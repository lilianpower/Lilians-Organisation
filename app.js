// Organização — tudo fica guardado no próprio telemóvel (localStorage),
// por isso funciona sem internet.

const STORAGE_KEY = 'lo.items.v1';

const CATEGORIES = [
  { id: 'tarefas',      label: 'Tarefas',      emoji: '✅' },
  { id: 'compromissos', label: 'Compromissos', emoji: '📅' },
  { id: 'compras',      label: 'Compras',      emoji: '🛒' },
  { id: 'ideias',       label: 'Ideias',       emoji: '💡' },
  { id: 'notas',        label: 'Notas',        emoji: '📝' },
];

// Palavras-chave (português e inglês) usadas para adivinhar a categoria.
// Para forçar uma categoria, começa com #compras, #tarefas, #ideias, etc.
const KEYWORDS = {
  compras: [
    'comprar', 'compra', 'compras', 'mercado', 'supermercado', 'farmacia', 'loja',
    'leite', 'pao', 'ovos', 'fruta', 'arroz', 'cafe', 'shampoo',
    'buy', 'shop', 'shopping', 'groceries', 'grocery', 'supermarket', 'milk', 'bread', 'eggs',
  ],
  compromissos: [
    'consulta', 'reuniao', 'dentista', 'medico', 'medica', 'jantar', 'almoco', 'aniversario',
    'festa', 'voo', 'entrevista', 'marcacao',
    'appointment', 'meeting', 'dentist', 'doctor', 'dinner', 'lunch', 'birthday', 'party',
    'flight', 'interview',
  ],
  ideias: [
    'ideia', 'ideias', 'talvez', 'e se', 'quem sabe', 'inspiracao', 'sonho',
    'idea', 'ideas', 'maybe', 'what if', 'someday', 'inspiration',
  ],
  tarefas: [
    'fazer', 'ligar', 'pagar', 'enviar', 'marcar', 'limpar', 'arrumar', 'lavar', 'tratar',
    'responder', 'lembrar', 'preciso', 'tenho que', 'tenho de', 'nao esquecer', 'devolver',
    'to do', 'call', 'pay', 'send', 'email', 'book', 'clean', 'fix', 'wash',
    'reply', 'remember', 'need to', 'have to', 'return',
  ],
};

const WEEKDAYS = [
  ['domingo', 'sunday'], ['segunda', 'monday'], ['terca', 'tuesday'], ['quarta', 'wednesday'],
  ['quinta', 'thursday'], ['sexta', 'friday'], ['sabado', 'saturday'],
];

// ---------- guardar / carregar ----------

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let items = load();
let activeTab = 'todos';
let query = '';

// ---------- organizar automaticamente ----------

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function hasWord(text, word) {
  return new RegExp(`(^|[^a-z0-9])${word}([^a-z0-9]|$)`).test(text);
}

function detectDue(text) {
  const t = normalize(text);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const addDays = (n) => new Date(today.getTime() + n * 86400000);

  if (hasWord(t, 'depois de amanha') || hasWord(t, 'day after tomorrow')) return addDays(2);
  if (hasWord(t, 'amanha') || hasWord(t, 'tomorrow')) return addDays(1);
  if (hasWord(t, 'hoje') || hasWord(t, 'today') || hasWord(t, 'tonight') || hasWord(t, 'esta noite')) return today;

  const dm = t.match(/(^|\D)(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?(\D|$)/);
  if (dm) {
    const day = +dm[2];
    const month = +dm[3] - 1;
    let year = dm[4] ? +dm[4] : today.getFullYear();
    if (year < 100) year += 2000;
    const d = new Date(year, month, day);
    if (!dm[4] && d < today) d.setFullYear(year + 1);
    if (d.getMonth() === month) return d;
  }

  for (let i = 0; i < WEEKDAYS.length; i++) {
    if (WEEKDAYS[i].some((w) => hasWord(t, w))) {
      const diff = (i - today.getDay() + 7) % 7 || 7;
      return addDays(diff);
    }
  }
  return null;
}

function hasTime(text) {
  return /\b\d{1,2}(:\d{2})?\s?(h|am|pm)\b|\bas \d{1,2}\b|\bat \d{1,2}\b/.test(normalize(text));
}

function categorize(text) {
  const t = normalize(text);

  const tag = t.match(/#(\w+)/);
  if (tag) {
    const found = CATEGORIES.find((c) => c.id.startsWith(tag[1]) || normalize(c.label).startsWith(tag[1]));
    if (found) return found.id;
  }

  if (KEYWORDS.compras.some((w) => hasWord(t, w))) return 'compras';
  if (KEYWORDS.compromissos.some((w) => hasWord(t, w))) return 'compromissos';
  if (detectDue(text) && hasTime(text)) return 'compromissos';
  if (KEYWORDS.ideias.some((w) => hasWord(t, w))) return 'ideias';
  if (KEYWORDS.tarefas.some((w) => hasWord(t, w))) return 'tarefas';
  if (detectDue(text)) return 'tarefas';
  return 'notas';
}

// ---------- ações ----------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addItem(rawText) {
  const text = rawText.trim();
  if (!text) return;
  const now = Date.now();
  const due = detectDue(text);
  items.unshift({
    id: uid(),
    text: text.replace(/#\w+\s*/g, '').trim() || text,
    category: categorize(text),
    done: false,
    due: due ? due.getTime() : null,
    createdAt: now,
    updatedAt: now,
  });
  save();
  render();
}

function updateItem(id, changes) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  Object.assign(item, changes, { updatedAt: Date.now() });
  save();
  render();
}

function deleteItem(id) {
  items = items.filter((i) => i.id !== id);
  save();
  render();
}

function nextCategory(current) {
  const idx = CATEGORIES.findIndex((c) => c.id === current);
  return CATEGORIES[(idx + 1) % CATEGORIES.length].id;
}

// ---------- mostrar no ecrã ----------

const $ = (id) => document.getElementById(id);

function formatDue(ms) {
  const d = new Date(ms);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Amanhã';
  if (diff < 0) return `Atrasado (${d.toLocaleDateString('pt')})`;
  return d.toLocaleDateString('pt', { weekday: 'short', day: 'numeric', month: 'short' });
}

function sortItems(list) {
  return list.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due) return a.due - b.due;
    if (a.due) return -1;
    if (b.due) return 1;
    return b.createdAt - a.createdAt;
  });
}

