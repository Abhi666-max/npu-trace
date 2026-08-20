# ⚡ NPU TRACE — AI Optimizer

> Real-time Edge AI Hardware Telemetry, AI Code Healer, Auto-Quantizer, and Hardware Profile Manager.

![Python](https://img.shields.io/badge/Python-3.12-blue?logo=python)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-teal?logo=fastapi)
![React](https://img.shields.io/badge/React-19-blue?logo=react)
![Vite](https://img.shields.io/badge/Vite-6-purple?logo=vite)
![WebSocket](https://img.shields.io/badge/WebSocket-60fps-green)
![Tailwind](https://img.shields.io/badge/TailwindCSS-3.4-cyan?logo=tailwindcss)

---

## 🎯 Problem Statement

**"Build tools that help developers create, test, deploy, or collaborate faster using AI."**

Edge AI developers deploying models on mobile NPUs (like iQOO's Snapdragon NPU) face critical blind spots:
- No real-time visibility into NPU load, thermal throttling, or token latency
- No automated code quality checks optimized for on-device inference
- No way to test how models perform under different power profiles before shipping

**NPU Trace** solves all three — a real-time AI-powered developer tool for edge deployment.

---

## 🚀 Features

### 1. Live HUD Dashboard
Real-time 60fps telemetry visualization — NPU Load, Token Latency, Chip Temperature, Battery Drain — all streamed via WebSocket.

### 2. AI Auto-Quantizer (Deploy Faster)
Drop a `.pt` or `.onnx` model file into `/target_builds` → The Watchdog auto-detects it, runs topology analysis, and triggers INT8 quantization for edge NPU deployment.

### 3. AI Code Healer (Create & Test Faster)
Drop a `.py` file → NPU Trace reads your code, detects performance bottlenecks (memory leaks, missing GC), shows a side-by-side Code Diff, and lets you **Apply AI Fix** with one click — rewriting your file in-place.

### 4. Hardware Profile Manager (Test Faster)
Switch between **ECO** / **BALANCED** / **PERFORMANCE** NPU profiles in real-time. Watch the Live HUD metrics shift instantly — test how your AI model behaves under different battery/performance constraints.

### 5. Deploy Readiness Score
AI-calculated 0-100 score based on latency + temperature + NPU load + hardware profile. Green = safe to ship. Red = optimize first.

### 6. Stress Test & Anomaly Detection
Click "Simulate Raw AI Workload" to spike NPU to 100%. Backend monitors for thermal throttling (>80°C) and sends real-time CRITICAL alerts.

### 7. Performance Report Export
One-click JSON report with session metrics, optimizations applied, anomalies detected, and deploy verdict. Share with your team.

---

## 🏗️ Architecture

```
┌──────────────┐    WebSocket (60fps)    ┌──────────────────┐
│  React/Vite  │ ◄──────────────────────► │  FastAPI Server   │
│  Gaming HUD  │                          │  + SQLite DB      │
│  + Charts    │                          │  + Watchdog       │
└──────────────┘                          └────────┬─────────┘
                                                   │
                                          ┌────────▼─────────┐
                                          │  Mock Telemetry   │
                                          │  Client (60fps)   │
                                          │  + Profile States │
                                          └──────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 19, Vite 6, Chart.js, Framer Motion, TailwindCSS 3.4 |
| **Backend** | Python 3.12, FastAPI, Uvicorn, SQLAlchemy, Watchdog |
| **Database** | SQLite (via SQLAlchemy ORM) |
| **Protocol** | WebSocket (real-time bidirectional at 60fps) |
| **Theme** | iQOO Esports Gaming HUD (AMOLED Black + Electric Gold) |

---

## ⚙️ Setup & Run

### Prerequisites
- Python 3.12+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+

### Backend
```bash
cd npu-trace
uv sync
uv run uvicorn main:app --host 0.0.0.0 --port 8000
```

### Mock Telemetry Client
```bash
uv run python mock_telemetry_client.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173** to see the dashboard.

---

## 🎮 Demo Flow

1. **Open Live HUD** → Watch real-time metrics stream
2. **Click "Simulate Raw AI Workload"** → See NPU spike to 100%, thermal alerts fire
3. **Go to Hardware Config** → Switch to PERFORMANCE mode → Watch metrics shift
4. **Drop a `.py` file in `target_builds/`** → AI Code Healer detects and suggests fix
5. **Click "Apply AI Fix"** → File is rewritten with optimized code
6. **Click "Export Report"** → Download session performance JSON
7. **Check Deploy Score** → Is your model ready to ship?

---

## 📄 License

MIT License — Built for iQOO Hackathon 2026

---

**Built by [Abhijeet Kangane](https://github.com/Abhi666-max)**
