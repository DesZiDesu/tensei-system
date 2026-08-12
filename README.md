# Tensei System

A responsive, persistent Mushoku Tensei role-play interface for SillyTavern.

## Features

- Animated magic-interface boot sequence.
- Selectable, locally resized per-chat profile portrait with animated magic-circle frame.
- Active SillyTavern persona header with title, race, guild, and party identity.
- Canonical day phase, world time, level, EXP requirement, and zone classification.
- Radial health, mana, and stamina instruments.
- Smooth pointer and touch tab transitions.
- Desktop side drawer and phone-specific full-screen layout.
- Status, Inventory, Skills, Quests, Rank, and World Map tabs.
- Per-chat state stored in SillyTavern chat metadata.
- Current state injected into role-play prompts for continuity.
- Optional automatic AI synchronization after replies.
- Manual editing and immediate actions from the interface.
- Interactive original SVG world atlas with canonical Mushoku Tensei geography.
- Map zoom, pan, pinch gestures, current-position pulse, discoveries, and custom pins.
- Travel, item-use, and quest actions sent through the normal chat composer.

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

Version 0.3.0 introduces the first complete visual identity and interactive world
atlas. Existing v0.2.0 chats migrate forward without resetting their saved state.
Deeper settlement maps, equipment rules, combat calculations, relationships, and
factions can be layered on in later milestones.

## License

[MIT](LICENSE)
