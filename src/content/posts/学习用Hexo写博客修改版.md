---
draft: false
title: 学习用Hexo写博客修改版
published: 2026-03-25
tags: [Hexo, 博客]
category: 技术笔记
---

#### 一、新建博客

**操作**：
打开 Git Bash，进入 Hexo 项目目录：

```bash
cd ~/Desktop/my-hexo-blog  
```

输入命令新建文章，格式如下：

```bash
hexo new "你的博客标题"
```



&nbsp;



#### 二、编辑博客内容

**操作**：
打开文章文件：用任意 Markdown 编辑器打开 `source/_posts/你的博客标题.md` 文件。
配置文章信息：文件开头的「Front-matter」是 Hexo 识别文章属性的区域（必须保留），**格式说明**：

- `---`：固定开头和结尾标记，不可省略
- `title:`：文章标题，**中文/英文均可**，冒号后必须加空格
- `date:`：发布日期，**格式为 `YYYY-MM-DD HH:mm:ss`**，冒号后必须加空格
- `tags:`：文章标签，**中文/英文均可**，多个标签用 `[标签1, 标签2]` 数组格式，冒号后必须加空格
- `categories:`：文章分类，**中文/英文均可**，冒号后必须加空格

##### 📝 写博客模板

```markdown
---
title: 你的博客标题
date: 2026-03-25 14:00:00
tags: [标签1, 标签2]
categories: 分类名称
---
# 一级标题（中文/英文均可）
正文内容（支持 Markdown 语法）

## 二级标题（中文/英文均可）
- 列表项1
- 列表项2

### 三级标题（中文/英文均可）
[链接文字](链接地址)
![图片描述](/images/图片文件名.jpg)
```



&nbsp;



#### 三、本地预览博客效果

**操作**：
在 Git Bash 的 Hexo 项目目录下，输入命令启动本地服务：

```bash
hexo clean  # 先清理旧缓存（建议执行）
hexo s      # 启动本地预览
```

**验证**：
打开浏览器访问 `http://localhost:4000`，在「文章」列表中找到对应文章，点击进入查看格式、图片、链接是否正常显示。

**关闭预览**：
在 Git Bash 中按 `Ctrl+C` 终止服务。



&nbsp;



#### 四、发布新博客到线上

##### 🔍 为什么要修改原步骤？

**核心原因**：国内网络环境对 GitHub 存在访问限制，直接执行 `hexo d` 会出现「连接失败、无法解析主机」等错误，导致部署失败。
**解决方案**：使用「加速器」来绕过网络限制，因此需要手动配置 Git 代理，让 Git 走加速器的本地端口（`7892`），才能正常推送代码到 GitHub。

##### ✅ 修改后的完整操作步骤

在 Git Bash 的 Hexo 项目目录下，依次执行以下命令：

```bash
# 1. 清空旧代理配置（避免之前残留的错误端口影响）
git config --global --unset http.proxy
git config --global --unset https.proxy

# 2. 配置加速器代理（本地端口为 7892，与加速器配置一致）
git config --global http.proxy http://127.0.0.1:7892
git config --global https.proxy http://127.0.0.1:7892

# 3. 清理本地缓存 + 生成静态文件 + 部署到 GitHub
hexo clean  # 清理本地缓存，确保生成最新文件
hexo g      # 重新生成包含新文章的静态页面
hexo d      # 部署到 GitHub 仓库
```

##### 📌 成功反馈

终端显示 `INFO  Deploy done: git` 即代表部署完成。

##### 🧩写博客的 Git Bash 操作模板

```bash
# 1. 进入项目目录
cd ~/Desktop/my-hexo-blog

# 2. 新建文章
hexo new "你的博客标题"

# 3. 编辑文章后，本地预览
hexo clean
hexo s

# 4. 预览无误后，部署上线
git config --global --unset http.proxy
git config --global --unset https.proxy
git config --global http.proxy http://127.0.0.1:7892
git config --global https.proxy http://127.0.0.1:7892
hexo clean && hexo g && hexo d
```

##### 🧩 修改博客的 Git Bash 操作模板

```bash
# 1. 进入项目目录
cd ~/Desktop/my-hexo-blog

# 2. 编辑文章后，本地预览
hexo clean
hexo s

# 3. 预览无误后，部署上线
git config --global --unset http.proxy
git config --global --unset https.proxy
git config --global http.proxy http://127.0.0.1:7892
git config --global https.proxy http://127.0.0.1:7892
hexo clean && hexo g && hexo d
```

##### 🧩 一键部署模板（推荐保存为 `deploy.sh`）

```bash
#!/bin/bash
# 清空旧代理
git config --global --unset http.proxy
git config --global --unset https.proxy

# 配置加速器代理
git config --global http.proxy http://127.0.0.1:7892
git config --global https.proxy http://127.0.0.1:7892

# 执行部署
hexo clean && hexo g && hexo d

# 部署完成后取消代理（可选）
git config --global --unset http.proxy
git config --global --unset https.proxy

echo "部署完成！访问 https://lycaonide.github.io 查看效果"
```

代理说明：仅在部署到 GitHub 时需要配置代理，本地预览（`hexo s`）无需代理。



&nbsp;



#### 五、验证线上效果

等待 1–3 分钟后，打开浏览器访问 `https://lycaonide.github.io`，刷新页面后即可看到新发布/修改的博客文章出现在文章列表中。
