# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## 项目概述

这是 JiGuro (刘叽咕) 的个人博客，基于 Hexo 7.3.0 初始搭建，但已脱离 Hexo 构建流程，全部手写维护。纯静态站点，使用原生 HTML/CSS/JS 构建，无运行时框架依赖，通过 Vercel 部署运行。

### 部署与DNS

- **域名**: `196104.xyz`
- **主部署**: Vercel 自动部署（Git push 触发）
- **备用部署**: GitHub Pages
- **DNS/CDN**: Cloudflare
- **源仓库**: `https://github.com/JiGuroLGC/JiGuroLGC.github.io`

## 常用命令

### 构建与部署

```bash
# 压缩构建（发布前执行）：交互式，输入工程目录和输出目录
# 依赖: Node.js (npx), terser, clean-css-cli, html-minifier-terser
python minify.py
```

`minify.py` 流程：复制工程到输出目录 -> 归档完整源码到 `source/` 子目录 -> 压缩所有 HTML/JS/CSS/JSON 文件。

### 版本更新

```bash
# 批量替换 jsDelivr CDN 版本号（跨所有 .html/.json/.js/.css/.md 文件）
python update_version.py <旧版本号> <新版本号>
```

### 本地开发

无本地开发服务器。直接在浏览器中打开 `index.html` 即可预览。`post.html` 需要本地 HTTP 服务来正确加载 JSON/Markdown（可用 VSCode Live Server 或 `python -m http.server`）。

## 架构概览

### 页面结构

每个页面是独立的目录，内含 `index.html`：

| 路径 | 功能 |
|------|------|
| `/index.html` | 首页（个人简介/导航页） |
| `/post.html` | 文章模板页（加载 Markdown 渲染） |
| `/about/` | 关于页面 |
| `/archives/` | 文章归档 |
| `/category/` | 按分类浏览 |
| `/tag/` | 按标签浏览 |
| `/poetry/` | 原创诗歌（25首） |
| `/songs/` | 音乐收藏 |
| `/message/` | 留言板（集成 Twikoo 评论） |
| `/links/` | 友情链接 |
| `/404.html` | 自定义 404 页 |

### 文章系统

文章写在 `posts/` 目录的 Markdown 文件中（如 `2024-07-27.md`）。**元数据不在 frontmatter 中，而是在 `posts/index.json` 里管理**，包含 id、title、description、date、tags、category 及文章 Markdown 文件的 CDN 路径。

`post.html` 页面在客户端运行时：从 URL 参数获取文章 ID -> 从 `posts/index.json` 查找元数据 -> 通过 `marked.js` CDN 获取并渲染 Markdown 内容。

### CSS 架构

纯 CSS 实现，暗色/亮色主题通过 CSS 变量驱动。核心文件 `css/style.css`（~4680行）：

- **主题切换**: `[data-theme="dark"]` 选择器定义暗色变量集
- **主题持久化**: `localStorage.getItem('theme')` 读写，读取值为 `"dark"` 或为空
- **主题切换动画**: 使用 View Transitions API 实现平滑切换

### JavaScript 架构

所有 JS 文件在 `js/` 目录，共存 14 个文件：

| 文件 | 用途 |
|------|------|
| `script.js` | 核心：主题切换、加载画面、移动端导航栏、页面初始化 |
| `dz.js` | Canvas 粒子网络背景动画 |
| `music-player.js` | 自定义音频播放器 |
| `search.js` | 客户端搜索（依赖 jQuery + XML） |
| `twikoo.nocss.js` | Twikoo 评论系统客户端 |
| `twikoo-collapse.js` | 评论折叠/展开交互 |
| `jquery-3.6.0.min.js`, `jquery-3.6.4.min.js` | jQuery 两版本共存（search.js 用 3.6.0，帖子页用 3.6.4） |

文章页 (`post.html`) 还在 `head` 中通过 CDN 加载：
- `marked.js` — Markdown 渲染
- `highlight.js` — 代码语法高亮
- `MathJax 2.7.5` — 数学公式渲染（本地文件）
- `tocbot` — 目录生成（本地文件）
- `fancybox` — 图片灯箱（本地文件）
- `lazyload` — 图片懒加载（本地文件）
- `busuanzi 2.3` — 访问量统计（本地文件）

### 后端/安全

- **Vercel 配置**: `vercel.json` 配置了服务端函数 `api/gequ-proxy.js`（最长执行 15 秒）
- **Edge Middleware**: `middleware.js` 在 Vercel 边缘层运行，阻止浏览器（document 请求）直接访问 `/source/`、`.md`、`.json` 原始文件；JS fetch 请求正常通过。匹配路径：`/source/*`、`/posts/*`、`/links/*`、`/about/*`、`/poetry/*`、`/songs/*`
- **服务端函数**: `api/gequ-proxy.js` 代理音乐播放 URL 请求到 `gequbao.net` 以规避 CORS 限制

