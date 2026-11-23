//! Native speech-to-text using Windows' built-in recogniser (Windows.Media.SpeechRecognition).
//!
//! Why: the desktop app's web view (WebView2) exposes the browser speech API but it doesn't actually
//! work, so on Windows we listen natively instead. Free, no extra account, uses Windows' own
//! dictation engine (the same one as Win+H).
//!
//! WinRT objects live on one dedicated thread; the rest of the app talks to it over a channel.
//! Events sent to the web app:
//!   "stt:partial" (String) — words so far, while you speak
//!   "stt:done"    (String) — conversation mode only: you paused, here's the final text

use std::sync::{mpsc, Arc, Mutex};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use windows::core::Ref;
use windows::Foundation::{TimeSpan, TypedEventHandler};
use windows::Globalization::Language;
use windows::Media::SpeechRecognition::{
    SpeechContinuousRecognitionCompletedEventArgs, SpeechContinuousRecognitionResultGeneratedEventArgs,
    SpeechContinuousRecognitionSession, SpeechRecognitionHypothesisGeneratedEventArgs, SpeechRecognitionResultStatus,
    SpeechRecognizer,
};

pub enum Cmd {
    Start { lang: String, hold: bool, reply: mpsc::Sender<Result<(), String>> },
    Stop { reply: mpsc::Sender<String> },
    Cancel,
}

struct Active {
    _rec: SpeechRecognizer,
    session: SpeechContinuousRecognitionSession,
    text: Arc<Mutex<String>>,
}

/// Map Windows errors to codes the web app turns into plain-English help.
fn friendly(e: windows::core::Error) -> String {
    let code = e.code().0 as u32;
    match code {
        // "The speech privacy policy was not accepted" → Online speech recognition is off.
        0x8004_5509 => "speech_privacy".into(),
        // Access denied → microphone blocked for desktop apps.
        0x8007_0005 => "mic_denied".into(),
        _ => format!("Windows speech error 0x{code:08X}: {}", e.message()),
    }
}

/// Use the requested language if Windows has it installed, otherwise the system speech language.
fn pick_language(tag: &str) -> Option<Language> {
    let supported = SpeechRecognizer::SupportedTopicLanguages().ok()?;
    let n = supported.Size().ok()?;
    let langs: Vec<Language> = (0..n).filter_map(|i| supported.GetAt(i).ok()).collect();
    let tag_of = |l: &Language| l.LanguageTag().map(|t| t.to_string().to_lowercase()).unwrap_or_default();
    let want = tag.to_lowercase();
    let prefix = want.split('-').next().unwrap_or("en").to_string();
    langs
        .iter()
        .find(|l| tag_of(l) == want)
        .or_else(|| langs.iter().find(|l| tag_of(l).starts_with(&prefix)))
        .cloned()
}

fn start(app: &AppHandle, lang: &str, hold: bool) -> Result<Active, String> {
    let rec = match pick_language(lang) {
        Some(l) => SpeechRecognizer::Create(&l).or_else(|_| SpeechRecognizer::new()),
        None => SpeechRecognizer::new(),
    }
    .map_err(friendly)?;

    let compiled = rec.CompileConstraintsAsync().and_then(|op| op.join()).map_err(friendly)?;
    let status = compiled.Status().map_err(friendly)?;
    if status != SpeechRecognitionResultStatus::Success {
        return Err(format!("Windows couldn't start dictation ({status:?})."));
    }

    let text = Arc::new(Mutex::new(String::new()));
    let done_sent = Arc::new(Mutex::new(false));

    // Live words while speaking.
    {
        let app = app.clone();
        let text = text.clone();
        rec.HypothesisGenerated(&TypedEventHandler::new(move |_, args: Ref<SpeechRecognitionHypothesisGeneratedEventArgs>| {
            let h = args.ok()?.Hypothesis()?.Text()?.to_string();
            let so_far = text.lock().unwrap().clone();
            let _ = app.emit("stt:partial", format!("{so_far} {h}").trim().to_string());
            Ok(())
        }))
        .map_err(friendly)?;
    }

    let session = rec.ContinuousRecognitionSession().map_err(friendly)?;

    // A finished phrase (Windows decides you paused).
    {
        let app = app.clone();
        let text = text.clone();
        let done_sent = done_sent.clone();
        session
            .ResultGenerated(&TypedEventHandler::new(move |_, args: Ref<SpeechContinuousRecognitionResultGeneratedEventArgs>| {
                let phrase = args.ok()?.Result()?.Text()?.to_string();
                if phrase.trim().is_empty() {
                    return Ok(());
                }
                let all = {
                    let mut t = text.lock().unwrap();
                    if !t.is_empty() {
                        t.push(' ');
                    }
                    t.push_str(phrase.trim());
                    t.clone()
                };
                let _ = app.emit("stt:partial", all.clone());
                // Conversation mode: the first complete phrase is the turn.
                if !hold {
                    let mut sent = done_sent.lock().unwrap();
                    if !*sent {
                        *sent = true;
                        let _ = app.emit("stt:done", all);
                    }
                }
                Ok(())
            }))
            .map_err(friendly)?;
    }

    if !hold {
        // Nobody spoke for 8 s → end the turn with nothing.
        session.SetAutoStopSilenceTimeout(TimeSpan { Duration: 8 * 10_000_000 }).map_err(friendly)?;
        let app = app.clone();
        let text = text.clone();
        session
            .Completed(&TypedEventHandler::new(move |_, _args: Ref<SpeechContinuousRecognitionCompletedEventArgs>| {
                let mut sent = done_sent.lock().unwrap();
                if !*sent {
                    *sent = true;
                    let _ = app.emit("stt:done", text.lock().unwrap().trim().to_string());
                }
                Ok(())
            }))
            .map_err(friendly)?;
    } else {
        // Push-to-talk: keep listening for as long as the key is held (up to a minute of silence).
        session.SetAutoStopSilenceTimeout(TimeSpan { Duration: 60 * 10_000_000 }).map_err(friendly)?;
    }

    session.StartAsync().and_then(|a| a.join()).map_err(friendly)?;
    Ok(Active { _rec: rec, session, text })
}

/// Start the recogniser thread. Returns the channel used to control it.
pub fn spawn(app: AppHandle) -> mpsc::Sender<Cmd> {
    let (tx, rx) = mpsc::channel::<Cmd>();
    std::thread::spawn(move || {
        // WinRT needs COM initialised on this thread.
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(None, windows::Win32::System::Com::COINIT_MULTITHREADED);
        }
        let mut active: Option<Active> = None;
        for cmd in rx {
            match cmd {
                Cmd::Start { lang, hold, reply } => {
                    if let Some(a) = active.take() {
                        let _ = a.session.CancelAsync().and_then(|op| op.join());
                    }
                    match start(&app, &lang, hold) {
                        Ok(a) => {
                            active = Some(a);
                            let _ = reply.send(Ok(()));
                        }
                        Err(e) => {
                            let _ = reply.send(Err(e));
                        }
                    }
                }
                Cmd::Stop { reply } => {
                    let text = match active.take() {
                        Some(a) => {
                            // Stopping flushes the last phrase through ResultGenerated first.
                            let _ = a.session.StopAsync().and_then(|op| op.join());
                            std::thread::sleep(Duration::from_millis(120));
                            let t = a.text.lock().unwrap().trim().to_string();
                            t
                        }
                        None => String::new(),
                    };
                    let _ = reply.send(text);
                }
                Cmd::Cancel => {
                    if let Some(a) = active.take() {
                        let _ = a.session.CancelAsync().and_then(|op| op.join());
                    }
                }
            }
        }
    });
    tx
}
