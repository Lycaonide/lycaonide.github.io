---
draft: false
title: 从Hexo迁移到Astro部署记录
published: 2026-09-11
description: 记录本站从 Hexo 迁移到 Astro 的全过程：技术选型、双站并存、字体本地化、站点美化、Giscus 评论接入、GitHub Actions 自动部署与 Cloudflare Pages 国内加速。
image: /assets/blog-migrate/cf-deploy-page.jpg
tags: [Astro, Hexo, 博客, 部署, GitHub Pages, Cloudflare Pages]
category: 技术笔记
---

#### 一、为什么从 Hexo 迁移到 Astro

原来这个博客是用 **Hexo** 搭的（另一篇《学习用Hexo写博客》记录了完整过程），部署在 GitHub Pages 上，用起来没问题。但用久了有几个痛点：

- **主题老旧**：Hexo 生态里好看的现代主题不多，定制麻烦；
- **性能一般**：页面是整站生成，JS 和 CSS 越来越重；
- **想折腾**：Astro 是当下内容站的主流方案，静态输出、组件化、生态活跃。

最终选型：

| 项目 | 选择 | 理由 |
| --- | --- | --- |
| 框架 | Astro 7 | 内容驱动、默认零 JS、构建快 |
| 主题 | Firefly | 基于 Fuwari 二次开发，二次元风格、功能全 |
| 托管 | GitHub Pages | 免费、和仓库联动 |
| 部署 | GitHub Actions | push 即自动构建发布 |

#### 二、搭建项目与本地预览

