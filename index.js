/* global SillyTavern, toastr */

const EXTENSION_FOLDER = 'third-party/tensei-system';
const SETTINGS_KEY = 'tensei_system';
const METADATA_KEY = 'tensei_system_state';
const PROMPT_KEY = 'tensei_system_roleplay_state';
const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const MASTERY = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Saint', 'King', 'Emperor', 'God'];
const WORLD = {
    'Central Continent': ['Asura Kingdom', 'Fittoa Region', 'Roanoa Kingdom', 'Shirone Kingdom', 'King Dragon Realm', 'Conflict Zone'],
    'Demon Continent': ['Rikarisu', 'Wind Port', 'Migurd Village', 'Kishirisu Castle Ruins'],
    'Millis Continent': ['Holy Country of Millis', 'Millishion', 'Great Forest', 'Zant Port'],
    'Begaritt Continent': ['Rapan', 'Teleport Labyrinth', 'Begaritt Desert'],
    'Heaven Continent': ['Heaven Continent Highlands'],
};
const DEFAULT_SETTINGS = Object.freeze({ showWandLauncher: true, autoTrack: true, injectState: true });

let initialized = false;
let previousFocusedElement = null;
let menuObserver = null;
let bootTimer = null;
let aiSyncInProgress = false;
let pendingSave = Promise.resolve();

