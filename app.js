const grid = document.getElementById('grid');
const statusEl = document.getElementById('status');
const chipsEl = document.getElementById('chips');
const searchEl = document.getElementById('search');
const savedToggle = document.getElementById('savedToggle');
const savedCountEl = document.getElementById('savedCount');

let articles = [];
let activeSource = '';
let showSaved = false;
let saved = loadSaved(); // { [link]: article }
let debounce;

function loadSaved() {
  try { return JSON.parse(localStorage.getItem('robotics-saved')) || {}; }
  catch { return {}; }
}
function persistSaved() {
  try { localStorage.setItem('robotics-saved', JSON.stringify(saved)); } catch {}
  savedCountEl.textContent = Object.keys(saved).length;
}

function timeAgo(iso) {
  const mins = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (mins < 60) return Math.max(mins, 1) + 'm ago';
  if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
  if (mins < 43200) return Math.floor(mins / 1440) + 'd ago';
  return new Date(iso).toLocaleDateString();
}

// Builds DOM nodes with textContent so feed content can never inject HTML
function el(tag, props = {}, ...kids) {
  const node = document.createElement(tag);
  Object.assign(node, props);
  kids.forEach(k => node.append(k));
  return node;
}

function card(a) {
  const col = el('div', { className: 'col' });
  const c = el('article', { className: 'news-card' });

  if (a.image) {
    const img = el('img', { className: 'thumb', src: a.image, alt: '', loading: 'lazy' });
    img.onerror = () => img.remove();
    c.append(img);
  }

  const link = el('a', { href: a.link, target: '_blank', rel: 'noopener noreferrer', textContent: a.title });
  const isSaved = !!saved[a.link];
  const btn = el('button', {
    className: 'save-btn' + (isSaved ? ' saved' : ''),
    textContent: isSaved ? 'Saved' : 'Save',
    type: 'button'
  });
  btn.setAttribute('aria-pressed', isSaved);
  btn.onclick = () => {
    if (saved[a.link]) delete saved[a.link]; else saved[a.link] = a;
    persistSaved();
    render();
  };

  c.append(el('div', { className: 'body' },
    el('div', { className: 'meta' },
      el('span', { textContent: a.source }),
      el('span', { className: 'when', textContent: timeAgo(a.date) })),
    el('h2', {}, link),
    el('p', { textContent: a.summary }),
    btn));

  col.append(c);
  return col;
}

function renderChips(sources) {
  chipsEl.replaceChildren();
  [{ id: '', name: 'All sources' }, ...sources].forEach(s => {
    const b = el('button', { className: 'chip' + (s.id === activeSource ? ' active' : ''), textContent: s.name, type: 'button' });
    b.onclick = () => { activeSource = s.id; load(); };
    chipsEl.append(b);
  });
}

function render() {
  const list = showSaved ? Object.values(saved) : articles;
  grid.replaceChildren(...list.map(card));
  if (!list.length) {
    statusEl.className = 'status';
    statusEl.textContent = showSaved
      ? 'No saved articles yet. Press Save on any story to keep it here.'
      : 'No articles match. Try a different search or source.';
  }
}

async function load(refresh = false) {
  statusEl.className = 'status';
  statusEl.textContent = 'Loading headlines...';
  const params = new URLSearchParams({ q: searchEl.value, source: activeSource });
  if (refresh) params.set('refresh', '1');
  try {
    const res = await fetch('/api/news?' + params);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Request failed');
    articles = data.articles;
    renderChips(data.sources);
    let msg = `${articles.length} articles. Updated ${timeAgo(data.fetchedAt)}.`;
    if (data.failed.length) msg += ` Could not reach: ${data.failed.join(', ')}.`;
    render();
    if (articles.length || showSaved) statusEl.textContent = msg;
  } catch (err) {
    statusEl.className = 'status error';
    statusEl.textContent = err.message + ' Check your connection and press Refresh.';
  }
}

searchEl.addEventListener('input', () => {
  clearTimeout(debounce);
  debounce = setTimeout(() => { showSaved = false; savedToggle.setAttribute('aria-pressed', false); load(); }, 300);
});
savedToggle.onclick = () => {
  showSaved = !showSaved;
  savedToggle.setAttribute('aria-pressed', showSaved);
  savedToggle.classList.toggle('active', showSaved);
  render();
};
document.getElementById('refresh').onclick = () => load(true);

persistSaved();
load();
