"""Creates a release and uploads st-opening-scenes.zip. Dev-only helper.

    python test/make_release.py <token> <version> [notes-file]
"""

import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "HakaiGod420/st-opening-scenes"
TOKEN = sys.argv[1]
VERSION = sys.argv[2] if len(sys.argv) > 2 else "1.1.0"
NOTES_FILE = sys.argv[3] if len(sys.argv) > 3 else None
ZIP = os.path.join(ROOT, "st-opening-scenes.zip")

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "hermes",
    "Content-Type": "application/json",
}

DEFAULT_BODY = """**Install**
- Unzip `st-opening-scenes.zip` into `SillyTavern/public/scripts/extensions/third-party/`, or
- *Extensions -> Install Extension* with `https://github.com/HakaiGod420/st-opening-scenes`

**What it does**
Writes opening messages that fit a character card: pick a vibe, get 1-4 takes, then keep one as the first message,
an alternate greeting, or a new chat message. Reads the card's own description/personality/scenario/example dialogue
and is told to avoid the existing greeting.

Open it from the wand menu, the Extensions drawer, or the feather button in the character edit panel.
Close with the X or `Esc`. Also available as `/opening` with `vibe`, `length`, `pov`, `count`, `direction`, `insert`.
"""

BODY = open(NOTES_FILE, encoding="utf-8").read() if NOTES_FILE else DEFAULT_BODY


def api(url, data=None, method="GET", headers=None, raw=False):
    request = urllib.request.Request(url, data=data, method=method, headers=headers or HEADERS)
    with urllib.request.urlopen(request) as response:
        payload = response.read()
        return payload if raw else json.loads(payload)


# 1. release
release = api(
    f"https://api.github.com/repos/{REPO}/releases",
    data=json.dumps({
        "tag_name": f"v{VERSION}",
        "target_commitish": "main",
        "name": f"Opening Scenes {VERSION}",
        "body": BODY,
        "draft": False,
        "prerelease": False,
    }).encode(),
    method="POST",
)
print("release:", release["html_url"])

# 2. asset upload
with open(ZIP, "rb") as handle:
    blob = handle.read()

upload_headers = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "hermes",
    "Content-Type": "application/zip",
}
asset = api(
    f"https://uploads.github.com/repos/{REPO}/releases/{release['id']}/assets?name=st-opening-scenes.zip",
    data=blob,
    method="POST",
    headers=upload_headers,
)
print("asset:", asset["name"], asset["size"], "bytes")
print("download:", asset["browser_download_url"])
print("local zip:", len(blob), "bytes")