const uid = () => globalThis.crypto?.randomUUID?.() || `tensei-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clone = value => globalThis.structuredClone ? structuredClone(value) : JSON.parse(JSON.stringify(value));
const text = (value, fallback = '', max = 300) => typeof value === 'string' ? value.trim().slice(0, max) : fallback;
const number = (value, fallback = 0, min = 0, max = 999999999) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const html = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;');

function defaultState() {
    return {
        version: 2,
        player: {
            name: 'Adventurer', race: 'Human', age: '', title: 'Newcomer', condition: 'Stable', level: 1,
            hp: { current: 100, max: 100 }, mp: { current: 100, max: 100 }, stamina: { current: 100, max: 100 },
        },
        progression: {
            adventurerRank: 'F', magicRank: 'Beginner', swordRank: 'Beginner', experience: 0, reputation: 0,
            currency: { gold: 0, silver: 0, copper: 0 },
        },
        location: { continent: 'Central Continent', region: 'Asura Kingdom', place: 'Unknown', detail: '', discovered: ['Asura Kingdom'] },
        inventory: [{ id: uid(), name: "Traveler's Clothes", quantity: 1, category: 'Equipment', description: '' }],
        skills: [],
        quests: [],
        journal: [],
        updatedAt: null,
        updateSource: 'initial',
    };
}

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    extensionSettings[SETTINGS_KEY] ||= clone(DEFAULT_SETTINGS);
    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!Object.hasOwn(extensionSettings[SETTINGS_KEY], key)) extensionSettings[SETTINGS_KEY][key] = value;
    }
    return extensionSettings[SETTINGS_KEY];
}

function meter(value, fallback) {
    const max = number(value?.max, fallback.max, 1, 999999);
    return { current: number(value?.current, fallback.current, 0, max), max };
}

function item(value, fallbackCategory = 'Other') {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 100),
        quantity: number(value.quantity, 1, 0, 99999), category: text(value.category, fallbackCategory, 60),
        description: text(value.description, '', 300),
    };
}

function skill(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 100),
        rank: MASTERY.includes(value.rank) ? value.rank : 'Beginner',
        type: text(value.type, 'General', 60), description: text(value.description, '', 300),
    };
}

function quest(value) {
    if (!value || typeof value !== 'object' || !text(value.name)) return null;
    const statuses = ['Active', 'Completed', 'Failed', 'On Hold'];
    return {
        id: text(value.id, uid(), 100), name: text(value.name, '', 120),
        status: statuses.includes(value.status) ? value.status : 'Active',
        objective: text(value.objective, '', 500), reward: text(value.reward, '', 160),
    };
}

function normalize(candidate, base = defaultState()) {
    const source = candidate && typeof candidate === 'object' ? candidate : {};
    const result = clone(base);
    const player = source.player && typeof source.player === 'object' ? source.player : {};
    const progress = source.progression && typeof source.progression === 'object' ? source.progression : {};
    const currency = progress.currency && typeof progress.currency === 'object' ? progress.currency : {};
    const location = source.location && typeof source.location === 'object' ? source.location : {};

    result.version = 2;
    result.player = {
        name: text(player.name, result.player.name, 100), race: text(player.race, result.player.race, 80),
        age: text(player.age, result.player.age, 40), title: text(player.title, result.player.title, 100),
        condition: text(player.condition, result.player.condition, 120),
        level: number(player.level, result.player.level, 1, 9999),
        hp: meter(player.hp, result.player.hp), mp: meter(player.mp, result.player.mp),
        stamina: meter(player.stamina, result.player.stamina),
    };
    result.progression = {
        adventurerRank: RANKS.includes(progress.adventurerRank) ? progress.adventurerRank : result.progression.adventurerRank,
        magicRank: MASTERY.includes(progress.magicRank) ? progress.magicRank : result.progression.magicRank,
        swordRank: MASTERY.includes(progress.swordRank) ? progress.swordRank : result.progression.swordRank,
        experience: number(progress.experience, result.progression.experience),
        reputation: number(progress.reputation, result.progression.reputation, -999999, 999999),
        currency: {
            gold: number(currency.gold, result.progression.currency.gold),
            silver: number(currency.silver, result.progression.currency.silver),
            copper: number(currency.copper, result.progression.currency.copper),
        },
    };
    result.location = {
        continent: text(location.continent, result.location.continent, 100),
        region: text(location.region, result.location.region, 120),
        place: text(location.place, result.location.place, 160),
        detail: text(location.detail, result.location.detail, 300),
        discovered: Array.isArray(location.discovered)
            ? [...new Set(location.discovered.map(x => text(x, '', 120)).filter(Boolean))].slice(0, 100)
            : result.location.discovered,
    };
    if (Array.isArray(source.inventory)) result.inventory = source.inventory.map(item).filter(Boolean).slice(0, 200);
    if (Array.isArray(source.skills)) result.skills = source.skills.map(skill).filter(Boolean).slice(0, 100);
    if (Array.isArray(source.quests)) result.quests = source.quests.map(quest).filter(Boolean).slice(0, 100);
    if (Array.isArray(source.journal)) {
        result.journal = source.journal.map(entry => ({
            id: text(entry?.id, uid(), 100), text: text(entry?.text, '', 500), at: text(entry?.at, '', 60),
        })).filter(entry => entry.text).slice(-30);
    }
    result.updatedAt = typeof source.updatedAt === 'string' ? source.updatedAt : result.updatedAt;
    result.updateSource = text(source.updateSource, result.updateSource, 40);
    return result;
}

function getState() {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) return defaultState();
    context.chatMetadata[METADATA_KEY] = normalize(context.chatMetadata[METADATA_KEY]);
    return context.chatMetadata[METADATA_KEY];
}

async function persistState(candidate, source = 'manual') {
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) {
        notify('warning', 'Open a character or group chat before changing the role-play state.');
        return false;
    }
    const state = normalize(candidate, getState());
    state.updatedAt = new Date().toISOString();
    state.updateSource = source;
    context.chatMetadata[METADATA_KEY] = state;
    updatePrompt(state);
    renderAll(state);
    pendingSave = pendingSave.catch(() => undefined).then(() => context.saveMetadata());
    await pendingSave;
    return true;
}

function statePrompt(state) {
    const canonical = {
        player: state.player, progression: state.progression, location: state.location,
        inventory: state.inventory, skills: state.skills, quests: state.quests,
    };
    return [
        '<tensei_system_state>',
        'Canonical current role-play state. Maintain continuity with these facts.',
        'Naturally acknowledge the current location when the scene or movement makes it relevant.',
        'Treat inventory, ranks, conditions, skills, and quests as established facts; change them only when story events justify it.',
        JSON.stringify(canonical),
        '</tensei_system_state>',
    ].join('\n');
}

function updatePrompt(state = getState()) {
    const context = SillyTavern.getContext();
    const enabled = getSettings().injectState && context.getCurrentChatId?.();
    context.setExtensionPrompt(PROMPT_KEY, enabled ? statePrompt(state) : '', 1, 1, false, 0);
}

function notify(type, message) {
    if (typeof toastr !== 'undefined' && typeof toastr[type] === 'function') toastr[type](message, 'Tensei System');
    else console[type === 'error' ? 'error' : 'info'](`[Tensei System] ${message}`);
}

const tabButton = (id, icon, label, active = false) => `
    <button class="tensei-tab-button${active ? ' is-active' : ''}" type="button" role="tab"
        data-tab="${id}" aria-selected="${active}"><i class="${icon}"></i><span>${label}</span></button>`;

function buildInterface() {
    if (document.getElementById('tensei-system-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'tensei-system-overlay';
    overlay.className = 'tensei-system-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <button class="tensei-system-backdrop" type="button" aria-label="Close Tensei System"></button>
        <section id="tensei-system-panel" class="tensei-system-panel" role="dialog" aria-modal="true"
            aria-labelledby="tensei-system-title" tabindex="-1">
            <div class="tensei-boot" aria-live="polite">
                <div class="tensei-boot-rune"><i class="fa-solid fa-wand-sparkles"></i></div>
                <span class="tensei-boot-kicker">Magic interface</span>
                <strong>Synchronizing world state</strong>
                <div class="tensei-boot-track"><span></span></div>
                <small>Connecting to the active role-play...</small>
            </div>
            <div class="tensei-app-shell">
                <header class="tensei-system-panel-header">
                    <div class="tensei-system-brand-mark"><i class="fa-solid fa-book-open"></i></div>
                    <div class="tensei-system-panel-heading"><span class="tensei-system-kicker">Mushoku Tensei Role-play</span>
                        <h2 id="tensei-system-title">Tensei System</h2></div>
                    <div id="tensei-system-sync-state" class="tensei-sync-state" data-mode="ready">
                        <i class="fa-solid fa-circle"></i><span>Ready</span></div>
                    <button id="tensei-system-close" class="menu_button menu_button_icon" type="button" aria-label="Close">
                        <i class="fa-solid fa-xmark"></i></button>
                </header>
                <div class="tensei-app-layout">
                    <nav class="tensei-tab-list" aria-label="Tensei System sections">
                        ${tabButton('status', 'fa-solid fa-user', 'Status', true)}
                        ${tabButton('inventory', 'fa-solid fa-box-open', 'Inventory')}
                        ${tabButton('skills', 'fa-solid fa-wand-magic-sparkles', 'Skills')}
                        ${tabButton('quests', 'fa-solid fa-scroll', 'Quests')}
                        ${tabButton('rank', 'fa-solid fa-medal', 'Rank')}
                        ${tabButton('map', 'fa-solid fa-map', 'World Map')}
                    </nav>
                    <main class="tensei-system-panel-body">
                        ${['status', 'inventory', 'skills', 'quests', 'rank', 'map'].map((id, index) =>
                            `<section class="tensei-tab-panel${index === 0 ? ' is-active' : ''}" data-panel="${id}"
                                ${index ? 'hidden' : ''}></section>`).join('')}
                    </main>
                </div>
                <footer class="tensei-system-panel-footer">
                    <span id="tensei-context-label"><i class="fa-solid fa-link"></i> Waiting for chat</span>
                    <button id="tensei-sync-now" class="tensei-text-button" type="button">
                        <i class="fa-solid fa-rotate"></i> Sync latest turn</button>
                </footer>
            </div>
        </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('.tensei-system-backdrop')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tensei-system-close')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tensei-sync-now')?.addEventListener('click', () => analyzeChat({ manual: true }));
    overlay.querySelectorAll('[data-tab]').forEach(button => button.addEventListener('click', () => activateTab(button.dataset.tab)));
    const body = overlay.querySelector('.tensei-system-panel-body');
    body?.addEventListener('submit', onSubmit);
    body?.addEventListener('click', onPanelClick);
    body?.addEventListener('change', onPanelChange);
}

function activateTab(id) {
    const overlay = document.getElementById('tensei-system-overlay');
    overlay?.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
    });
    overlay?.querySelectorAll('[data-panel]').forEach(panel => {
        const active = panel.dataset.panel === id;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
    });
}

const input = (label, name, value, type = 'text', extra = '') =>
    `<label class="tensei-field"><span>${label}</span><input name="${name}" type="${type}" value="${html(value)}" ${extra}></label>`;
const select = (label, name, options, selected) =>
    `<label class="tensei-field"><span>${label}</span><select name="${name}">${options.map(value =>
        `<option value="${html(value)}"${value === selected ? ' selected' : ''}>${html(value)}</option>`).join('')}</select></label>`;
const heading = (title, subtitle, icon) =>
    `<div class="tensei-section-heading"><div><span class="tensei-eyebrow">System interface</span>
        <h3>${html(title)}</h3><p>${html(subtitle)}</p></div><i class="${icon} tensei-heading-icon"></i></div>`;
const empty = message => `<div class="tensei-empty-state"><i class="fa-regular fa-compass"></i><p>${html(message)}</p></div>`;

function meterView(label, value, icon) {
    const percent = Math.round(value.current / Math.max(1, value.max) * 100);
    return `<div class="tensei-meter"><div class="tensei-meter-line"><span><i class="${icon}"></i> ${label}</span>
        <strong>${value.current} / ${value.max}</strong></div><div class="tensei-meter-track">
        <span style="width:${Math.min(100, percent)}%"></span></div></div>`;
}

function renderAll(state = getState()) {
    const overlay = document.getElementById('tensei-system-overlay');
    if (!overlay) return;
    renderStatus(overlay.querySelector('[data-panel="status"]'), state);
    renderInventory(overlay.querySelector('[data-panel="inventory"]'), state);
    renderSkills(overlay.querySelector('[data-panel="skills"]'), state);
    renderQuests(overlay.querySelector('[data-panel="quests"]'), state);
    renderRank(overlay.querySelector('[data-panel="rank"]'), state);
    renderMap(overlay.querySelector('[data-panel="map"]'), state);
    const label = overlay.querySelector('#tensei-context-label');
    if (label) label.innerHTML = SillyTavern.getContext().getCurrentChatId?.()
        ? `<i class="fa-solid fa-location-dot"></i> ${html(state.location.region)} · ${html(state.location.place)}`
        : '<i class="fa-solid fa-triangle-exclamation"></i> Open a chat to activate this system';
}

function renderStatus(panel, state) {
    if (!panel) return;
    panel.innerHTML = `
        <div class="tensei-section-heading"><div><span class="tensei-eyebrow">Character record</span>
            <h3>${html(state.player.name)}</h3><p>${html(state.player.title)} · Level ${state.player.level}</p></div>
            <span class="tensei-rank-seal">${html(state.progression.adventurerRank)}</span></div>
        <div class="tensei-dashboard-grid">
            <article class="tensei-card"><div class="tensei-card-title"><span>Vital status</span>
                <em>${html(state.player.condition)}</em></div>
                ${meterView('Health', state.player.hp, 'fa-solid fa-heart')}
                ${meterView('Mana', state.player.mp, 'fa-solid fa-droplet')}
                ${meterView('Stamina', state.player.stamina, 'fa-solid fa-bolt')}</article>
            <article class="tensei-card"><div class="tensei-card-title"><span>Identity</span>
                <i class="fa-solid fa-feather"></i></div><dl class="tensei-fact-list">
                <div><dt>Race</dt><dd>${html(state.player.race)}</dd></div>
                <div><dt>Age</dt><dd>${html(state.player.age || 'Unknown')}</dd></div>
                <div><dt>Current region</dt><dd>${html(state.location.region)}</dd></div>
                <div><dt>Exact place</dt><dd>${html(state.location.place)}</dd></div></dl></article>
        </div>
        <details class="tensei-editor"><summary><i class="fa-solid fa-pen"></i> Edit status</summary>
            <form data-form="status" class="tensei-form-grid">
                ${input('Name', 'name', state.player.name)}${input('Title', 'title', state.player.title)}
                ${input('Race', 'race', state.player.race)}${input('Age', 'age', state.player.age)}
                ${input('Condition', 'condition', state.player.condition)}${input('Level', 'level', state.player.level, 'number', 'min="1"')}
                ${input('HP', 'hpCurrent', state.player.hp.current, 'number', 'min="0"')}${input('HP max', 'hpMax', state.player.hp.max, 'number', 'min="1"')}
                ${input('MP', 'mpCurrent', state.player.mp.current, 'number', 'min="0"')}${input('MP max', 'mpMax', state.player.mp.max, 'number', 'min="1"')}
                ${input('Stamina', 'staminaCurrent', state.player.stamina.current, 'number', 'min="0"')}${input('Stamina max', 'staminaMax', state.player.stamina.max, 'number', 'min="1"')}
                <button class="tensei-primary-button tensei-form-submit" type="submit">Save status</button>
            </form></details>`;
}

function renderInventory(panel, state) {
    if (!panel) return;
    panel.innerHTML = `${heading('Inventory', `${state.inventory.length} item types`, 'fa-solid fa-box-open')}
        <div class="tensei-item-grid">${state.inventory.length ? state.inventory.map(entry => `
            <article class="tensei-list-card"><div class="tensei-item-icon"><i class="fa-solid fa-cube"></i></div>
                <div class="tensei-item-copy"><strong>${html(entry.name)}</strong><span>${html(entry.category)} · ×${entry.quantity}</span>
                <p>${html(entry.description || 'No description')}</p></div><div class="tensei-card-actions">
                <button type="button" data-action="use-item" data-id="${html(entry.id)}" title="Use in chat"><i class="fa-solid fa-comment-dots"></i></button>
                <button type="button" data-action="delete-item" data-id="${html(entry.id)}" title="Remove"><i class="fa-solid fa-trash"></i></button></div></article>`).join('') : empty('Your inventory is empty.')}</div>
        <details class="tensei-editor"><summary><i class="fa-solid fa-plus"></i> Add inventory item</summary>
            <form data-form="inventory" class="tensei-form-grid">${input('Item name', 'name', '')}
                ${input('Quantity', 'quantity', 1, 'number', 'min="0"')}${input('Category', 'category', 'Other')}
                ${input('Description', 'description', '')}<button class="tensei-primary-button tensei-form-submit" type="submit">Add item</button>
            </form></details>`;
}

function renderSkills(panel, state) {
    if (!panel) return;
    panel.innerHTML = `${heading('Skills & Magic', `${state.skills.length} recorded abilities`, 'fa-solid fa-wand-magic-sparkles')}
        <div class="tensei-item-grid">${state.skills.length ? state.skills.map(entry => `
            <article class="tensei-list-card"><div class="tensei-item-icon"><i class="fa-solid fa-sparkles"></i></div>
                <div class="tensei-item-copy"><strong>${html(entry.name)}</strong><span>${html(entry.type)} · ${html(entry.rank)}</span>
                <p>${html(entry.description || 'No description')}</p></div><div class="tensei-card-actions">
                <button type="button" data-action="delete-skill" data-id="${html(entry.id)}" title="Remove"><i class="fa-solid fa-trash"></i></button></div></article>`).join('') : empty('Skills learned during role-play will appear here.')}</div>
        <details class="tensei-editor"><summary><i class="fa-solid fa-plus"></i> Add skill</summary>
            <form data-form="skill" class="tensei-form-grid">${input('Skill name', 'name', '')}${select('Rank', 'rank', MASTERY, 'Beginner')}
                ${input('Type', 'type', 'Magic')}${input('Description', 'description', '')}
                <button class="tensei-primary-button tensei-form-submit" type="submit">Add skill</button></form></details>`;
}

function renderQuests(panel, state) {
    if (!panel) return;
    panel.innerHTML = `${heading('Quest Log', `${state.quests.filter(q => q.status === 'Active').length} active`, 'fa-solid fa-scroll')}
        <div class="tensei-quest-list">${state.quests.length ? state.quests.map(entry => `
            <article class="tensei-quest-card" data-status="${html(entry.status.toLowerCase())}"><div>
                <span class="tensei-quest-status">${html(entry.status)}</span><h4>${html(entry.name)}</h4>
                <p>${html(entry.objective || 'No objective recorded')}</p>${entry.reward ? `<small>Reward: ${html(entry.reward)}</small>` : ''}</div>
                <div class="tensei-card-actions"><button type="button" data-action="pursue-quest" data-id="${html(entry.id)}" title="Pursue in chat"><i class="fa-solid fa-comment-dots"></i></button>
                <button type="button" data-action="delete-quest" data-id="${html(entry.id)}"><i class="fa-solid fa-trash"></i></button></div></article>`).join('') : empty('No quests have been recorded yet.')}</div>
        <details class="tensei-editor"><summary><i class="fa-solid fa-plus"></i> Add quest</summary>
            <form data-form="quest" class="tensei-form-grid">${input('Quest name', 'name', '')}
                ${select('Status', 'status', ['Active', 'Completed', 'Failed', 'On Hold'], 'Active')}
                ${input('Objective', 'objective', '')}${input('Reward', 'reward', '')}
                <button class="tensei-primary-button tensei-form-submit" type="submit">Add quest</button></form></details>`;
}

const rankRow = (label, value, icon) => `<article class="tensei-rank-row"><i class="${icon}"></i><span>${label}</span><strong>${html(value)}</strong></article>`;

function renderRank(panel, state) {
    if (!panel) return;
    const p = state.progression;
    panel.innerHTML = `${heading('Ranks & Progression', 'Guild and mastery record', 'fa-solid fa-medal')}
        <div class="tensei-rank-layout"><article class="tensei-rank-hero"><span>Adventurer Rank</span>
            <strong>${html(p.adventurerRank)}</strong><small>Recognized guild classification</small></article>
            <div class="tensei-rank-stack">${rankRow('Magic mastery', p.magicRank, 'fa-solid fa-hat-wizard')}
                ${rankRow('Sword mastery', p.swordRank, 'fa-solid fa-khanda')}${rankRow('Experience', p.experience, 'fa-solid fa-star')}
                ${rankRow('Reputation', p.reputation, 'fa-solid fa-people-group')}</div></div>
        <article class="tensei-card tensei-wallet"><div><span>Gold</span><strong>${p.currency.gold}</strong></div>
            <div><span>Silver</span><strong>${p.currency.silver}</strong></div><div><span>Copper</span><strong>${p.currency.copper}</strong></div></article>
        <details class="tensei-editor"><summary><i class="fa-solid fa-pen"></i> Edit progression</summary>
            <form data-form="rank" class="tensei-form-grid">${select('Adventurer rank', 'adventurerRank', RANKS, p.adventurerRank)}
                ${select('Magic rank', 'magicRank', MASTERY, p.magicRank)}${select('Sword rank', 'swordRank', MASTERY, p.swordRank)}
                ${input('Experience', 'experience', p.experience, 'number', 'min="0"')}${input('Reputation', 'reputation', p.reputation, 'number')}
                ${input('Gold', 'gold', p.currency.gold, 'number', 'min="0"')}${input('Silver', 'silver', p.currency.silver, 'number', 'min="0"')}
                ${input('Copper', 'copper', p.currency.copper, 'number', 'min="0"')}
                <button class="tensei-primary-button tensei-form-submit" type="submit">Save progression</button></form></details>`;
}

function renderMap(panel, state) {
    if (!panel) return;
    panel.innerHTML = `${heading('World Map', `${state.location.continent} · ${state.location.region}`, 'fa-solid fa-map')}
        <div class="tensei-map-layout"><div class="tensei-map-visual"><div class="tensei-map-orbit"></div>
            ${Object.keys(WORLD).map((continent, index) => `<button type="button" class="tensei-map-node node-${index + 1}${continent === state.location.continent ? ' is-current' : ''}"
                data-continent="${html(continent)}"><i class="fa-solid fa-location-dot"></i><span>${html(continent.replace(' Continent', ''))}</span></button>`).join('')}
            <div class="tensei-map-current"><span>Current position</span><strong>${html(state.location.region)}</strong><small>${html(state.location.place)}</small></div></div>
            <article class="tensei-card tensei-travel-card"><div class="tensei-card-title"><span>Travel control</span><i class="fa-solid fa-compass"></i></div>
                <form data-form="travel" class="tensei-travel-form">${select('Continent', 'continent', Object.keys(WORLD), state.location.continent)}
                    ${select('Region', 'region', WORLD[state.location.continent] || [state.location.region], state.location.region)}
                    ${input('Place', 'place', state.location.place)}${input('Location detail', 'detail', state.location.detail)}
                    <button class="tensei-primary-button" type="submit"><i class="fa-solid fa-route"></i> Travel and notify chat</button></form>
                <p class="tensei-help-copy">Travel updates the canonical location and sends an action through normal SillyTavern chat.</p></article></div>`;
}

async function onSubmit(event) {
    const form = event.target.closest('form[data-form]');
    if (!form) return;
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form).entries());
    const state = clone(getState());
    switch (form.dataset.form) {
        case 'status':
            state.player = {
                ...state.player, name: values.name, title: values.title, race: values.race,
                age: values.age, condition: values.condition, level: values.level,
                hp: { current: values.hpCurrent, max: values.hpMax },
                mp: { current: values.mpCurrent, max: values.mpMax },
                stamina: { current: values.staminaCurrent, max: values.staminaMax },
            };
            await persistState(state);
            notify('success', 'Character status saved.');
            break;
        case 'inventory': {
            const nextItem = item(values);
            if (!nextItem) return notify('warning', 'Enter an item name first.');
            state.inventory.push(nextItem);
            await persistState(state);
            notify('success', `${nextItem.name} added to inventory.`);
            break;
        }
        case 'skill': {
            const nextSkill = skill(values);
            if (!nextSkill) return notify('warning', 'Enter a skill name first.');
            state.skills.push(nextSkill);
            await persistState(state);
            notify('success', `${nextSkill.name} added to skills.`);
            break;
        }
        case 'quest': {
            const nextQuest = quest(values);
            if (!nextQuest) return notify('warning', 'Enter a quest name first.');
            state.quests.push(nextQuest);
            await persistState(state);
            notify('success', `${nextQuest.name} added to the quest log.`);
            break;
        }
        case 'rank':
            state.progression = {
                ...state.progression, adventurerRank: values.adventurerRank, magicRank: values.magicRank,
                swordRank: values.swordRank, experience: values.experience, reputation: values.reputation,
                currency: { gold: values.gold, silver: values.silver, copper: values.copper },
            };
            await persistState(state);
            notify('success', 'Progression saved.');
            break;
        case 'travel': {
            const previous = state.location.region;
            state.location = {
                ...state.location, continent: values.continent, region: values.region,
                place: values.place || 'Unknown', detail: values.detail,
                discovered: [...new Set([...state.location.discovered, values.region])],
            };
            state.journal.push({ id: uid(), text: `Traveled from ${previous} to ${values.region}.`, at: new Date().toISOString() });
            if (await persistState(state, 'travel')) {
                const destination = values.place && values.place !== 'Unknown' ? `, heading for ${values.place}` : '';
                sendChatAction(`*I travel to ${values.region}${destination}.*`);
            }
            break;
        }
    }
}

function onPanelChange(event) {
    const continent = event.target.closest('form[data-form="travel"] select[name="continent"]');
    if (!continent) return;
    const region = continent.form.querySelector('select[name="region"]');
    if (region) region.innerHTML = (WORLD[continent.value] || []).map(value =>
        `<option value="${html(value)}">${html(value)}</option>`).join('');
}

async function onPanelClick(event) {
    const button = event.target.closest('button[data-action], button[data-continent]');
    if (!button) return;
    if (button.dataset.continent) {
        const continent = document.querySelector('form[data-form="travel"] select[name="continent"]');
        if (continent) {
            continent.value = button.dataset.continent;
            continent.dispatchEvent(new Event('change', { bubbles: true }));
        }
        return;
    }

    const state = clone(getState());
    const id = button.dataset.id;
    switch (button.dataset.action) {
        case 'delete-item':
            state.inventory = state.inventory.filter(entry => entry.id !== id);
            await persistState(state);
            break;
        case 'delete-skill':
            state.skills = state.skills.filter(entry => entry.id !== id);
            await persistState(state);
            break;
        case 'delete-quest':
            state.quests = state.quests.filter(entry => entry.id !== id);
            await persistState(state);
            break;
        case 'use-item': {
            const entry = state.inventory.find(value => value.id === id);
            if (entry) sendChatAction(`*I use ${entry.name} from my inventory.*`);
            break;
        }
        case 'pursue-quest': {
            const entry = state.quests.find(value => value.id === id);
            if (entry) sendChatAction(`*I focus on the quest "${entry.name}" and work toward this objective: ${entry.objective || 'continue the quest'}.*`);
            break;
        }
    }
}

function sendChatAction(message) {
    const composer = document.querySelector('#send_textarea');
    const send = document.querySelector('#send_but');
    if (!(composer instanceof HTMLTextAreaElement) || !(send instanceof HTMLElement)) {
        notify('error', 'The SillyTavern chat composer is not available.');
        return;
    }
    const hadDraft = Boolean(composer.value.trim());
    composer.value = hadDraft ? `${composer.value.trim()}\n${message}` : message;
    composer.dispatchEvent(new Event('input', { bubbles: true }));
    composer.focus();
    closeInterface();
    if (hadDraft || send.matches(':disabled, .disabled')) {
        notify('info', 'The action was added to the chat composer. Press Send when ready.');
    } else {
        send.click();
    }
}

function analyzerPrompt(state, transcript) {
    return `You maintain structured state for an ongoing Mushoku Tensei role-play.

