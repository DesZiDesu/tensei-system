# Tensei System

A responsive, persistent Mushoku Tensei role-play interface for SillyTavern.

## Features

- Animated magic-interface boot sequence.
- Desktop side drawer and phone-specific full-screen layout.
- Status, Inventory, Skills, Quests, Rank, and World Map tabs.
- Per-chat state stored in SillyTavern chat metadata.
- Current state injected into role-play prompts for continuity.
- Optional automatic AI synchronization after replies.
- Manual editing and immediate actions from the interface.
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

Version 0.2.0 is the functional foundation. It ships a stylized selector map and
generic state schema; deeper Mushoku Tensei location data, equipment rules,
combat calculations, relationships, factions, and custom imagery can be layered
on in later milestones.

## License

[MIT](LICENSE)
