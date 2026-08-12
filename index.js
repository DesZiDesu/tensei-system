/* global SillyTavern, toastr */

const EXTENSION_FOLDER = 'third-party/tensei-system';
const SETTINGS_KEY = 'tensei_system';
const DEFAULT_SETTINGS = Object.freeze({ showWandLauncher: true });

let initialized = false;
let previousFocusedElement = null;
let menuObserver = null;

function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();

    if (!extensionSettings[SETTINGS_KEY]) {
        extensionSettings[SETTINGS_KEY] = structuredClone(DEFAULT_SETTINGS);
    }

    for (const [key, value] of Object.entries(DEFAULT_SETTINGS)) {
        if (!Object.hasOwn(extensionSettings[SETTINGS_KEY], key)) {
            extensionSettings[SETTINGS_KEY][key] = value;
        }
    }

    return extensionSettings[SETTINGS_KEY];
}

function buildInterfaceShell() {
    if (document.getElementById('tensei-system-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'tensei-system-overlay';
    overlay.className = 'tensei-system-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = `
        <button class="tensei-system-backdrop" type="button" aria-label="Close Tensei System"></button>
        <section id="tensei-system-panel" class="tensei-system-panel" role="dialog" aria-modal="true" aria-labelledby="tensei-system-title" tabindex="-1">
            <header class="tensei-system-panel-header">
                <div class="tensei-system-brand-mark" aria-hidden="true"><i class="fa-solid fa-book-open"></i></div>
                <div class="tensei-system-panel-heading">
                    <span class="tensei-system-kicker">SillyTavern Extension</span>
                    <h2 id="tensei-system-title">Tensei System</h2>
                </div>
                <button id="tensei-system-close" class="menu_button menu_button_icon" type="button" aria-label="Close Tensei System" title="Close">
                    <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
            </header>
            <main class="tensei-system-panel-body">
                <div class="tensei-system-placeholder" role="status">
                    <i class="fa-solid fa-layer-group" aria-hidden="true"></i>
                    <h3>Interface shell loaded</h3>
                    <p>The Mushoku Tensei tabs and role-play systems will be added in the next stage.</p>
                </div>
            </main>
            <footer class="tensei-system-panel-footer">
                <span>Responsive drawer foundation</span>
                <span class="tensei-system-device-label" aria-hidden="true"></span>
            </footer>
        </section>`;

    document.body.appendChild(overlay);
    overlay.querySelector('.tensei-system-backdrop')?.addEventListener('click', closeInterface);
    overlay.querySelector('#tensei-system-close')?.addEventListener('click', closeInterface);
}

function openInterface() {
    buildInterfaceShell();
    const overlay = document.getElementById('tensei-system-overlay');
    const panel = document.getElementById('tensei-system-panel');
    if (!overlay || !panel) return;

    previousFocusedElement = document.activeElement;
    overlay.classList.add('is-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.classList.add('tensei-system-open');
    requestAnimationFrame(() => panel.focus());
}

function closeInterface() {
    const overlay = document.getElementById('tensei-system-overlay');
    if (!overlay?.classList.contains('is-open')) return;

    overlay.classList.remove('is-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('tensei-system-open');

    if (previousFocusedElement instanceof HTMLElement) {
        previousFocusedElement.focus({ preventScroll: true });
    }
}

function handleGlobalKeydown(event) {
    if (event.key === 'Escape') closeInterface();
}

function syncWandLauncherVisibility() {
    const launcher = document.getElementById('tensei-system-wand-launcher');
    if (launcher) launcher.hidden = !getSettings().showWandLauncher;
}

function createWandLauncher() {
    if (document.getElementById('tensei-system-wand-launcher')) return true;

    const extensionsMenu = document.getElementById('extensionsMenu');
    if (!extensionsMenu) return false;

    const launcher = document.createElement('div');
    launcher.id = 'tensei-system-wand-launcher';
    launcher.className = 'list-group-item flex-container flexGap5 interactable';
    launcher.tabIndex = 0;
    launcher.setAttribute('role', 'button');
    launcher.title = 'Open Tensei System';
    launcher.innerHTML = '<i class="fa-solid fa-book-open" aria-hidden="true"></i><span>Tensei System</span>';

    const activate = (event) => {
        if (event.type === 'keydown' && event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        openInterface();
    };

    launcher.addEventListener('click', activate);
    launcher.addEventListener('keydown', activate);
    extensionsMenu.appendChild(launcher);
    syncWandLauncherVisibility();
    return true;
}

function observeForWandMenu() {
    if (createWandLauncher() || menuObserver) return;

    menuObserver = new MutationObserver(() => {
        if (createWandLauncher()) {
            menuObserver.disconnect();
            menuObserver = null;
        }
    });
    menuObserver.observe(document.body, { childList: true, subtree: true });
}

async function addSettingsDrawer() {
    if (document.getElementById('tensei-system-settings')) return;

    const context = SillyTavern.getContext();
    const container = document.getElementById('extensions_settings2');
    if (!container) throw new Error('Could not find the SillyTavern Extensions settings container.');

    const html = await context.renderExtensionTemplateAsync(EXTENSION_FOLDER, 'settings');
    container.insertAdjacentHTML('beforeend', html);

    const settings = getSettings();
    const showLauncher = document.getElementById('tensei-system-show-launcher');
    const openButton = document.getElementById('tensei-system-open-from-settings');

    if (showLauncher instanceof HTMLInputElement) {
        showLauncher.checked = settings.showWandLauncher;
        showLauncher.addEventListener('change', () => {
            settings.showWandLauncher = showLauncher.checked;
            context.saveSettingsDebounced();
            syncWandLauncherVisibility();
        });
    }

    openButton?.addEventListener('click', openInterface);
}

async function initialize() {
    if (initialized) return;
    initialized = true;

    try {
        getSettings();
        buildInterfaceShell();
        await addSettingsDrawer();
        observeForWandMenu();
        document.addEventListener('keydown', handleGlobalKeydown);
        console.info('[Tensei System] Drawer shell loaded.');
    } catch (error) {
        initialized = false;
        console.error('[Tensei System] Failed to initialize.', error);
        if (typeof toastr !== 'undefined') toastr.error('Tensei System could not load. Check the browser console.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
} else {
    void initialize();
}
