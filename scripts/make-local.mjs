#!/usr/bin/env node
// Post-process `dist-local/` so the site can be opened by double-clicking
// index.html (file:// protocol) without a web server.
//
// What this does:
//  1. Rewrites root-absolute URLs (href="/x", src="/x", url(/x)) in every
//     .html and .css file into paths relative to that file's location.
//  2. Turns directory links like `/notes/foo/` into `../notes/foo/index.html`
//     because file:// has no concept of a default index document.
//
// Usage: npm run build:local   (runs `astro build --outDir dist-local` first)
import { readdirSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist-local');

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if (/\.(html|css)$/.test(name)) acc.push(p);
  }
  return acc;
}

function toPosix(p) {
  return p.split(sep).join('/');
}

/** Turn a root-absolute site path into a relative path from `fromFile`. */
function relativize(fromFile, sitePath) {
  // Strip query/hash, remember them.
  const m = sitePath.match(/^([^?#]*)(.*)$/);
  let path = m[1];
  const suffix = m[2];

  // Directory URL → index.html so file:// can open it.
  if (path.endsWith('/')) path += 'index.html';

  const target = join(out, path);
  let rel = toPosix(relative(dirname(fromFile), target));
  if (!rel.startsWith('.')) rel = './' + rel;
  return rel + suffix;
}

const files = walk(out);
let touched = 0;

for (const file of files) {
  const src = readFileSync(file, 'utf8');
  let outSrc = src;

  if (file.endsWith('.html')) {
    // href="/..." | src="/..." | content="/..." | action="/..."  (but not "//cdn" protocol-relative)
    outSrc = outSrc.replace(
      /\b(href|src|content|action|poster|srcset)=(["'])\/(?!\/)([^"']*)\2/g,
      (_, attr, q, rest) => {
        if (attr === 'srcset') {
          // "/a.png 1x, /b.png 2x"
          const parts = ('/' + rest).split(',').map((s) => {
            const [u, ...d] = s.trim().split(/\s+/);
            const u2 = u.startsWith('/') && !u.startsWith('//') ? relativize(file, u) : u;
            return [u2, ...d].join(' ');
          });
          return `${attr}=${q}${parts.join(', ')}${q}`;
        }
        return `${attr}=${q}${relativize(file, '/' + rest)}${q}`;
      },
    );
    // Root link "/" alone (home) → index.html
    outSrc = outSrc.replace(/\b(href)=(["'])\/\2/g, (_, attr, q) => `${attr}=${q}${relativize(file, '/')}${q}`);
    // Inlined search index: "u":"/notes/xxx/" → relative
    outSrc = outSrc.replace(/"u":"(\/[^"]*)"/g, (_, u) => `"u":"${relativize(file, u)}"`);
  }

  // CSS url(/x) in both .css files and inline <style>
  outSrc = outSrc.replace(/url\((["']?)\/(?!\/)([^"')]*)\1\)/g, (_, q, rest) => `url(${q}${relativize(file, '/' + rest)}${q})`);

  if (outSrc !== src) {
    writeFileSync(file, outSrc, 'utf8');
    touched++;
  }
}

console.log(`make-local: 处理了 ${files.length} 个文件,改写了 ${touched} 个。`);
console.log(`双击 dist-local/index.html 即可离线查看。`);