function renderTabs() {
  const tabs = [{ id: 'todos', label: 'Tudo', emoji: '🗂️' }, ...CATEGORIES];
  $('tabs').innerHTML = '';
  for (const tab of tabs) {
    const count = items.filter((i) => !i.done && (tab.id === 'todos' || i.category === tab.id)).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = tab.id === activeTab ? 'active' : '';
    btn.innerHTML = `${tab.emoji} ${tab.label}<span class="count">${count || ''}</span>`;
    btn.onclick = () => { activeTab = tab.id; render(); };
    $('tabs').appendChild(btn);
  }
}

function renderItem(item) {
  const cat = CATEGORIES.find((c) => c.id === item.category) || CATEGORIES[4];
  const el = document.createElement('div');
  el.className = 'item' + (item.done ? ' done' : '');

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = item.done;
  check.onchange = () => updateItem(item.id, { done: check.checked });

  const body = document.createElement('div');
  body.className = 'body';
  const text = document.createElement('div');
  text.className = 'text';
  text.textContent = item.text;
  const meta = document.createElement('div');
  meta.className = 'meta';

  const catBtn = document.createElement('button');
  catBtn.className = 'cat';
  catBtn.type = 'button';
  catBtn.title = 'Toca para mudar de categoria';
  catBtn.textContent = `${cat.emoji} ${cat.label}`;
  catBtn.onclick = () => updateItem(item.id, { category: nextCategory(item.category) });
  meta.appendChild(catBtn);

  if (item.due) {
    const due = document.createElement('span');
    due.className = 'due';
    due.textContent = formatDue(item.due);
    meta.appendChild(due);
  }
  body.append(text, meta);

  const del = document.createElement('button');
  del.className = 'del';
  del.type = 'button';
  del.title = 'Apagar';
  del.textContent = '✕';
  del.onclick = () => { if (confirm('Apagar isto?')) deleteItem(item.id); };

  el.append(check, body, del);
  return el;
}

function render() {
  renderTabs();
  const list = $('list');
  list.innerHTML = '';

  const q = normalize(query);
  const visible = items.filter((i) =>
    (activeTab === 'todos' || i.category === activeTab) && (!q || normalize(i.text).includes(q)));

  if (!visible.length) {
    list.innerHTML = `<p class="empty">${items.length ? 'Nada aqui.' : 'Escreve algo em cima para começar ✨'}</p>`;
    return;
  }

  if (activeTab === 'todos') {
    for (const cat of CATEGORIES) {
      const group = sortItems(visible.filter((i) => i.category === cat.id));
      if (!group.length) continue;
      const section = document.createElement('section');
      section.className = 'group';
      section.innerHTML = `<h2>${cat.emoji} ${cat.label}</h2>`;
      group.forEach((i) => section.appendChild(renderItem(i)));
      list.appendChild(section);
    }
  } else {
    sortItems(visible).forEach((i) => list.appendChild(renderItem(i)));
  }
}

// ---------- ligar os botões ----------

$('addForm').addEventListener('submit', (e) => {
  e.preventDefault();
  addItem($('input').value);
  $('input').value = '';
  $('input').focus();
});

$('input').addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    $('addForm').requestSubmit();
  }
});

$('search').addEventListener('input', (e) => { query = e.target.value; render(); });

$('clearDoneBtn').addEventListener('click', () => {
  const n = items.filter((i) => i.done).length;
  if (n && confirm(`Apagar ${n} concluído(s)?`)) {
    items = items.filter((i) => !i.done);
    save();
    render();
  }
});

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `organizacao-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error();
    const byId = new Map(items.map((i) => [i.id, i]));
    for (const it of imported) {
      const mine = byId.get(it.id);
      if (!mine || (it.updatedAt || 0) > (mine.updatedAt || 0)) byId.set(it.id, it);
    }
    items = [...byId.values()];
    save();
    render();
    alert('Cópia restaurada ✔');
  } catch {
    alert('Este ficheiro não parece ser uma cópia válida.');
  }
  e.target.value = '';
});

// ---------- online / offline ----------

function updateStatus() {
  $('status').textContent = navigator.onLine ? '' : '● offline';
}
window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
updateStatus();

// ---------- instalar no ecrã principal ----------

let installPrompt = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  installPrompt = e;
  $('installBtn').hidden = false;
});
$('installBtn').addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $('installBtn').hidden = true;
});

const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
if (isIOS && !isStandalone) $('iosHint').hidden = false;

// ---------- funcionar sem internet ----------

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js'));
}

render();
