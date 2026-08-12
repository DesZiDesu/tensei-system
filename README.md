# Tensei System

A responsive, persistent Mushoku Tensei role-play interface for SillyTavern.

## Features

- Animated magic-interface boot sequence.
- Selectable, locally resized per-chat profile portrait with animated magic-circle frame.
- Active SillyTavern persona header with title, race, guild, and party identity.
- Canonical day phase, world time, level, EXP requirement, and zone classification.
- Formal segmented health, mana, and stamina instruments.
- Smooth pointer and touch tab transitions.
- Desktop side drawer and phone-specific full-screen layout.
- Status, Inventory, Skills, Quests, Rank, and World Map tabs.
- Per-chat state stored in SillyTavern chat metadata.
- Current state injected into role-play prompts for continuity.
- Optional automatic AI synchronization after replies.
- Manual editing and immediate actions from the interface.
- Interactive original SVG world atlas with canonical Mushoku Tensei geography.
- Map zoom, pan, pinch gestures, current-position pulse, discoveries, and custom pins.
- English/Thai interface and generated role-play actions.
- Hidden, visible, and draft-only action delivery modes.
- User-configurable accent color, glass opacity, glow strength, and information density.

## API and privacy

Tensei System uses SillyTavern's active API/provider and selected model through
SillyTavern's extension context. It does not ask for, read, copy, store, or send
the user's API key anywhere. Automatic state synchronization is an additional
quiet generation and may therefore consume tokens or provider credits.

## Install

1. Open **Extensions** in SillyTavern.
2. Select **Install extension**.
3. Paste `https://github.com/DesZiDesu/tensei-system`.
4. Reload SillyTavern after installation if prompted.

Open the system from **Extensions → Tensei System** or the wand menu beside the
chat input. Use **Sync latest turn** to test the connected model manually.

## Current scope

Version 0.4.0 introduces the black-and-umber fantasy glass interface, bilingual
actions, and configurable action delivery. Existing chats migrate forward without
resetting their saved state.
Deeper settlement maps, equipment rules, combat calculations, relationships, and
factions can be layered on in later milestones.

## Changelog

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
