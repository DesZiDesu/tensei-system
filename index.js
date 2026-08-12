/* global SillyTavern, toastr */

const EXTENSION_FOLDER = 'third-party/tensei-system';
const SETTINGS_KEY = 'tensei_system';
const METADATA_KEY = 'tensei_system_state';
const PROMPT_KEY = 'tensei_system_roleplay_state';
const RANKS = ['F', 'E', 'D', 'C', 'B', 'A', 'S'];
const MASTERY = ['None', 'Beginner', 'Intermediate', 'Advanced', 'Saint', 'King', 'Emperor', 'God'];
const DAY_PHASES = ['Morning', 'Afternoon', 'Evening', 'Night'];
const ZONE_TYPES = ['Safe Zone', 'Neutral Zone', 'Danger Zone', 'Unknown Zone'];
const WORLD_LOCATIONS = [
    { id: 'asura', continent: 'Central Continent', name: 'Asura Kingdom', x: 254, y: 286, zone: 'Safe Zone' },
    { id: 'ars', continent: 'Central Continent', name: 'Capital Ars', x: 164, y: 307, zone: 'Safe Zone' },
    { id: 'fittoa', continent: 'Central Continent', name: 'Fittoa Region', x: 277, y: 228, zone: 'Neutral Zone' },
    { id: 'roa', continent: 'Central Continent', name: 'Roa', x: 250, y: 245, zone: 'Safe Zone' },
    { id: 'ranoa', continent: 'Central Continent', name: 'Ranoa Kingdom', x: 276, y: 128, zone: 'Safe Zone' },
    { id: 'sharia', continent: 'Central Continent', name: 'Magic City of Sharia', x: 315, y: 117, zone: 'Safe Zone' },
    { id: 'biheiril', continent: 'Central Continent', name: 'Biheiril Kingdom', x: 470, y: 126, zone: 'Neutral Zone' },
    { id: 'conflict', continent: 'Central Continent', name: 'Conflict Zone', x: 438, y: 307, zone: 'Danger Zone' },
    { id: 'shirone', continent: 'Central Continent', name: 'Shirone Kingdom', x: 470, y: 365, zone: 'Safe Zone' },
    { id: 'kikka', continent: 'Central Continent', name: 'Kikka Kingdom', x: 485, y: 398, zone: 'Safe Zone' },
    { id: 'sanakia', continent: 'Central Continent', name: 'Sanakia Kingdom', x: 498, y: 430, zone: 'Safe Zone' },
    { id: 'dragon-king', continent: 'Central Continent', name: 'Dragon King Kingdom', x: 447, y: 478, zone: 'Safe Zone' },
    { id: 'east-port', continent: 'Central Continent', name: 'East Port', x: 553, y: 495, zone: 'Safe Zone' },
    { id: 'rikuaris', continent: 'Demon Continent', name: 'Rikarisu', x: 832, y: 185, zone: 'Danger Zone' },
    { id: 'migurd', continent: 'Demon Continent', name: 'Migurd Village', x: 785, y: 223, zone: 'Neutral Zone' },
    { id: 'kurasuma', continent: 'Demon Continent', name: 'Kurasuma', x: 752, y: 129, zone: 'Neutral Zone' },
    { id: 'wind-port', continent: 'Demon Continent', name: 'Wind Port', x: 854, y: 307, zone: 'Safe Zone' },
    { id: 'zant-port', continent: 'Millis Continent', name: 'Zant Port', x: 846, y: 345, zone: 'Safe Zone' },
    { id: 'great-forest', continent: 'Millis Continent', name: 'Great Forest', x: 820, y: 415, zone: 'Neutral Zone' },
    { id: 'millishion', continent: 'Millis Continent', name: 'Millishion', x: 775, y: 492, zone: 'Safe Zone' },
    { id: 'west-port', continent: 'Millis Continent', name: 'West Port', x: 666, y: 500, zone: 'Safe Zone' },
    { id: 'rapan', continent: 'Begaritt Continent', name: 'Rapan', x: 221, y: 492, zone: 'Safe Zone' },
    { id: 'teleport-labyrinth', continent: 'Begaritt Continent', name: 'Teleport Labyrinth', x: 188, y: 505, zone: 'Danger Zone' },
    { id: 'heaven', continent: 'Heaven Continent', name: 'Heaven Continent Highlands', x: 574, y: 77, zone: 'Danger Zone' },
];
const WORLD = Object.fromEntries([...new Set(WORLD_LOCATIONS.map(location => location.continent))].map(continent => [
    continent, WORLD_LOCATIONS.filter(location => location.continent === continent).map(location => location.name),
]));
const LOCATION_REGIONS = {
    'Capital Ars': 'Asura Kingdom', Roa: 'Fittoa Region', 'Magic City of Sharia': 'Ranoa Kingdom',
    'East Port': 'Dragon King Kingdom', 'Migurd Village': 'Biegoya Region', Rikarisu: 'Biegoya Region',
    Kurasuma: 'Demon Continent', 'Wind Port': 'Demon Continent', 'Zant Port': 'Great Forest',
    Millishion: 'Holy Country of Millis', 'West Port': 'Holy Country of Millis', Rapan: 'Begaritt Continent',
    'Teleport Labyrinth': 'Begaritt Continent',
};
const DEFAULT_SETTINGS = Object.freeze({ showWandLauncher: true, autoTrack: true, injectState: true });

