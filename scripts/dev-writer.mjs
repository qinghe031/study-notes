// Dev-only file writer, mounted as a Vite middleware in astro.config.mjs.
// Lets the admin page save notes/data straight into the project during
// `npm run dev`. Not part of the build, so the hosted site is untouched.
import { writeFile, mkdir, access, readFile, unlink } from 'node:fs/promises';
import { resolve, dirname, normalize } from 'node:path';

const ALLOWED = ['src/content/notes/', 'src/data/'];

function safePath(root, rel) {
  const n = normalize(String(rel || '')).replace(/\\/g, '/');
  if (!n || n.includes('..') || n.startsWith('/')) return null;
  if (!ALLOWED.some((p) => n.startsWith(p))) return null;
  if (!/\.(md|json)$/.test(n)) return null;
  return resolve(root, n);
}

function json(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}

/** @returns {import('vite').Plugin} */
export default function devWriter() {
  return {
    name: 'study-notes-dev-writer',
    apply: 'serve',
    configureServer(server) {
      const root = server.config.root;
      server.middlewares.use('/__dev/read', async (req, res) => {
        const url = new URL(req.url || '', 'http://x');
        const abs = safePath(root, url.searchParams.get('path'));
        if (!abs) return json(res, 400, { ok: false, error: '路径不允许' });
        try {
          const content = await readFile(abs, 'utf8');
          json(res, 200, { ok: true, content });
        } catch {
          json(res, 404, { ok: false, error: '文件不存在' });
        }
      });
      server.middlewares.use('/__dev/delete', async (req, res) => {
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body;
        try { body = JSON.parse(raw); } catch { return json(res, 400, { ok: false, error: '请求格式错误' }); }
        const abs = safePath(root, body.path);
        if (!abs) return json(res, 400, { ok: false, error: '路径不允许' });
        try { await unlink(abs); json(res, 200, { ok: true }); }
        catch { json(res, 404, { ok: false, error: '文件不存在' }); }
      });
      server.middlewares.use('/__dev/write', async (req, res) => {
        if (req.method === 'GET') return json(res, 200, { ok: true });
        if (req.method !== 'POST') return json(res, 405, { ok: false, error: 'method' });
        let raw = '';
        for await (const chunk of req) raw += chunk;
        let body;
        try { body = JSON.parse(raw); } catch { return json(res, 400, { ok: false, error: '请求格式错误' }); }
        const abs = safePath(root, body.path);
        if (!abs || typeof body.content !== 'string') return json(res, 400, { ok: false, error: '路径不允许' });
        if (!body.overwrite) {
          try { await access(abs); return json(res, 409, { ok: false, error: '文件已存在', exists: true }); } catch {}
        }
        await mkdir(dirname(abs), { recursive: true });
        await writeFile(abs, body.content, 'utf8');
        json(res, 200, { ok: true, path: body.path });
      });
    },
  };
}
