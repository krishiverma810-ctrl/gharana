//! GHARANA desktop — a thin native shell around the web app.
//!
//! What this adds on top of the website:
//!   • System-wide hotkeys (work even when GHARANA is minimised / another app is focused):
//!       hold  Ctrl+Shift+Space → talk to ALFRED (release to send)
//!       tap   Ctrl+Shift+A     → conversation mode on/off
//!       tap   Ctrl+Shift+T     → type to ALFRED
//!     All rebindable from Settings → Desktop (saved to hotkeys.json in the app config folder).
//!   • A small always-on-top ALFRED bar (the "overlay" window) bottom-centre of the screen.
//!   • A tray icon with quick actions, today's summary, and launch-on-startup.
//!   • Closing the window hides it to the tray so the hotkeys keep working.

use serde::{Deserialize, Serialize};
use std::sync::Mutex;
use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[derive(Clone, Serialize, Deserialize)]
struct Hotkeys {
    talk: String,
    converse: String,
    type_to: String,
}

impl Default for Hotkeys {
    fn default() -> Self {
        Self { talk: "Ctrl+Shift+Space".into(), converse: "Ctrl+Shift+A".into(), type_to: "Ctrl+Shift+T".into() }
    }
}

struct AppState {
    hotkeys: Mutex<Hotkeys>,
    pinned: Mutex<bool>,
}

fn hotkeys_path(app: &AppHandle) -> Option<std::path::PathBuf> {
    app.path().app_config_dir().ok().map(|d| d.join("hotkeys.json"))
}

fn load_hotkeys(app: &AppHandle) -> Hotkeys {
    hotkeys_path(app)
        .and_then(|p| std::fs::read_to_string(p).ok())
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default()
}

fn save_hotkeys(app: &AppHandle, h: &Hotkeys) {
    if let Some(p) = hotkeys_path(app) {
        let _ = std::fs::create_dir_all(p.parent().unwrap());
        let _ = std::fs::write(p, serde_json::to_string_pretty(h).unwrap_or_default());
    }
}

/// Register the three global shortcuts. Returns an error naming any that couldn't be registered
/// (usually because another app already owns that combination).
fn register(app: &AppHandle, h: &Hotkeys) -> Result<(), String> {
    let gs = app.global_shortcut();
    let _ = gs.unregister_all();
    let mut failed = vec![];
    for k in [&h.talk, &h.converse, &h.type_to] {
        match k.parse::<Shortcut>() {
            Ok(s) => {
                if gs.register(s).is_err() {
                    failed.push(k.clone());
                }
            }
            Err(_) => failed.push(format!("{k} (not a valid shortcut)")),
        }
    }
    if failed.is_empty() { Ok(()) } else { Err(format!("Couldn't register: {}", failed.join(", "))) }
}

/// Bottom-centre of the monitor the cursor is on (falls back to the primary monitor).
fn position_overlay(app: &AppHandle) {
    let Some(win) = app.get_webview_window("overlay") else { return };
    let monitor = win
        .cursor_position()
        .ok()
        .and_then(|p| win.monitor_from_point(p.x, p.y).ok().flatten())
        .or_else(|| win.primary_monitor().ok().flatten());
    if let (Some(m), Ok(size)) = (monitor, win.outer_size()) {
        let pos = m.position();
        let ms = m.size();
        let x = pos.x + (ms.width as i32 - size.width as i32) / 2;
        let y = pos.y + ms.height as i32 - size.height as i32 - (ms.height as f64 * 0.08) as i32;
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }
}

fn show_overlay(app: &AppHandle, focus: bool) {
    if let Some(win) = app.get_webview_window("overlay") {
        position_overlay(app);
        let _ = win.show();
        let _ = win.set_always_on_top(true);
        if focus {
            let _ = win.set_focus();
        }
    }
}

fn show_main(app: &AppHandle) {
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.unminimize();
        let _ = win.show();
        let _ = win.set_focus();
    }
}

// ── Commands the web app can call ─────────────────────────────────────

#[tauri::command]
fn hide_overlay(app: AppHandle) {
    let pinned = *app.state::<AppState>().pinned.lock().unwrap();
    if !pinned {
        if let Some(win) = app.get_webview_window("overlay") {
            let _ = win.hide();
        }
    }
}

#[tauri::command]
fn set_overlay_pinned(app: AppHandle, pinned: bool) {
    *app.state::<AppState>().pinned.lock().unwrap() = pinned;
}

#[tauri::command]
fn get_hotkeys(app: AppHandle) -> Hotkeys {
    app.state::<AppState>().hotkeys.lock().unwrap().clone()
}

