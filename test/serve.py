"""Static server for the extension harness, plus a stub for the one write
endpoint the extension calls. Dev-only."""

import http.server
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
EXT_ROOT = os.path.dirname(ROOT)
MIRROR = os.path.join(ROOT, 'mirror')
EXTENSION_DIR = os.path.join(MIRROR, 'scripts', 'extensions', 'third-party', 'st-opening-scenes')
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8765

FILES = ['index.js', 'style.css', 'modal.html', 'settings.html', 'manifest.json']


def sync_mirror():
    """Rebuild the mirror from the real extension sources."""
    shutil.rmtree(EXTENSION_DIR, ignore_errors=True)
    os.makedirs(EXTENSION_DIR, exist_ok=True)

    for name in FILES:
        shutil.copy2(os.path.join(EXT_ROOT, name), os.path.join(EXTENSION_DIR, name))

    shutil.copytree(os.path.join(EXT_ROOT, 'src'), os.path.join(EXTENSION_DIR, 'src'))

    stubs = os.path.join(ROOT, 'stubs')
    targets = {
        'extensions.js': os.path.join(MIRROR, 'scripts', 'extensions.js'),
        'script.js': os.path.join(MIRROR, 'script.js'),
        'popup.js': os.path.join(MIRROR, 'scripts', 'popup.js'),
    }
    for name, target in targets.items():
        shutil.copy2(os.path.join(stubs, name), target)

    shutil.copytree(
        os.path.join(stubs, 'slash-commands'),
        os.path.join(MIRROR, 'scripts', 'slash-commands'),
        dirs_exist_ok=True,
    )


class Handler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        '.js': 'text/javascript',
        '.mjs': 'text/javascript',
        '.css': 'text/css',
        '.html': 'text/html',
        '.json': 'application/json',
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # The harness gets reloaded constantly; never let the browser cache modules.
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def do_POST(self):
        length = int(self.headers.get('Content-Length') or 0)
        body = self.rfile.read(length)

        if self.path.startswith('/api/characters/merge-attributes'):
            with open(os.path.join(ROOT, 'last_merge.jsonl'), 'ab') as handle:
                handle.write(body + b'\n')
            self._json(200, {'ok': True})
            return

        self._json(404, {'error': 'not found'})

    def do_PUT(self):
        self.do_POST()

    def _json(self, status, payload):
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass


if __name__ == '__main__':
    sync_mirror()
    print(f'harness on http://127.0.0.1:{PORT}/harness.html')
    http.server.ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()