let initialized = false;
let previousFocusedElement = null;
let menuObserver = null;
let bootTimer = null;
let aiSyncInProgress = false;
let pendingSave = Promise.resolve();
let tabTransitionToken = 0;
let mapSelectionId = null;
const mapView = { scale: 1, x: 0, y: 0 };

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
        version: 3,
        player: {
            name: 'Adventurer', portrait: '', race: 'Human', age: '', title: 'Newcomer', guild: 'Unaffiliated', party: 'Solo', condition: 'Stable', level: 1,
            hp: { current: 100, max: 100 }, mp: { current: 100, max: 100 }, stamina: { current: 100, max: 100 },
        },
        progression: {
            adventurerRank: 'F', magicRank: 'Beginner', swordRank: 'Beginner', experience: 0, experienceMax: 100, reputation: 0,
            currency: { gold: 0, silver: 0, copper: 0 },
        },
        worldClock: { day: 1, time: '08:00', phase: 'Morning' },
        location: { continent: 'Central Continent', region: 'Asura Kingdom', place: 'Unknown', detail: '', zoneType: 'Safe Zone', discovered: ['Asura Kingdom'], pins: [] },
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

    result.version = 3;
    result.player = {
        name: text(player.name, result.player.name, 100), portrait: text(player.portrait, result.player.portrait, 1500000),
        race: text(player.race, result.player.race, 80),
        age: text(player.age, result.player.age, 40), title: text(player.title, result.player.title, 100),
        guild: text(player.guild, result.player.guild, 100), party: text(player.party, result.player.party, 100),
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
        experienceMax: number(progress.experienceMax, result.progression.experienceMax, 1, 999999999),
        reputation: number(progress.reputation, result.progression.reputation, -999999, 999999),
        currency: {
            gold: number(currency.gold, result.progression.currency.gold),
            silver: number(currency.silver, result.progression.currency.silver),
            copper: number(currency.copper, result.progression.currency.copper),
        },
    };
    const worldClock = source.worldClock && typeof source.worldClock === 'object' ? source.worldClock : {};
    result.worldClock = {
        day: number(worldClock.day, result.worldClock.day, 1, 999999),
        time: /^([01]\d|2[0-3]):[0-5]\d$/.test(worldClock.time) ? worldClock.time : result.worldClock.time,
        phase: DAY_PHASES.includes(worldClock.phase) ? worldClock.phase : result.worldClock.phase,
    };
    result.location = {
        continent: text(location.continent, result.location.continent, 100),
        region: text(location.region, result.location.region, 120),
        place: text(location.place, result.location.place, 160),
        detail: text(location.detail, result.location.detail, 300),
        zoneType: ZONE_TYPES.includes(location.zoneType) ? location.zoneType : result.location.zoneType,
        discovered: Array.isArray(location.discovered)
            ? [...new Set(location.discovered.map(x => text(x, '', 120)).filter(Boolean))].slice(0, 100)
            : result.location.discovered,
        pins: Array.isArray(location.pins) ? location.pins.map(pin => ({
            id: text(pin?.id, uid(), 100), locationId: text(pin?.locationId, '', 100),
            label: text(pin?.label, 'Marked location', 100), note: text(pin?.note, '', 300),
        })).filter(pin => pin.locationId).slice(0, 100) : result.location.pins,
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

function aiState(state) {
    const safePlayer = { ...state.player };
    delete safePlayer.portrait;
    return {
        player: safePlayer, progression: state.progression, worldClock: state.worldClock, location: state.location,
        inventory: state.inventory, skills: state.skills, quests: state.quests,
    };
}

function statePrompt(state) {
    const canonical = {
        ...aiState(state),
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

function currentPersonaName(state = getState()) {
    return text(SillyTavern.getContext().name1, state.player.name, 100) || state.player.name;
}

function currentMapLocation(state) {
    return WORLD_LOCATIONS.find(location => location.name === state.location.place)
        || WORLD_LOCATIONS.find(location => location.name === state.location.region)
        || WORLD_LOCATIONS.find(location => location.continent === state.location.continent)
        || WORLD_LOCATIONS[0];
}

function mapLocation(id) {
    return WORLD_LOCATIONS.find(location => location.id === id);
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
    if (!overlay) return;
    const next = overlay.querySelector(`[data-panel="${id}"]`);
    const current = overlay.querySelector('[data-panel].is-active');
    if (!next || next === current) return;
    const transition = ++tabTransitionToken;
    overlay?.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === id;
        button.classList.toggle('is-active', active);
        button.setAttribute('aria-selected', String(active));
    });
    current?.classList.add('is-leaving');
    const finish = () => {
        if (transition !== tabTransitionToken) return;
        overlay.querySelectorAll('[data-panel]').forEach(panel => {
            const active = panel === next;
            panel.hidden = !active;
            panel.classList.toggle('is-active', active);
            panel.classList.remove('is-leaving');
        });
        next.classList.remove('is-entering');
        void next.offsetWidth;
        next.classList.add('is-entering');
        overlay.querySelector('.tensei-system-panel-body')?.scrollTo({ top: 0, behavior: 'smooth' });
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
    else setTimeout(finish, 130);
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

function meterView(label, value, icon, tone) {
    const percent = Math.round(value.current / Math.max(1, value.max) * 100);
    const offset = 176 - (176 * Math.min(100, percent) / 100);
    return `<article class="tensei-vital tensei-vital-${tone}"><div class="tensei-vital-orbit">
        <svg viewBox="0 0 68 68" aria-hidden="true"><circle class="tensei-vital-base" cx="34" cy="34" r="28"></circle>
        <circle class="tensei-vital-value" cx="34" cy="34" r="28" style="stroke-dashoffset:${offset}"></circle></svg>
        <span><i class="${icon}"></i><b>${percent}%</b></span></div><div class="tensei-vital-copy">
        <small>${label}</small><strong>${value.current}<em>/ ${value.max}</em></strong></div></article>`;
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
    const persona = currentPersonaName(state);
    const phaseIndex = Math.max(0, DAY_PHASES.indexOf(state.worldClock.phase));
    const expPercent = Math.min(100, Math.round(state.progression.experience / Math.max(1, state.progression.experienceMax) * 100));
    const initial = html((persona || '?').charAt(0).toUpperCase());
    panel.innerHTML = `
        <section class="tensei-character-hero"><button class="tensei-avatar" type="button" data-action="choose-portrait" aria-label="Choose profile picture">
            <span class="tensei-magic-ring ring-one"></span><span class="tensei-magic-ring ring-two"></span>
            ${state.player.portrait ? `<img src="${html(state.player.portrait)}" alt="${html(persona)} portrait">` : `<span class="tensei-avatar-initial">${initial}</span>`}
            <span class="tensei-avatar-edit"><i class="fa-solid fa-camera"></i></span></button>
            <input id="tensei-avatar-input" type="file" accept="image/png,image/jpeg,image/webp" hidden>
            <div class="tensei-character-copy"><span class="tensei-eyebrow">Current persona</span><h3>${html(persona)}</h3>
                <p class="tensei-character-title">${html(state.player.title)}</p><div class="tensei-identity-chips">
                <span><i class="fa-solid fa-dna"></i>${html(state.player.race)}</span><span><i class="fa-solid fa-shield-halved"></i>${html(state.player.guild)}</span>
                <span><i class="fa-solid fa-people-group"></i>${html(state.player.party)}</span></div></div>
            <span class="tensei-rank-seal"><small>Guild rank</small>${html(state.progression.adventurerRank)}</span></section>
        <section class="tensei-progress-deck"><div class="tensei-day-cycle" style="--phase:${phaseIndex}">
            <div class="tensei-cycle-line"><span></span></div>${DAY_PHASES.map((phase, index) => `<div class="tensei-cycle-stop${index === phaseIndex ? ' is-current' : ''}">
                <i class="${['fa-solid fa-sun','fa-regular fa-sun','fa-solid fa-cloud-sun','fa-solid fa-moon'][index]}"></i><span>${phase}</span></div>`).join('')}
            <div class="tensei-clock-label"><b>Day ${state.worldClock.day}</b><span>${html(state.worldClock.time)}</span></div></div>
            <div class="tensei-exp-line"><div class="tensei-exp-track"><span style="width:${expPercent}%"></span><i style="left:${expPercent}%"></i></div>
            <p><strong>${state.progression.experience} / ${state.progression.experienceMax} EXP</strong><span>Lv. ${state.player.level} · ${html(state.location.zoneType)} · ${html(state.location.place === 'Unknown' ? state.location.region : state.location.place)}</span></p></div></section>
        <div class="tensei-dashboard-grid">
            <article class="tensei-card tensei-vitals-card"><div class="tensei-card-title"><span>Vital resonance</span>
                <em><i class="fa-solid fa-wave-square"></i> ${html(state.player.condition)}</em></div><div class="tensei-vitals-grid">
                ${meterView('Health', state.player.hp, 'fa-solid fa-heart', 'health')}
                ${meterView('Mana', state.player.mp, 'fa-solid fa-droplet', 'mana')}
                ${meterView('Stamina', state.player.stamina, 'fa-solid fa-bolt', 'stamina')}</div></article>
            <article class="tensei-card"><div class="tensei-card-title"><span>Identity</span>
                <i class="fa-solid fa-feather"></i></div><dl class="tensei-fact-list">
                <div><dt>Race</dt><dd>${html(state.player.race)}</dd></div>
                <div><dt>Age</dt><dd>${html(state.player.age || 'Unknown')}</dd></div>
                <div><dt>Guild</dt><dd>${html(state.player.guild)}</dd></div>
                <div><dt>Party</dt><dd>${html(state.player.party)}</dd></div>
                <div><dt>Current region</dt><dd>${html(state.location.region)}</dd></div>
                <div><dt>Exact place</dt><dd>${html(state.location.place)}</dd></div></dl></article>
        </div>
        <details class="tensei-editor"><summary><i class="fa-solid fa-pen"></i> Edit status</summary>
            <form data-form="status" class="tensei-form-grid">
                ${input('Name', 'name', state.player.name)}${input('Title', 'title', state.player.title)}
                ${input('Race', 'race', state.player.race)}${input('Age', 'age', state.player.age)}
                ${input('Guild', 'guild', state.player.guild)}${input('Party', 'party', state.player.party)}
                ${input('Condition', 'condition', state.player.condition)}${input('Level', 'level', state.player.level, 'number', 'min="1"')}
                ${select('Day phase', 'phase', DAY_PHASES, state.worldClock.phase)}${input('World time', 'time', state.worldClock.time, 'time')}
                ${input('World day', 'day', state.worldClock.day, 'number', 'min="1"')}${select('Zone type', 'zoneType', ZONE_TYPES, state.location.zoneType)}
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
                ${rankRow('Sword mastery', p.swordRank, 'fa-solid fa-khanda')}${rankRow('Experience', `${p.experience} / ${p.experienceMax}`, 'fa-solid fa-star')}
                ${rankRow('Reputation', p.reputation, 'fa-solid fa-people-group')}</div></div>
        <article class="tensei-card tensei-wallet"><div><span>Gold</span><strong>${p.currency.gold}</strong></div>
            <div><span>Silver</span><strong>${p.currency.silver}</strong></div><div><span>Copper</span><strong>${p.currency.copper}</strong></div></article>
        <details class="tensei-editor"><summary><i class="fa-solid fa-pen"></i> Edit progression</summary>
            <form data-form="rank" class="tensei-form-grid">${select('Adventurer rank', 'adventurerRank', RANKS, p.adventurerRank)}
                ${select('Magic rank', 'magicRank', MASTERY, p.magicRank)}${select('Sword rank', 'swordRank', MASTERY, p.swordRank)}
                ${input('Experience', 'experience', p.experience, 'number', 'min="0"')}${input('EXP to next level', 'experienceMax', p.experienceMax, 'number', 'min="1"')}
                ${input('Reputation', 'reputation', p.reputation, 'number')}
                ${input('Gold', 'gold', p.currency.gold, 'number', 'min="0"')}${input('Silver', 'silver', p.currency.silver, 'number', 'min="0"')}
                ${input('Copper', 'copper', p.currency.copper, 'number', 'min="0"')}
                <button class="tensei-primary-button tensei-form-submit" type="submit">Save progression</button></form></details>`;
}

function renderMap(panel, state) {
    if (!panel) return;
    const current = currentMapLocation(state);
    if (!mapLocation(mapSelectionId)) mapSelectionId = current.id;
    const selected = mapLocation(mapSelectionId) || current;
    const discovered = new Set(state.location.discovered);
    const pinIds = new Set(state.location.pins.map(pin => pin.locationId));
    const mapMarkers = WORLD_LOCATIONS.map(location => {
        const isCurrent = location.id === current.id;
        const isSelected = location.id === selected.id;
        const isDiscovered = discovered.has(location.name) || isCurrent;
        const isPinned = pinIds.has(location.id);
        return `<g class="tensei-map-marker${isCurrent ? ' is-current' : ''}${isSelected ? ' is-selected' : ''}${isDiscovered ? ' is-discovered' : ''}${isPinned ? ' is-pinned' : ''}"
            data-map-location="${location.id}" transform="translate(${location.x} ${location.y})" tabindex="0" role="button" aria-label="${html(location.name)}">
            <circle class="tensei-marker-aura" r="14"></circle><path class="tensei-marker-pin" d="M0-9c-5 0-9 4-9 9 0 7 9 15 9 15S9 7 9 0c0-5-4-9-9-9Z"></path>
            <circle class="tensei-marker-core" cy="0" r="3"></circle><text x="0" y="28">${html(location.name)}</text></g>`;
    }).join('');
    panel.innerHTML = `${heading('Six-Faced World Atlas', `${state.location.continent} · ${state.location.region}`, 'fa-solid fa-earth-asia')}
        <div class="tensei-map-layout"><div class="tensei-map-frame"><div class="tensei-map-toolbar" aria-label="Map controls">
            <button type="button" data-action="map-zoom-in" title="Zoom in"><i class="fa-solid fa-plus"></i></button>
            <button type="button" data-action="map-zoom-out" title="Zoom out"><i class="fa-solid fa-minus"></i></button>
            <button type="button" data-action="map-center" title="Center current location"><i class="fa-solid fa-crosshairs"></i></button>
            <button type="button" data-action="map-reset" title="Reset map"><i class="fa-solid fa-expand"></i></button></div>
            <svg class="tensei-world-map" viewBox="0 0 1000 600" role="img" aria-label="Interactive map of the Mushoku Tensei world">
                <defs><linearGradient id="tensei-land-central" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#80915f"/><stop offset="1" stop-color="#405342"/></linearGradient>
                <linearGradient id="tensei-land-demon" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#8a5f4b"/><stop offset="1" stop-color="#4b3134"/></linearGradient>
                <linearGradient id="tensei-land-millis" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#688d63"/><stop offset="1" stop-color="#315853"/></linearGradient>
                <pattern id="tensei-sea-grid" width="36" height="36" patternUnits="userSpaceOnUse"><path d="M36 0H0V36" fill="none" stroke="#b9dddf" stroke-opacity=".045"/></pattern>
                <filter id="tensei-map-shadow"><feDropShadow dx="0" dy="5" stdDeviation="6" flood-color="#000" flood-opacity=".6"/></filter></defs>
                <rect width="1000" height="600" class="tensei-map-ocean"></rect><rect width="1000" height="600" fill="url(#tensei-sea-grid)"></rect>
                <g class="tensei-map-camera" transform="translate(${mapView.x} ${mapView.y}) scale(${mapView.scale})">
                    <g class="tensei-continent-shapes" filter="url(#tensei-map-shadow)">
                        <path class="land central" d="M72 86 178 57 308 62 394 95 500 103 554 151 538 219 579 279 554 341 581 402 557 497 487 534 373 521 315 487 245 473 185 425 135 356 91 278 52 181Z"/>
                        <path class="land begaritt" d="M46 412 137 389 235 415 305 486 277 561 165 578 66 543 25 480Z"/>
                        <path class="land demon" d="M682 71 823 47 937 70 978 135 961 226 907 310 824 326 750 292 704 219 663 151Z"/>
                        <path class="land millis" d="M637 352 715 318 822 329 916 374 965 448 932 538 824 570 716 548 646 493 604 414Z"/>
                        <path class="land heaven" d="M484 36 538 17 614 26 650 58 624 101 553 110 492 84 466 57Z"/>
                    </g>
                    <g class="tensei-mountains" aria-hidden="true"><path d="M196 92 220 154 245 99 271 169 303 108 334 179 371 116 404 188"/>
                    <path d="M672 449 710 411 735 460 768 416 797 476 830 435 856 491"/><path d="M133 470 161 443 188 486 219 449 244 506"/></g>
                    <g class="tensei-map-labels" aria-hidden="true"><text x="320" y="310">CENTRAL CONTINENT</text><text x="801" y="250">DEMON CONTINENT</text>
                    <text x="784" y="460">MILLIS CONTINENT</text><text x="138" y="518">BEGARITT</text><text x="530" y="60">HEAVEN</text></g>
                    <path class="tensei-route" d="M164 307Q254 286 277 228T315 117M553 495Q610 512 666 500T775 492M846 345Q855 325 854 307"/>
                    <g class="tensei-map-markers">${mapMarkers}</g>
                </g></svg>
            <div class="tensei-map-legend"><span><i class="current"></i>Current</span><span><i class="known"></i>Discovered</span><span><i class="marked"></i>Marked</span><small>Drag to pan · Pinch or scroll to zoom</small></div></div>
            <aside class="tensei-map-sidebar"><article class="tensei-location-dossier"><span class="tensei-eyebrow">Selected location</span><h4>${html(selected.name)}</h4>
                <p>${html(selected.continent)}</p><div class="tensei-zone-badge" data-zone="${html(selected.zone)}"><i class="fa-solid fa-shield"></i>${html(selected.zone)}</div>
                <dl><div><dt>Region</dt><dd>${html(LOCATION_REGIONS[selected.name] || selected.name)}</dd></div>
                <div><dt>Discovery</dt><dd>${discovered.has(selected.name) ? 'Recorded' : 'Unexplored'}</dd></div>
                <div><dt>Marker</dt><dd>${pinIds.has(selected.id) ? 'Pinned' : 'None'}</dd></div></dl></article>
                <form data-form="travel" class="tensei-travel-form"><label class="tensei-field"><span>Destination</span><select name="destination">
                    ${Object.entries(WORLD).map(([continent]) => `<optgroup label="${html(continent)}">${WORLD_LOCATIONS.filter(location => location.continent === continent).map(location =>
                        `<option value="${location.id}"${location.id === selected.id ? ' selected' : ''}>${html(location.name)}</option>`).join('')}</optgroup>`).join('')}</select></label>
                    ${input('Exact place / scene', 'place', selected.name)}${input('Location detail', 'detail', state.location.detail)}
                    <button class="tensei-primary-button" type="submit"><i class="fa-solid fa-route"></i> Travel and notify chat</button></form>
                <form data-form="map-pin" class="tensei-pin-form">${input('Marker label', 'label', selected.name)}${input('Marker note', 'note', '')}
                    <input type="hidden" name="locationId" value="${selected.id}"><button class="tensei-secondary-button" type="submit"><i class="fa-solid fa-map-pin"></i> Mark location</button></form>
                ${state.location.pins.length ? `<div class="tensei-pin-list">${state.location.pins.map(pin => `<button type="button" data-action="select-pin" data-location-id="${html(pin.locationId)}">
                    <i class="fa-solid fa-map-pin"></i><span>${html(pin.label)}<small>${html(pin.note || mapLocation(pin.locationId)?.name || '')}</small></span></button>`).join('')}</div>` : ''}</aside></div>`;
    setupMapInteractions(panel);
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
                age: values.age, guild: values.guild, party: values.party, condition: values.condition, level: values.level,
                hp: { current: values.hpCurrent, max: values.hpMax },
                mp: { current: values.mpCurrent, max: values.mpMax },
                stamina: { current: values.staminaCurrent, max: values.staminaMax },
            };
            state.worldClock = { day: values.day, time: values.time, phase: values.phase };
            state.location.zoneType = values.zoneType;
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
                swordRank: values.swordRank, experience: values.experience, experienceMax: values.experienceMax, reputation: values.reputation,
                currency: { gold: values.gold, silver: values.silver, copper: values.copper },
            };
            await persistState(state);
            notify('success', 'Progression saved.');
            break;
        case 'travel': {
            const destination = mapLocation(values.destination);
            if (!destination) return notify('warning', 'Choose a valid destination.');
            const previous = state.location.region;
            state.location = {
                ...state.location, continent: destination.continent, region: LOCATION_REGIONS[destination.name] || destination.name,
                place: values.place || destination.name, detail: values.detail, zoneType: destination.zone,
                discovered: [...new Set([...state.location.discovered, destination.name])],
            };
            state.journal.push({ id: uid(), text: `Traveled from ${previous} to ${destination.name}.`, at: new Date().toISOString() });
            if (await persistState(state, 'travel')) {
                const exact = values.place && values.place !== destination.name ? `, heading for ${values.place}` : '';
                sendChatAction(`*I travel to ${destination.name}${exact}. The scene is now in ${destination.continent}.*`);
            }
            break;
        }
        case 'map-pin': {
            const destination = mapLocation(values.locationId);
            if (!destination) return notify('warning', 'Choose a map location first.');
            const existing = state.location.pins.find(pin => pin.locationId === destination.id);
            const nextPin = { id: existing?.id || uid(), locationId: destination.id, label: values.label || destination.name, note: values.note };
            state.location.pins = [...state.location.pins.filter(pin => pin.locationId !== destination.id), nextPin];
            state.location.discovered = [...new Set([...state.location.discovered, destination.name])];
            await persistState(state, 'map');
            notify('success', `${destination.name} marked on the map.`);
            break;
        }
    }
}

