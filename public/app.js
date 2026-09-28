// Organizar — os dados ficam guardados no próprio telemóvel (localStorage), por isso
// funciona sem internet. Com a sincronização ligada, as alterações são enviadas para
// uma lista partilhada no Netlify sempre que há ligação.

const STORAGE_KEY = 'lo.items.v1';
const SYNC_KEY = 'lo.sync.code';
const TOMBSTONE_TTL = 60 * 86400000;

// ---------- língua: segue a língua do telemóvel ----------

const LOCALE = navigator.language || 'pt';
const LANG = LOCALE.toLowerCase().startsWith('pt') ? 'pt' : 'en';
const BR = LOCALE.toLowerCase() === 'pt-br';

const STRINGS = {
  pt: {
    install: 'Instalar',
    iosHint: `Para instalar: toque em <strong>Compartilhar</strong> ⬆️ e depois em <strong>${BR ? 'Adicionar à Tela de Início' : 'Adicionar ao ecrã principal'}</strong>.`,
    placeholder: 'Escreva qualquer coisa… ex: dentista amanhã às 10h, comprar leite',
    placeholderDay: 'Adicionar neste dia… ex: reunião 14h, pagar conta',
    add: 'Adicionar',
    search: 'Procurar…',
    export: 'Fazer backup',
    import: 'Restaurar backup',
    clearDone: 'Limpar concluídos',
    all: 'Tudo',
    empty: 'Escreva algo acima para começar ✨',
    nothing: 'Nada aqui.',
    dayEmpty: 'Nada marcado para este dia. Escreva acima para adicionar ✨',
    changeCat: 'Toque para mudar de categoria',
    delete: 'Apagar',
    confirmDelete: 'Apagar isto?',
    confirmClear: (n) => `Apagar ${n} concluído(s)?`,
    restored: 'Backup restaurado ✔',
    badFile: 'Este arquivo não parece ser um backup válido.',
    today: 'Hoje', tomorrow: 'Amanhã', late: 'Atrasado',
    viewDay: '📅 Dia', viewMonth: '🗓️ Mês', viewList: '🗂️ Lista',
    goToday: 'Voltar para hoje',
    lateTitle: '⚠️ Atrasados',
    undatedTitle: '✅ Para fazer (sem data)',
    fText: 'O quê', fDate: 'Dia', fTime: 'Horário', fCat: 'Categoria', fNote: 'Anotações',
    save: 'Salvar', cancel: 'Cancelar',
    offline: 'offline', syncing: 'sincronizando…', synced: 'sincronizado', syncError: 'erro', notShared: 'compartilhar',
    syncIntro: 'Compartilhe esta agenda com outra pessoa (ou outro aparelho). O que um escreve aparece no outro — mesmo sem internet, tudo se junta quando a conexão voltar.',
    createShared: 'Criar agenda compartilhada',
    haveCode: 'Ou, se você recebeu um código:',
    codePlaceholder: 'Cole o código aqui',
    join: 'Entrar',
    code: 'Código:',
    invite: 'Enviar convite',
    leave: 'Parar de sincronizar',
    confirmLeave: 'Parar de sincronizar neste aparelho? A agenda continua salva aqui, mas deixa de receber alterações.',
    confirmSwitch: 'Entrar nesta agenda compartilhada? O que você tem aqui também vai para lá.',
    badCode: 'Esse código não parece certo. Confira se copiou tudo.',
    lastSync: (t) => `✓ Sincronizado às ${t}`,
    notYet: 'Ainda não sincronizou (sem internet?)',
    inviteText: (link, code) => `Entre na minha agenda do Organizar 💜\n\nAbra este link: ${link}\n\nOu, no app, toque em 🔄 e cole este código: ${code}`,
    copied: 'Convite copiado — cole numa mensagem.',
  },
  en: {
    install: 'Install',
    iosHint: 'To install: tap <strong>Share</strong> ⬆️ then <strong>Add to Home Screen</strong>.',
    placeholder: 'Type anything… e.g. buy milk, dentist tomorrow at 10am',
    add: 'Add',
    placeholderDay: 'Add to this day… e.g. meeting 2pm, pay bill',
    dayEmpty: 'Nothing planned for this day. Type above to add ✨',
    viewDay: '📅 Day', viewMonth: '🗓️ Month', viewList: '🗂️ List',
    goToday: 'Back to today',
    lateTitle: '⚠️ Overdue',
    undatedTitle: '✅ To do (no date)',
    fText: 'What', fDate: 'Day', fTime: 'Time', fCat: 'Category', fNote: 'Notes',
    save: 'Save', cancel: 'Cancel',
    search: 'Search…',
    export: 'Save a copy',
    import: 'Restore a copy',
    clearDone: 'Clear completed',
    all: 'All',
    empty: 'Type something above to get started ✨',
    nothing: 'Nothing here.',
    changeCat: 'Tap to change category',
    delete: 'Delete',
    confirmDelete: 'Delete this?',
    confirmClear: (n) => `Delete ${n} completed item(s)?`,
    restored: 'Copy restored ✔',
    badFile: 'This file doesn’t look like a valid copy.',
    today: 'Today', tomorrow: 'Tomorrow', late: 'Overdue',
    offline: 'offline', syncing: 'syncing…', synced: 'synced', syncError: 'error', notShared: 'share',
    syncIntro: 'Share this list with someone else (or another device). What one of you writes shows up for the other — even if one is offline, everything merges when the connection comes back.',
    createShared: 'Create shared list',
    haveCode: 'Or, if you were sent a code:',
    codePlaceholder: 'Paste the code here',
    join: 'Join',
    code: 'Code:',
    invite: 'Send invite',
    leave: 'Stop syncing',
    confirmLeave: 'Stop syncing on this device? The list stays here but won’t get new changes.',
    confirmSwitch: 'Join this shared list? What you have here will be added to it too.',
    badCode: 'That code doesn’t look right. Check you copied all of it.',
    lastSync: (t) => `✓ Synced at ${t}`,
    notYet: 'Not synced yet (no internet?)',
    inviteText: (link, code) => `Join my list on Organizar 💜\n\nOpen this link: ${link}\n\nOr, in the app, tap 🔄 and paste this code: ${code}`,
    copied: 'Invite copied — paste it in a message.',
  },
};
const T = STRINGS[LANG];

