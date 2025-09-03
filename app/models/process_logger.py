"""
Process Logger Model
Provides functionality for capturing and storing process logs
"""

import os
import threading
from collections import deque
from datetime import datetime


class ProcessLogger:
    """Helper class to capture and store process logs"""
    
    def __init__(self, pid, log_file_path):
        self.pid = pid
        self.log_file_path = log_file_path
        self.log_queue = deque(maxlen=1000)  # Keep last 1000 lines in memory
        self.lock = threading.Lock()
        
    def append_log(self, line):
        with self.lock:
            timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
            log_entry = f"[{timestamp}] {line}"
            self.log_queue.append(log_entry)
            
            # Also write to file
            try:
                with open(self.log_file_path, 'a', encoding='utf-8') as f:
                    f.write(log_entry + '\n')
            except Exception as e:
                print(f"Error writing to log file: {e}")