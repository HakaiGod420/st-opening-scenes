# Opening Scenes

A SillyTavern extension for writing **first messages** — the opening scenario of a chat — for a character card.
Pick a vibe, get a few takes, keep the one that works.

Built against SillyTavern **1.19.0** (verified imports and API surface against a running instance).

## What it does

- Reads the character's own card (description, personality, scenario, example dialogue, tags, author notes).
- Writes new openings in that character's voice, at the length and perspective you choose.
- Explicitly avoids the card's existing first message, so the new one isn't a rephrasing.
- Lets you apply a take three ways: **replace the first message**, **add as an alternate greeting**, or **insert it into the open chat**.
- Everything is editable before it lands on the card.

## Install

**Manual (recommended for a modified card library):**

1. Download `st-opening-scenes.zip` and unzip it.
2. Drop the folder into `SillyTavern/public/scripts/extensions/third-party/st-opening-scenes/`.
3. Reload SillyTavern (the page, not just the chat).

**From a git URL:** push this folder to a repo, then use *Extensions → Install Extension* in SillyTavern with the repo URL.

## Usage

Open it from the **wand menu** (feather icon, next to the chat input) or from *Extensions → Opening Scenes → Open generator*.

1. The current character is preselected — click the name to switch to any other card.
2. Pick a **vibe** (auto, intimate, conflict, warm, mystery, action, comedy, angst, spicy).
3. Optionally open **Fine-tune** for length, narration perspective, number of variants and free-form direction
   ("start in the rain, mid-argument with someone else, keep it under 100 words").
4. Generate. Each take gets a title, word count and its own action row.

### Slash command

```
/opening                          # one opening for the open chat's character
/opening vibe=conflict count=3    # three takes, returned as text
/opening Aria length=short        # a named character
/opening insert=true              # generate and drop it straight into the chat
```

Named arguments: `vibe`, `length`, `pov`, `count`, `direction`, `insert`.

## How it writes to your cards

- Card updates go through SillyTavern's own `/api/characters/merge-attributes` endpoint, so the card is deep-merged
  and validated as a V2 card — the rest of the card is never rebuilt from scratch.
- V2 cards are written under `data.*`, V1 cards at the root, matching how SillyTavern reads them back.
- Replacing the first message also refreshes the greeting in the open chat, but **only** when that chat is untouched
  (just the greeting). If you've already started roleplaying, the card is updated and the chat is left alone.
- Inserting into the chat only works when the open chat belongs to the character you generated for.

## Which model call is used

- Generating **for the character you're currently in**: `generateQuietPrompt`, so your live card, world info and
  persona stay in context.
- Generating **for any other character**: `generateRaw` with a fully self-contained prompt, because a quiet prompt
  would be written *through* the currently selected character's card.

Both use your active connection and its sampling presets. No extra API key, no separate server.

## Development

The extension ships with a harness that boots it against stubbed SillyTavern internals — no SillyTavern needed.

```bash
cd test
python serve.py          # -> http://127.0.0.1:8765/harness.html
```

`serve.py` rebuilds `test/mirror/` from the real sources on every start, so edits show up on reload.
The harness fakes `/api/characters/merge-attributes` and appends every payload to `test/last_merge.jsonl`.

Parser and prompt tests (plain node, no dependencies):

```bash
node test/parse.test.mjs
```

### Layout

```
manifest.json       SillyTavern extension manifest
index.js            boot, wand menu, settings panel, /opening command
settings.html       drawer panel in Extensions settings
modal.html          generator markup
style.css           all UI styling, scoped to .os-popup / .os-app
src/prompt.js       vibe/length/pov definitions, prompt builder, output parser
src/generate.js     quiet-prompt vs raw-prompt generation
src/apply.js        card writes, chat insert, clipboard
src/modal.js        modal state and UI
src/store.js        persisted settings
```
