---
draft: false
title: 从Hexo迁移到Astro部署记录
published: 2026-09-14
updated: 2026-09-15
description: 记录本站从 Hexo 迁移到 Astro 的全过程：技术选型、双站并存、字体本地化、站点美化、Giscus 评论接入、GitHub Actions 自动部署与 Cloudflare Pages 国内加速。
tags: [Astro, Hexo, 博客, 部署, GitHub Pages, Cloudflare Pages]
category: 技术笔记
---

#### 一、为什么从 Hexo 迁移到 Astro

原来这个博客是用 **Hexo** 搭的（另一篇《学习用Hexo写博客》记录了完整过程），部署在 GitHub Pages 上，用起来没问题。但用久了有几个很实际的痛点：

- **主题改不动**：想加个新功能、调个布局，得翻模板源码加硬改样式，主题一升级就冲突，越改越不敢动；
- **构建越来越慢**：文章一多，`hexo generate` 要跑好几分钟，改个错别字也要等半天；
- **国内打开不稳**：GitHub Pages 直连时快时慢，图片偶尔加载失败；主题默认引的国外 CDN（jsdelivr、Google Fonts）经常卡住加载不出来——这个后面"字体本地化"和"Cloudflare 双部署"两章就是为了治它；
- **想换主流方案**：Astro 是当下内容站的主流，静态输出、组件化、生态活跃，值得折腾。

最终选型：

| 项目 | 选择 | 理由 |
| --- | --- | --- |
| 框架 | Astro 7 | 内容驱动、默认零 JS、构建快 |
| 主题 | Firefly | 基于 Fuwari 二次开发，二次元风格、功能全 |
| 托管 | GitHub Pages | 免费、和仓库联动 |
| 部署 | GitHub Actions | push 即自动构建发布 |

#### 二、搭建项目与本地预览

前置环境：需要 **Node.js 22.12+**（本教程用 24 LTS；Astro 7 构建、wrangler 部署都要求 22 以上，用 20 会直接报错）和 **pnpm** 包管理器。Windows 推荐用 **nvm-windows** 管理 Node 版本：

```bash
# 安装 nvm-windows：github.com/coreybutler/nvm-windows 下载安装
nvm install 24.5.0   # 安装 Node 24（也可装 22 LTS）
nvm use 24.5.0       # 切换版本
node --version       # 确认输出 v24.x

# 安装 pnpm（Node.js 自带 corepack，也可用 npm 装）
npm install -g pnpm
pnpm --version       # 确认安装成功
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

#### 三、双站并存

迁移期间新站还没完全就绪，旧站不能直接关。方案是**双站并存**：

- **新站（Astro）**：部署在 `lycaonide.github.io` 仓库，即主站 `https://lycaonide.github.io`；
- **旧站（Hexo）**：保留原内容，作为项目页部署到 `https://lycaonide.github.io/hexo-blog/`。

等新站内容补齐后，再逐步把旧站文章迁过来，最后下线旧站即可。迁移过程零停服，随时可以回滚。

#### 四、字体本地化

主题默认从 **jsdelivr CDN** 下载 3 个在线字体（Zen Maru Gothic / Inter / JetBrains Mono）。**最省事的做法是直接用在线字体**——用 Fontsource + jsdelivr CDN 几行 CSS 就能引入，网络能访问 jsdelivr 时：

```css
/* 放在全局样式入口文件顶部 */
@import url("https://cdn.jsdelivr.net/npm/@fontsource/zen-maru-gothic@5/index.css");
@import url("https://cdn.jsdelivr.net/npm/@fontsource/jetbrains-mono@5/index.css");
@import url("https://cdn.jsdelivr.net/npm/@fontsource/inter@5/index.css");
```

然后在字体配置里直接引用对应字体名即可，不用下载文件、不用子集化。我一开始就是这么用的，当时网络能连上 jsdelivr。

但在线字体的机制是**访客打开页面时由浏览器现场去 `cdn.jsdelivr.net` 拉取**——大多数访客在国内，直连这个域名经常连不上，字体就加载不出来，页面回退成系统字体。所以为了访客体验，我需要找**不连外网也能加载**的方案，于是试了好几种方案：

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
  font-family: "Noto Sans SC";
  src: url("/assets/fonts/noto-sans-sc-500.woff2") format("woff2");
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

这个脚本已集成进 `pnpm build`（构建链会自动执行），也可以单独跑：`npx tsx scripts/subset-fonts.ts`。结果：**字体体积从 3MB 压到约 140KB**（子集化后），页面加载快了很多。

本站最终用的是这套本地化方案：字体文件存在站点自己的服务器上，**访客打开本站不需要连任何外部字体服务**，构建和线上都稳。

横幅标题（首页那句"你好，我是lycaonide"）的字体也是这么折腾出来的：主题默认标题是 **Zen Maru Gothic**（圆体），一路试了不少：

| 试过的字体 | 结果 |
| --- | --- |
| 站酷快乐体 | 圆润手写风，和参考图不像，弃 |
| Zen Maru Gothic（主题默认圆体） | 圆体效果不符预期，弃 |
| 思源黑体 Noto Sans SC | 方正黑体，不够满意，弃 |
| **霞鹜文楷（楷体）** ✅ | **最想要的楷体风格**，本地化+子集化后体积小，最终采用 |

结论：横幅标题/副标题用霞鹜文楷（`fontConfig.ts` 里 `bannerTitleFont` / `bannerSubtitleFont` 都指向 LXGW WenKai），本地化+子集化后体积可控，访客加载无压力。

#### 五、站点美化：装饰总开关

主题本身是二次元风格，加了几个装饰效果：**樱花飘落、水波纹背景、卡片立体感**。为了让它们可管理，我统一收敛到一个配置文件 `src/config/decorationConfig.ts`：

```ts
// src/config/decorationConfig.ts
export const decorationConfig = {
  sakura: true,   // 樱花飘落
  waves: true,    // 背景水波纹
  card3d: true,   // 卡片立体感
};
```

想换"极简技术风"时，全部改成 `false` 就行，不用到处找开关。

#### 六、评论系统：Giscus

评论用的是 **Giscus**。选它是因为对比一圈后，它是唯一"零后端"的方案：

- **不新增任何服务器**：博客已经免费部署在 GitHub Pages / Cloudflare Pages 上，如果评论改用 Twikoo 这类方案，还得在 Vercel 或腾讯云函数上多部署一个后端——Vercel 国内访问不稳定，云函数要花钱。Giscus 直接挂在仓库的 Discussions 上，不产生任何额外部署和费用；
- **登录即评论**：博客源码就在 GitHub，访客用 GitHub 账号就能评论，不用再注册第三方评论账号，也不需要接验证码；
- **数据在仓库里**：评论存在仓库的 Discussions 里，以后换部署平台、换域名，数据都跟着仓库走，不会丢；
- **防刷屏省心**：配成 Announcements 分类后只有我能开新讨论，访客只能回复，不用再做审核后台。

