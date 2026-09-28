// Servidor de sincronização: guarda a lista partilhada no Netlify Blobs.
// Cada lista partilhada tem um código secreto; quem tem o código vê e edita a lista.
import { getStore } from '@netlify/blobs';

const CODE_RE = /^[a-z0-9]{20,64}$/;
const MAX_ITEMS = 5000;
const MAX_TEXT = 5000;
const TOMBSTONE_TTL = 60 * 86400000; // apagados ficam 60 dias, para chegarem a todos os aparelhos

function clean(item) {
  if (!item || typeof item.id !== 'string' || item.id.length > 64) return null;
  return {
    id: item.id,
    text: String(item.text ?? '').slice(0, MAX_TEXT),
    category: String(item.category ?? 'notas').slice(0, 32),
    done: !!item.done,
    due: Number.isFinite(item.due) ? item.due : null,
    time: /^\d{2}:\d{2}$/.test(item.time) ? item.time : null,
    note: String(item.note ?? '').slice(0, MAX_TEXT),
    createdAt: Number(item.createdAt) || 0,
    updatedAt: Number(item.updatedAt) || 0,
    deleted: !!item.deleted,
  };
}

function merge(serverItems, incoming) {
  const byId = new Map(serverItems.map((i) => [i.id, i]));
  for (const raw of incoming) {
    const it = clean(raw);
    if (!it) continue;
    const mine = byId.get(it.id);
    if (!mine || it.updatedAt > mine.updatedAt) byId.set(it.id, it);
  }
  const cutoff = Date.now() - TOMBSTONE_TTL;
  return [...byId.values()]
    .filter((i) => !(i.deleted && i.updatedAt < cutoff))
    .slice(0, MAX_ITEMS);
}

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

export default async (req) => {
  const url = new URL(req.url);
  const code = url.searchParams.get('code') || '';
  if (!CODE_RE.test(code)) return json({ error: 'invalid code' }, 400);

  const store = getStore({ name: 'organizar', consistency: 'strong' });
  const key = `lists/${code}`;

  if (req.method === 'GET') {
    const data = await store.get(key, { type: 'json' });
    return json({ items: data?.items ?? [] });
  }

  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405);

  let incoming;
  try {
    incoming = (await req.json()).items;
    if (!Array.isArray(incoming)) throw new Error();
  } catch {
    return json({ error: 'invalid body' }, 400);
  }

  // Se os dois aparelhos gravarem ao mesmo tempo, tenta outra vez em vez de perder alterações.
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getWithMetadata(key, { type: 'json' });
    const items = merge(current?.data?.items ?? [], incoming);
    const result = current
      ? await store.setJSON(key, { items }, { onlyIfMatch: current.etag })
      : await store.setJSON(key, { items }, { onlyIfNew: true });
    if (result.modified) return json({ items });
  }
  return json({ error: 'busy, try again' }, 409);
};

export const config = { path: '/api/sync' };
