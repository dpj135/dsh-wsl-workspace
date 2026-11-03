#!/usr/bin/env python3
"""Terminate only our backend process group when its Windows pipe lease ends."""
import os
import signal
import subprocess
import sys
import threading

stop = threading.Event()
signal.signal(signal.SIGTERM, lambda *_: stop.set())
signal.signal(signal.SIGINT, lambda *_: stop.set())
child = subprocess.Popen(sys.argv[1:], stdin=subprocess.DEVNULL, start_new_session=True)

def lease():
    try:
        while sys.stdin.buffer.read(1):
            pass
    finally:
        stop.set()

threading.Thread(target=lease, daemon=True).start()
try:
    while child.poll() is None and not stop.wait(0.2):
        pass
finally:
    try:
        os.killpg(child.pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        child.wait(timeout=8)
    except subprocess.TimeoutExpired:
        pass
    # Descendants that deliberately create a new session are outside this group.
    try:
        os.killpg(child.pid, signal.SIGKILL)
    except ProcessLookupError:
        pass
    child.wait()
sys.exit(child.returncode if child.returncode >= 0 else 0)
