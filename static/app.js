// Setup WebSocket
const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
const wsUrl = `${protocol}//${window.location.host}/ws/telemetry`;
let ws;

const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');
const statusContainer = document.getElementById('connection-status-container');
const logContainer = document.getElementById('log-container');

// Data arrays for charts
const maxDataPoints = 120;
const npuData = new Array(maxDataPoints).fill(0);
const latencyData = new Array(maxDataPoints).fill(0);
const tempData = new Array(maxDataPoints).fill(0);

// Initialize Canvas
function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;
    
    // Handle high DPI displays
    const rect = canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    // Set actual size in memory (scaled to account for extra pixel density)
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    
    // Normalize coordinate system to use css pixels
    ctx.scale(dpr, dpr);
    
    return { canvas, ctx, width: rect.width, height: rect.height };
}

let npuCtx = setupCanvas('npuCanvas');
let latencyCtx = setupCanvas('latencyCanvas');
let tempCtx = setupCanvas('tempCanvas');

window.addEventListener('resize', () => {
    npuCtx = setupCanvas('npuCanvas');
    latencyCtx = setupCanvas('latencyCanvas');
    tempCtx = setupCanvas('tempCanvas');
});

function drawSmoothChart(ctxObj, data, baseColor, glowColor) {
    if (!ctxObj || !ctxObj.ctx) return;
    const { ctx, width, height } = ctxObj;
    
    ctx.clearRect(0, 0, width, height);
    if (data.length === 0) return;

    // Find min/max for dynamic scaling
    let max = Math.max(...data, 10);
    let min = Math.min(...data);
    if (max === min) max += 1;
    
    const range = max - min;
    const padding = range * 0.15; // More padding for breathability
    const yMax = max + padding;
    const yMin = Math.max(0, min - padding);
    
    const pointWidth = width / (maxDataPoints - 1);

    // --- Draw Fill Gradient ---
    ctx.beginPath();
    let startY = height - ((data[0] - yMin) / (yMax - yMin)) * height;
    ctx.moveTo(0, startY);

    for (let i = 1; i < data.length; i++) {
        const x = i * pointWidth;
        const y = height - ((data[i] - yMin) / (yMax - yMin)) * height;
        ctx.lineTo(x, y);
    }
    
    // Complete path for fill
    ctx.lineTo(width, height);
    ctx.lineTo(0, height);
    ctx.closePath();

    const fillGrad = ctx.createLinearGradient(0, 0, 0, height);
    
    const isCyan = baseColor.includes('06b6d4') || baseColor.includes('60A5FA');
    const isPurple = baseColor.includes('a855f7');
    
    let rgb = isCyan ? '6, 182, 212' : (isPurple ? '168, 85, 247' : '249, 115, 22');

    fillGrad.addColorStop(0, `rgba(${rgb}, 0.25)`);
    fillGrad.addColorStop(1, `rgba(${rgb}, 0.0)`);
    ctx.fillStyle = fillGrad;
    ctx.fill();

    // --- Draw Line ---
    ctx.beginPath();
    ctx.moveTo(0, startY);
    
    for (let i = 1; i < data.length; i++) {
        const x = i * pointWidth;
        const y = height - ((data[i] - yMin) / (yMax - yMin)) * height;
        ctx.lineTo(x, y);
    }

    // Neon Glow effect
    ctx.shadowBlur = 12;
    ctx.shadowColor = glowColor;
    
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    
    ctx.stroke();
    
    // Reset shadow for next draw
    ctx.shadowBlur = 0;
}

// Animation loop
let lastFrameTime = performance.now();
let frames = 0;

function animate(time) {
    frames++;
    if (time - lastFrameTime >= 1000) {
        const fpsEl = document.getElementById('fps-val');
        if (fpsEl) fpsEl.innerText = frames;
        frames = 0;
        lastFrameTime = time;
    }

    // Brand colors: Cyan #06b6d4, Purple #a855f7, Orange #f97316
    drawSmoothChart(npuCtx, npuData, '#06b6d4', 'rgba(6, 182, 212, 0.6)');
    drawSmoothChart(latencyCtx, latencyData, '#a855f7', 'rgba(168, 85, 247, 0.6)');
    drawSmoothChart(tempCtx, tempData, '#f97316', 'rgba(249, 115, 22, 0.6)');

    requestAnimationFrame(animate);
}
requestAnimationFrame(animate);

function connectWebSocket() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
        if (statusContainer) statusContainer.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 transition-all duration-500";
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]";
        if (statusText) {
            statusText.className = "text-xs font-semibold uppercase tracking-wider text-emerald-400";
            statusText.innerText = "Connected";
        }
    };

    ws.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "telemetry") {
            const data = msg.data;
            
            // Update Data Arrays
            npuData.shift(); npuData.push(data.npu_load_pct);
            latencyData.shift(); latencyData.push(data.token_latency_ms);
            tempData.shift(); tempData.push(data.chip_temp_celsius);

            // Update UI values
            const npuEl = document.getElementById('npu-val');
            if (npuEl) npuEl.innerText = data.npu_load_pct.toFixed(1);
            
            const latEl = document.getElementById('latency-val');
            if (latEl) latEl.innerText = data.token_latency_ms.toFixed(1);
            
            const tempEl = document.getElementById('temp-val');
            if (tempEl) tempEl.innerText = data.chip_temp_celsius.toFixed(1);
            
            const battEl = document.getElementById('battery-val');
            if (battEl) battEl.innerText = `${data.battery_drain_ma} mA`;

        } else if (msg.type === "log") {
            if (!logContainer) return;
            const div = document.createElement('div');
            const time = new Date().toLocaleTimeString('en-US', { hour12: false, hour: "numeric", minute: "numeric", second: "numeric" });
            
            // Format log with premium styling
            div.className = "flex items-start gap-3 py-1 border-b border-white/[0.02] last:border-0 hover:bg-white/[0.02] transition-colors rounded px-2";
            div.innerHTML = `
                <span class="text-slate-500 shrink-0 font-mono">[${time}]</span> 
                <span class="text-indigo-200/90 break-words font-mono">${msg.data}</span>
            `;
            
            // Remove initial placeholder
            if (logContainer.children.length > 0 && logContainer.children[0].classList.contains('italic')) {
                logContainer.innerHTML = '';
            }
            
            logContainer.appendChild(div);
            // Smooth Auto scroll
            logContainer.scrollTo({
                top: logContainer.scrollHeight,
                behavior: 'smooth'
            });
            
            // Limit log entries
            if (logContainer.children.length > 60) {
                logContainer.removeChild(logContainer.firstChild);
            }
        }
    };

    ws.onclose = () => {
        if (statusContainer) statusContainer.className = "flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 transition-all duration-500";
        if (statusDot) statusDot.className = "w-2 h-2 rounded-full bg-red-500 animate-pulse";
        if (statusText) {
            statusText.className = "text-xs font-semibold uppercase tracking-wider text-red-400";
            statusText.innerText = "Reconnecting...";
        }
        setTimeout(connectWebSocket, 2000);
    };
}

connectWebSocket();
