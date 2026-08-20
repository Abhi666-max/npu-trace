# NPU Trace

NPU Trace is an AI-powered telemetry bridge and code healing platform designed for edge devices. It enables real-time hardware monitoring (NPU load, temperature, token latency, battery drain) via WebSockets and integrates LLM-based autonomous code optimization for hardware-specific constraints.

Built as a submission for the iQOO Hackathon.

## Architecture & Workflow

The platform operates through a two-way telemetry bridge:
1. **Edge Client**: A lightweight client running on an edge device (e.g., iQOO phone) that streams hardware metrics via a WebSocket connection.
2. **Host IDE**: A local dashboard that visualizes the incoming data streams and acts as a code dropzone. 
3. **AI Code Healer**: A background worker that monitors dropped scripts (`.py`, `.onnx`, `.pt`), intercepts errors or sub-optimal patterns (e.g., lack of quantization), and utilizes an LLM (Llama3-8b) to suggest and apply optimized code fixes dynamically.

## Tech Stack

**Frontend:**
- React 18
- Vite
- TailwindCSS (Styling & Animations)
- Framer Motion (Transitions)
- Chart.js (Telemetry Visualization)

**Backend:**
- Python 3
- FastAPI (WebSocket Server & API Routing)
- Watchdog (File System Monitoring)
- Groq API (Llama3-8b for AI Code Healing)

## Directory Structure

```text
npu-trace/
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── NodeTopology.jsx
│   │   ├── App.jsx
│   │   ├── index.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── static/
│   ├── app.js
│   ├── index.html
│   └── mobile.html
├── .env
├── .gitignore
├── directory_tracker.py
├── main.py
├── mock_telemetry_client.py
└── README.md
```

## Setup & Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Abhi666-max/npu-trace.git
   cd npu-trace
   ```

2. **Backend Setup:**
   ```bash
   # Install dependencies (using uv or pip)
   uv venv
   uv pip install fastapi uvicorn watchdog groq python-multipart
   
   # Set environment variables
   echo "GROQ_API_KEY=your_key_here" > .env
   
   # Run the server
   uv run uvicorn main:app --host 0.0.0.0 --port 8000
   ```

3. **Frontend Setup:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Testing Telemetry:**
   You can either run `mock_telemetry_client.py` to simulate device metrics locally or scan the QR code in the dashboard using an edge device connected to the same network.

## Credits
- Designed and Developed by **Abhijeet Kangane**
- GitHub: [Abhi666-max](https://github.com/abhi666-max)
- LinkedIn: [abhijeet-kangane](https://www.linkedin.com/in/abhijeet-kangane/)

## License
MIT License. See `LICENSE` for more information.