const CATEGORIES = [
  { id: 'tarefas',      emoji: '✅', pt: 'Tarefas',      en: 'Tasks' },
  { id: 'compromissos', emoji: '📅', pt: 'Compromissos', en: 'Appointments' },
  { id: 'compras',      emoji: '🛒', pt: 'Compras',      en: 'Shopping' },
  { id: 'ideias',       emoji: '💡', pt: 'Ideias',       en: 'Ideas' },
  { id: 'notas',        emoji: '📝', pt: 'Notas',        en: 'Notes' },
];
const catLabel = (c) => c[LANG];

// Palavras-chave (português e inglês) usadas para adivinhar a categoria.
// Para forçar uma categoria, começa com #compras, #tarefas, #ideias, #shopping, etc.
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

// Itens apagados ficam guardados como "apagado" durante uns tempos,
// para o outro aparelho também saber que foram apagados.
function save() {
  const cutoff = Date.now() - TOMBSTONE_TTL;
  items = items.filter((i) => !(i.deleted && i.updatedAt < cutoff));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

let items = load();
let activeTab = 'todos';
let query = '';

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
function addDaysTo(ms, n) {
  const d = new Date(ms);
  d.setDate(d.getDate() + n);
  return d.getTime();
}

const VIEW_KEY = 'lo.view';
let view = 'dia';
try { view = localStorage.getItem(VIEW_KEY) || 'dia'; } catch { /* sem armazenamento */ }
let selDay = startOfDay(new Date());
let monthCursor = new Date(new Date(selDay).getFullYear(), new Date(selDay).getMonth(), 1);

const live = () => items.filter((i) => !i.deleted);

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
    // Português e inglês britânico usam dia/mês; inglês americano usa mês/dia.
    const monthFirst = LOCALE === 'en-US';
    const day = +(monthFirst ? dm[3] : dm[2]);
    const month = +(monthFirst ? dm[2] : dm[3]) - 1;
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

// Encontra um horário no texto: "14h", "14h30", "às 10", "10:30", "3pm", "at 9".
function extractTime(text) {
  const t = normalize(text);
  let m = t.match(/(^|[^\d/])(\d{1,2})(?::|h)(\d{2})(?!\d)/)
    || t.match(/(^|[^\d/])(\d{1,2})\s?(?:h|hs|horas?)(?![a-z])()/)
    || t.match(/(^|\s)(?:as|at)\s(\d{1,2})(?::(\d{2}))?(?![\d/])/);
  let pm = false;
  if (!m) {
    m = t.match(/(^|[^\d/])(\d{1,2})(?::(\d{2}))?\s?(am|pm)\b/);
    pm = !!m && m[4] === 'pm';
  } else {
    const ap = t.slice(m.index + m[0].length).match(/^\s?(am|pm)\b/);
    pm = !!ap && ap[1] === 'pm';
  }
  if (!m) return null;
  let h = +m[2];
  const min = m[3] ? +m[3] : 0;
  if (pm && h < 12) h += 12;
  if (h > 23 || min > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function hasTime(text) {
  return !!extractTime(text);
}

function categorize(text) {
  const t = normalize(text);

  const tag = t.match(/#(\w+)/);
  if (tag) {
    const found = CATEGORIES.find((c) =>
      [c.id, normalize(c.pt), normalize(c.en)].some((name) => name.startsWith(tag[1])));
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

function changed() {
  save();
  render();
  syncSoon();
}

// Nas vistas Dia e Mês, o que se escreve sem data vai para o dia escolhido.
function addItem(rawText) {
  const text = rawText.trim();
  if (!text) return;
  const now = Date.now();
  const onAgenda = view !== 'lista';
  const due = detectDue(text) || (onAgenda ? new Date(selDay) : null);
  const time = extractTime(text);
  let category = categorize(text);
  if (!/#\w+/.test(text)) {
    if (due && time && category !== 'compras') category = 'compromissos';
    else if (onAgenda && category === 'notas') category = 'tarefas';
  }
  items.unshift({
    id: uid(),
    text: text.replace(/#\w+\s*/g, '').trim() || text,
    category,
    done: false,
    due: due ? due.getTime() : null,
    time,
    note: '',
    createdAt: now,
    updatedAt: now,
  });
  changed();
}

function updateItem(id, changes) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  Object.assign(item, changes, { updatedAt: Date.now() });
  changed();
}

function deleteItem(id) {
  updateItem(id, { deleted: true });
}

function nextCategory(current) {
  const idx = CATEGORIES.findIndex((c) => c.id === current);
  return CATEGORIES[(idx + 1) % CATEGORIES.length].id;
}

// Junta duas listas: para cada item fica a versão alterada mais recentemente.
function mergeItems(a, b) {
  const byId = new Map(a.map((i) => [i.id, i]));
  for (const it of b) {
    if (!it || !it.id) continue;
    const mine = byId.get(it.id);
    if (!mine || (it.updatedAt || 0) > (mine.updatedAt || 0)) byId.set(it.id, it);
  }
  return [...byId.values()].sort((x, y) => y.createdAt - x.createdAt);
}

// ---------- sincronização ----------

let syncCode = localStorage.getItem(SYNC_KEY) || '';
let syncState = 'idle'; // idle | syncing | ok | error
let lastSync = null;
let syncTimer = null;
let syncing = false;
let syncAgain = false;

function newCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function cleanCode(raw) {
  const text = String(raw || '').trim();
  const fromLink = text.match(/juntar=([a-z0-9]+)/i);
  const code = (fromLink ? fromLink[1] : text).toLowerCase().replace(/[^a-z0-9]/g, '');
  return /^[a-z0-9]{20,64}$/.test(code) ? code : null;
}

function inviteLink() {
  return `${location.origin}${location.pathname}#juntar=${syncCode}`;
}

function syncSoon(delay = 800) {
  if (!syncCode) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, delay);
}

async function syncNow() {
  if (!syncCode) return;
  if (syncing) { syncAgain = true; return; }
  if (!navigator.onLine) { renderStatus(); return; }
  syncing = true;
  syncState = 'syncing';
  renderStatus();
  try {
    const res = await fetch(`/api/sync?code=${syncCode}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ items }),
    });
    if (!res.ok) throw new Error(res.status);
    const data = await res.json();
    items = mergeItems(items, data.items || []);
    save();
    render();
    syncState = 'ok';
    lastSync = new Date();
  } catch {
    syncState = 'error';
  }
  syncing = false;
  renderStatus();
  if (syncAgain) { syncAgain = false; syncSoon(200); }
}

function startSync(code) {
  syncCode = code;
  localStorage.setItem(SYNC_KEY, code);
  renderSyncPanel();
  syncNow();
}

// Abrir um link de convite (…#juntar=CÓDIGO) junta este aparelho à lista partilhada.
function joinFromLink() {
  const code = cleanCode(location.hash);
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.search);
  if (code === syncCode) return;
  if (!syncCode && !live().length) { startSync(code); return; }
  if (confirm(T.confirmSwitch)) startSync(code);
}

// ---------- mostrar no ecrã ----------

const $ = (id) => document.getElementById(id);

function applyStrings() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T[el.dataset.i18n]; });
  $('search').placeholder = T.search;
  $('codeInput').placeholder = T.codePlaceholder;
  $('iosHint').innerHTML = T.iosHint;
}

function formatDue(ms) {
  const d = new Date(ms);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d - today) / 86400000);
  if (diff === 0) return T.today;
  if (diff === 1) return T.tomorrow;
  if (diff < 0) return `${T.late} (${d.toLocaleDateString(LOCALE)})`;
  return d.toLocaleDateString(LOCALE, { weekday: 'short', day: 'numeric', month: 'short' });
}

function sortItems(list) {
  return list.slice().sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    if (a.due && b.due && a.due !== b.due) return a.due - b.due;
    if (a.due && !b.due) return -1;
    if (b.due && !a.due) return 1;
    if (a.time || b.time) return (a.time || '99') < (b.time || '99') ? -1 : 1;
    return b.createdAt - a.createdAt;
  });
}

// Itens de um dia: primeiro os com horário (por ordem), depois os sem horário; feitos no fim.
function itemsOnDay(dayMs) {
  const end = addDaysTo(dayMs, 1);
  return sortItems(live().filter((i) => i.due && i.due >= dayMs && i.due < end));
}

function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

function longDate(ms) {
  return new Date(ms).toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
}

function renderStatus() {
  let text;
  if (!syncCode) text = navigator.onLine ? T.notShared : T.offline;
  else if (!navigator.onLine) text = T.offline;
  else text = { syncing: T.syncing, ok: T.synced, error: T.syncError, idle: '' }[syncState];
  $('status').textContent = text;
  $('syncBtn').dataset.state = !navigator.onLine ? 'offline' : syncCode ? syncState : 'off';
  if (syncCode) {
    const time = lastSync && lastSync.toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
    $('syncState').textContent = time ? T.lastSync(time) : T.notYet;
  }
}

function renderSyncPanel() {
  $('syncOff').hidden = !!syncCode;
  $('syncOn').hidden = !syncCode;
  $('codeShow').textContent = syncCode;
  renderStatus();
}

function renderTabs() {
  const tabs = [{ id: 'todos', emoji: '🗂️', pt: T.all, en: T.all }, ...CATEGORIES];
  $('tabs').innerHTML = '';
  for (const tab of tabs) {
    const count = live().filter((i) => !i.done && (tab.id === 'todos' || i.category === tab.id)).length;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = tab.id === activeTab ? 'active' : '';
    btn.textContent = `${tab.emoji} ${catLabel(tab)}`;
    const span = document.createElement('span');
    span.className = 'count';
    span.textContent = count || '';
    btn.appendChild(span);
    btn.onclick = () => { activeTab = tab.id; render(); };
    $('tabs').appendChild(btn);
  }
}

function renderItem(item, { showDue = true } = {}) {
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
  text.onclick = () => openEdit(item.id);
  const meta = document.createElement('div');
  meta.className = 'meta';

  if (item.time) {
    const time = document.createElement('span');
    time.className = 'time';
    time.textContent = `🕒 ${formatTime(item.time)}`;
    meta.appendChild(time);
  }

  const catBtn = document.createElement('button');
  catBtn.className = 'cat';
  catBtn.type = 'button';
  catBtn.title = T.changeCat;
  catBtn.textContent = `${cat.emoji} ${catLabel(cat)}`;
  catBtn.onclick = () => updateItem(item.id, { category: nextCategory(item.category) });
  meta.appendChild(catBtn);

  if (item.due && showDue) {
    const due = document.createElement('span');
    due.className = 'due';
    due.textContent = formatDue(item.due);
    meta.appendChild(due);
  }
  if (item.note) {
    const note = document.createElement('span');
    note.className = 'noteMark';
    note.textContent = '📝';
    note.title = item.note;
    meta.appendChild(note);
  }
  body.append(text, meta);

  const del = document.createElement('button');
  del.className = 'del';
  del.type = 'button';
  del.title = T.delete;
  del.textContent = '✕';
  del.onclick = () => { if (confirm(T.confirmDelete)) deleteItem(item.id); };

  el.append(check, body, del);
  return el;
}

function section(list, title, entries, opts, className = '') {
  if (!entries.length) return;
  const sec = document.createElement('section');
  sec.className = 'group ' + className;
  if (title) {
    const h = document.createElement('h2');
    h.textContent = title;
    sec.appendChild(h);
  }
  entries.forEach((i) => sec.appendChild(renderItem(i, opts)));
  list.appendChild(sec);
}

function emptyMessage(list, text) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = text;
  list.appendChild(p);
}

function renderDayItems(list, dayMs) {
  const today = startOfDay(new Date());
  const dayItems = itemsOnDay(dayMs);
  if (dayItems.length) section(list, '', dayItems, { showDue: false });
  else emptyMessage(list, T.dayEmpty);

  // No dia de hoje também aparece o que ficou para trás e o que não tem data.
  if (dayMs === today) {
    const late = sortItems(live().filter((i) => !i.done && i.due && i.due < today));
    section(list, T.lateTitle, late, { showDue: true }, 'late');
    const undated = sortItems(live().filter((i) => !i.done && !i.due && i.category === 'tarefas'));
    section(list, T.undatedTitle, undated, { showDue: false });
  }
}

function renderDay() {
  const today = startOfDay(new Date());
  $('dayTitle').textContent = selDay === today ? `${T.today} · ${longDate(selDay)}` : longDate(selDay);
  $('todayBtn').hidden = selDay === today;
  renderDayItems($('list'), selDay);
}

function renderMonth() {
  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  $('monthTitle').textContent = monthCursor.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });

  const grid = $('monthGrid');
  grid.innerHTML = '';
  // Brasil e EUA começam a semana no domingo; Portugal e Reino Unido na segunda.
  const weekStart = ['pt-BR', 'en-US'].includes(LOCALE) ? 0 : 1;
  for (let i = 0; i < 7; i++) {
    const wd = document.createElement('div');
    wd.className = 'wd';
    wd.textContent = new Date(2024, 0, 7 + ((i + weekStart) % 7))
      .toLocaleDateString(LOCALE, { weekday: 'narrow' });
    grid.appendChild(wd);
  }
  const blanks = (new Date(y, m, 1).getDay() - weekStart + 7) % 7;
  for (let i = 0; i < blanks; i++) {
    const b = document.createElement('div');
    b.className = 'cell blank';
    grid.appendChild(b);
  }
  const today = startOfDay(new Date());
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const ms = new Date(y, m, d).getTime();
    const dayItems = itemsOnDay(ms);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell' + (ms === today ? ' today' : '') + (ms === selDay ? ' sel' : '');
    const num = document.createElement('span');
    num.textContent = d;
    const dots = document.createElement('span');
    dots.className = 'dots';
    dayItems.slice(0, 4).forEach((i) => {
      const dot = document.createElement('i');
      if (i.done) dot.className = 'off';
      dots.appendChild(dot);
    });
    cell.append(num, dots);
    cell.onclick = () => { selDay = ms; render(); };
    // Dois toques num dia abrem a vista desse dia.
    cell.ondblclick = () => { selDay = ms; setView('dia'); };
    grid.appendChild(cell);
  }

  $('selDayTitle').textContent = longDate(selDay);
  renderDayItems($('list'), selDay);
}

function renderList() {
  renderTabs();
  const list = $('list');
  const q = normalize(query);
  const all = live();
  const visible = all.filter((i) =>
    (activeTab === 'todos' || i.category === activeTab)
    && (!q || normalize(i.text + ' ' + (i.note || '')).includes(q)));

  if (!visible.length) { emptyMessage(list, all.length ? T.nothing : T.empty); return; }

  if (activeTab === 'todos') {
    for (const cat of CATEGORIES) {
      section(list, `${cat.emoji} ${catLabel(cat)}`, sortItems(visible.filter((i) => i.category === cat.id)));
    }
  } else {
    section(list, '', sortItems(visible));
  }
}

function setView(v) {
  view = v;
  try { localStorage.setItem(VIEW_KEY, v); } catch { /* sem armazenamento */ }
  render();
}

function render() {
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
  $('dayHead').hidden = view !== 'dia';
  $('month').hidden = view !== 'mes';
  $('tabs').hidden = view !== 'lista';
  $('search').hidden = view !== 'lista';
  $('input').placeholder = view === 'lista' ? T.placeholder : T.placeholderDay;
  $('list').innerHTML = '';
  if (view === 'dia') renderDay();
  else if (view === 'mes') renderMonth();
  else renderList();
}

// ---------- editar um item (data, horário, anotações) ----------

let editingId = null;

function toInputDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function openEdit(id) {
  const item = items.find((i) => i.id === id);
  if (!item) return;
  editingId = id;
  $('fText').value = item.text;
  $('fDate').value = item.due ? toInputDate(item.due) : '';
  $('fTime').value = item.time || '';
  $('fCat').innerHTML = '';
  for (const c of CATEGORIES) {
    const o = document.createElement('option');
    o.value = c.id;
    o.textContent = `${c.emoji} ${catLabel(c)}`;
    $('fCat').appendChild(o);
  }
  $('fCat').value = item.category;
  $('fNote').value = item.note || '';
  $('editDlg').showModal();
}

$('editForm').addEventListener('submit', () => {
  const [y, mo, d] = $('fDate').value.split('-').map(Number);
  updateItem(editingId, {
    text: $('fText').value.trim() || '…',
    due: $('fDate').value ? new Date(y, mo - 1, d).getTime() : null,
    time: $('fTime').value || null,
    category: $('fCat').value,
    note: $('fNote').value.trim(),
  });
});
$('fCancel').addEventListener('click', () => $('editDlg').close());
$('fDelete').addEventListener('click', () => {
  if (!confirm(T.confirmDelete)) return;
  $('editDlg').close();
  deleteItem(editingId);
});

document.querySelectorAll('#views button').forEach((b) => {
  b.textContent = T[{ dia: 'viewDay', mes: 'viewMonth', lista: 'viewList' }[b.dataset.view]];
  b.onclick = () => setView(b.dataset.view);
});
$('prevDay').onclick = () => { selDay = addDaysTo(selDay, -1); render(); };
$('nextDay').onclick = () => { selDay = addDaysTo(selDay, 1); render(); };
$('todayBtn').onclick = () => { selDay = startOfDay(new Date()); render(); };
$('prevMonth').onclick = () => { monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1); render(); };
$('nextMonth').onclick = () => { monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1); render(); };

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
  const done = live().filter((i) => i.done);
  if (done.length && confirm(T.confirmClear(done.length))) {
    const now = Date.now();
    done.forEach((i) => Object.assign(i, { deleted: true, updatedAt: now }));
    changed();
  }
});

$('exportBtn').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(live(), null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `organizar-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
});

$('importFile').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    const imported = JSON.parse(await file.text());
    if (!Array.isArray(imported)) throw new Error();
    items = mergeItems(items, imported);
    changed();
    alert(T.restored);
  } catch {
    alert(T.badFile);
  }
  e.target.value = '';
});

$('syncBtn').addEventListener('click', () => {
  $('syncPanel').hidden = !$('syncPanel').hidden;
  if (syncCode) syncNow();
});

$('createBtn').addEventListener('click', () => startSync(newCode()));

$('joinBtn').addEventListener('click', () => {
  const code = cleanCode($('codeInput').value);
  if (!code) { alert(T.badCode); return; }
  $('codeInput').value = '';
  startSync(code);
});

$('inviteBtn').addEventListener('click', async () => {
  const text = T.inviteText(inviteLink(), syncCode);
  if (navigator.share) {
    try { await navigator.share({ title: 'Organizar', text }); } catch { /* cancelado */ }
  } else {
    await navigator.clipboard.writeText(text);
    alert(T.copied);
  }
});

$('leaveBtn').addEventListener('click', () => {
  if (!confirm(T.confirmLeave)) return;
  syncCode = '';
  localStorage.removeItem(SYNC_KEY);
  syncState = 'idle';
  lastSync = null;
  renderSyncPanel();
});

window.addEventListener('online', () => syncNow());
window.addEventListener('offline', renderStatus);
window.addEventListener('hashchange', joinFromLink);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') syncNow();
});
setInterval(() => {
  if (document.visibilityState === 'visible') syncNow();
}, 20000);

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

applyStrings();
renderSyncPanel();
render();
joinFromLink();
syncNow();
