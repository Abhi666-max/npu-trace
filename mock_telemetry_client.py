import asyncio
import websockets
import json
import random
import time

async def telemetry_client():
    uri = "ws://localhost:8000/ws/telemetry"
    
    # State variables
    npu_base = 20.0
    temp_base = 45.0
    latency_base = 12.0
    battery_base = 1200
    
    stress_mode = False
    stress_end_time = 0
    optimized = False
    
    while True:
        try:
            async with websockets.connect(uri) as websocket:
                print("Connected to telemetry server")
                
                async def receiver():
                    nonlocal stress_mode, stress_end_time
                    try:
                        while True:
                            data = await websocket.recv()
                            msg = json.loads(data)
                            if msg.get("type") == "command":
                                if msg.get("data") == "STRESS_TEST":
                                    print("Received STRESS_TEST command! Spiking telemetry...")
                                    stress_mode = True
                                    stress_end_time = time.time() + 10 # Stress test for 10 seconds
                                elif msg.get("data") == "OPTIMIZE_MODEL":
                                    print("Received OPTIMIZE_MODEL command! Lowering base latency and temp...")
                                    optimized = True
                                    npu_base = 10.0
                                    temp_base = 30.0
                                    latency_base = 4.0
                                    battery_base = 800
                                elif msg.get("data") == "SET_PROFILE_ECO":
                                    print("Switching to ECO profile...")
                                    npu_base = 10.0
                                    temp_base = 35.0
                                    latency_base = 45.0
                                    battery_base = 500
                                elif msg.get("data") == "SET_PROFILE_BALANCED":
                                    print("Switching to BALANCED profile...")
                                    npu_base = 20.0
                                    temp_base = 45.0
                                    latency_base = 12.0
                                    battery_base = 1200
                                elif msg.get("data") == "SET_PROFILE_PERFORMANCE":
                                    print("Switching to PERFORMANCE profile...")
                                    npu_base = 80.0
                                    temp_base = 75.0
                                    latency_base = 2.0
                                    battery_base = 3500
                    except Exception as e:
                        print(f"Receiver error: {e}")
                
                asyncio.create_task(receiver())
                
                while True:
                    current_time = time.time()
                    if stress_mode and current_time > stress_end_time:
                        stress_mode = False
                        print("Stress test ended, returning to normal.")
                    
                    if stress_mode:
                        # Spiked metrics
                        npu_load = min(100.0, 95.0 + random.uniform(-2, 5))
                        temp = min(100.0, 82.0 + random.uniform(-1, 4)) # Over 80 to trigger anomaly
                        latency = 45.0 + random.uniform(-5, 15)
                        battery = battery_base + random.randint(300, 500)
                    else:
                        # Normal metrics
                        npu_load = max(0.0, min(100.0, npu_base + random.uniform(-5, 15)))
                        temp = max(30.0, min(100.0, temp_base + random.uniform(-2, 5)))
                        latency = max(2.0, latency_base + random.uniform(-1, 4))
                        battery = battery_base + random.randint(-50, 50)
                    
                    payload = {
                        "timestamp": int(current_time * 1000),
                        "npu_load_pct": round(npu_load, 1),
                        "token_latency_ms": round(latency, 1),
                        "chip_temp_celsius": round(temp, 1),
                        "battery_drain_ma": battery
                    }
                    
                    await websocket.send(json.dumps(payload))
                    await asyncio.sleep(1/60)  # 60fps
                    
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed, retrying in 2s...")
            await asyncio.sleep(2)
        except Exception as e:
            print(f"Connection failed: {e}, retrying in 2s...")
            await asyncio.sleep(2)

if __name__ == "__main__":
    asyncio.run(telemetry_client())
