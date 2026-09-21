use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::{Child, Command};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::Duration;
use tauri::Manager;

#[derive(Debug, Serialize, Deserialize)]
pub struct BackendInfo {
    pub port: u16,
    pub token: String,
    pub pid: u32,
}
// Sidecar TTS routing v1.1

#[derive(Clone)]
pub struct AppState {
    pub sidecar: Arc<Mutex<Option<Child>>>,
}

#[tauri::command]
fn get_backend_info() -> Result<BackendInfo, String> {
    let candidate_paths = [
        PathBuf::from("apps/backend/runtime.json"),
        PathBuf::from("../apps/backend/runtime.json"),
        PathBuf::from("runtime.json"),
    ];

    for _ in 0..30 {
        for path in &candidate_paths {
            if path.exists() {
                if let Ok(contents) = fs::read_to_string(path) {
                    if let Ok(info) = serde_json::from_str::<BackendInfo>(&contents) {
                        return Ok(info);
                    }
                }
            }
        }
        thread::sleep(Duration::from_millis(100));
    }

    Err("Backend runtime.json not found or could not be read. Ensure sidecar is active.".to_string())
}

fn spawn_sidecar() -> Option<Child> {
    let candidate_dirs = [
        PathBuf::from("apps/backend"),
        PathBuf::from("../apps/backend"),
    ];

    let mut found = None;
    for dir in &candidate_dirs {
        let uvicorn = dir.join(".venv/Scripts/uvicorn.exe");
        let python = dir.join(".venv/Scripts/python.exe");
        if uvicorn.exists() {
            found = Some((uvicorn, dir.clone(), true));
            break;
        } else if python.exists() {
            found = Some((python, dir.clone(), false));
            break;
        }
    }

    let (exe_path, working_dir, is_uvicorn) = match found {
        Some(t) => t,
        None => {
            println!("[Tauri] Backend venv not found; relying on external supervisor");
            return None;
        }
    };

    let mut cmd = Command::new(&exe_path);
    cmd.current_dir(&working_dir)
        .env("STORYFORGE_PORT", "8000")
        .env("STORYFORGE_TOKEN", "auto-session-token");

    if is_uvicorn {
        cmd.args(["app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]);
    } else {
        cmd.args(["-m", "uvicorn", "app.main:app", "--host", "127.0.0.1", "--port", "8000", "--reload"]);
    }

    let child = cmd.spawn();

    match child {
        Ok(c) => {
            println!(
                "[Tauri] Backend sidecar spawned with PID: {} using {:?}",
                c.id(),
                exe_path
            );
            Some(c)
        }
        Err(e) => {
            eprintln!("[Tauri] Failed to spawn sidecar: {}", e);
            None
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let sidecar_holder = Arc::new(Mutex::new(None));
    let sidecar_for_event = Arc::clone(&sidecar_holder);

    tauri::Builder::default()
        .manage(AppState {
            sidecar: sidecar_holder,
        })
        .setup(|app| {
            let child = spawn_sidecar();
            let state = app.state::<AppState>();
            if let Ok(mut lock) = state.sidecar.lock() {
                *lock = child;
            }
            Ok(())
        })
        .on_window_event(move |_window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                if let Ok(mut lock) = sidecar_for_event.lock() {
                    if let Some(mut child) = lock.take() {
                        println!("[Tauri] Gracefully terminating sidecar child...");
                        let _ = child.kill();
                    }
                }
            }
        })
        .invoke_handler(tauri::generate_handler![get_backend_info])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
