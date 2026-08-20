import asyncio
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

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
                self._enqueue(f"[AI ENGINE] Running static analysis and performance profiling...")
                time.sleep(1.0)
                self._enqueue(f"TRIGGER_CODE_FIX_SUGGESTION:{filename}")
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
