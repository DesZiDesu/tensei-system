# Tensei System

A responsive, persistent Mushoku Tensei role-play interface for SillyTavern.

## Features

- Animated magic-interface boot sequence.
- Selectable full-aspect portrait with separate desktop/phone X, Y, and zoom framing.
- Active SillyTavern persona header with title, race, guild, and party identity.
- Canonical day phase, world time, level, EXP requirement, and zone classification.
- Formal segmented health, mana, and stamina instruments.
- Smooth pointer and touch tab transitions.
- Desktop side drawer and phone-specific full-screen layout.
- Status, Scene, Inventory, Skill Storage, Techniques, Quests, Rank, World Map, NPC Codex, Mailbox, and Music tabs.
- Per-chat state stored in SillyTavern chat metadata.
- Current state injected into role-play prompts for continuity.
- Zero-extra-call state tracking from the normal AI reply.
- Elemental magic and North/Water/Sword God Style proficiency meters plus extensible techniques.
- Per-chat NPC contacts and physical letters with unread state, animated reading, reply, and delete actions.
- AI/manual per-chat NPC dossiers with relationship meters, location, family, stats, abilities, custom meters, and private diary entries.
- Locally stored NPC portraits with independent desktop and phone framing, including iPhone safe-area and touch controls.
- Per-chat music playlists with MP3/audio files stored locally on each device.
- Manual editing and immediate actions from the interface.
- Interactive original SVG world atlas with canonical Mushoku Tensei geography.
- Map zoom, pan, pinch gestures, current-position pulse, discoveries, and custom pins.
- English/Thai interface and generated role-play actions.
- Hidden, visible, and draft-only action delivery modes.
- Scene tracking for day name/counter, time/phase, place, exact location, position, weather, and temperature.
- Hybrid SVG floor maps with AI-assisted room discovery, multiple floors, connections, current-room markers, drag positioning, manual correction, and layout locks.
- Named proficiency ranks alongside percentage progress for every magic discipline, sword school, and technique.
- AI-created and manually managed custom Magic/Sword proficiencies with a semantic icon preset library.
- Evidence-based full-system updates with EXP awards, automatic level rollover, and granular NPC relationship/stat changes.
- Optional floating Full/Compact activity capsule for waiting, patch checks, updates, no-change replies, disabled tracking, and errors.
- User-configurable accent color, glass opacity, glow strength, and information density.

## API and privacy

Tensei System uses SillyTavern's active API/provider and selected model through
SillyTavern's extension context. It does not ask for, read, copy, store, or send
the user's API key anywhere. Automatic tracking is parsed from the normal role-play
reply and adds no background request. Manual Sync is the only state feature that
uses a separate quiet generation.

## Install

1. Open **Extensions** in SillyTavern.
2. Select **Install extension**.
3. Paste `https://github.com/DesZiDesu/tensei-system`.
4. Reload SillyTavern after installation if prompted.

Open the system from **Extensions → Tensei System** or the wand menu beside the
chat input. Use **Sync latest turn** to test the connected model manually.

## Current scope

Version 1.1.0 evaluates every relevant subsystem on each normal reply while preserving zero-extra-call
automatic tracking. A fresh chat still does not inject, analyze,
or create extension state for the character's First Message; tracking starts only
after the user sends the first reply. NPC Codex and Mailbox remain separate tabs,
connected only through optional NPC/Contact links and physical letters.

## Changelog

### 1.2.0 — MT chat + NPC Management + cache-safe loading