async function onPanelChange(event) {
    const portrait = event.target.closest('#tensei-avatar-input');
    if (portrait instanceof HTMLInputElement && portrait.files?.[0]) {
        try {
            const state = clone(getState());
            state.player.portrait = await resizePortrait(portrait.files[0]);
            await persistState(state, 'portrait');
            notify('success', 'Profile picture updated.');
        } catch (error) {
            notify('error', error.message || 'Could not use that image.');
        }
        return;
    }
    const destination = event.target.closest('form[data-form="travel"] select[name="destination"]');
    if (destination) {
        mapSelectionId = destination.value;
        renderMap(document.querySelector('[data-panel="map"]'), getState());
    }
}

async function onPanelClick(event) {
    const button = event.target.closest('button[data-action], [data-map-location]');
    if (!button) return;
    if (button.dataset.mapLocation) {
        mapSelectionId = button.dataset.mapLocation;
        renderMap(document.querySelector('[data-panel="map"]'), getState());
        return;
    }

    const state = clone(getState());
    const id = button.dataset.id;
    switch (button.dataset.action) {
        case 'choose-portrait':
            document.getElementById('tensei-avatar-input')?.click();
            break;
        case 'map-zoom-in':
            setMapZoom(mapView.scale * 1.25);
            break;
        case 'map-zoom-out':
            setMapZoom(mapView.scale / 1.25);
            break;
        case 'map-reset':
            Object.assign(mapView, { scale: 1, x: 0, y: 0 });
            updateMapTransform();
            break;
        case 'map-center': {
            const location = currentMapLocation(state);
            mapView.scale = 1.8;
            mapView.x = 500 - location.x * mapView.scale;
            mapView.y = 300 - location.y * mapView.scale;
            updateMapTransform();
            break;
        }
        case 'select-pin':
            mapSelectionId = button.dataset.locationId;
            renderMap(document.querySelector('[data-panel="map"]'), getState());
            break;
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

function resizePortrait(file) {
    if (!file.type.startsWith('image/')) return Promise.reject(new Error('Choose a PNG, JPG, or WebP image.'));
    if (file.size > 8 * 1024 * 1024) return Promise.reject(new Error('The image must be smaller than 8 MB.'));
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.onload = () => {
            const image = new Image();
            image.onerror = () => reject(new Error('The image format is not supported.'));
            image.onload = () => {
                const size = 512;
                const canvas = document.createElement('canvas');
                canvas.width = size; canvas.height = size;
                const context = canvas.getContext('2d');
                const crop = Math.min(image.naturalWidth, image.naturalHeight);
                const sx = (image.naturalWidth - crop) / 2;
                const sy = (image.naturalHeight - crop) / 2;
                context.drawImage(image, sx, sy, crop, crop, 0, 0, size, size);
                resolve(canvas.toDataURL('image/jpeg', .86));
            };
            image.src = reader.result;
        };
        reader.readAsDataURL(file);
    });
}

