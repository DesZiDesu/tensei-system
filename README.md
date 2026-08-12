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
- Status, Inventory, Magic & Technique, Quests, Rank, World Map, Mailbox, and Music tabs.
- Per-chat state stored in SillyTavern chat metadata.
- Current state injected into role-play prompts for continuity.
- Zero-extra-call state tracking from the normal AI reply.
- Elemental magic and North/Water/Sword God Style proficiency meters plus extensible techniques.
- Per-chat NPC contacts and physical letters with unread state, animated reading, reply, and delete actions.
- Per-chat music playlists with MP3/audio files stored locally on each device.
- Manual editing and immediate actions from the interface.
- Interactive original SVG world atlas with canonical Mushoku Tensei geography.
- Map zoom, pan, pinch gestures, current-position pulse, discoveries, and custom pins.
- English/Thai interface and generated role-play actions.
- Hidden, visible, and draft-only action delivery modes.
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

Version 0.6.0 replaces dual background synchronization with an inline, validated
state patch taken from the normal role-play reply. A fresh chat does not inject,
analyze, or create extension state for the character's First Message; tracking
starts only after the user sends the first reply. Existing chats migrate without
resetting their saved state.
Deeper settlement maps, equipment rules, combat calculations, relationships, and
factions can be layered on in later milestones.

## Changelog

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