- Approved rectangular Header/Dialogue/Narrative design: per-character colors, light parchment dialogue, neutral narrative, no gaps between blocks, and one header per continuous speaker. Ordinary legacy prose is not guessed or converted.
- Square 1:1 portraits with a double frame, 32–128 px size, and 70–100% dialogue width. Without an available image there is no placeholder or empty frame. Main-character card images are used when available; uploaded portraits stay on this device, not in AI prompts.
- Open **Extensions → Tensei System → NPC Management** or its shortcut in the existing NPC Codex. Six editable sections cover identity, story, relationships, stats, skills/notes, and image/color. Search, create, edit, delete and AI completion share the existing per-chat `npcs` registry; previous Codex data is retained.
- The normal AI response uses `<tensei_chat>` with `npcs` and `turns`, plus the existing `tensei_patch` for other state. No additional AI request is made for automatic NPC collection. The system starts after the first user reply, as before.
- Every new AI profile must have all 22 textual fields, six relationship values, eight numeric stats plus rank, and explicit abilities/customMeters/diary arrays (empty arrays are valid when there are no entries). Placeholder strings and incomplete nested entries fail validation. Fictional details/game stats are requested consistently with the story, not represented as canonical source facts.
- If a model omits fields or only supplies a speaker name, the NPC is still visible in Management as **pending**, with the exact missing fields. It is not falsely marked complete; the next main reply is asked to complete it. Existing filled/manual values are protected during completion. A model cannot be forced to comply: retry or use **ให้ AI เติมช่องว่าง** if needed. That explicit button uses one extra request, previews the result, and requires Save.
- The HTML transcript keeps the chat protocol for replay/swipes; rendering uses text nodes, never executes AI-supplied markup. Per-chat isolation, duplicate prevention, and stale-context checks protect NPC saves and portrait uploads. Deleting a dossier does not delete old chat messages or letters.

#### Updating on iOS Safari

Press **Update** for the extension in SillyTavern, wait for the server update to finish, then refresh/reopen SillyTavern normally. No Safari cache clearing is needed for subsequent releases using this loader. `manifest.json` now selects a new stable `loader.js` entry; it loads runtime, every local module, all stylesheets, and settings with a fresh query token on every page load. Settings also use `cache: no-store`; CSS has no unversioned `@import`.

Reloading alone does **not** update extension files on the server. A stale server/proxy/service worker that ignores query strings is outside the loader's control. Keep `loader.js` stable in future releases, put feature changes in runtime/modules, and preserve versioned loading for all new local assets.

#### Verification

`npm test` runs protocol and runtime-state regressions without dependencies or AI calls. `npm run test:browser` runs the optional Playwright mock-host suite (install Playwright and Chromium first, or provide `CHROMIUM_PATH`). This release's browser download was blocked by network timeouts in the development environment, so only the Node suite was executed there; real iOS Safari/provider testing remains necessary.

### 1.1.0

- Added a comprehensive per-reply update checklist for progression, proficiency, NPCs, Scene, maps, inventory, quests, and Mailbox.
- Added defined EXP award guidance and automatic player level rollover with a growing next-level requirement.
- Added granular NPC relationship and stat patch operations; substantive interactions can now adjust the relevant meters without changing unrelated values.
- Exposed complete NPC stats and custom meters to tracking; unrevealed combat stats now display as a dash instead of a misleading zero.
- Added AI/manual custom Magic and Sword proficiencies with semantic automatic icon selection and a 32-icon preset library.
- Rebuilt the proficiency interface with mastery overview, responsive cards, radial progress, clearer rank hierarchy, and integrated custom entries.

### 1.0.0

- Added responsive SVG overhead maps for mansions, dungeons, ships, towns, and other local structures.
- Added multiple floor views, rooms, doors/passages, discovered-area visibility, and a current-room marker.
- Added zero-extra-call AI patch operations for maps, floors, rooms, connections, and player movement.
- Added manual creation and correction tools, including draggable room positioning and precise geometry fields.
- Added per-room and whole-map locks that reject automatic layout edits while keeping manual correction available.
- Kept prompt size controlled by sending full geometry only for the active floor and compact summaries for other floors.

### 0.9.0

