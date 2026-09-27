"""Local preview server that never lets the browser cache.

Plain `python3 -m http.server` sends no Cache-Control, so Safari and Chrome
cache ES modules heuristically and keep serving an old world.js or vendor
bundle after an edit. Usage: python3 tools/serve.py [port]  (default 4173)
"""
import functools
import http.server
import os
import sys


class NoStore(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


root = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
port = int(sys.argv[1]) if len(sys.argv) > 1 else 4173
handler = functools.partial(NoStore, directory=root)
print(f"Serving {os.path.abspath(root)} on http://127.0.0.1:{port}/ (no-store)")
http.server.ThreadingHTTPServer(("127.0.0.1", port), handler).serve_forever()
