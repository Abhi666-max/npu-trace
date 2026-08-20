import asyncio
import websockets

async def test_ws():
    try:
        async with websockets.connect("wss://npu-trace-backend.onrender.com/ws/telemetry") as websocket:
            print("Connected successfully!")
            await websocket.close()
    except Exception as e:
        print(f"Connection failed: {e}")

asyncio.run(test_ws())
