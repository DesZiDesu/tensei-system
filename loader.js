/* Stable bootstrap. Keep this filename and loader logic unchanged in future releases. */
const root = new URL('.', import.meta.url);
if (!globalThis.__tenseiBootstrap) {
    globalThis.__tenseiBootstrap = true;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const url = file => new URL(`${file}?v=${token}`, root).href;
    async function start() {
        try {
            // No stylesheet @imports: every local asset receives the same fresh token.
            for (const [index, file] of ['style.css', 'ui-polish.css', 'chat-ui.css'].entries()) {
                const link = document.createElement('link');
                link.rel = 'stylesheet'; link.href = url(file); link.dataset.tenseiAsset = String(index);
                document.head.append(link);
            }
            await import(url('runtime.js'));
        } catch (error) {
            console.error('[Tensei] Loader failed', error);
            const message = document.createElement('div');
            message.textContent = 'Tensei โหลดไม่สำเร็จ ตรวจการเชื่อมต่อแล้วรีเฟรชหน้า (ไม่ต้องล้าง cache)';
            message.setAttribute('role', 'alert');
            (document.getElementById('extensions_settings2') || document.body).append(message);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
    else void start();
}
