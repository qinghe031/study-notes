#!/usr/bin/env node
// Usage: npm run new "笔记标题"
// Creates src/content/notes/YYYY-MM-DD-<title>.md with a filled-in frontmatter.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const notesDir = resolve(root, 'src/content/notes');

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('用法: npm run new "笔记标题"');
  process.exit(1);
}

const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

// Keep CJK, letters, digits; collapse everything else to a dash.
const safe = title.replace(/[\\/:*?"<>|\s]+/g, '-').replace(/^-+|-+$/g, '');
const file = resolve(notesDir, `${date}-${safe}.md`);

if (existsSync(file)) {
  console.error(`已存在: ${file}`);
  process.exit(1);
}

mkdirSync(notesDir, { recursive: true });

const content = `---
title: ${title}
date: ${date}
category: 未分类
tags: []
summary:
sticky: 0
draft: false
---

##

`;

writeFileSync(file, content, 'utf8');
console.log(`已创建: src/content/notes/${date}-${safe}.md`);
