#!/usr/bin/env python3
"""Spin up the static server briefly, fetch key assets, assert status, stop.

Temporary verification helper for the FEAT-002 preview.
"""
import http.server
import socketserver
import threading
import urllib.request
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
os.chdir(ROOT)
PORT = 8099

Handler = http.server.SimpleHTTPRequestHandler


class Quiet(Handler):
    def log_message(self, *a):
        pass


httpd = socketserver.TCPServer(("127.0.0.1", PORT), Quiet)
t = threading.Thread(target=httpd.serve_forever, daemon=True)
t.start()

paths = [
    "/", "/index.html", "/css/styles.css", "/js/app.js", "/js/zones.js",
    "/js/time.js", "/js/i18n.js", "/js/facts.js", "/js/map.js",
    "/js/profiles.js", "/js/share.js", "/manifest.webmanifest", "/sw.js",
    "/icons/icon-192.png", "/icons/icon-512.png",
]

ok = True
for p in paths:
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{PORT}{p}", timeout=5) as r:
            code = r.getcode()
            print(f"{code}  {p}")
            if code != 200:
                ok = False
    except Exception as e:
        print(f"ERR {p}: {e}")
        ok = False

# Check the HTML references the expected assets.
with urllib.request.urlopen(f"http://127.0.0.1:{PORT}/", timeout=5) as r:
    html = r.read().decode("utf-8")
for needle in ["js/app.js", "css/styles.css", "manifest.webmanifest",
               "screen-onboarding", "screen-zone", "screen-end"]:
    present = needle in html
    print(f"{'has' if present else 'MISSING'}: {needle}")
    if not present:
        ok = False

httpd.shutdown()
sys.exit(0 if ok else 1)
