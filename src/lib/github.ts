// GitHub Contents API client for in-browser editing of the hosted site.
// The token lives only in this browser's localStorage. It needs
// "Contents: Read and write" on a fine-grained PAT (or `repo` on a classic one).
// Owner/repo/branch come from src/data/site.json → github.

import site from '../data/site.json';

export const GH_TOKEN_KEY = 'gh:token';
export const GH = { owner: site.github.owner, repo: site.github.repo, branch: site.github.branch };

const API = 'https://api.github.com';
const repoUrl = () => `${API}/repos/${GH.owner}/${GH.repo}`;

export function getToken(): string {
  try { return localStorage.getItem(GH_TOKEN_KEY) || ''; } catch { return ''; }
}
export function setToken(t: string) {
  try { t ? localStorage.setItem(GH_TOKEN_KEY, t.trim()) : localStorage.removeItem(GH_TOKEN_KEY); } catch {}
}

function headers(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'Content-Type': 'application/json',
  };
}

// UTF-8 safe base64
function b64encode(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b: string) {
  return new TextDecoder().decode(Uint8Array.from(atob(b.replace(/\n/g, '')), (c) => c.charCodeAt(0)));
}

export interface Verify { ok: boolean; login?: string; error?: string }

export async function verifyToken(token: string): Promise<Verify> {
  try {
    const r = await fetch(repoUrl(), { headers: headers(token) });
    if (r.status === 401) return { ok: false, error: 'Token 无效或已过期' };
    if (r.status === 404) return { ok: false, error: `Token 没有访问 ${GH.owner}/${GH.repo} 的权限` };
    if (!r.ok) return { ok: false, error: `GitHub 返回 ${r.status}` };
    const j = await r.json();
    const u = await fetch(`${API}/user`, { headers: headers(token) });
    const login = u.ok ? (await u.json()).login : undefined;
    if (!j.permissions?.push) return { ok: false, login, error: '这个 Token 没有写入权限(需要 Contents: Read and write)' };
    return { ok: true, login };
  } catch (e: any) {
    return { ok: false, error: e?.message || '网络错误' };
  }
}

export interface FileInfo { sha: string; content: string }

export async function getFile(path: string, token = getToken()): Promise<FileInfo | null> {
  const r = await fetch(`${repoUrl()}/contents/${encodeURI(path)}?ref=${GH.branch}`, { headers: headers(token) });
  if (r.status === 404) return null;
  if (!r.ok) throw new Error(`读取失败 (${r.status})`);
  const j = await r.json();
  return { sha: j.sha, content: b64decode(j.content) };
}

/** Create (no sha) or update (with sha) a file in one commit. */
export async function putFile(path: string, content: string, message: string, sha?: string, token = getToken()) {
  const body: Record<string, string> = { message, content: b64encode(content), branch: GH.branch };
  if (sha) body.sha = sha;
  const r = await fetch(`${repoUrl()}/contents/${encodeURI(path)}`, { method: 'PUT', headers: headers(token), body: JSON.stringify(body) });
  if (!r.ok) {
    const j = await r.json().catch(() => ({}));
    if (r.status === 422 && /sha/i.test(j.message || '')) throw new Error('文件已存在或已被改动,请刷新后重试');
    throw new Error(j.message || `提交失败 (${r.status})`);
  }
  return r.json();
}

export async function deleteFile(path: string, sha: string, message: string, token = getToken()) {
  const r = await fetch(`${repoUrl()}/contents/${encodeURI(path)}`, { method: 'DELETE', headers: headers(token), body: JSON.stringify({ message, sha, branch: GH.branch }) });
  if (!r.ok) throw new Error(`删除失败 (${r.status})`);
}

export const actionsUrl = () => `https://github.com/${GH.owner}/${GH.repo}/actions`;
export const newTokenUrl = () =>
  `https://github.com/settings/personal-access-tokens/new?name=study-notes-editor&description=${encodeURIComponent('学习笔记站在线编辑')}`;

export interface BuildStatus {
  /** queued | in_progress | completed */
  status: string;
  /** success | failure | cancelled | null while still running */
  conclusion: string | null;
  url: string;
  createdAt: string;
}

/** Latest Pages build run, so we can tell the writer whether their note is live
 *  yet. Uses the same token; a read-only public repo also works unauthenticated. */
export async function latestRun(sinceMs = 0, token = getToken()): Promise<BuildStatus | null> {
  try {
    const r = await fetch(`${repoUrl()}/actions/runs?per_page=5`, { headers: headers(token) });
    if (!r.ok) return null;
    const j = await r.json();
    const runs: any[] = j.workflow_runs || [];
    // Prefer the newest run created after the sync moment; else the newest.
    const after = runs.filter((x) => new Date(x.created_at).getTime() >= sinceMs - 5000);
    const w = after[0] || runs[0];
    if (!w) return null;
    return { status: w.status, conclusion: w.conclusion, url: w.html_url, createdAt: w.created_at };
  } catch {
    return null;
  }
}