- Added a Scene tab immediately after Status with time, day name, day counter, phase, region, place, location detail, position, weather, and temperature.
- Added validated Scene patch paths without adding a background AI request.
- Split Skill Storage and Techniques into independent tabs.
- Exposed the complete stored user skill collection with manual add/delete controls.
- Added derived None through God proficiency ranks alongside percentage bars.
- Forced Inventory Use actions through Hidden delivery without creating a visible user bubble or disturbing the composer draft.
- Kept story tracking content-neutral with no extension-level NSFW filter; model/provider restrictions still apply.

### 0.8.0

- Added a smooth floating activity capsule with Full, Compact, and Off preferences.
- Reports Waiting for AI, Checking reply, State updated, No state changes, Tracking off, and failure states.
- Keeps the current composer draft visible and untouched during Hidden actions.
- Makes Visible mode send its own user bubble immediately while preserving any existing unsent draft.
- Keeps Draft mode local until the user explicitly presses Send, so it uses no quota before then.
- Clarified Action delivery descriptions in both Extension Settings and the in-panel appearance menu.
- Kept NPC Codex and Mailbox as independent tabs connected only through optional NPC/Contact links and letters.
- Preserved First Message gating and one-call normal-turn tracking.

### 0.7.0

- Added a dedicated per-chat NPC Codex populated by validated AI patches or manual forms.
- Added relationship, affection, trust, loyalty, fear, corruption, lust, location, faction, alignment, family, partner, children, and notes fields.
- Added core NPC stats, unlimited abilities, proficiency, custom meters, and timestamped diary entries.
- Linked NPC dossiers bidirectionally with Mailbox Contacts while allowing NPC-only characters.
- Migrated existing Contacts into lightweight NPC dossiers without deleting letters.
- Added per-NPC portraits stored in local IndexedDB, never AI prompts or chat metadata.
- Added separate desktop and mobile X/Y/zoom framing for every NPC portrait.
- Added responsive iOS layouts, safe-area-aware navigation, 44px touch targets, and local-file recovery messaging.
- Kept automatic NPC/state tracking inside the normal reply with zero background AI calls.
- Limited prompt cost with a compact NPC index and only 16 recently updated detailed dossiers.

### 0.6.0

- Removed automatic quiet generations after user and AI messages.
- Added zero-extra-call state patches carried by the normal AI reply.
- Added a strict path and collection allowlist before any AI patch can modify chat state.
- Protected portraits, portrait framing, music, UI settings, and map pins from AI patches.
- Stripped patch metadata before the AI message is rendered or saved to chat history.
- Delayed prompt injection, state creation, and tracking until the user replies to the First Message.
- Kept Manual Sync as an optional one-request fallback and reduced its response budget from 2,200 to 900 tokens.
- Reduced prompt state size by omitting local-only data, map pins, descriptions, letter bodies, and all but the five latest letter headers.

### 0.5.0

- Added queued state analysis after user submissions and after AI responses, with per-message cursors to prevent duplicate sync.
- Added uncropped portrait storage and independent desktop/mobile positioning and zoom controls.
- Added nine magic discipline proficiency meters and the three sword-school meters.
- Added an extensible technique list with independent proficiency values.
- Added per-chat NPC contacts and incoming/outgoing physical letters.
- Added unread/read/sent states, animated letter opening, reply composition, clearing, and deletion.
- Added per-chat playlists with local-device MP3/audio storage, playback, seek, shuffle, repeat, and track controls.
- Kept portraits and audio files out of AI prompts; only structured story state is synchronized.

### 0.4.0

- Rebuilt every tab around a compact, formal fantasy information system.
- Added a dedicated mobile composition with bottom navigation and touch-sized controls.
- Added live accent, glass, glow, and density controls in the interface and settings.
- Added English and Thai UI/action language selection.
- Added hidden one-turn actions that do not create a user chat bubble.
- Added visible immediate-send and draft-only action modes.
- Replaced circular vitals with legible segmented meter bars.
- Restyled the interactive atlas as a dark parchment command map.
- Preserved all v0.3.0 chat state, portrait, discoveries, and map pins.

## License

[MIT](LICENSE)
