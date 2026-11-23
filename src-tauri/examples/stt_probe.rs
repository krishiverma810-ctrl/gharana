// Diagnostic: the same steps as src/stt.rs, printed one by one.  cargo run --example stt_probe
use std::time::Duration;
use windows::Media::SpeechRecognition::SpeechRecognizer;

fn step<T>(name: &str, f: impl FnOnce() -> windows::core::Result<T>) -> Option<T> {
    print!("{name} … ");
    use std::io::Write;
    let _ = std::io::stdout().flush();
    match f() {
        Ok(v) => {
            println!("ok");
            Some(v)
        }
        Err(e) => {
            println!("ERROR 0x{:08X} {}", e.code().0 as u32, e.message());
            None
        }
    }
}

fn main() {
    let mta = std::env::args().all(|a| a != "--sta");
    let t = std::thread::spawn(move || {
        unsafe {
            let flag = if mta { windows::Win32::System::Com::COINIT_MULTITHREADED } else { windows::Win32::System::Com::COINIT_APARTMENTTHREADED };
            let _ = windows::Win32::System::Com::CoInitializeEx(None, flag);
        }
        println!("thread: {}", if mta { "MTA" } else { "STA" });
        let langs = step("SupportedTopicLanguages", SpeechRecognizer::SupportedTopicLanguages);
        let lang = langs.and_then(|l| l.GetAt(0).ok());
        if let Some(l) = &lang {
            println!("  using {:?}", l.LanguageTag());
        }
        let Some(rec) = (match &lang {
            Some(l) => step("SpeechRecognizer::Create(lang)", || SpeechRecognizer::Create(l)),
            None => step("SpeechRecognizer::new", SpeechRecognizer::new),
        }) else { return };
        use windows::core::Ref;
        use windows::Foundation::TypedEventHandler;
        use windows::Media::SpeechRecognition::*;
        step("HypothesisGenerated handler", || {
            rec.HypothesisGenerated(&TypedEventHandler::new(move |_, a: Ref<SpeechRecognitionHypothesisGeneratedEventArgs>| {
                println!("  heard: {}", a.ok()?.Hypothesis()?.Text()?);
                Ok(())
            }))
        });
        let Some(op) = step("CompileConstraintsAsync", || rec.CompileConstraintsAsync()) else { return };
        let Some(res) = step("  .join()", || op.join()) else { return };
        println!("  status = {:?}", res.Status());
        let Some(session) = step("ContinuousRecognitionSession", || rec.ContinuousRecognitionSession()) else { return };
        step("ResultGenerated handler", || {
            session.ResultGenerated(&TypedEventHandler::new(move |_, a: Ref<SpeechContinuousRecognitionResultGeneratedEventArgs>| {
                println!("  phrase: {}", a.ok()?.Result()?.Text()?);
                Ok(())
            }))
        });
        step("SetAutoStopSilenceTimeout", || session.SetAutoStopSilenceTimeout(windows::Foundation::TimeSpan { Duration: 60 * 10_000_000 }));
        let Some(a) = step("StartAsync", || session.StartAsync()) else { return };
        step("  .join()", || a.join());
        std::thread::sleep(Duration::from_millis(500));
        if let Some(c) = step("CancelAsync", || session.CancelAsync()) {
            step("  .join()", || c.join());
        }
        println!("DONE");
    });
    let start = std::time::Instant::now();
    while !t.is_finished() {
        if start.elapsed() > Duration::from_secs(20) {
            println!("\nHUNG — still waiting after 20 s");
            std::process::exit(2);
        }
        std::thread::sleep(Duration::from_millis(100));
    }
}
