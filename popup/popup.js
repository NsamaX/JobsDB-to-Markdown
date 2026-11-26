const statusEl = document.getElementById('status');
const countEl = document.getElementById('count');
const keywordsEl = document.getElementById('keywords');
const pagesEl = document.getElementById('pages');

async function activeTab() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  return tab;
}

async function send(cmd, extra = {}) {
  const tab = await activeTab();
  if (!tab?.url?.startsWith('https://th.jobsdb.com/')) {
    statusEl.textContent = 'Open any th.jobsdb.com page in this tab.';
    return;
  }
  try {
    await browser.tabs.sendMessage(tab.id, { cmd, ...extra });
  } catch {
    statusEl.textContent = 'Reload the JobsDB page, then try again.';
  }
}

async function render() {
  const { state } = await browser.storage.local.get('state');
  if (!state) return;
  statusEl.textContent = state.message || (state.running ? 'Running...' : 'Idle');
  countEl.textContent = `Collected: ${Object.keys(state.jobs || {}).length}`;
}

document.getElementById('start').onclick = () =>
  send('start', { keywords: keywordsEl.value, pages: pagesEl.value });
document.getElementById('stop').onclick = () => send('stop');
document.getElementById('export').onclick = () => send('export');
document.getElementById('clear').onclick = async () => {
  await browser.storage.local.set({ state: { running: false, jobs: {}, message: 'Cleared.' } });
};

browser.storage.local.get('state').then(({ state }) => {
  if (state?.query) keywordsEl.value = state.query;
  if (state?.pages) pagesEl.value = state.pages;
});
browser.storage.onChanged.addListener(render);
render();