前置环境：需要 **Node.js 20+**（去 [nodejs.org](https://nodejs.org) 下载安装）和 **pnpm** 包管理器：

```bash
# 安装 pnpm（Node.js 自带 corepack，也可用 npm 装）
npm install -g pnpm
pnpm --version   # 确认安装成功
```

Firefly 主题的仓库地址：[CuteLeaf/Firefly](https://github.com/CuteLeaf/Firefly)。克隆后安装依赖：

```bash
# 克隆模板（我的目录是 my-firefly-blog）
git clone https://github.com/CuteLeaf/Firefly.git my-firefly-blog
cd my-firefly-blog

# 安装依赖并启动本地预览
pnpm install
pnpm dev
```

浏览器打开 `http://localhost:4321` 即可看到站点。之后每次改配置，本地跑 `pnpm build` + `pnpm preview` 验证，确认无误再推送。

#### 三、双站并存：旧博客不丢

迁移期间新站还没完全就绪，旧站不能直接关。方案是**双站并存**：

- **新站（Astro）**：部署在 `lycaonide.github.io` 仓库，即主站 `https://lycaonide.github.io`；
- **旧站（Hexo）**：保留原内容，作为项目页部署到 `https://lycaonide.github.io/hexo-blog/`。

等新站内容补齐后，再逐步把旧站文章迁过来，最后下线旧站即可。迁移过程零停服，随时可以回滚。

#### 四、字体本地化（最大的坑：jsdelivr 被墙）

这是迁移过程中最折腾的一环。主题默认从 **jsdelivr CDN** 下载 3 个在线字体（Zen Maru Gothic / Inter / JetBrains Mono），而 jsdelivr 在国内**经常被墙**，导致：

- 构建卡在字体下载、超时失败；
- 线上页面字体加载不出来，回退成默认字体，很丑。

试过的方案和结论：

| 方案 | 结果 |
| --- | --- |
| 全局字体改系统字体 | 横幅标题、代码块仍引用在线字体 |
| 把字体装成 npm 包，provider 改 npm | Astro 7 的 npm provider **依然走 jsdelivr** |
| local provider | 集成静默失效，复制了字体但没生成 `@font-face` |
| **手动 `@font-face` + 本地 woff2** ✅ | **成功**，完全离线构建 |

最终做法：

1. 把 4 个 woff2 字体文件放进 `public/assets/fonts/`（字体可从主题自带的 assets 目录复制，或从 Google Fonts 下载对应字重的 woff2）；
2. 新建 `src/styles/local-fonts.css`，手写 `@font-face`：

```css
/* src/styles/local-fonts.css */
@font-face {
  font-family: "LXGW WenKai";
  src: url("/assets/fonts/lxgw-wenkai-500.woff2") format("woff2");
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: "Space Grotesk";
  src: url("/assets/fonts/space-grotesk-500.woff2") format("woff2");
  font-weight: 500;
  font-display: swap;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("/assets/fonts/jetbrains-mono-400.woff2") format("woff2");
  font-weight: 400;
  font-display: swap;
}
@font-face {
  font-family: "JetBrains Mono";
  src: url("/assets/fonts/jetbrains-mono-700.woff2") format("woff2");
  font-weight: 700;
  font-display: swap;
}
```

3. `fontConfig.ts` 里把 selected 设为 `["system"]`，让全局走系统字体；
4. 写一个**子集化脚本**：扫描构建产物里的所有 HTML，收集实际用到的字符，只保留这些字符生成轻量 woff2（核心代码用了 `subset-font` 库）：

```ts
// scripts/subset-fonts.ts（核心逻辑）
import subsetFont from "subset-font";
import { glob } from "glob";
import { readFile, writeFile } from "node:fs/promises";

// 1. 收集 dist/ 里所有 HTML 的实际字符
const htmlFiles = await glob(`${DIST_DIR}/**/*.html`);
const charSet = new Set<string>();
for (const file of htmlFiles) {
  const html = await readFile(file, "utf-8");
  for (const c of html.replace(/<[^>]+>/g, " ")) charSet.add(c);
}

// 2. 用 subset-font 生成子集 woff2，再替换 CSS/HTML 里的引用
const subset = await subsetFont(fontBuffer, [...charSet].join(""), {
  targetFormat: "woff2",
});
await writeFile(outFile, subset);
```

这个脚本已集成进 `pnpm build`（构建链会自动执行），也可以单独跑：`npx tsx scripts/subset-fonts.ts`。结果：**字体体积从 7MB 压到 160.8KB**，页面加载快了很多。

##### 在线字体：能访问 jsdelivr 时的简单方案

如果网络环境能访问 jsdelivr（比如开了代理，https://www.jsdelivr.com 能正常打开），就不必折腾本地化，用 **Fontsource + jsdelivr CDN** 几行 CSS 引入即可，主题用的三个字体都能这样加：

```css
/* 放在全局样式入口文件顶部 */
@import url("https://cdn.jsdelivr.net/npm/@fontsource/zen-maru-gothic@5/index.css");
@import url("https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/index.css");
@import url("https://cdn.jsdelivr.net/npm/@fontsource/inter@5/index.css");
```

然后在字体配置里直接引用对应字体名（比如 `Zen Maru Gothic`、`JetBrains Mono`）即可，不需要下载任何文件、不需要子集化脚本，这是最省事的路径。

> 注意：这个方法**依赖运行时能访问 cdn.jsdelivr.net**。国内直连时这个域名经常被墙或极慢，页面会长时间白屏等字体。**能稳定访问 jsdelivr → 用在线方案（简单）；国内直连 → 用本地化方案（稳）**。本站最终选了本地化，原因就是访客大多在国内。

> 结论：**国内直连时** jsdelivr 基本无解，**能本地化的资源一律本地化**，构建和线上都稳。

> 结论：jsdelivr 在国内基本无解，**能本地化的资源一律本地化**，构建和线上都稳。

#### 五、站点美化：装饰总开关

主题本身是二次元风格，加了几个装饰效果：**樱花飘落、Live2D 看板娘、水波纹背景、卡片立体感**。为了让它们可管理，我统一收敛到一个配置文件 `src/config/decorationConfig.ts`：

```ts
// src/config/decorationConfig.ts
export const decorationConfig = {
  sakura: true,   // 樱花飘落
  live2d: true,   // 看板娘
  waves: true,    // 背景水波纹
  card3d: true,   // 卡片立体感
};
```

想换"极简技术风"时，全部改成 `false` 就行，不用到处找开关。

#### 六、评论系统：Giscus

评论用的是 **Giscus**（基于 GitHub Discussions，免费、无广告、数据在自己仓库里）。接入步骤：

1. **开启 Discussions**：仓库 `Settings → Features → Discussions` 勾选开启。开启后仓库导航栏会出现 Discussions 入口：

![步骤1：开启仓库 Discussions](/assets/blog-migrate/discussions.png)

2. **安装 giscus App**：[giscus.app](https://giscus.app) → Install，授权给博客仓库；
3. **生成配置**：在 giscus 配置页填仓库名，页面会校验仓库状态（必须公开、已装 App、已开 Discussions），三项都满足会显示"成功"：

![步骤3：giscus 配置页校验仓库](/assets/blog-migrate/giscus-repo.png)

4. **写入主题配置** `src/config/commentConfig.ts`：

```ts
// src/config/commentConfig.ts
export const commentConfig = {
  type: "giscus",
  repo: "lycaonide/lycaonide.github.io",
  repoId: "R_kgDORApdOw",
  category: "Announcements",
  categoryId: "DIC_kwDORApdO84DFWdq",
  mapping: "title",        // 按文章标题匹配讨论
  reactionsEnabled: "1",
  inputPosition: "top",
  lang: "zh-CN",
  loading: "lazy",
};
```

> 补充：分类我选了 **Announcements**（公告分类），可以防止陌生人随意开新讨论刷屏。

#### 七、友链页面

主题自带了友链页，只是默认关闭。开启方法：

```ts
// src/config/siteConfig.ts
friends: true,   // 原来是 false
```

同时新建 `src/content/spec/friends.md` 写入友链说明（本站信息、申请方式、小要求），页面底部就会显示自定义的友链交换说明。

注意：友链内容页缺失会导致构建报错 `friends page content not found`，所以 **开关和内容文件要一起建**。

#### 八、GitHub Actions 自动部署

推送后自动构建发布，用的是 Actions workflow（`.github/workflows/deploy.yml`），这是本站实际在用的完整配置：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main, master ]
  workflow_dispatch:

# Pages 部署需要的权限
permissions:
  contents: read
  pages: write
  id-token: write

# 确保只有一个部署任务同时运行
concurrency:
  group: "pages"
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.22.0
          run_install: false

      - name: Install dependencies
        run: pnpm install --no-frozen-lockfile

      - name: Build site
        run: pnpm run build

      - name: Create .nojekyll file
        run: touch dist/.nojekyll

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: dist  # Astro默认构建输出目录

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

几个关键点：

- **`touch dist/.nojekyll`**：GitHub Pages 默认用 Jekyll 处理，不建这个文件会把 `_astro` 这类目录忽略掉，页面会白屏；
- **`concurrency`**：防止多次 push 时部署任务互相打架；
- **`workflow_dispatch`**：想手动触发重新部署时，Actions 页面点一下即可。

每次 push 后，仓库的 Actions 页面会看到构建部署记录（绿色对勾表示成功，点进去能看每步日志）：

![步骤：push 后在 Actions 页面查看部署记录](/assets/blog-migrate/github-actions.png)

以后写文章只需要：

```bash
git add .
git commit -m "新文章"
git push
```

> 前置：`git push` 走 SSH，需要先在 GitHub 配置好 SSH 密钥（生成密钥、把公钥加到 GitHub → SSH and GPG keys，方法可参考本站《学习用Hexo写博客》一文第五节）。

等待 3-4 分钟，Actions 构建部署完成，线上自动更新，全程不用手动操作。

#### 十、Cloudflare Pages 部署（国内访问加速）

GitHub Pages 的服务器在境外，国内访问时快时慢，图片、字体偶尔要等很久。为了让国内访客更流畅，给本站加了一层 **Cloudflare Pages 双部署**：GitHub Pages 保持不变（原有链接不断），Cloudflare Pages 作为国内加速入口，两个域名内容同步。

**双部署有什么用：**

- **国内加速**：Cloudflare 有全球 CDN（含国内优化节点），页面、图片、字体加载明显更快，这是最主要的价值；
- **双保险**：一个平台出问题（GitHub 被墙、Pages 服务异常、DNS 污染），另一个域名随时能顶上，站点不"失联"；
- **评论/友链不受影响**：Giscus 评论挂在 GitHub 仓库上、友链数据在配置里，两个域名共用同一套，换域名不丢数据。

**两个网址内容完全一致，按网络环境任选：**

- GitHub Pages：`https://lycaonide.github.io`
- Cloudflare Pages：`https://my-firefly-blog.pages.dev`

##### 为什么选 Cloudflare Pages

- **免费额度够用**：每月 100 GB 流量，静态博客轻松覆盖；
- **自带全球 CDN**：国内节点比 GitHub Pages 快得多；
- **支持自定义域名、自动 HTTPS**；
- **和 GitHub 无缝衔接**：可以直接连仓库，也可以用 API Token 手动部署。

##### 方案对比：控制台连接 Git vs API Token

一开始尝试的是 Cloudflare 控制台「连接到 Git」（Workers 和 Pages → 创建 → 连接到 Git → 授权 GitHub → 选仓库），理想情况是自动构建、push 即部署。但实测遇到了几个坑：

- 点「Connect GitHub」后**反复跳转到 GitHub 的 App 安装配置页**（settings/installations），而不是正常的 OAuth 授权；
- 仓库权限配好后点 Save，**授权回调不自动回 CF**，仓库列表一直加载不出来；
- 折腾半天走不到选仓库那一步。

**为什么改用 API Token 方案：**

- **不依赖控制台页面**：命令行一条命令完成部署，不碰那个绕圈的 OAuth 流程；
- **可复现、可写进脚本/CI**：命令即文档，以后换机器也能一键部署；
- **权限可精确控制**：token 只给「Cloudflare Pages → Edit」权限，用完随时在控制台撤销，比账号级授权更安全。

##### 1. 创建 API Token

Cloudflare 控制台 → 右上角头像 → **My Profile** → **API Tokens** → **Create Token** → 选 **Custom token**：

- Token name：随意（比如 `blog-deploy`）；
- Permissions：`Account` → `Cloudflare Pages` → `Edit`；
- Account resources：`Include` → 你的账号；
- 其他默认，点 Create 后复制 token（只显示一次）。

> 注意：token 相当于账号钥匙，**不要提交到代码仓库**；部署完可以随时在控制台撤销轮换。

##### 2. 构建并部署（wrangler）

本地构建产物在 `dist/`，用 [wrangler](https://developers.cloudflare.com/workers/wrangler/) 直接推上去（Node 自带 npx，无需全局安装）：

```bash
# 1. 构建（输出 dist/）
pnpm build

# 2. 配置凭据（PowerShell 用 $env: 前缀）
export CLOUDFLARE_API_TOKEN="你的API_TOKEN"      # 上一步创建的
export CLOUDFLARE_ACCOUNT_ID="你的账号ID"        # CF 控制台 URL 里 /xxx/ 那段

# 3. 创建 Pages 项目（仅首次）
npx wrangler pages project create my-firefly-blog --production-branch main

# 4. 部署 dist 目录
npx wrangler pages deploy dist --project-name my-firefly-blog --branch main
```

部署成功输出（真实记录）：

```text
✨ Success! Uploaded 244 files (17.28 sec)

🌎 Deploying...
✨ Deployment complete! Take a peek over at https://ca824054.my-firefly-blog.pages.dev
```

生产域名：**https://my-firefly-blog.pages.dev**

##### 3. 验证

浏览器打开 `https://my-firefly-blog.pages.dev`，内容和 GitHub Pages 完全一致（同一个 dist 构建产物），国内访问明显更流畅：

![Cloudflare Pages 部署后的博客首页](/assets/blog-migrate/cloudflare-pages.jpg)

Cloudflare 控制台的部署记录页（Production 域名 + 每次部署的提交信息、状态、预览地址）：

![Cloudflare Pages 部署记录页](/assets/blog-migrate/cf-deploy-page.jpg)

##### 4. 后续自动化：push 双平台同步

目前 GitHub Pages 是 push 自动部署，Cloudflare Pages 是手动 `wrangler pages deploy`。想做到**推一次代码、两个平台同时更新**，在仓库新建 `.github/workflows/deploy-cloudflare.yml`，用官方 `cloudflare/wrangler-action@v3`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'

      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 11.22.0
          run_install: false

      - name: Install dependencies
        run: pnpm install --no-frozen-lockfile

      - name: Build
        run: pnpm run build

      - name: Deploy to Cloudflare Pages
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          command: pages deploy dist --project-name my-firefly-blog --branch main
```

使用前提：在 GitHub 仓库 Settings → Secrets and variables → Actions 里添加两个 secret：

- `CLOUDFLARE_API_TOKEN`：Cloudflare API Token（创建方法见上文）；
- `CLOUDFLARE_ACCOUNT_ID`：Cloudflare 账号 ID（控制台 URL 里 `/xxx/` 那段）。

配好之后，每次 `git push` 会自动构建并同时部署到 GitHub Pages 和 Cloudflare Pages。

##### 5. 自定义域名（可选）

Cloudflare Pages 支持绑定自定义域名（免费，自动 HTTPS），在项目页 → Custom domains 里添加即可。本站暂时用 `pages.dev` 子域名，等有合适域名再绑。绑定后原 `pages.dev` 域名依然可用，不影响现有访问。

#### 十一、总结

这次迁移的核心经验：

1. **能本地化就本地化**：jsdelivr 在国内不可靠，字体、JS 库尽量走本地，构建和线上都稳；
2. **配置收敛**：装饰、评论、友链等开关集中在 config 文件里，方便统一管理；
3. **双站过渡**：新旧站并存，内容迁完再下线，风险可控；
4. **自动化部署**：GitHub Actions 让发布变成"push 就完事"。

最终效果就是你现在看到的这个站：Astro 7 + Firefly 主题 + GitHub Pages，樱花、评论、友链齐全，加载快还免费。
