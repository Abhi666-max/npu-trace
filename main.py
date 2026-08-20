import os
import json
import asyncio
import time
import shutil
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from models import CoreMeshTelemetryPayload
from directory_tracker import start_directory_tracker
from database import init_db, SessionLocal, TelemetryRecord, EventLog

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directory for static files (dashboard)
os.makedirs("static", exist_ok=True)
app.mount("/static", StaticFiles(directory="static"), name="static")

class ConnectionManager:
    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: str, exclude: WebSocket = None):
        for connection in list(self.active_connections):
            if connection == exclude:
                continue
            try:
                await connection.send_text(message)
            except Exception:
                self.disconnect(connection)

manager = ConnectionManager()
log_queue = asyncio.Queue()

async def log_broadcaster():
    """Background task to broadcast compilation logs to clients and save to DB"""
    while True:
        message = await log_queue.get()
        db = SessionLocal()
        try:
            log_record = EventLog(level="INFO", message=message)
            db.add(log_record)
            db.commit()
        except Exception:
            db.rollback()
        finally:
            db.close()
            
        if message == "TRIGGER_OPTIMIZATION":
            await manager.broadcast(json.dumps({"type": "command", "data": "OPTIMIZE_MODEL"}))
            log_queue.task_done()
            continue

        if message.startswith("TRIGGER_CODE_FIX_SUGGESTION:"):
            filename = message.split(":")[1]
            await manager.broadcast(json.dumps({"type": "code_fix", "file": filename, "data": f"[AI ENGINE] Critical memory leak detected in {filename}. Suggested fix ready."}))
            log_queue.task_done()
            continue

        await manager.broadcast(json.dumps({"type": "log", "data": message}))
        log_queue.task_done()

@app.on_event("startup")
async def startup_event():
    init_db()
    
    target_dir = "target_builds"
    os.makedirs(target_dir, exist_ok=True)
    loop = asyncio.get_running_loop()
    start_directory_tracker(target_dir, log_queue, loop)
    
    asyncio.create_task(log_broadcaster())

@app.get("/api/history/telemetry")
def get_telemetry_history(limit: int = 100):
    db = SessionLocal()
    records = db.query(TelemetryRecord).order_by(TelemetryRecord.timestamp.desc()).limit(limit).all()
    db.close()
    return records

@app.get("/api/history/logs")
def get_logs_history(limit: int = 100):
    db = SessionLocal()
    records = db.query(EventLog).order_by(EventLog.timestamp.desc()).limit(limit).all()
    db.close()
    return records

@app.post("/api/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        os.makedirs("target_builds", exist_ok=True)
        file_path = os.path.join("target_builds", file.filename)
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        return {"filename": file.filename, "status": "Upload successful. Watchdog triggered."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.websocket("/ws/telemetry")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    db = SessionLocal()
    last_alert_time = 0
    last_db_save_time = 0  # Throttle DB writes to 1 per second
    try:
        while True:
            data = await websocket.receive_text()
            try:
                payload_dict = json.loads(data)
                
                # Check if it's a Command from the Frontend
                if "command" in payload_dict:
                    cmd = payload_dict["command"]
                    msg = f"Executing Command: {cmd}"
                    # Log command
                    db.add(EventLog(level="INFO", message=msg))
                    db.commit()
                    # Broadcast command string so frontend sees it in execution stream
                    await manager.broadcast(json.dumps({"type": "log", "data": msg}))
                    
                    if cmd == "TRIGGER_STRESS_TEST":
                        # We can broadcast to all clients including phone mock
                        await manager.broadcast(json.dumps({"type": "command", "data": "STRESS_TEST"}))
                    elif cmd.startswith("SET_PROFILE_"):
                        await manager.broadcast(json.dumps({"type": "command", "data": cmd}))
                    elif cmd == "APPLY_FIX":
                        file_name = payload_dict.get("file", "unknown.py")
                        optimized_code = payload_dict.get("code", "")
                        file_path = os.path.join("target_builds", file_name)
                        try:
                            with open(file_path, "w") as f:
                                f.write(optimized_code)
                            await manager.broadcast(json.dumps({"type": "log", "data": f"[AI CODE HEALER] Successfully applied fix to {file_name}. File rewritten."}))
                        except Exception as e:
                            await manager.broadcast(json.dumps({"type": "log", "data": f"[AI CODE HEALER] Failed to apply fix: {e}"}))
                    continue

                # Normal Telemetry Processing
                if "npu_load_pct" in payload_dict:
                    payload = CoreMeshTelemetryPayload(**payload_dict)
                    
                    # 1. Save to DB (throttled to 1 write per second for clean timestamps)
                    current_time = time.time()
                    if current_time - last_db_save_time >= 1.0:
                        last_db_save_time = current_time
                        record = TelemetryRecord(
                            npu_load_pct=payload.npu_load_pct,
                            token_latency_ms=payload.token_latency_ms,
                            chip_temp_celsius=payload.chip_temp_celsius,
                            battery_drain_ma=payload.battery_drain_ma
                        )
                        db.add(record)
                        db.commit()
                    
                    # 2. Anomaly Detection (AI monitoring AI)
                    if payload.chip_temp_celsius >= 80.0:
                        if current_time - last_alert_time > 5.0:
                            last_alert_time = current_time
                            alert_msg = f"CRITICAL: Thermal Throttling Detected ({payload.chip_temp_celsius}°C)"
                            db.add(EventLog(level="ALERT", message=alert_msg))
                            db.commit()
                            await manager.broadcast(json.dumps({
                                "type": "alert",
                                "data": alert_msg
                            }))

                    # 3. Broadcast to Dashboards
                    await manager.broadcast(json.dumps({
                        "type": "telemetry",
                        "data": payload.model_dump()
                    }), exclude=websocket)
            except ValidationError:
                pass
            except json.JSONDecodeError:
                pass
            except Exception as e:
                db.rollback()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        await manager.broadcast(json.dumps({"type": "node_status", "data": "offline"}))
    finally:
        db.close()

@app.get("/api/ping")
def ping():
    return {"status": "awake", "time": time.time()}

app.mount("/", StaticFiles(directory="static", html=True), name="static")
