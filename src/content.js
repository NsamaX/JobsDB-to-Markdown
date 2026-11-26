// Runs on th.jobsdb.com search pages. Clicks each job card in turn, reads the
// detail panel the site renders, stores it, then moves to the next results page.
// State lives in storage.local so a full page reload resumes where it stopped.
(() => {
  const MIN_DELAY = 1500;
  const MAX_DELAY = 3000;
  const LOAD_TIMEOUT = 20000;

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const jitter = () => MIN_DELAY + Math.random() * (MAX_DELAY - MIN_DELAY);
  const $ = (sel, root = document) => root.querySelector(sel);
  const txt = (sel, root) => ($(sel, root)?.innerText || '').trim();
  const firstText = (root, ...sels) => sels.map(s => txt(s, root)).find(Boolean) || '';
  const searchUrl = keywords =>
    `https://th.jobsdb.com/${keywords.trim().split(/\s+/).map(encodeURIComponent).join('-')}-jobs`;

  const panel = () => $('[data-automation="splitViewJobDetailsWrapper"]');
  const isChallenge = () => /just a moment|attention required/i.test(document.title);

  let busy = false;

  async function getState() {
    const { state } = await browser.storage.local.get('state');
    return state || { running: false, jobs: {} };
  }

  async function setState(patch) {
    const state = { ...(await getState()), ...patch };
    await browser.storage.local.set({ state });
    return state;
  }

  const norm = s => s.replace(/\s+/g, ' ').trim();
  const selectedId = () => new URL(location.href).searchParams.get('jobId');

  async function waitDetail(id, title) {
    const head = norm(title).slice(0, 20);
    const t0 = Date.now();
    while (Date.now() - t0 < LOAD_TIMEOUT) {
      const t = norm(panel()?.innerText || '');
      if (selectedId() === id && t.length > 200 && t.includes(head)) {
        await sleep(300);
        return panel();
      }
      await sleep(200);
    }
    console.warn('[jobsdb-to-md] detail timeout', { id, urlJobId: selectedId(), panelFound: !!panel() });
    return null;
  }

  function readJob(card, detail) {
    const id = card.getAttribute('data-job-id');
    return {
      id,
      url: `https://th.jobsdb.com/job/${id}`,
      title: firstText(detail, '[data-automation="job-detail-title"]') || txt('[data-automation="jobTitle"]', card),
      company: firstText(detail, '[data-automation="advertiser-name"]') || txt('[data-automation="jobCompany"]', card),
      location: firstText(detail, '[data-automation="job-detail-location"]') ||
        firstText(card, '[data-automation="jobLocation"]', '[data-automation="jobCardLocation"]'),
      workType: firstText(detail, '[data-automation="job-detail-work-type"]'),
      salary: firstText(detail, '[data-automation="job-detail-salary"]') || txt('[data-automation="jobSalary"]', card),
      classification: firstText(detail, '[data-automation="job-detail-classifications"]') ||
        [txt('[data-automation="jobClassification"]', card), txt('[data-automation="jobSubClassification"]', card)]
          .filter(Boolean).join(' / '),
      listed: txt('[data-automation="jobListingDate"]', card),
      description: detail ? firstText(detail, '[data-automation="jobAdDetails"]') || detail.innerText.trim() : '',
    };
  }

  async function collectPage() {
    const cards = [...document.querySelectorAll('article[data-job-id]')];
    for (const card of cards) {
      let state = await getState();
      if (!state.running) return false;
      const id = card.getAttribute('data-job-id');
      if (state.jobs[id]?.description) continue;

      const title = txt('[data-automation="jobTitle"]', card);
      await setState({ message: `Page ${state.pagesDone + 1}/${state.pages}: ${title}` });
      (card.querySelector('[data-automation="job-list-item-link-overlay"]') || card).click();
      const detail = await waitDetail(id, title);

      if (isChallenge()) {
        await setState({ running: false, message: 'Stopped: Cloudflare check appeared. Pass it, then press Start again.' });
        return false;
      }

      state = await getState();
      state.jobs[id] = readJob(card, detail);
      const count = Object.keys(state.jobs).length;
      await setState({ jobs: state.jobs, message: `${count} jobs collected${detail ? '' : ' (last one: no detail)'}` });
      await sleep(jitter());
    }
    return true;
  }

  async function goNext() {
    const next = $('a[aria-label="Next"]');
    if (!next || next.getAttribute('aria-hidden') === 'true') return false;
    const firstId = $('article[data-job-id]')?.getAttribute('data-job-id');
    next.click();
    const t0 = Date.now();
    while (Date.now() - t0 < LOAD_TIMEOUT &&
      $('article[data-job-id]')?.getAttribute('data-job-id') === firstId) await sleep(300);
    await sleep(jitter());
    return true;
  }

  async function run() {
    if (busy) return;
    busy = true;
    try {
      while (await collectPage()) {
        const state = await setState({ pagesDone: (await getState()).pagesDone + 1 });
        if (state.pagesDone >= state.pages || !(await goNext())) {
          await setState({ running: false, message: `Done: ${Object.keys(state.jobs).length} jobs. Press Export.` });
          break;
        }
      }
    } finally {
      busy = false;
    }
  }

  function exportMarkdown(state) {
    const blob = new Blob([JobsdbMarkdown.build(state)], { type: 'text/markdown' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = JobsdbMarkdown.filename(state);
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  browser.runtime.onMessage.addListener(async msg => {
    if (msg.cmd === 'start') {
      const keywords = (msg.keywords || '').trim();
      if (!keywords) {
        await setState({ message: 'Enter a position to search for.' });
        return;
      }
      const state = await getState();
      const sameSearch = state.query?.toLowerCase() === keywords.toLowerCase();
      await setState({
        running: true,
        jobs: sameSearch ? state.jobs : {},
        query: keywords,
        searchUrl: searchUrl(keywords),
        pages: Math.max(1, Math.floor(Number(msg.pages)) || 1),
        pagesDone: 0,
        message: 'Opening search...',
      });
      // The load of the search page starts run() from the startup check below.
      location.href = searchUrl(keywords);
    } else if (msg.cmd === 'stop') {
      await setState({ running: false, message: 'Stopped.' });
    } else if (msg.cmd === 'export') {
      exportMarkdown(await getState());
    }
  });

  getState().then(state => {
    if (state.running && document.querySelector('article[data-job-id]')) run();
  });
})();