#[tauri::command]
fn set_hotkeys(app: AppHandle, hotkeys: Hotkeys) -> Result<(), String> {
    let result = register(&app, &hotkeys);
    if result.is_ok() {
        save_hotkeys(&app, &hotkeys);
        *app.state::<AppState>().hotkeys.lock().unwrap() = hotkeys;
    } else {
        // Put the previous working set back.
        let prev = app.state::<AppState>().hotkeys.lock().unwrap().clone();
        let _ = register(&app, &prev);
    }
    result
}

#[tauri::command]
fn set_tray_summary(app: AppHandle, text: String) {
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_tooltip(Some(format!("GHARANA\n{text}")));
    }
}

#[tauri::command]
fn open_main(app: AppHandle, path: Option<String>) {
    show_main(&app);
    if let Some(p) = path {
        let _ = app.emit_to("main", "navigate", p);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // A second launch just brings the existing window forward.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| show_main(app)))
        .plugin(tauri_plugin_autostart::init(MacosLauncher::LaunchAgent, Some(vec!["--hidden"])))
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, shortcut, event| {
                    let h = app.state::<AppState>().hotkeys.lock().unwrap().clone();
                    let is = |k: &str| k.parse::<Shortcut>().map(|s| &s == shortcut).unwrap_or(false);
                    if is(&h.talk) {
                        match event.state() {
                            ShortcutState::Pressed => {
                                show_overlay(app, false);
                                let _ = app.emit_to("overlay", "alfred:ptt-down", ());
                            }
                            ShortcutState::Released => {
                                let _ = app.emit_to("overlay", "alfred:ptt-up", ());
                            }
                        }
                    } else if is(&h.converse) && event.state() == ShortcutState::Pressed {
                        show_overlay(app, false);
                        let _ = app.emit_to("overlay", "alfred:converse", ());
                    } else if is(&h.type_to) && event.state() == ShortcutState::Pressed {
                        show_overlay(app, true);
                        let _ = app.emit_to("overlay", "alfred:type", ());
                    }
                })
                .build(),
        )
        .manage(AppState { hotkeys: Mutex::new(Hotkeys::default()), pinned: Mutex::new(false) })
        .invoke_handler(tauri::generate_handler![hide_overlay, set_overlay_pinned, get_hotkeys, set_hotkeys, set_tray_summary, open_main])
        .setup(|app| {
            let handle = app.handle().clone();

            // Hotkeys
            let h = load_hotkeys(&handle);
            if let Err(e) = register(&handle, &h) {
                eprintln!("{e}");
            }
            *app.state::<AppState>().hotkeys.lock().unwrap() = h;

            // Started by Windows at login → stay in the tray.
            if std::env::args().any(|a| a == "--hidden") {
                if let Some(w) = app.get_webview_window("main") {
                    let _ = w.hide();
                }
            }

            // Tray
            let talk = MenuItem::with_id(app, "talk", "Talk to ALFRED", true, None::<&str>)?;
            let water = MenuItem::with_id(app, "water", "Log 250 ml water", true, None::<&str>)?;
            let focus = MenuItem::with_id(app, "focus", "Start 25-min focus", true, None::<&str>)?;
            let open = MenuItem::with_id(app, "open", "Open GHARANA", true, None::<&str>)?;
            let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);
            let startup = CheckMenuItem::with_id(app, "startup", "Launch on startup", true, autostart_on, None::<&str>)?;
            let quit = MenuItem::with_id(app, "quit", "Quit GHARANA", true, None::<&str>)?;
            let sep = PredefinedMenuItem::separator(app)?;
            let sep2 = PredefinedMenuItem::separator(app)?;
            let menu = Menu::with_items(app, &[&talk, &water, &focus, &sep, &open, &startup, &sep2, &quit])?;
            let startup_item = startup.clone();

            TrayIconBuilder::with_id("main")
                .icon(app.default_window_icon().unwrap().clone())
                .tooltip("GHARANA — The house builds the name.")
                .menu(&menu)
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "talk" => {
                        show_overlay(app, true);
                        let _ = app.emit_to("overlay", "alfred:converse", ());
                    }
                    "water" => {
                        let _ = app.emit_to("main", "tray:action", "water");
                    }
                    "focus" => {
                        let _ = app.emit_to("main", "tray:action", "focus");
                    }
                    "open" => show_main(app),
                    "startup" => {
                        let al = app.autolaunch();
                        let on = al.is_enabled().unwrap_or(false);
                        let _ = if on { al.disable() } else { al.enable() };
                        let _ = startup_item.set_checked(!on);
                    }
                    "quit" => app.exit(0),
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click { button: MouseButton::Left, button_state: MouseButtonState::Up, .. } = event {
                        show_main(tray.app_handle());
                    }
                })
                .build(app)?;
            Ok(())
        })
        .on_window_event(|window, event| {
            // Closing the main window hides it to the tray so the hotkeys keep working.
            if let WindowEvent::CloseRequested { api, .. } = event {
                if window.label() == "main" {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running GHARANA");
}
