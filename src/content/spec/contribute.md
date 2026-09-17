# 投稿 / Contribute

本站是个人技术记录博客，也欢迎你投稿。投稿走 **GitHub 驱动**，稿件会直接进入 git 审核流程。

## 投稿方式（二选一）

| 方式 | 适合场景 | 入口 |
| --- | --- | --- |
| **提 Issue** | 想写但还没动笔，先讨论主题 / 大纲 / 是否合适 | [新建 Issue](https://github.com/Lycaonide/lycaonide.github.io/issues/new) |
| **提 PR** | 稿子已经写好，直接提交正文 | [新建 Pull Request](https://github.com/Lycaonide/lycaonide.github.io/pulls) |

仓库：[Lycaonide/lycaonide.github.io](https://github.com/Lycaonide/lycaonide.github.io)

## 流程

1. **Issue 讨论**：投稿前先开一个 Issue 说明主题和大致内容，确认方向合适再动笔，避免白写；
2. **撰写稿件**：按下方格式要求写好 Markdown 文件；
3. **提交 PR**：把文章放到 `src/content/posts/` 目录，PR 里引用对应的 Issue 编号；
4. **审核发布**：我 review 后合并到 main 分支，站点（GitHub Pages / Cloudflare Pages）会自动构建部署。

## 稿件要求

- **主题范围**：技术记录、踩坑经验、学习笔记、项目实践均可，与本站定位（AI / 机器人 / 编程 / 考研）相符；
- **文件格式**：Markdown，放在 `src/content/posts/`，文件名用中文或英文均可；
- **frontmatter**：参考现有文章，包含 `title`、`published`、`updated`、`description`、`tags`、`category` 等字段（`draft` 先设为 `true` 便于预览审核）；
- **图片 / 视频**：资源放入 `public/assets/`，文中用相对路径引用；
- **原创性**：投稿须为原创内容；转载需注明出处并获得授权。

## 说明

- 稿件合并即视为同意以站点现有方式（GitHub Pages / Cloudflare Pages）公开发布；
- 我会在审核时对格式、内容做必要调整，改动前会通过 PR 对话沟通；
- 本页面的投稿方式完全依赖 GitHub，如果打不开 GitHub，可以暂时跳过，等网络恢复后再提。
