// Organizar — agenda simples. Os dados ficam guardados no próprio celular (localStorage),
// por isso funciona sem internet. Com a sincronização ligada, as alterações vão para uma
// agenda compartilhada no Netlify sempre que há conexão.

const STORAGE_KEY = 'lo.items.v1';
const SYNC_KEY = 'lo.sync.code';
const TOMBSTONE_TTL = 60 * 86400000;

// ---------- língua: segue a língua do celular ----------

const LOCALE = navigator.language || 'pt';
const LANG = LOCALE.toLowerCase().startsWith('pt') ? 'pt' : 'en';
const BR = LOCALE.toLowerCase() === 'pt-br';

const STRINGS = {
  pt: {
    install: 'Instalar',
    iosHint: `Para instalar: toque em <strong>Compartilhar</strong> ⬆️ e depois em <strong>${BR ? 'Adicionar à Tela de Início' : 'Adicionar ao ecrã principal'}</strong>.`,
    goToday: 'Voltar para hoje',
    upcoming: 'Próximos compromissos',
    noUpcoming: 'Nenhum compromisso marcado. Toque no + para adicionar ✨',
    dayEmpty: 'Nada marcado neste dia. Toque no + para adicionar.',
    showAll: 'Ver todos',
    undated: 'Sem data',
    more: (n) => `+${n}`,
    today: 'Hoje', tomorrow: 'Amanhã',
    newTitle: 'Novo compromisso', editTitle: 'Editar compromisso',
    fText: 'O quê?', fTextPh: 'ex: Médico', fDate: 'Dia', fTime: 'Horário', fNote: 'Anotações',
    save: 'Salvar', cancel: 'Cancelar', delete: 'Apagar',
    confirmDelete: 'Apagar este compromisso?',
    export: 'Fazer backup', import: 'Restaurar backup',
    restored: 'Backup restaurado ✔',
    badFile: 'Este arquivo não parece ser um backup válido.',
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
    goToday: 'Back to today',
    upcoming: 'Upcoming',
    noUpcoming: 'Nothing planned yet. Tap + to add ✨',
    dayEmpty: 'Nothing planned this day. Tap + to add.',
    showAll: 'Show all',
    undated: 'No date',
    more: (n) => `+${n}`,
    today: 'Today', tomorrow: 'Tomorrow',
    newTitle: 'New appointment', editTitle: 'Edit appointment',
    fText: 'What?', fTextPh: 'e.g. Doctor', fDate: 'Day', fTime: 'Time', fNote: 'Notes',
    save: 'Save', cancel: 'Cancel', delete: 'Delete',
    confirmDelete: 'Delete this appointment?',
    export: 'Save a backup', import: 'Restore a backup',
    restored: 'Backup restored ✔',
    badFile: 'This file doesn’t look like a valid backup.',
    offline: 'offline', syncing: 'syncing…', synced: 'synced', syncError: 'error', notShared: 'share',
    syncIntro: 'Share this calendar with someone else (or another device). What one of you writes shows up for the other — even offline, everything merges when the connection comes back.',
    createShared: 'Create shared calendar',
    haveCode: 'Or, if you were sent a code:',
    codePlaceholder: 'Paste the code here',
    join: 'Join',
    code: 'Code:',
    invite: 'Send invite',
    leave: 'Stop syncing',
    confirmLeave: 'Stop syncing on this device? The calendar stays here but won’t get new changes.',
    confirmSwitch: 'Join this shared calendar? What you have here will be added to it too.',
    badCode: 'That code doesn’t look right. Check you copied all of it.',
    lastSync: (t) => `✓ Synced at ${t}`,
    notYet: 'Not synced yet (no internet?)',
    inviteText: (link, code) => `Join my calendar on Organizar 💜\n\nOpen this link: ${link}\n\nOr, in the app, tap 🔄 and paste this code: ${code}`,
    copied: 'Invite copied — paste it in a message.',
  },
};
const T = STRINGS[LANG];

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
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* sem armazenamento */ }
}

let items = load();
const live = () => items.filter((i) => !i.deleted);

// ---------- datas ----------

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
function toInputDate(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fromInputDate(value) {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, m - 1, d).getTime();
}
function formatTime(hhmm) {
  if (!hhmm) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString(LOCALE, { hour: '2-digit', minute: '2-digit' });
}

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Encontra um horário escrito no texto: "14h", "14h30", "às 10", "10:30", "3pm".
// Serve para quem escreve "Médico 14h" e esquece de preencher o horário.
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

// ---------- ações ----------

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function changed() {
  save();
  render();
  syncSoon();
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

function byTime(a, b) {
  if (a.due !== b.due) return (a.due || 0) - (b.due || 0);
  if (a.done !== b.done) return a.done ? 1 : -1;
  return (a.time || '99') < (b.time || '99') ? -1 : (a.time || '99') > (b.time || '99') ? 1 : 0;
}

function itemsOnDay(dayMs) {
  const end = addDaysTo(dayMs, 1);
  return live().filter((i) => i.due && i.due >= dayMs && i.due < end).sort(byTime);
}

// ---------- sincronização ----------

let syncCode = '';
try { syncCode = localStorage.getItem(SYNC_KEY) || ''; } catch { /* sem armazenamento */ }
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
  try { localStorage.setItem(SYNC_KEY, code); } catch { /* sem armazenamento */ }
  renderSyncPanel();
  syncNow();
}

