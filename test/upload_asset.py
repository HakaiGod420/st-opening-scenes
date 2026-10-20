"""Uploads st-opening-scenes.zip to an existing release (replacing any existing asset)."""

import json
import os
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPO = "HakaiGod420/st-opening-scenes"
TOKEN = sys.argv[1]
VERSION = sys.argv[2]
ZIP = os.path.join(ROOT, "st-opening-scenes.zip")

AUTH = {
    "Authorization": f"Bearer {TOKEN}",
    "Accept": "application/vnd.github+json",
    "User-Agent": "hermes",
}


def call(url, data=None, method="GET", headers=None):
    request = urllib.request.Request(url, data=data, method=method, headers=headers or AUTH)
    with urllib.request.urlopen(request) as response:
        body = response.read()
        return json.loads(body) if body else {}


release = call(f"https://api.github.com/repos/{REPO}/releases/tags/v{VERSION}")
print("release:", release["html_url"], "id", release["id"])

for asset in release.get("assets", []):
    call(f"https://api.github.com/repos/{REPO}/releases/assets/{asset['id']}", method="DELETE")
    print("removed old asset:", asset["name"])

with open(ZIP, "rb") as handle:
    blob = handle.read()

asset = call(
    f"https://uploads.github.com/repos/{REPO}/releases/{release['id']}/assets?name=st-opening-scenes.zip",
    data=blob,
    method="POST",
    headers={**AUTH, "Content-Type": "application/zip"},
)

print("uploaded:", asset["name"], asset["size"], "bytes")
print("local:", len(blob), "bytes")
print("match:", asset["size"] == len(blob))