function updateMapTransform() {
    const camera = document.querySelector('.tensei-map-camera');
    if (camera) camera.setAttribute('transform', `translate(${mapView.x} ${mapView.y}) scale(${mapView.scale})`);
}

function setMapZoom(scale, anchorX = 500, anchorY = 300) {
    const next = Math.min(4, Math.max(.75, scale));
    const ratio = next / mapView.scale;
    mapView.x = anchorX - (anchorX - mapView.x) * ratio;
    mapView.y = anchorY - (anchorY - mapView.y) * ratio;
    mapView.scale = next;
    updateMapTransform();
}

function setupMapInteractions(panel) {
    const svg = panel.querySelector('.tensei-world-map');
    if (!(svg instanceof SVGElement)) return;
    const pointers = new Map();
    let previous = null;
    let pinchDistance = 0;
    svg.addEventListener('wheel', event => {
        event.preventDefault();
        const rect = svg.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width * 1000;
        const y = (event.clientY - rect.top) / rect.height * 600;
        setMapZoom(mapView.scale * (event.deltaY < 0 ? 1.15 : .87), x, y);
    }, { passive: false });
    svg.addEventListener('pointerdown', event => {
        svg.setPointerCapture?.(event.pointerId);
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        previous = { x: event.clientX, y: event.clientY };
        svg.classList.add('is-dragging');
    });
    svg.addEventListener('pointermove', event => {
        if (!pointers.has(event.pointerId)) return;
        pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const points = [...pointers.values()];
        const rect = svg.getBoundingClientRect();
        if (points.length === 1 && previous) {
            mapView.x += (event.clientX - previous.x) / rect.width * 1000;
            mapView.y += (event.clientY - previous.y) / rect.height * 600;
            previous = { x: event.clientX, y: event.clientY };
            updateMapTransform();
        } else if (points.length >= 2) {
            const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
            if (pinchDistance) setMapZoom(mapView.scale * distance / pinchDistance);
            pinchDistance = distance;
        }
    });
    const end = event => {
        pointers.delete(event.pointerId);
        previous = pointers.size === 1 ? [...pointers.values()][0] : null;
        pinchDistance = 0;
        if (!pointers.size) svg.classList.remove('is-dragging');
    };
    svg.addEventListener('pointerup', end);
    svg.addEventListener('pointercancel', end);
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
${JSON.stringify(aiState(state))}

LATEST CHAT:
${transcript}

Return ONLY valid JSON: {"state": <complete updated state object>, "summary": "short description of confirmed changes"}.
Preserve every existing value unless the latest chat clearly establishes a change. Do not treat plans, questions,
out-of-character discussion, hypothetical events, rejected actions, or failed attempts as completed changes. Keep IDs
for inventory items, skills, quests, and map pins that still exist. Update location only after completed movement or a clear scene
change. Advance day, time, phase, experience, and level only when the story supports it. Update inventory, conditions, meters,
ranks, currency, skills, and quests only with chat evidence. The profile portrait is local UI data and is intentionally omitted. No prose
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
    if (eventTypes.PERSONA_CHANGED) eventSource.on(eventTypes.PERSONA_CHANGED, () => renderAll());
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
        console.info('[Tensei System] Role-play interface v0.3.0 loaded.');
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
