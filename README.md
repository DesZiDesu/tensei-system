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
- Status, Inventory, Magic & Technique, Quests, Rank, World Map, NPC Codex, Mailbox, and Music tabs.
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

Version 0.8.0 makes zero-call tracking visible through an optional floating status
capsule and clarifies action delivery. A fresh chat still does not inject, analyze,
or create extension state for the character's First Message; tracking starts only
after the user sends the first reply. NPC Codex and Mailbox remain separate tabs,
connected only through optional NPC/Contact links and physical letters.

## Changelog

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
