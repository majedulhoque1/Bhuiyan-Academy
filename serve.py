#!/usr/bin/env python3
"""Local preview server that mimics Vercel cleanUrls (/about -> about.html).

    python serve.py [port]        # default 8080
"""
import os
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and os.path.exists(p + ".html"):
            return p + ".html"
        return p

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    print("Serving on http://localhost:%d" % port)
    ThreadingHTTPServer(("", port), Handler).serve_forever()
