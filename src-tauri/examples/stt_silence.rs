// Diagnostic: does the continuous session end by itself after the silence timeout?
//   cargo run --example stt_silence            (wait with .join(), like the old code)
//   cargo run --example stt_silence -- --poll  (wait by polling Status(), like the new code)
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use windows::core::Ref;
use windows::Foundation::{TimeSpan, TypedEventHandler};
use windows::Media::SpeechRecognition::*;
use windows_future::AsyncStatus;

fn main() {
    let poll = std::env::args().any(|a| a == "--poll");
    std::thread::spawn(move || {
        unsafe {
            let _ = windows::Win32::System::Com::CoInitializeEx(None, windows::Win32::System::Com::COINIT_MULTITHREADED);
        }
        let rec = SpeechRecognizer::new().unwrap();
        rec.CompileConstraintsAsync().unwrap().join().unwrap();
        let session = rec.ContinuousRecognitionSession().unwrap();
        let t0 = Instant::now();
        let fired = Arc::new(Mutex::new(None::<String>));
        {
            let fired = fired.clone();
            session
                .Completed(&TypedEventHandler::new(move |_, a: Ref<SpeechContinuousRecognitionCompletedEventArgs>| {
                    let st = a.ok().and_then(|a| a.Status()).map(|s| format!("{s:?}")).unwrap_or_default();
                    *fired.lock().unwrap() = Some(format!("Completed after {:.1}s ({st})", t0.elapsed().as_secs_f32()));
                    Ok(())
                }))
                .unwrap();
        }
        session.SetAutoStopSilenceTimeout(TimeSpan { Duration: 4 * 10_000_000 }).unwrap();
        let a = session.StartAsync().unwrap();
        if poll {
            while a.Status().unwrap() == AsyncStatus::Started {
                std::thread::sleep(Duration::from_millis(20));
            }
            a.GetResults().unwrap();
        } else {
            a.join().unwrap();
        }
        println!("{} started; waiting up to 15 s for the 4 s silence timeout…", if poll { "poll" } else { "join" });
        while t0.elapsed() < Duration::from_secs(15) {
            if let Some(m) = fired.lock().unwrap().clone() {
                println!("{m}");
                return;
            }
            std::thread::sleep(Duration::from_millis(100));
        }
        println!("NO Completed event within 15 s");
        let _ = session.CancelAsync().unwrap().join();
    })
    .join()
    .unwrap();
}