### 数据文件规范

文章元数据在 JSON manifest 文件中管理：

- `posts/index.json` — 文章列表（id、title、description、date、tags、category、CDN路径、toc）
- `poetry/index.json` — 诗歌列表（含 HTML 预览片段）
- `songs/config.json` — 文章与 Meting API 歌曲 ID 的映射
- `posts/music.json` — 单篇文章的音乐配置
- `links/data.json` — 12 条友情链接条目

### 资源版本管理

本地静态资源通过 jsDelivr CDN 分发并带有版本号，形式为：
`https://cdn.jsdelivr.net/gh/JiGuroLGC/JiGuroLGC.github.io@1.0.7/...`

使用 `update_version.py` 统一更新版本号。

### 内容组织形式

**博客文章分类**: "博客"、"逆向工程"、"杂谈"

**诗歌体裁**: 现代诗、唐诗、古体诗、宋词、诗经体。每首独立为 `.md` 文件，支持 HTML 注释标记 genre、尾注 (endnote)、创作心得 (heartfelt note)。

**音乐整合**: 通过 Meting API 获取元数据（支持网易云等平台），自定义播放器渲染封面、歌词(LRC)、音频播放。

## 文章页渲染管线 (`post.html`)

`post.html` 是整个博客的核心，所有逻辑集中在文件内联 `<script>` 中（约 750 行）。渲染分为三个阶段：

### 阶段 1：文章解析
1. 读取 URL 参数 `?id=` 和 `?type=`（type=poetry 加载诗歌索引）
2. `fetch(posts/index.json)` → 按 ID 查找文章，填充标题、日期、标签、封面图、上/下一篇链接
3. 若 Markdown 开头有 `<!-- 流派 -->` HTML 注释，提取并保存

### 阶段 2：Markdown 渲染
4. `fetch()` 获取文章 Markdown（来自 jsDelivr CDN）
5. 提取三个可选区块（HTML 注释语法）：
   - `<!-- 尾注 -->...<!-- /尾注 -->` → 文章底部附加段落
   - `<!-- 注释 -->...<!-- /注释 -->` → 解析 `[N]` 和 `[N_T]` 标记，渲染脚注引用与跳转链接
   - `<!-- 心语 -->...<!-- /心语 -->` → 附加在注释之后
6. `marked.parse()` 渲染 HTML
7. 诗歌页面：根据流派参数应用布局 CSS 类（`poetry-layout-xds/fgs/fgc/sw`）

### 阶段 3：后处理（按顺序）
8. **代码块增强**：`<pre><code>` → `.code-block`（行号列 + 代码列 + 语言标签 + 复制按钮），`hljs.highlightElement()`
9. **图片包裹**：三类规则（见下方"图片系统"）
10. **目录生成**：若 `article.toc === true`，扫描 h2-h4 标题生成 `<nav class="post-toc">`（含折叠/展开 + 点击滚动闪烁）
11. **Obsidian 标注段**：`[!TYPE]` blockquote → `div.callout` 结构
11. **`<p>` 解包裹**：仅含图片无文本的 `<p>` → 提升子元素，移除父 `<p>`
12. **画廊分组**：2-3 张连续 `.ps-figure` → `<div class="ps-figure-row">` flex 容器
13. **滚动渐显**：页头交错延迟显隐 + 内容 IntersectionObserver（见"动画系统"）
14. **注释闪烁**：点击 `#annot-N` → 居中滚动 + 1.8s 背景闪动动画
15. 页面 `.is-loaded`，页脚 `.is-loaded` → `opacity: 1` 0.4s 过渡

## 图片系统 (`post.html` + `css/style.css`)

所有图片托管于外部图床（S.EE、GitHub Raw、论坛 CDN 等），不在仓库内。

### 封面图
- 元数据字段 `posts/index.json` → `image`
- 渲染为 `.post-cover` div，`aspect-ratio: 3/2`，`object-fit: cover`
- 加载完成后 `onCoverReady()` 添加 `.loaded` 类

### 内容图片包裹（二分类，按 `data-badge` 属性判断）

**A) 带 `data-badge` 属性的图片** → `.img-placeholder`
- 用途：徽章、GitHub shields、小尺寸图标
- 写入 Markdown 时需显式添加 `data-badge` 属性
- 如 `<img src="..." height="20" data-badge>`
- 灰色背景占位，保留显式尺寸
- `onBadgeReady()`：双重 `requestAnimationFrame` 延迟确保先画模糊再过渡

