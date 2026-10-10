// Sync local notebook → GitHub. Only what you explicitly push becomes public.
// Runs against the Contents API, one commit per note (plus one for stickies +
// countdowns), so the site rebuilds and others can see it.
import { load, toMarkdown, markSynced, pending, markMiscSynced, clearTombstone, type NoteDraft } from './notebook';
import { getToken, getFile, putFile, deleteFile } from './github';

export interface SyncResult {
  ok: boolean;
  pushed: number;
  deleted: number;
  errors: string[];
}

const NOTE_DIR = 'src/content/notes/';

function notesFile(n: NoteDraft) {
  return `${NOTE_DIR}${n.slug}.md`;
}

export async function syncNote(n: NoteDraft): Promise<{ sha?: string }> {
  const path = notesFile(n);
  // Always look up the current remote sha: the file may exist (needs sha to
  // update) or our cached sha may be stale after a sync from another device.
  const remote = await getFile(path);
  const res = await putFile(path, toMarkdown(n), `笔记本:${n.slug}`, remote?.sha);
  const newSha = res?.content?.sha;
  markSynced(n.slug, newSha);
  return { sha: newSha };
}

export async function deleteNoteRemote(slug: string): Promise<void> {
  const path = `${NOTE_DIR}${slug}.md`;
  const info = await getFile(path);
  if (info) await deleteFile(path, info.sha, `删除笔记:${slug}`);
  clearTombstone(slug);
}

export async function syncMisc(): Promise<void> {
  const nb = load();
  const sPath = 'src/data/stickies.json';
  const cPath = 'src/data/countdowns.json';
  const [s, c] = await Promise.all([getFile(sPath), getFile(cPath)]);
  await putFile(sPath, JSON.stringify({ note: '首页便利贴。', stickies: nb.stickies }, null, 2), '笔记本:更新便利贴', s?.sha);
  await putFile(cPath, JSON.stringify({ note: '标题旁的倒计时。', countdowns: nb.countdowns }, null, 2), '笔记本:更新倒计时', c?.sha);
  markMiscSynced();
}

/** Push everything pending. Requires a valid token. */
export async function syncAll(): Promise<SyncResult> {
  const res: SyncResult = { ok: true, pushed: 0, deleted: 0, errors: [] };
  if (!getToken()) { res.ok = false; res.errors.push('还没有设置 GitHub 令牌'); return res; }

  const p = pending();
  for (const slug of p.deletions) {
    try { await deleteNoteRemote(slug); res.deleted++; }
    catch (e: any) { res.ok = false; res.errors.push(`删除 ${slug}:${e?.message || e}`); }
  }
  for (const n of p.notes) {
    try { await syncNote(n); res.pushed++; }
    catch (e: any) { res.ok = false; res.errors.push(`${n.slug}:${e?.message || e}`); }
  }
  if (p.misc) {
    try { await syncMisc(); res.pushed++; }
    catch (e: any) { res.ok = false; res.errors.push(`便利贴/倒计时:${e?.message || e}`); }
  }
  return res;
}
