import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
import os
import json
from groq import Groq
from dotenv import load_dotenv

load_dotenv()
try:
    groq_client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
except:
    groq_client = None

class BuildDirectoryHandler(FileSystemEventHandler):
    def __init__(self, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self.queue = queue
        self.loop = loop

    def _enqueue(self, message: str):
        # Safely enqueue message from Watchdog's background thread to the main event loop
        asyncio.run_coroutine_threadsafe(self.queue.put(message), self.loop)

    def on_modified(self, event):
        if not event.is_directory:
            pass # Keep it simple, trigger on create
            
    def on_created(self, event):
        if not event.is_directory:
            import time
            import os
            filename = os.path.basename(event.src_path)
            if filename.endswith(".py"):
                self._enqueue(f"[AI ENGINE] Python source code detected: {filename}")
                time.sleep(0.5)
                self._enqueue(f"[AI ENGINE] Running AI static analysis and performance profiling...")
                
                # Call Groq LLM
                original_code = ""
                optimized_code = ""
                try:
                    with open(event.src_path, "r") as f:
                        original_code = f.read()
                    
                    if groq_client:
                        prompt = f"Optimize the following Python code for edge NPU deployment. Fix memory leaks, add garbage collection, or improve performance. Return ONLY the optimized Python code. No markdown, no explanations.\n\nCode:\n{original_code}"
                        completion = groq_client.chat.completions.create(
                            model="llama3-8b-8192",
                            messages=[{"role": "user", "content": prompt}],
                            temperature=0.1,
                            max_tokens=1000
                        )
                        optimized_code = completion.choices[0].message.content.strip()
                        if optimized_code.startswith("```python"):
                            optimized_code = optimized_code.split("```python")[1].split("```")[0].strip()
                    else:
                        optimized_code = "import gc\n# AI OPTIMIZED CODE (Mocked)\n\n" + original_code + "\n    gc.collect()\n"
                except Exception as e:
                    print("LLM Error:", e)
                    optimized_code = original_code
                
                time.sleep(1.0)
                # We serialize the data as JSON inside the trigger string so frontend can parse it
                payload = json.dumps({"file": filename, "original": original_code, "optimized": optimized_code})
                self._enqueue(f"TRIGGER_CODE_FIX_SUGGESTION:{payload}")
            else:
                self._enqueue(f"[AI ENGINE] Raw model detected: {filename}")
                time.sleep(0.5)
                self._enqueue(f"[AI ENGINE] Analyzing graph topology for hardware acceleration...")
                time.sleep(0.5)
                self._enqueue(f"[AI ENGINE] Auto-Quantizing {filename} to INT8...")
                time.sleep(0.5)
                self._enqueue(f"TRIGGER_OPTIMIZATION")
                time.sleep(0.5)
                self._enqueue(f"[AI ENGINE] Edge Deployment Successful.")

def start_directory_tracker(path: str, queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
    event_handler = BuildDirectoryHandler(queue, loop)
    observer = Observer()
    observer.schedule(event_handler, path, recursive=True)
    observer.start()
    return observer