CURRENT STATE:
${JSON.stringify(state)}

LATEST CHAT:
${transcript}

Return ONLY valid JSON: {"state": <complete updated state object>, "summary": "short description of confirmed changes"}.
Preserve every existing value unless the latest chat clearly establishes a change. Do not treat plans, questions,
out-of-character discussion, hypothetical events, rejected actions, or failed attempts as completed changes. Keep IDs
for inventory items, skills, and quests that still exist. Update location only after completed movement or a clear scene
change. Update inventory, conditions, meters, ranks, currency, skills, and quests only with chat evidence. No prose
outside the JSON.`;
}

function parseJson(response) {
    const cleaned = String(response || '').trim().replace(/^\`\`\`(?:json)?\s*/i, '').replace(/\s*\`\`\`$/, '');
    try {
        return JSON.parse(cleaned);
    } catch {
        const start = cleaned.indexOf('{');
        const end = cleaned.lastIndexOf('}');
        if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
        throw new Error('The AI response did not contain valid JSON.');
    }
}

async function analyzeChat({ manual = false, messageId = null, generationType = '' } = {}) {
    if (aiSyncInProgress || (!manual && !getSettings().autoTrack)) return;
    if (generationType === 'quiet' || generationType === 'impersonate') return;
    const context = SillyTavern.getContext();
    if (!context.getCurrentChatId?.()) {
        if (manual) notify('warning', 'Open a chat before synchronizing.');
        return;
    }
    const transcript = context.chat.filter(message => message?.mes && !message.is_system).slice(-8)
        .map(message => `${message.is_user ? 'User' : 'Character'}: ${message.mes}`).join('\n\n');
    if (!transcript) {
        if (manual) notify('info', 'There are no role-play messages to analyze yet.');
        return;
    }

    aiSyncInProgress = true;
    setSync('working', 'Reading latest turn');
    try {
        const current = getState();
        const response = await context.generateQuietPrompt({
            quietPrompt: analyzerPrompt(current, transcript),
            skipWIAN: true,
            responseLength: 1400,
            removeReasoning: true,
        });
        const parsed = parseJson(response);
        const next = normalize(parsed.state || parsed, current);
        const summary = text(parsed.summary, 'Role-play state synchronized.', 300);
        next.journal = [...current.journal, { id: uid(), text: summary, at: new Date().toISOString() }].slice(-30);
        await persistState(next, 'ai');
        setSync('ready', 'AI synchronized');
        if (manual) notify('success', summary);
        console.info('[Tensei System] State synchronized.', messageId);
    } catch (error) {
        console.error('[Tensei System] AI synchronization failed.', error);
        setSync('error', 'Sync unavailable');
        if (manual) notify('error', `Could not synchronize: ${error.message}`);
    } finally {
        aiSyncInProgress = false;
    }
}

function setSync(mode, label) {
    const status = document.getElementById('tensei-system-sync-state');
    if (!status) return;
    status.dataset.mode = mode;
    const copy = status.querySelector('span');
    if (copy) copy.textContent = label;
}

function openInterface() {
    buildInterface();
    const overlay = document.getElementById('tensei-system-overlay');
    const panel = document.getElementById('tensei-system-panel');
    if (!overlay || !panel) return;
    clearTimeout(bootTimer);
    previousFocusedElement = document.activeElement;
    renderAll();
    overlay.classList.remove('is-ready');
    overlay.classList.add('is-open', 'is-booting');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tensei-system-open');
    requestAnimationFrame(() => panel.focus());
    const delay = matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 820;
    bootTimer = setTimeout(() => {
        overlay.classList.remove('is-booting');
        overlay.classList.add('is-ready');
    }, delay);
}

function closeInterface() {
    const overlay = document.getElementById('tensei-system-overlay');
    if (!overlay?.classList.contains('is-open')) return;
    clearTimeout(bootTimer);
    overlay.classList.remove('is-open', 'is-ready', 'is-booting');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tensei-system-open');
    if (previousFocusedElement instanceof HTMLElement) previousFocusedElement.focus({ preventScroll: true });
}

function syncLauncherVisibility() {
    const launcher = document.getElementById('tensei-system-wand-launcher');
    if (launcher) launcher.hidden = !getSettings().showWandLauncher;
}

function createWandLauncher() {
    if (document.getElementById('tensei-system-wand-launcher')) return true;
    const menu = document.getElementById('extensionsMenu');
    if (!menu) return false;
    const launcher = document.createElement('div');
    launcher.id = 'tensei-system-wand-launcher';
    launcher.className = 'list-group-item flex-container flexGap5 interactable';
    launcher.tabIndex = 0;
    launcher.setAttribute('role', 'button');
    launcher.title = 'Open Tensei System';
    launcher.innerHTML = '<i class="fa-solid fa-book-open"></i><span>Tensei System</span>';
    const activate = event => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openInterface();
    };
    launcher.addEventListener('click', activate);
    launcher.addEventListener('keydown', activate);
    menu.appendChild(launcher);
    syncLauncherVisibility();
    return true;
}

function observeWandMenu() {
    if (createWandLauncher() || menuObserver) return;
    menuObserver = new MutationObserver(() => {
        if (createWandLauncher()) {
            menuObserver.disconnect();
            menuObserver = null;
        }
    });
    menuObserver.observe(document.body, { childList: true, subtree: true });
}

function bindCheckbox(id, key, settings, callback) {
    const checkbox = document.getElementById(id);
    if (!(checkbox instanceof HTMLInputElement)) return;
    checkbox.checked = settings[key];
    checkbox.addEventListener('change', () => {
        settings[key] = checkbox.checked;
        SillyTavern.getContext().saveSettingsDebounced();
        callback?.();
    });
}

async function addSettingsDrawer() {
    if (document.getElementById('tensei-system-settings')) return;
    const context = SillyTavern.getContext();
    const container = document.getElementById('extensions_settings2');
    if (!container) throw new Error('Could not find the SillyTavern Extensions settings container.');
    container.insertAdjacentHTML('beforeend', await context.renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings'));
    const settings = getSettings();
    bindCheckbox('tensei-system-show-launcher', 'showWandLauncher', settings, syncLauncherVisibility);
    bindCheckbox('tensei-system-auto-track', 'autoTrack', settings);
    bindCheckbox('tensei-system-inject-state', 'injectState', settings, updatePrompt);
    document.getElementById('tensei-system-open-from-settings')?.addEventListener('click', openInterface);
    document.getElementById('tensei-system-sync-from-settings')?.addEventListener('click', () => analyzeChat({ manual: true }));
}

function bindChatEvents() {
    const { eventSource, eventTypes } = SillyTavern.getContext();
    eventSource.on(eventTypes.CHAT_CHANGED, () => {
        updatePrompt();
        renderAll();
        setSync('ready', 'Ready');
    });
    eventSource.on(eventTypes.MESSAGE_RECEIVED, (messageId, generationType) => {
        void analyzeChat({ messageId, generationType });
    });
    eventSource.on(eventTypes.MESSAGE_EDITED, () => {
        if (getSettings().autoTrack) void analyzeChat();
    });
    eventSource.on(eventTypes.MESSAGE_SWIPED, messageId => {
        if (getSettings().autoTrack) void analyzeChat({ messageId, generationType: 'swipe' });
    });
}

async function initialize() {
    if (initialized) return;
    initialized = true;
    try {
        getSettings();
        buildInterface();
        await addSettingsDrawer();
        observeWandMenu();
        bindChatEvents();
        updatePrompt();
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') closeInterface();
        });
        console.info('[Tensei System] Role-play interface v0.2.0 loaded.');
    } catch (error) {
        initialized = false;
        console.error('[Tensei System] Failed to initialize.', error);
        notify('error', 'Tensei System could not load. Check the browser console.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    void initialize();
}