**B) 所有其他图片** → `<a class="ps-figure" data-fancybox="{postId}">`
- Fancybox 灯箱卡片，按文章 ID 分组
- 若图片原本在 `<a>` 链接内，会先从父 `<a>` 中移出再包裹（避免无效嵌套 `<a>`）
- 宽高比：`data-ratio="w:h"` > `width`/`height` 属性 > 默认 16:9
- EXIF：`data-exif` 属性 → `.ps-exif-top` 叠加层（悬停渐显）
- 标题：`alt` 文本 → `.ps-caption` 底部渐变遮罩层
- `onImgReady()`：计算目标尺寸适配容器，若自然高度超过 80vh（桌面端）则约束宽度，同步动画修正宽高并居中（0.4s cubic-bezier）

### 渐进模糊-清晰加载
统一过渡系统，作用于 `.post-page-content img`、`.post-cover img`、`.ps-figure img`、`.img-placeholder img`：
- 初始：`filter: blur(20px); transform: scale(1.05)`
- 加载完成后 `.loaded`：`filter: blur(0); transform: scale(1)`
- 过渡：`filter 0.5s ease, transform 0.5s ease`

### 画廊行分组
2-3 张连续 `.ps-figure` 卡片 → `<div class="ps-figure-row">` flex 容器。桌面端（≥1024px）并排 12px 间距，移动端独占行。

### Fancybox 灯箱
- Fancybox 5，jsDelivr CDN 加载
- `data-fancybox="{postId}"` 同一灯箱实例内多图滑动
- 自定义：`.fb-exif-top` 在工具栏下方显示 EXIF，`.fancybox__slide` 的 `padding-top: 64px` 预留工具栏空间
- 关闭时：抑制 `.ps-exif-top` 悬停 + 冻结图片 CSS 过渡，防止"回弹"缩放（`.no-exif`、`.no-close-anim`、`.caption-reset`）

### ps-figure CSS 交互
- 悬停缩放：`scale(1.03)`，`cubic-bezier(0.23, 1, 0.32, 1)`，0.6s
- 加载完成后：`background` → `transparent`、`borderRadius` → `0`、`boxShadow` → `none`（卡片边界消失，图片与页面融为一体）
- 加载失败：显示 `.ps-error`（居中感叹号图标 + "图片加载失败"文字），保留卡片背景
- 暗色模式：加载前 `background: #1e1f22` + `box-shadow: 1px` 边界线，加载后同去除
- 暗色模式：背景 `#1e1f22` + `box-shadow: 0 0 0 1px rgba(255,255,255,0.08)` 边界光环
- EXIF 叠加层：顶部绝对定位，`opacity:0; translateY(-8px)` → `opacity:1; translateY(0)` 悬停 0.35s
- 标题条：底部绝对定位，渐变 `rgba(0,0,0,0.85)` → 透明，等宽字体

### 无懒加载
`js/lazyload.min.js` 存在但 **未在 `post.html` 中加载**，所有图片主动加载。

## 动画系统

### 页头渐显（交错延迟）
封面(0ms) → 标题(80ms) → 元数据(160ms) → 标签(240ms)
- 从：`opacity:0, translateY(20px), blur(6px)`
- 到：`opacity:1, translateY(0), blur(0)`
- `cubic-bezier(0.22, 0.61, 0.36, 1)`，0.6s

### 内容滚动渐显
IntersectionObserver，threshold: 0.15，400ms 延迟
- 观察：`.post-page-content > *` + `.ps-figure` 元素
- 过渡：0.7s `cubic-bezier(0.22, 0.61, 0.36, 1)`
- 从：`opacity:0, translateY(30px), blur(10px)`
- **ps-figure 特殊处理**：始终 `opacity:1`（模糊过渡即视觉提示），仅执行 `translateY` 滑入

### 其他动画
- **移动端菜单**：亚克力覆盖层 0.25s opacity + 面板弹性滑入 + 条目交错入场
- **回到顶部按钮**：滚动 > 120px 出现，向上滚动隐藏，passive listener + rAF
- **主题切换**：View Transitions API（`::view-transition-old/new(theme-toggle)`），不兼容浏览器回退 `.no-transitions` 类
- **无障碍**：`@media (prefers-reduced-motion: reduce)` 禁用所有动画/模糊/变换

### 诗歌特殊处理
- `<!-- 流派 -->`：现代诗/仿古诗/仿古词/散文，驱动不同 CSS 布局
- 仿古词：计算行宽，短句（≤ 最长句一半）包裹 `<span class="ci-short">` 阶梯缩进
- 章节迁移：尾注/注释/心语移出 `#post-content`，500ms 延迟重新附加 IntersectionObserver

## 项目规则

- `.gitignore` 仅忽略 `.vs/`（Visual Studio 工作区文件），其他所有文件均提交到仓库
- `node_modules`、`.codebuddy`、`__pycache__`、`source` 目录在压缩构建时自动忽略（参见 `minify.py` 的 `SKIP_DIRS`）
- 文章中的图片统一托管于外部图床（S.EE），不直接存在于仓库中
- 内容采用 CC BY-NC-SA 4.0 协议，源代码采用 MIT 协议
