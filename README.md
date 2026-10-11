# hard2exp

本地用 Markdown 写笔记,一条命令生成可分享的静态网页。没有数据库、没有账号、没有服务器。

布局参考 [arthurs-blog](https://github.com/ArthurloveLin/arthurs-blog),纸张灰白底、宋体标题、细线分隔,安静的生活博客风格。

## 模块

| 模块 | 路径 | 内容来源 |
|---|---|---|
| 文章流 / 分类 / 标签 / 归档 / 搜索 / 分页 | `/` `/category/` `/tag/` `/archive/` `/search/` | `src/content/notes/*.md` |
| 文章页:目录 · 阅读进度 · 点赞 · 相关笔记 · 上下篇 · 评论 | `/notes/<slug>/` | 同上 + `interactions.json` |
| 生活相册(全屏预览) | `/gallery/` | `src/data/gallery.json` + `public/gallery/` |
| 留言板 | `/guestbook/` | `src/data/guestbook.json` 或 Giscus |
| 后台管理(本地表单生成文件) | `/admin/`(不在导航里) | — |
| 高达加油小人 | 每页右下角 | `src/components/Mascot.astro` |
| RSS / 站点地图 / 404 | `/rss.xml` `/sitemap-index.xml` | 自动 |

## 快速开始

```bash
npm install            # 第一次运行
npm run new "标题"     # 新建一篇笔记
npm run dev            # 本地预览 http://localhost:4321
npm run build          # 生成 dist/  → 发布到 GitHub Pages / Cloudflare Pages
npm run build:local    # 生成 dist-local/ → 打包发给别人,双击 index.html 离线查看
```

完整说明见站内置顶的「使用说明」(`src/content/notes/2026-10-09-使用说明.md`)。

## 互动功能的边界

| 功能 | 默认 | 升级 |
|---|---|---|
| 点赞 | 浏览器本地存储,离线可用 | — |
| 评论 / 在线留言 | 显示接入提示 | 填 `src/data/interactions.json` 接 Giscus(免费、基于 GitHub Discussions) |

离线双击版:所有本地内容正常;Giscus 评论需要联网。

## 技术栈

- [Astro 5](https://astro.build) — 内容集合 + 纯静态输出
- Tailwind CSS 4 + `@tailwindcss/typography`
- Shiki 代码高亮(亮暗双主题)、KaTeX 公式、自动目录
- 内联搜索索引(`file://` 下也能搜)

## 目录

```
src/
  content/notes/     ← 笔记(.md)和图片
  content.config.ts  ← frontmatter 校验
  data/*.json        ← 相册 / 歌单 / 留言 / 互动开关 / 站点文案
  lib/site.ts        ← 读取 data/、导航、主题列表
  lib/content.ts     ← 查询/排序/阅读时长/目录/相关笔记
  layouts/           ← BaseLayout
  components/        ← Navbar、PostCard、TOC、Turntable、Lightbox、NeteaseEmbed、LikeButton、Giscus、Mascot…
  pages/             ← 各模块页面
  styles/global.css  ← 主题变量 + 8 套色相 + 排版
scripts/
  new-note.mjs       ← npm run new
  make-local.mjs     ← build:local 后处理(绝对路径 → 相对路径)
```
