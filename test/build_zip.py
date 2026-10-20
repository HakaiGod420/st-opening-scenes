"""Builds the installable zip (extension files only, no dev harness)."""

import os
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'st-opening-scenes.zip')

FILES = ['manifest.json', 'index.js', 'style.css', 'modal.html', 'settings.html', 'README.md', 'LICENSE']
FILES += ['src/' + name for name in sorted(os.listdir(os.path.join(ROOT, 'src')))]

with zipfile.ZipFile(OUT, 'w', zipfile.ZIP_DEFLATED) as archive:
    for relative in FILES:
        archive.write(os.path.join(ROOT, relative), 'st-opening-scenes/' + relative)

    screenshot = os.path.join(ROOT, 'docs', 'screenshot-desktop.png')
    if os.path.exists(screenshot):
        archive.write(screenshot, 'st-opening-scenes/docs/screenshot-desktop.png')

print(OUT, os.path.getsize(OUT), 'bytes')
with zipfile.ZipFile(OUT) as archive:
    for name in archive.namelist():
        print(' ', name)