// Abrir um link de convite (…#juntar=CÓDIGO) junta este aparelho à agenda compartilhada.
function joinFromLink() {
  const code = cleanCode(location.hash);
  if (!code) return;
  history.replaceState(null, '', location.pathname + location.search);
  if (code === syncCode) return;
  if (!syncCode && !live().length) { startSync(code); return; }
  if (confirm(T.confirmSwitch)) startSync(code);
}

// ---------- mostrar na tela ----------

const $ = (id) => document.getElementById(id);

const today = () => startOfDay(new Date());
let monthCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
let selDay = null; // null = mostra os próximos compromissos

// Brasil e EUA começam a semana no domingo; Portugal e Reino Unido na segunda.
const WEEK_START = ['pt-BR', 'en-US'].includes(LOCALE) ? 0 : 1;

function applyStrings() {
  document.documentElement.lang = LANG;
  document.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = T[el.dataset.i18n]; });
  $('codeInput').placeholder = T.codePlaceholder;
  $('fText').placeholder = T.fTextPh;
  $('iosHint').innerHTML = T.iosHint;

  $('weekdays').innerHTML = '';
  for (let i = 0; i < 7; i++) {
    const wd = document.createElement('div');
    wd.textContent = new Date(2024, 0, 7 + ((i + WEEK_START) % 7))
      .toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '');
    $('weekdays').appendChild(wd);
  }
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

// Calendário do mês: cada dia mostra os seus compromissos escritos.
function renderCalendar() {
  const y = monthCursor.getFullYear();
  const m = monthCursor.getMonth();
  const title = monthCursor.toLocaleDateString(LOCALE, { month: 'long', year: 'numeric' });
  $('monthTitle').textContent = title.charAt(0).toUpperCase() + title.slice(1);
  const now = new Date();
  $('todayBtn').hidden = y === now.getFullYear() && m === now.getMonth() && selDay === null;

  const grid = $('grid');
  grid.innerHTML = '';
  const blanks = (new Date(y, m, 1).getDay() - WEEK_START + 7) % 7;
  for (let i = 0; i < blanks; i++) {
    const b = document.createElement('div');
    b.className = 'cell blank';
    grid.appendChild(b);
  }
  const t = today();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const ms = new Date(y, m, d).getTime();
    const dayItems = itemsOnDay(ms);
    const cell = document.createElement('button');
    cell.type = 'button';
    cell.className = 'cell'
      + (ms === t ? ' today' : '')
      + (ms === selDay ? ' sel' : '')
      + (ms < t ? ' past' : '');

    const num = document.createElement('span');
    num.className = 'num';
    num.textContent = d;
    cell.appendChild(num);

    const shown = dayItems.slice(0, 2);
    for (const it of shown) {
      const ev = document.createElement('span');
      ev.className = 'ev' + (it.done ? ' done' : '');
      ev.textContent = it.text;
      cell.appendChild(ev);
    }
    if (dayItems.length > shown.length) {
      const more = document.createElement('span');
      more.className = 'more';
      more.textContent = T.more(dayItems.length - shown.length);
      cell.appendChild(more);
    }
    cell.onclick = () => { selDay = selDay === ms ? null : ms; render(); };
    grid.appendChild(cell);
  }
}

function dateBadge(ms) {
  const d = new Date(ms);
  const badge = document.createElement('div');
  badge.className = 'badge' + (ms === today() ? ' isToday' : '');
  const mon = document.createElement('span');
  mon.className = 'mon';
  mon.textContent = d.toLocaleDateString(LOCALE, { month: 'short' }).replace('.', '');
  const day = document.createElement('span');
  day.className = 'day';
  day.textContent = d.getDate();
  const wd = document.createElement('span');
  wd.className = 'wd';
  wd.textContent = d.toLocaleDateString(LOCALE, { weekday: 'short' }).replace('.', '');
  badge.append(mon, day, wd);
  return badge;
}

function renderEntry(item) {
  const row = document.createElement('div');
  row.className = 'entry' + (item.done ? ' done' : '');

  const check = document.createElement('input');
  check.type = 'checkbox';
  check.checked = !!item.done;
  check.setAttribute('aria-label', item.text);
  check.onchange = () => updateItem(item.id, { done: check.checked });

  const main = document.createElement('button');
  main.type = 'button';
  main.className = 'entryMain';
  main.onclick = () => openEdit(item);
  const time = document.createElement('span');
  time.className = 'time';
  time.textContent = formatTime(item.time);
  const text = document.createElement('span');
  text.className = 'text';
  text.textContent = item.text;
  main.append(time, text);
  if (item.note) {
    const note = document.createElement('span');
    note.className = 'note';
    note.textContent = item.note;
    main.appendChild(note);
  }

  row.append(check, main);
  return row;
}