实际对比过的方案：Twikoo（功能全，但要额外部署后端，Vercel 国内访问不稳）、自建评论（要服务器和维护）、第三方免费评论（有广告、数据在别人平台）——都有后端或迁移成本，最后选了 Giscus。接入步骤：

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

> 注意：上面 `repoId`、`categoryId` 是**本站的值**，照着做时去 [giscus.app](https://giscus.app) 填自己的仓库，页面会自动生成你仓库对应的 repoId / categoryId / mapping，替换进去即可（填错评论不会加载）。

> 补充：分类我选了 **Announcements**（公告分类），可以防止陌生人随意开新讨论刷屏。GitHub Discussions 的分类主要有这几个：

| 分类 | 用途 |
| --- | --- |
| **Announcements** | 公告/官方发布，只有管理员能开讨论，访客只能看和回复，适合评论系统防刷屏 |
| General | 一般讨论，默认分类 |
| Ideas | 想法、建议、构思 |
| Polls | 投票 |
| Q&A | 问答，提问/解答 |
| Show and tell | 展示作品、分享 |

评论只需要展示和回复，用 **Announcements** 最合适：既能回复，又不怕陌生人随手开新帖。

#### 七、友链页面

主题自带了友链页，只是默认关闭。开启方法：

```ts
// src/config/siteConfig.ts
friends: true,   // 原来是 false
```

同时新建 `src/content/spec/friends.md` 写入友链说明（本站信息、申请方式、小要求），页面底部就会显示自定义的友链交换说明。

注意：友链内容页缺失会导致构建报错 `friends page content not found`，所以 **开关和内容文件要一起建**。

**友链的几种常见方式：**

- **评论区申请**：在友链页评论区留言，附上站点名、链接、简介、头像；
- **邮件申请**：直接发邮件到站长邮箱，说明互换意愿和站点信息；
- **自助表单**：友链页放一个登记表单，来访者填完自动收录，站长后台看提交记录。做法概括：① 找一个免费表单服务（如 Formspree、腾讯云开发静态网站托管自带表单能力）；② 复制它给的 action 地址，在友链页写一个简单的 HTML 表单（站点名/链接/简介/头像四个字段）；③ 提交后数据进表单服务后台，站长定期把新友链加进 `friends.md` 再构建发布；
- **先加后说**：先在对方站点加上自己的链接，再通过评论/邮件告知对方回加。

本站用的是**评论区 + 邮件**：友链页底部有申请说明，评论里留下站点信息即可，详情见 `src/content/spec/friends.md`。

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

每次 push 后，仓库的 Actions 页面会看到构建部署记录，点进去能看每步日志：

![步骤：push 后在 Actions 页面查看部署记录](/assets/blog-migrate/github-actions.png)

以后写文章只需要：

```bash
git add .
git commit -m "新文章"
git push
```

> 前置：`git push` 走 SSH，需要先在 GitHub 配置好 SSH 密钥（生成密钥、把公钥加到 GitHub → SSH and GPG keys，方法可参考本站《学习用Hexo写博客》一文第五节）。

等待 3-4 分钟，Actions 构建部署完成，线上自动更新，全程不用手动操作。

#### 九、Cloudflare Pages 部署（国内访问加速）

GitHub Pages 的服务器在境外，国内访问时快时慢，图片、字体偶尔要等很久。为了让国内访客更流畅，给本站加了一层 **Cloudflare Pages 双部署**：GitHub Pages 保持不变，Cloudflare Pages 作为国内加速入口，两个域名内容同步。

**双部署有什么用：**

- **国内加速**：Cloudflare 有全球 CDN（含国内优化节点），页面、图片、字体加载明显更快，这是最主要的价值；
- **双保险**：一个平台出问题（GitHub 被墙、Pages 服务异常、DNS 污染），另一个域名随时能顶上，站点不"失联"；
- **评论/友链不受影响**：Giscus 评论挂在 GitHub 仓库上、友链数据在配置里，两个域名共用同一套，换域名不丢数据。

**两个网址内容完全一致，按网络环境任选：**

- GitHub Pages：`https://lycaonide.github.io`
- Cloudflare Pages：`https://my-firefly-blog.pages.dev`

##### 1. 为什么选 Cloudflare Pages

- **免费额度够用**：每月 100 GB 流量，静态博客轻松覆盖；
- **自带全球 CDN**：国内节点比 GitHub Pages 快得多；
- **支持自定义域名、自动 HTTPS**；
- **和 GitHub 无缝衔接**：可以直接连仓库，也可以用 API Token 手动部署。

##### 2. 方案对比：控制台连接 Git vs API Token

一开始尝试的是 Cloudflare 控制台「连接到 Git」（Workers 和 Pages → 创建 → 连接到 Git → 授权 GitHub → 选仓库），理想情况是自动构建、push 即部署。但实测遇到了几个坑：

- 点「Connect GitHub」后**反复跳转到 GitHub 的 App 安装配置页**（settings/installations），而不是正常的 OAuth 授权；
- 仓库权限配好后点 Save，**授权回调不自动回 CF**，仓库列表一直加载不出来；
- 折腾半天走不到选仓库那一步。

**为什么改用 API Token 方案：**

- **不依赖控制台页面**：命令行一条命令完成部署，不碰那个绕圈的 OAuth 流程；
- **可复现、可写进脚本/CI**：命令即文档，以后换机器也能一键部署；
- **权限可精确控制**：token 只给「Cloudflare Pages → Edit」权限，用完随时在控制台撤销，比账号级授权更安全。

##### 3. 创建 API Token

在 Cloudflare 控制台右上角头像 → **My Profile** → **API Tokens** 页面，点右上角蓝色 **Create Token** 按钮：

![Cloudflare API Tokens 页面](/assets/blog-migrate/cf-api-token.jpg)

然后选 **Custom token**，按下面的参数填：

- Token name：**随便填**，只是标签不影响功能（比如 `blog-deploy`、`blog_deploy` 都行）；
- Permissions：`Account` → `Cloudflare Pages` → `Edit`；
- Account resources：`Include` → 你的账号；
- 其他默认，点 Create 后复制 token（只显示一次）。

> 注意：token 相当于账号钥匙，**不要提交到代码仓库**。

**以后想改 / 轮换 / 删除 token**：Cloudflare 控制台 → 右上角头像 → **My Profile** → **API Tokens**，找到对应 token 后点右侧菜单：

- **Edit**：修改名称、权限、绑定的账号；
- **Roll**：轮换——生成一个新值，旧值立即失效（token 泄露或想换新时用这个）；
- **Delete**：彻底删除（部署不再需要时）。

token 只在创建时完整显示一次，**Roll 之后记得把新值同步到 GitHub Secrets**（见下文第 6 节）。

##### 4. 构建并部署（wrangler）

本地构建产物在 `dist/`，用 [wrangler](https://developers.cloudflare.com/workers/wrangler/) 直接推上去（Node 自带 npx，无需全局安装）：

```powershell
# 1. 构建（输出 dist/）
pnpm build

# 2. 配置凭据（Windows PowerShell 用 $env: 前缀，Linux/macOS 用 export）
$env:CLOUDFLARE_API_TOKEN = "你的API_TOKEN"      # 上一步创建的
$env:CLOUDFLARE_ACCOUNT_ID = "你的账号ID"        # 你的账号ID

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

##### 5. 验证

浏览器打开 `https://my-firefly-blog.pages.dev`，内容和 GitHub Pages 完全一致（同一个 dist 构建产物），国内访问明显更流畅：

![Cloudflare Pages 部署后的博客首页](/assets/blog-migrate/cloudflare-pages.jpg)

Cloudflare 控制台的部署记录页（Production 域名 + 每次部署的提交信息、状态、预览地址）：

![Cloudflare Pages 部署记录页](/assets/blog-migrate/cf-deploy-page.jpg)

##### 6. 后续自动化：push 双平台同步

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

使用前提：把两个值配到 GitHub 仓库的 **Secrets** 里，步骤如下：

1. 打开 GitHub 仓库页：`https://github.com/Lycaonide/lycaonide.github.io`；
2. 点顶部 **Settings** 标签；
3. 左侧菜单 **Security** → **Secrets and variables** → **Actions**；
4. 点绿色的 **New repository secret** 按钮；
5. **Name** 填 `CLOUDFLARE_API_TOKEN`，**Secret** 填你的 Cloudflare API Token（创建方法见上文第 3 节），点 **Add secret**；
6. 再点一次 **New repository secret**：**Name** 填 `CLOUDFLARE_ACCOUNT_ID`，**Secret** 填 Cloudflare 账号 ID，点 **Add secret**。

![GitHub Secrets 配置界面](/assets/blog-migrate/github-secrets.jpg)

> 注意：**workflow 是仓库 `.github/workflows/` 目录里的 YAML 配置**，声明“每次 push 自动执行哪些步骤”，**Name 必须和 workflow 里引用的一致**，不能随便起名（名字对不上，workflow 读不到，CF 部署会一直失败）。两个值分别填什么：`CLOUDFLARE_API_TOKEN` 填你创建的那个新 token 值；`CLOUDFLARE_ACCOUNT_ID` 填账号 ID——打开 Cloudflare 控制台任意页面，看地址栏 `dash.cloudflare.com/` 后面第一段，就是账号 ID。

配好之后，每次 `git push` 会自动构建并同时部署到 GitHub Pages 和 Cloudflare Pages。仓库 Actions 页面可以看到两个 workflow 同时运行、双双成功：

![push 后 GitHub Actions 双平台同时部署成功](/assets/blog-migrate/actions-double-deploy.png)

##### 7. 自定义域名（可选）

Cloudflare Pages 支持绑定自定义域名（免费，自动 HTTPS），在项目页 → Custom domains 里添加即可。本站暂时用 `pages.dev` 子域名，等有合适域名再绑。绑定后原 `pages.dev` 域名依然可用，不影响现有访问。

#### 十、知识库（Starlight）

博客的文章是"一篇一篇"的，但考研笔记这种**按科目、按章节**整理的内容，文章流明显不合适：笔记要看的是"树状目录 → 章节导航"，不是一篇篇文章卡片。所以在这个仓库里加了一个 **Starlight** 文档区（Astro 官方的文档站集成），导航名显示"知识库"，URL 用短路径 **`/kb/`**，和博客**同一个仓库、同一次构建、同一个域名**：

- 博客：`/`（Firefly 主题，文章、首页、友链等）
- 知识库：`/kb/`（Starlight 文档站，考研四科笔记）

##### 1. 为什么用 Starlight

对比过两种方案：一是"手写侧边栏"（自己写文档区 + 侧边栏组件），二是"单独建一个文档站"（另一个仓库/域名）。

| 方案 | 问题 |
| --- | --- |
| 手写侧边栏 | 要自己处理文件夹嵌套、排序、分组、折叠逻辑，笔记一多维护成本高 |
| 单独建文档站 | 多一个仓库、多一套部署、搜索还得分开 |
| **Starlight 同仓库子路由** ✅ | 自动侧边栏、TOC、代码高亮全自带；一次构建、一个域名，Pagefind 统一搜博客+知识库 |

408 四科 26 章笔记，用 Starlight 最省事。

##### 2. 安装与接入

```powershell
pnpm add @astrojs/starlight
```

在 `astro.config.mjs` 的 `integrations` 里加 starlight：

```js
// astro.config.mjs（starlight 部分，本站实际配置）
starlight({
  title: "知识库",                              // 导航名显示"知识库"
  disable404Route: true,
  sidebar: kbSidebar,                           // 动态侧边栏，见第 5 节
  social: [{ icon: "external", label: "返回", href: "/" }],   // 顶栏"返回"回博客首页
  components: {
    SocialIcons: "./src/components/starlight/SocialIcons.astro",  // 把图标换成文字"返回"
  },
  customCss: ["./src/styles/starlight.css"],    // 样式对齐博客主题色，见第 6 节
  head: [
    // AI 问答脚本（第十一章），必须 is:inline，知识库页也有 AI 按钮
    { tag: "script", attrs: { src: "/ai-chat.js", is: "inline" } },
  ],
}),
```

> **导航名和 URL 为什么分开**：`title` 显示"知识库"，但访问路径是 `/kb/`——短路径好记、输入方便，导航名和 URL 互不绑定，改名字不用动链接。

##### 3. 内容目录

知识库内容在 `src/content/docs/`，按"知识库 → 考研 → 科目 → 章节"建文件夹，四科章节目录按王道《408 考研复习指导》建：

```text
src/content/docs/kb/
├── index.md                    # 知识库首页
└── 考研/
    ├── index.md
    ├── 操作系统/       # 5 章：概述 / 进程线程 / 内存 / 文件 / IO
    ├── 数据结构/       # 8 章：绪论 / 线性表 / 栈队列数组 / 串 / 树 / 图 / 查找 / 排序
    ├── 计算机网络/     # 6 章：体系结构 / 物理 / 数据链路 / 网络 / 传输 / 应用
    └── 计算机组成原理/ # 7 章：概述 / 数据运算 / 存储 / 指令 / CPU / 总线 / IO
```

##### 4. 每章建一个子页

每个科目一个文件夹 + `index.md`，每章一个 md 文件。科目首页 `index.md` 里写章节目录链接（方便从科目页点进章节），章节页是独立的 `第N章-xxx.md`，Starlight 自动按层级生成侧边栏。

```markdown
<!-- src/content/docs/kb/考研/操作系统/index.md -->
---
title: 操作系统
description: Operating System - 进程/内存/文件/设备管理，配合王道考研
sidebar:
  hidden: true
---

> 这里放 操作系统 的复习笔记，按章节组织。
## 章节目录（王道考研复习指导）
- [第1章 计算机系统概述](第1章-计算机系统概述/)
- [第2章 进程与线程](第2章-进程与线程/)
- ……
```

`sidebar: hidden: true` 让科目首页不在侧边栏重复出现（侧边栏只展示章节），章节目录由用户点进科目页看。

##### 5. 动态侧边栏（加新章不用改配置）

Starlight 默认 `sidebar` 要手写条目，加一章改一次很烦。本站写了个**构建时扫描函数**：读 `src/content/docs/kb` 目录，自动生成侧边栏结构——**以后加新章节、新科目，只要把 md 丢进文件夹就行，不用碰 astro.config.mjs**：

```js
// astro.config.mjs 顶部（本站实际使用）
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __kbDir = fileURLToPath(new URL("./src/content/docs/kb", import.meta.url));

function kbSlugify(name) {
  return name.replace(/\.mdx?$/, "").toLowerCase()
    .replace(/[^\p{L}\p{N}\- ]/gu, "").replace(/ +/g, "-");
}

function kbScan(dir, prefix) {
  const items = readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory() || /\.mdx?$/.test(d.name))
    .sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const out = [];
  for (const e of items) {
    if (e.isDirectory()) {
      const children = kbScan(join(dir, e.name), prefix + "/" + e.name);
      if (children.length) out.push({ label: e.name, items: children });
    } else if (e.name !== "index.md" && e.name !== "index.mdx") {
      out.push({ slug: prefix + "/" + kbSlugify(e.name) });
    }
  }
  return out;
}

const kbSidebar = [
  { label: "知识库", items: [{ label: "知识库首页", link: "/kb/" }, ...kbScan(__kbDir, "kb")] },
];
```

之后在 `考研/` 下新增 `第N章-xxx.md`，**构建时侧边栏自动出现**。`index.md` 被过滤（只作文件夹首页，不进侧边栏）。

##### 6. 样式对齐博客主题 + 明暗联动

Starlight 默认是蓝色主题，放在博客里很突兀。用 `src/styles/starlight.css` 改成博客的青绿主题色（teal，和 Firefly 的 primary 一致）：

```css
/* src/styles/starlight.css（本站实际使用） */
:root[data-theme="light"] {
  --sl-color-accent-high: #0f766e;
  --sl-color-accent: #0d9488;
  --sl-color-accent-low: #ccfbf1;
}
:root[data-theme="dark"] {
  --sl-color-accent-high: #5eead4;
  --sl-color-accent: #2dd4bf;
  --sl-color-accent-low: #134e4a;
}
```

**明暗联动**：博客主题切换存在 `localStorage.theme`，Starlight 存在 `starlight-theme`，两边互不相通会割裂。`astro.config.mjs` 的 starlight `head` 里加了一段同步脚本（第 2 节配置里有），本地存储变化互相转发——**在博客切暗色，知识库跟着变**，反之亦然。

##### 7. 顶栏"返回"链接

Starlight 顶栏右侧默认放社交图标，本站自定义了 `src/components/starlight/SocialIcons.astro`，把图标换成**文字"返回"**，点击直接回博客首页——知识库是从博客点进来的，给一个明确的回去入口：

```astro
---
// src/components/starlight/SocialIcons.astro（本站实际使用）
import config from "virtual:starlight/user-config";
const links = config.social || [];
---
{
  links.length > 0 && (
    <>
      {links.map(({ label, href }) => (
        <a href={href} class="return-link">{label}</a>
      ))}
    </>
  )
}
<style>
  .return-link {
    color: var(--sl-color-text-accent);
    padding: 0.5em;
    margin: -0.5em;
    font-size: var(--sl-text-sm);
    text-decoration: none;
    white-space: nowrap;
  }
</style>
```

##### 8. 踩坑记录（实际修过的问题）

- **标题锚点图标**：Starlight 给每个标题自动加 `#` 锚点图标（点击可定位），博客文章也有一份。看起来"标题后面跟一个 # 加一个链接符号"，实际是自动生成的锚点。用 CSS 隐藏图标、保留锚点定位功能：
  ```css
  .sl-markdown-content .anchor { display: none; }
  ```
- **Swup 无刷新冲突**：博客用了 Swup 无刷新跳转，但 `/kb` 是 Starlight 独立布局，走 Swup 会样式错乱。在 swup 配置里排除：`ignore: [/^\/kb/]`。
- **AI 脚本注入**：知识库页要显示 AI 按钮，脚本在 starlight `head` 里注入**必须 `is: inline`**（否则 Astro 构建时丢弃引用），和博客布局里同一份 `ai-chat.js`。

##### 9. Obsidian 编辑 + AI 联动 + 部署

- **Obsidian 编辑**：`src/content/docs/kb/` 就是一个普通 Markdown 文件夹，直接用 **Obsidian** 打开就能编辑（双链、大纲都支持）。本地的 `.obsidian/` 配置目录已 gitignore，不会进仓库；写完 `git push` 自动部署上线。
- **AI 联动**：知识库页面同样有右下角 AI 问答按钮（第 11 章），提问时会把当前章节的正文作为上下文带给大模型——**对着笔记章节直接问"这一章的重点是什么"**。
- **部署**：`/kb/` 和博客一起构建、一起被 GitHub Actions / Cloudflare Pages 部署，**不需要额外配置**。

##### 10. 验证

```powershell
pnpm dev
```

浏览器打开 `https://my-firefly-blog.pages.dev/kb/`：左侧目录树（知识库 → 考研 → 四科）都正常。

![知识库首页：左侧目录树自动生成（知识库 → 考研 → 四科），右侧 On this page 目录](/assets/blog-migrate/kb-sidebar.png)以后写笔记：`src/content/docs/kb/考研/操作系统/` 里新建 `第6章-xxx.md` → `git push` → 侧边栏自动多出一节，不用改任何配置。

#### 十一、AI 问答接入（可选扩展）

本站右下角的 **✦ 悬浮按钮**就是 AI 问答：点开后可以像聊天一样问问题，系统会先在本地检索本站**全部博客文章**，把最相关的段落带给大模型，回答贴合本站内容（检索原理见第 5 节）。整个功能**免费额度内不花钱**，用的模型是火山方舟（豆包）的 **Doubao-Seed-2.0-Code**。

**为什么选火山方舟：**

先对比过 DeepSeek、智谱 GLM 的官方 API——都要**先充值**才能开通调用，个人博客还没用上就要花钱。火山方舟是少数**开通即送免费额度**的大模型平台（每个模型 50 万 tokens），加上国内直连、API 兼容 OpenAI 格式，正好符合本站"不花钱"的原则：

- **免费额度**：每个模型开通即送 50 万 tokens（约上千次问答），个人博客基本用不完；
- **国内直连快**：endpoint 在 `ark.cn-beijing.volces.com`，国内访问无墙；
- **按量计费便宜**：额度耗尽后按 tokens 计费（约 0.8 元/千 tokens 量级），可以随时在控制台停用；
- **不用额外服务器**：后端跑在 Cloudflare Pages Function 上（随 Pages 免费托管），不需要自己的云服务器。

##### 1. 开通模型

火山方舟控制台：`console.volcengine.com/ark` → **开通管理** → 搜索要用的模型（比如 `doubao-seed-2-0`）→ 点**开通**。开通页面能直接看到每个模型的免费额度（50 万 tokens）和计费价格，开通免费。

> 注意：模型 ID 在开通后控制台可查（如 `doubao-seed-2-0-code-preview-260215`）。如果控制台提示"余额不足无法开通"，是因为部分模型要求账户有预留金，充 20 元即可（可退）。

##### 2. 创建 API Key

控制台左侧 **API Key 管理** → **创建 API Key**，起个名字（如 `blog-ai`），创建后**只显示一次，马上复制保存**：

> API Key 相当于账号钥匙，**不要提交到代码仓库**（本教程把它放在 CF 环境变量里，见第 5 节）。

##### 3. 写 Cloudflare Pages Function（后端代理）

Pages 项目根目录建 `functions/api/chat.ts`——Cloudflare Pages 会自动把 `functions/api/` 下的文件发布成 `/api/xxx` 接口。作用：前端只把问题发给本站，由这个 Function 带 Key 去请求火山方舟，**Key 永远不会暴露到浏览器**：

```ts
// functions/api/chat.ts（本站实际使用版本）
export async function onRequestPost(context) {
  const { question, context: ctx } = await context.request.json().catch(() => ({}));
  if (!question || typeof question !== "string") {
    return json({ error: "缺少问题" }, 400);
  }
  const API_KEY = context.env.ARK_API_KEY;
  if (!API_KEY) {
    return json({ error: "服务未配置（缺少 ARK_API_KEY）" }, 500);
  }
  const MODEL = context.env.ARK_MODEL || "doubao-seed-2-0-code-preview-260215";
  const system =
    "你是本站的 AI 问答助手，根据提供的知识库内容回答用户问题。" +
    "如果知识库内容不足以回答，可以结合你的知识补充，并说明哪些来自知识库。回答简洁、条理清晰，使用中文。";
  const user =
    (ctx && typeof ctx === "string" && ctx.trim()
      ? `以下是知识库相关章节的内容（供参考）：\n\n${ctx.slice(0, 6000)}\n\n`
      : "") + `用户问题：${question}`;
  try {
    const resp = await fetch("https://ark.cn-beijing.volces.com/api/v3/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        max_tokens: 1500,
        temperature: 0.6,
      }),
    });
    if (!resp.ok) {
      const t = (await resp.text()).slice(0, 300);
      return json({ error: `上游接口错误 ${resp.status}: ${t}` }, 502);
    }
    const data = await resp.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (!answer) {
      return json({ error: "AI 未返回内容" }, 502);
    }
    // 把本次消耗的 tokens 返回给前端，用于费用提示
    const usage = data?.usage
      ? { prompt: data.usage.prompt_tokens ?? 0, completion: data.usage.completion_tokens ?? 0, total: data.usage.total_tokens ?? 0 }
      : null;
    return json({ answer, usage });
  } catch (e) {
    return json({ error: `请求失败: ${String(e)}` }, 500);
  }
}

function json(obj, status) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}
```

##### 4. 前端组件

新建 `public/ai-chat.js`：右下角浮动按钮 + 聊天弹窗 + 费用提示。核心逻辑：

```js
// public/ai-chat.js（核心逻辑，完整文件见仓库）
(function () {
  // GitHub Pages 没有 Functions 后端，只在 Cloudflare 域名启用
  if (location.hostname === "lycaonide.github.io") return;

  // 1. 创建浮动按钮和弹窗（appendChild 到 body）
  // 2. 发送问题时先本地检索博客全文（见第 5 节），把命中片段作为上下文，POST /api/chat
  // 3. 回答里如果有 usage.total，就显示"本次消耗 X tokens（免费额度内不扣费）"
  // 4. 弹窗底部常驻提示行：
  //    "免费额度内不花钱 · 额度用尽后按量计费，余额不足自动停用"
})();
```

然后在布局里**引入**（注意：必须加 `is:inline`，否则 Astro 会丢弃对 public 目录脚本的引用，按钮不出来）：

```astro
<!-- src/layouts/Layout.astro 的 <head> 里 -->
<script src="/ai-chat.js" is:inline></script>
```

如果用了 Starlight 知识库，也要在 `astro.config.mjs` 的 starlight `head` 里注入同一份：

```js
// astro.config.mjs（starlight 配置里）
head: [
  { tag: "script", attrs: { src: "/ai-chat.js", is: "inline" } },
],
```

> 踩坑记录：① Astro 会丢弃非 `is:inline` 的 public 脚本引用（页面 HTML 里查不到）；② 脚本在 `<head>` 里立即执行时 `document.body` 还不存在，要先等 `DOMContentLoaded`；③ GitHub Pages 没有 Functions 后端，要按域名禁用（`location.hostname` 判断）。

##### 5. 升级：博客全文本地检索（轻量 RAG）

第一版只能把"当前页面"内容带给 AI——你在哪个页面问，它参考哪个页面，问"本项目用什么 Node 版本"这种信息在其他文章里的问题就答不上。升级后改成**全文检索（轻量 RAG）**，实测效果（回答会**明确区分来源、点名具体篇目**）：

<img src="/assets/blog-migrate/ai-rag-sources.png" alt="AI 问答检索博客全文后回答 Node 版本（区分来源、点名篇目）" width="400" />

- **全文索引**：构建时由 `scripts/build-blog-index.mjs` 把 `src/content/posts/` 下所有文章解析成纯文本、按段落分块，生成 `public/api/blog-index.json`（本站 5 篇约 43KB），已挂进 `pnpm build` 自动生成；
- **本地检索**：提问时浏览器直接读索引，把问题拆成关键词（英文/数字词高权重 + 中文相邻两字 bigram）给每个段落打分，取最相关的 4 段（≤4500 字符，每篇最多 2 段）；
- **只送片段**：命中的段落拼进请求发给大模型，AI 基于片段回答——检索在浏览器本地完成**不花钱**，每次只消耗片段对应的 tokens（实测约 2200 tokens）。

```js
// public/ai-chat.js 新增的检索逻辑（核心）
fetch("/api/blog-index.json", { cache: "force-cache" })   // 1. 加载索引（缓存复用）
  .then(r => r.json()).then(idx => {
    // 2. 问题拆词：英文词 + 中文 bigram，标题/正文/标签加权打分
    // 3. 取分数最高的 4 段拼成上下文（每篇最多 2 段），并记录命中文章标题
    // 4. 片段作为 context、文章标题作为 sources 随问题 POST /api/chat
  });
```

**来源标注**：前端把命中文章的标题去重后随请求传给后端，后端拼进提示词“参考内容来自以下博客文章：xxx”；后端提示词同时要求 AI——先判断来源（博客文章还是知识库笔记）、回答时点名具体篇目（如“出自《从Hexo迁移到Astro部署记录》”）、只陈述事实不做纠错评论。在知识库页面提问时，回退内容会标注为“知识库笔记”，AI 会说明来自知识库。

**为什么不把全文直接塞给 AI**：5 篇文章全文约 43KB ≈ 2 万+ tokens，每次问答全量发太费；检索后只发命中片段 ≈ 4500 字符 ≈ 2 千 tokens，**省约 10 倍**，免费额度能多用很久。

##### 6. 配置环境变量（ARK_API_KEY）

Cloudflare 控制台 → 你的 Pages 项目 → **Settings** → **Environment variables** → **Add**：

- **Type**：Text（明文字符串即可，Key 只在服务器端读取，不会发给浏览器）
- **Name**：`ARK_API_KEY`
- **Value**：第 2 步创建的 API Key

![CF Pages 环境变量配置](/assets/blog-migrate/cf-env.png)

想换模型可以再加一个 `ARK_MODEL` 变量（默认就是 Doubao-Seed-2.0-Code，不配也行）。

##### 7. 费用提示

前端弹窗里做了两层提示（本站实际效果）：

- **常驻提示行**（输入框上方）：`免费额度内不花钱 · 额度用尽后按量计费，余额不足自动停用`；
- **每次回答后**显示本次消耗：`本次消耗 927 tokens（免费额度内不扣费）`。

![AI 问答弹窗与费用提示](/assets/blog-migrate/ai-chat-cost.png)

控制台（火山方舟 → 费用中心）能看每月账单，个人博客用量远低于 50 万免费额度，基本不产生费用。

##### 8. 验证

```bash
# 本地或线上直接测接口（返回 JSON，含 answer 和 usage）
curl -X POST https://my-firefly-blog.pages.dev/api/chat ^
  -H "Content-Type: application/json" ^
  -d "{\"question\":\"进程和线程有什么区别？\"}"
```

浏览器打开 `https://my-firefly-blog.pages.dev`，点右下角 ✦ 按钮即可聊天。**注意 GitHub Pages 站没有 Functions 后端，AI 按钮自动隐藏**（前端已按域名判断）。


##### 9. 后续：向量检索（RAG 进阶）

现在的轻量 RAG 是**关键词/字面匹配**（"node"能命中"Node 24"），零成本、够用。以后文章多到几百篇、或想让它理解口语化问法（"node 版本"自动关联"v24.5.0"这类变体表达）时，升级成**向量检索**：

- 原理：用 embedding 模型把每段文本转成向量存索引，提问时把问题也转成向量，按**余弦相似度**找最相关的段落——语义层面的匹配，不依赖字面一致；
- 代价：检索前多一步 embedding 调用（火山方舟等平台提供，按 tokens 计费，量很小），实现复杂度也高一些；
- 结论：等文章数量足够多，在 `scripts/build-blog-index.mjs` 里给每段生成向量、前端检索改成向量相似度即可，上下文接口不用动。
#### 十二、发布博客和更新博客命令


- **本地预览**：`pnpm dev`（默认 http://localhost:4321）；
- **构建**：`pnpm build`（输出到 `dist/`，会顺便做字体子集化）；
- **发布 / 更新**：改完文章（或任何文件）后：

```bash
git add -A
git commit -m "写点说明"
git push
```

push 后 GitHub Actions 自动构建，**同时部署到 GitHub Pages 和 Cloudflare Pages**；

- **完整一键发布（Windows PowerShell，含 Node 版本切换）**：本机 `node` 必须 ≥22，若默认 shell 指到旧版 Node（20）会导致 Astro 构建报错。用 nvm 的软链 `C:\nvm4w\nodejs` 覆盖 PATH 后再构建推送：

```powershell
cd E:\Project and blog\my-firefly-blog

# nvm 软链指向 v24.5.0；覆盖 PATH，避免用沙箱/旧版 Node 20
$env:PATH = "C:\nvm4w\nodejs;" + $env:PATH
node --version        # 确认输出 v24.x

pnpm build            # 本地构建（含字体子集化）

git add -A
git commit -m "写点说明"

# 首次推新仓库可能要确认 host key；已配置过可省略这行
$env:GIT_SSH_COMMAND = "ssh -o StrictHostKeyChecking=accept-new"
git push origin main
```

- **只手动部署 Cloudflare**：

```bash
$env:CLOUDFLARE_API_TOKEN = "你的token"
$env:CLOUDFLARE_ACCOUNT_ID = "9df1e93b29898adab711c0958d7bccec"
npx wrangler pages deploy dist --project-name my-firefly-blog --branch main
```

#### 十三、文章最后编辑时间

文章页现在会显示两个时间：**发布时间**和**最后更新于**，都显示在标题下方的元信息区（同一行并排，图标区分）。

![文章开头：标题、字数、阅读时长、发布于 2026-09-14、最后更新于 2026-09-14、分类与标签](/assets/blog-migrate/updated-card.png)

这个"最后更新"时间怎么维护？对比过几种方案：

| 方案 | 原理 | 优点 | 缺点 |
| --- | --- | --- | --- |
| **A. 手动写 `updated`** | 每篇 frontmatter 手写 `updated: 2026-09-14` | 零成本、完全可控 | 容易忘——只改内容不写字段，页面就"假装没更新" |
| **B. pre-commit 钩子自动补**（本站采用） | 提交时检测本次改动的文章，自动补 `updated: 今天` | 全自动、不用记、即时生效 | 钩子在本地 `.git/hooks`，换机器/重克隆后要重装一次 |
| **C. GitHub Actions 自动提交** | CI 检测文章改动并自动提交回仓库 | 跨机器统一 | 需要 CI 写仓库权限、可能触发循环构建、有几分钟延迟 |
| **D. 构建时读 git log** | 构建时用 `git log` 查每篇最后修改时间 | 完全自动、不用字段 | 线上 Pages 是静态产物没有 git 信息；本地构建还要依赖 git 命令 |

结论：**B 最省心**——文章更新流程完全不变（改完 `git add` + `git commit`），钩子悄悄把时间补上，不需要任何额外记忆。

##### 1. 主题原生支持

主题的 `content.config.ts` 本身就定义了可选的 `updated` 字段，`PostMeta.astro`（文章页元信息）原生支持显示"最后更新于"。默认条件比较严（`updated` 存在且不等于 `published` 才显示），我只改了两处：**只要写了 `updated` 就显示**，并且**删掉了主题在文章底部的大卡片**（避免开头结尾重复）。

##### 2. 提交钩子（已入库 `scripts/pre-commit.hook`）

钩子内容（文件已放进仓库，方便换机器恢复）：

```bash
#!/bin/sh
command -v node >/dev/null 2>&1 || exit 0
SCRIPT_DIR="$(cd "$(dirname "$0")/../../scripts" && pwd)" || exit 0
node "$SCRIPT_DIR/auto-updated.mjs" >/dev/null 2>&1
exit 0
```

安装到本机（Git 只认 `.git/hooks/` 下的钩子文件）：

```powershell
# Windows（Git Bash 环境）
cp scripts/pre-commit.hook .git/hooks/pre-commit
```

换机器 / 重新克隆仓库后，重新执行上面这一行即可（核心脚本 `scripts/auto-updated.mjs` 已经在仓库里）。

##### 3. 自动补日期脚本（`scripts/auto-updated.mjs`）

核心就三步：取本次提交的文章 → 补 `updated: 今天` → 重新暂存。

```js
// 1. 取出本次 staged 的博客文章（-z 处理中文/空格文件名）
const out = execSync(
  'git -c core.quotepath=false diff --cached --name-only -z -- "src/content/posts"',
  { cwd: root, encoding: "utf8" },
);
files = out.split("\0").filter(f => f.endsWith(".md"));

// 2. 逐篇补 updated: 今天（已有且是今天则跳过）
if (/^updated:/m.test(s)) {
  s = s.replace(/^updated:.*$/m, `updated: ${today}`);
} else {
  s = s.replace(/^(published:.*)$/m, `$1\nupdated: ${today}`);
}

// 3. 重新 git add 改过的文件，让提交带上新字段
execSync(`git add -- ${changed.map(f => `"${f}"`).join(" ")}`);
```

##### 4. 以后怎么用

改文章 → `git add` → `git commit` → `git push`，钩子在 commit 时自动补 `updated: 当天`，push 后双站部署完，文章页自动显示新的"最后更新于"，**全程不用手动写字段**。

两个注意点：

- 钩子只管 `src/content/posts/` 下的博客文章，知识库笔记（`src/content/docs/`）不处理；
- 钩子只装在本机 `.git/hooks/`，换机器 / 重克隆后按第 2 节一行命令重装即可。

#### 十四、接入 Cloudflare Web Analytics 访问统计

文章写多了自然想知道：到底有多少人看？从哪国来？页面打开快不快。接统计之前对比了一圈方案：

| 方案 | 后端 | 费用 | Cookie 横幅 | 体积 |
| --- | --- | --- | --- | --- |
| Google Analytics | Google | 免费但功能臃肿 | 要弹 cookie 授权条 | 重 |
| Umami 自建 | 要自己再部署一个服务 | 免费但得管服务器 | 自己定 | 中 |
| **Cloudflare Web Analytics** ✅ | Cloudflare 托管 | **免费、不限流量** | **隐私友好，不用 cookie 横幅** | **一段约 1KB 的 beacon** |

选 Cloudflare Web Analytics 主要三点：① 本站已经在 Cloudflare Pages 上，**同一个账号开通就行，不用再注册或部署任何东西**；② 免费、不限流量；③ 隐私优先——它本身不给访客种追踪 cookie，国内访客不用再弹"是否接受 Cookie"那个横幅。

##### 1. 在控制台添加站点

Cloudflare 控制台左侧 **Analytics → Web analytics** → 右上角 **Add a site**，填入主域名 `lycaonide.github.io`（一个 property 可绑多个主机名，备用域名后面想统计再加）：

![Cloudflare Web Analytics 站点列表：已添加 lycaonide.github.io](/assets/blog-migrate/cf-web-analytics-sites.png)

创建后进 **Manage site**，页面下方 **Install JS Snippet** 直接给出一段带 token 的代码，点 **Click to copy** 复制：

![Manage site 页：Install JS Snippet 给出带 token 的统计代码](/assets/blog-migrate/cf-beacon-snippet.png)

> 注意：这段代码里的 `token` 是**公开的站点标识**，本来就会出现在每个访客的 HTML 里，随便贴、不用当密钥；真正要保密的是第九节那个部署用的 API Token。

##### 2. 把 beacon 加到两处布局

为什么是两处？博客文章用的是 Firefly 主题自己的 `src/layouts/Layout.astro`，而知识库 `/kb/` 用的是 **Starlight 独立布局**，两者 `<head>` 互不相干——只加一处，另一处就不计数。

**第一处：博客布局** `src/layouts/Layout.astro` 的 `<head>` 里（和 AI 脚本一样必须 `is:inline`）：

```astro
<!-- src/layouts/Layout.astro 的 <head> 里 -->
<!-- Cloudflare Web Analytics -->
<script is:inline type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "092a891a22f0434890303a58e99052f6"}'></script>
<!-- End Cloudflare Web Analytics -->
```

**第二处：知识库 Starlight 布局**，加在 `astro.config.mjs` 的 `starlight({ head: [...] })` 数组里（和第十一节 AI 脚本同一个数组）：

```js
// astro.config.mjs（starlight 配置的 head 数组里，本站实际使用）
{
  tag: "script",
  attrs: {
    src: "https://static.cloudflareinsights.com/beacon.min.js",
    type: "module",
    "data-cf-beacon":
      '{"token": "092a891a22f0434890303a58e99052f6"}',
  },
},
```

两处用的是**同一个 token**，所以博客文章和知识库章节都汇总到同一个 Web Analytics property 里看。

##### 3. 验证

push 部署后等几分钟，回到 Web Analytics 看板，能看到 PV / 独立访问数、访客国家分布，以及 **Core Web Vitals**（LCP / INP / CLS，条全绿就是体验健康）：

![接入后控制台：近 24 小时 PV/访问量、Core Web Vitals 全部正常](/assets/blog-migrate/cf-web-analytics-dashboard.png)

几个实际踩过的点：

- **数据有几分钟延迟**，刚部署完立刻看是空的，正常，过一会儿再刷新就有数了；
- **一定要 `is:inline`**：和第十一节 AI 脚本一个道理，不加 `is:inline`，Astro 构建时会把这条 `<script>` 引用丢掉，页面里根本没有，控制台永远收不到数；
- **两个域名想清楚**：本站 property 里只配了 `lycaonide.github.io`（主站），`my-firefly-blog.pages.dev` 备用域名的访问默认不计入；想一起统计就在 Manage site 的 Configured hostname(s) 里把 pages.dev 也加上；
- **不依赖 Cloudflare 托管也能用**：它只是一段前端 beacon，静态站挂哪都行——本站反正已经在 CF Pages 上，顺手开通而已。
#### 十五、踩坑记录

前面各章是"怎么搭起来"，这章单独记两个实际踩过、又花了点时间才定位的坑。

##### 1. 从知识库点"返回"，中间多跳了两个页面

**现象**：在知识库 `/kb/` 章节页点右上角"返回"回博客首页，中间会闪过两个额外页面，有时还短暂白屏。

**原因**：博客用了 **Swup** 做站内无刷新过渡（点站内链接只换内容、不整页刷新）。正常站内链接交给 Swup 没问题，但"返回"链接同时叠了两种跳转：

- Swup 拦截这个链接，先做一次 SPA 式半切换；
- 返回按钮的逻辑里又强制整页跳一次。

两者叠加 = 实际跳了两次，中间那两个"页面"就是这么多出来的。

**解决**：给返回链接加 `data-no-swup`，Swup 直接放行、完全不碰它，只走一次浏览器原生跳转。代码就在 `src/components/starlight/SocialIcons.astro`：

```astro
{/* 知识库顶栏"返回"：必须 data-no-swup，否则和 Swup 叠加跳两次 */}
<a href={href} class="return-link" data-no-swup>{label}</a>
```

> 经验：用了 Swup 这类过渡库后，所有"特殊跳转"——返回、外链、必须整页刷新的链接——都要显式加 `data-no-swup`，别让它和库的拦截逻辑打架。

##### 2. 背景视频压到 13MB 反而糊

**现象**：首版背景视频从 36MB 压到 13MB，体积是小了，但樱花飘落 + 人物的动画画面明显发糊。

**原因**：720p 视频码率压到了约 448kbps（crf 35）。这种带动态细节的动画画面，720p 码率低于约 700kbps 就会糊。

**解决**：重新压制，把 crf 提到 30，码率回到约 875kbps（清晰近 2 倍），成品 **24.27MB**，正好卡在 Cloudflare Pages 单文件 25MB 上限内。中间试了几版都不合适：

| 方案 | 参数 | 结果 | 取舍 |
| --- | --- | --- | --- |
| 第一版 | crf 35 | 13MB / 约 448kbps | 太糊，弃 |
| 试 crf 27 | crf 27 / preset slow | 30.3MB | 超 25MB 上限，弃 |
| 试 ABR 两遍 | `-b:v 900k -pass 2` | 29.3MB | ABR 有偏差仍超限（没加 `-maxrate`），弃 |
| **最终** ✅ | **crf 30 / preset medium** | **24.27MB / 约 875kbps** | **限内且清晰，采用** |

压制前先用 `ffprobe` 查源视频参数，确认分辨率和时长（算 25MB 码率预算要用）：

```bash
# 查源视频分辨率/时长/码率
ffprobe -v error -select_streams v:0 -show_entries stream=width,height,bit_rate \
  -show_entries format=duration,size 源视频.mp4
# 实际结果：1280x720，时长 245s
```

最终压制命令：

```bash
# 源视频 1280x720、245s；最终压成 firefly.mp4（24.27MB）
ffmpeg -y -i 源视频.mp4 -c:v libx264 -preset medium -crf 30 \
  -pix_fmt yuv420p -c:a aac -b:a 96k -movflags +faststart firefly.mp4
```

参数：`-crf` 越小越清晰、体积越大（动画 720p 用 30 可接受）；`-movflags +faststart` 把索引放到文件头，浏览器能边下边播；`-pix_fmt yuv420p` 兼容性最好。

配套的加载优化：背景视频不做首屏自动加载，而是挂在导航栏"播放背景视频"按钮上，点击时才给 `<video>` 赋 `src`——访客不点就不下载这 24MB，首屏更快也更省流量：

```js
// BackgroundPlayer：点击播放才赋 src，访客不点就不下载
const video = document.querySelector("video");
playBtn.addEventListener("click", () => {
  if (!video.src) video.src = "/assets/videos/firefly.mp4";
  video.play();
});
```

> 经验：① 动画类 720p 视频码率别低于 700kbps，否则动态细节必糊；② CF Pages 单文件 25MB，长视频先算预算——可用码率 ≈ 25MB × 8 ÷ 时长(秒)；③ 体积 / 清晰 / 加载速度三者不可兼得，按场景取舍。
#### 十六、总结

这次迁移的核心经验：

1. **配置收敛**：装饰、评论、友链等开关集中在 config 文件里，方便统一管理；
2. **双站过渡**：新旧站并存，内容迁完再下线，风险可控；
3. **自动化部署**：GitHub Actions 让发布变成"push 就完事"（GitHub Pages + Cloudflare Pages 双平台同时更新）；
4. **AI 问答**：火山方舟 + Cloudflare Pages Function 免费接入，知识库随页携带，Key 不落地；
5. **访问统计**：Cloudflare Web Analytics 同账号免费接入，一段 beacon 同时统计博客和知识库，无 Cookie 横幅。

最终效果就是你现在看到的这个站：Astro 7 + Firefly 主题，**樱花、评论、友链齐全，加载快还免费**。