function renderDayGroup(list, dayMs, entries) {
  const group = document.createElement('div');
  group.className = 'dayGroup';
  const label = document.createElement('div');
  label.className = 'relDay';
  const t = today();
  if (dayMs === t) label.textContent = T.today;
  else if (dayMs === addDaysTo(t, 1)) label.textContent = T.tomorrow;
  const body = document.createElement('div');
  body.className = 'entries';
  if (label.textContent) body.appendChild(label);
  entries.forEach((it) => body.appendChild(renderEntry(it)));
  group.append(dateBadge(dayMs), body);
  list.appendChild(group);
}

function renderList() {
  const list = $('list');
  list.innerHTML = '';

  if (selDay !== null) {
    $('listTitle').textContent = new Date(selDay)
      .toLocaleDateString(LOCALE, { weekday: 'long', day: 'numeric', month: 'long' });
    $('showAllBtn').hidden = false;
    const dayItems = itemsOnDay(selDay);
    if (dayItems.length) renderDayGroup(list, selDay, dayItems);
    else emptyMessage(list, T.dayEmpty);
    return;
  }

  $('listTitle').textContent = T.upcoming;
  $('showAllBtn').hidden = true;
  const t = today();
  const upcoming = live().filter((i) => i.due && i.due >= t).sort(byTime);
  const byDay = new Map();
  for (const it of upcoming) {
    const key = startOfDay(it.due);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key).push(it);
  }
  for (const [day, entries] of byDay) renderDayGroup(list, day, entries);

  // Coisas antigas sem data (de versões anteriores) continuam visíveis aqui.
  const undated = live().filter((i) => !i.due && !i.done);
  if (undated.length) {
    const h = document.createElement('h3');
    h.className = 'undatedTitle';
    h.textContent = T.undated;
    list.appendChild(h);
    const box = document.createElement('div');
    box.className = 'entries loose';
    undated.forEach((it) => box.appendChild(renderEntry(it)));
    list.appendChild(box);
  }

  if (!byDay.size && !undated.length) emptyMessage(list, T.noUpcoming);
}

function emptyMessage(list, text) {
  const p = document.createElement('p');
  p.className = 'empty';
  p.textContent = text;
  list.appendChild(p);
}

function render() {
  renderCalendar();
  renderList();
}

// ---------- novo / editar compromisso ----------

let editingId = null;

function openEdit(item) {
  editingId = item ? item.id : null;
  $('fTitle').textContent = item ? T.editTitle : T.newTitle;
  $('fText').value = item ? item.text : '';
  $('fDate').value = toInputDate(item && item.due ? item.due : selDay ?? today());
  $('fTime').value = item && item.time ? item.time : '';
  $('fNote').value = item ? item.note || '' : '';
  $('fDelete').hidden = !item;
  $('editDlg').showModal();
  if (!item) $('fText').focus();
}

$('editForm').addEventListener('submit', () => {
  const text = $('fText').value.trim();
  if (!text) return;
  const due = $('fDate').value ? fromInputDate($('fDate').value) : today();
  const time = $('fTime').value || extractTime(text);
  const note = $('fNote').value.trim();

  if (editingId) {
    updateItem(editingId, { text, due, time, note });
  } else {
    const now = Date.now();
    items.unshift({
      id: uid(), text, category: 'compromissos', done: false,
      due, time, note, createdAt: now, updatedAt: now,
    });
    // Mostra o mês do compromisso que acabou de ser criado.
    const d = new Date(due);
    monthCursor = new Date(d.getFullYear(), d.getMonth(), 1);
    changed();
  }
});
$('fCancel').addEventListener('click', () => $('editDlg').close());
$('fDelete').addEventListener('click', () => {
  if (!confirm(T.confirmDelete)) return;
  $('editDlg').close();
  deleteItem(editingId);
});

// ---------- ligar os botões ----------

$('fab').onclick = () => openEdit(null);
$('prevMonth').onclick = () => { monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() - 1, 1); selDay = null; render(); };
$('nextMonth').onclick = () => { monthCursor = new Date(monthCursor.getFullYear(), monthCursor.getMonth() + 1, 1); selDay = null; render(); };
$('todayBtn').onclick = () => { const n = new Date(); monthCursor = new Date(n.getFullYear(), n.getMonth(), 1); selDay = null; render(); };
$('showAllBtn').onclick = () => { selDay = null; render(); };

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
  try { localStorage.removeItem(SYNC_KEY); } catch { /* sem armazenamento */ }
  syncState = 'idle';
  lastSync = null;
  renderSyncPanel();
});

window.addEventListener('online', () => syncNow());
window.addEventListener('offline', renderStatus);
window.addEventListener('hashchange', joinFromLink);
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') { render(); syncNow(); }
});
setInterval(() => {
  if (document.visibilityState === 'visible') syncNow();
}, 20000);

// ---------- instalar na tela de início ----------

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
