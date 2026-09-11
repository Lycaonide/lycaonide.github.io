---
draft: false
title: 学习用Hexo写博客
published: 2026-01-25
tags: [Hexo, 博客] 
category: 技术笔记
---

#### 一、前置工具安装

##### 1. 安装Node.js

- **操作**：
  1. 打开[Node.js官网](https://nodejs.org/)，点击对应Windows版本的安装包（如“Windows Installer (.msi) 64-bit”）；
  2. 双击安装包，勾选“Accept the terms...”，点击“Next”；
  3. 安装路径保持默认（或自定义，需记住路径），点击“Next”；
  4. 勾选“Add to PATH”（自动配置环境变量），点击“Next”→“Install”→“Finish”。
- **验证**：
  右键桌面→选择“Git Bash Here”打开终端，输入`node -v`，我安装的是v.24.5.0版本。


##### 2. 安装Git
- **操作**：
  
  1. 打开[Git官网](https://git-scm.com/)，点击“Download for Windows”；
  2. 双击安装包，依次点击“Next”；
  3. 安装路径保持默认，点击“Next”；
  4. 组件选择默认（需包含“Git Bash Here”），点击“Next”；
  5. 开始菜单文件夹保持默认，点击“Next”；
  6. 选择“Use Visual Studio Code as Git's default editor”（或默认编辑器），点击“Next”；
  7. 选择“Let Git decide”（换行符处理），点击“Next”→“Next”→“Next”；
  8. 选择“Use Windows' default console window”，点击“Next”→“Install”→“Finish”。
- **验证**：
  右键桌面→选择“Git Bash Here”，输入`git -v`，若显示版本号（如`git version 2.43.0.windows.1`）则成功。
- **必做配置**：
  在Git Bash中输入以下命令，绑定Git与GitHub的身份：
  
  ```bash
  git config --global user.name "你的GitHub用户名"  # 如"lycaonide"
  git config --global user.email "你的GitHub注册邮箱"
  ```


##### 3. 注册并登录GitHub
- **操作**：
  1. 打开[GitHub官网](https://github.com/)，点击“Sign up”；
  2. 输入邮箱→创建密码→输入用户名（需记住，后续仓库名要用）→完成验证；
  3. 登录后，进入GitHub主页。

#### 二、初始化Hexo博客（本地可预览）

##### 1. 创建本地Hexo项目

- **操作**：
  
  1. 右键桌面→选择“Git Bash Here”；
  2. 输入命令安装Hexo脚手架（全局工具）：
     ```bash
     npm install -g hexo-cli
     ```
     （等待终端显示“added xx packages in xx s”即安装完成）
  3. 输入命令在桌面创建Hexo项目（项目名自定义，这里用`my-hexo-blog`）：
     ```bash
     hexo init my-hexo-blog
     ```
     （等待终端显示“Start blogging with Hexo!”即初始化完成）
  4. 进入项目目录并安装依赖：
     ```bash
     cd my-hexo-blog  # 进入项目文件夹
     npm install      # 安装项目依赖
     ```


##### 2. 本地预览博客（确保本地能正常运行）
- **操作**：
  在Git Bash的`my-hexo-blog`目录下，输入：
  ```bash
  hexo server  # 可简写为 hexo s
  ```
- **反馈**：
  终端显示“Hexo is running at http://localhost:4000 . Press Ctrl+C to stop.”。
- **验证**：
  打开浏览器，输入`http://localhost:4000`，若显示Hexo默认博客页面（白色背景、“Hello World”文章）则本地运行成功。
- **关闭预览**：
  在Git Bash中按`Ctrl+C`终止服务。


#### 三、创建GitHub Pages专属仓库
- **操作**：
  1. 登录GitHub后，点击页面右上角“+”图标→选择“New repository”；
  2. 在“Repository name”输入框中，必须填写：`你的GitHub用户名.github.io`（例如你的用户名为`lycaonide`，则填写`lycaonide.github.io`）；
  3. “Visibility”选择“Public”（GitHub Pages仅支持公开仓库，若为付费用户可选Private）；
  4. 不要勾选“Add a README file”“Add .gitignore”等选项（Hexo会自动生成文件）；
  5. 点击页面最下方的“Create repository”按钮。
- **验证**：
  仓库创建后，页面顶部会显示仓库名`lycaonide.github.io`，且代码区域为空（后续部署会自动上传文件）。


#### 四、配置Hexo的部署信息（关联本地与GitHub）
##### 1. 打开Hexo的配置文件
- **操作**：
  1. 打开桌面的`my-hexo-blog`文件夹→找到`_config.yml`文件。
  1. 右键点击“用记事本编辑”。


##### 2. 修改部署配置
- **操作**：
  滚动到`_config.yml`文件的**末尾**，找到`deploy`段落（默认可能是注释状态），修改为：
  
  ```yaml
  deploy:
    type: git
    repo: git@github.com:lycaonide/lycaonide.github.io.git  # 替换为你的仓库SSH地址
    branch: main
  ```
- **关键说明**：
  
  - `repo`地址获取：进入GitHub仓库页面→点击“Code”按钮→选择“SSH”→复制地址（以`git@github.com:`开头）；
  - **缩进要求**：`type`、`repo`、`branch`必须与`deploy`保持**2个空格的缩进**（YAML语法不支持Tab，必须用空格）。


#### 五、配置SSH密钥（解决GitHub访问权限问题）
- **操作**：
  
  1. 在Git Bash的`my-hexo-blog`目录下，输入命令生成SSH密钥（替换为你的GitHub邮箱）：
     ```bash
     ssh-keygen -t ed25519 -C "你的GitHub注册邮箱"
     ```
     （连续按3次回车，使用默认路径和空密码）
  2. 输入命令复制密钥内容：
     ```bash
     cat ~/.ssh/id_ed25519.pub
     ```
     （终端会显示一长串以“ssh-ed25519”开头、你的邮箱结尾的字符串，全选复制）
  3. 登录GitHub→点击页面右上角“头像”→选择“Settings”；
  4. 左侧菜单选择“SSH and GPG keys”→点击“New SSH key”；
  5. “Title”填写自定义名称（如“我的Windows电脑”），“Key”粘贴刚才复制的密钥字符串；
  6. 点击“Add SSH key”。
- **验证**：
  在Git Bash中输入：
  ```bash
  ssh -T git@github.com
  ```
  终端显示“Hi lycaonide! You've successfully authenticated...”即密钥配置成功。


#### 六、安装Hexo部署插件
- **操作**：
  在Git Bash的`my-hexo-blog`目录下，输入：
  ```bash
  npm install hexo-deployer-git --save
  ```
- **验证**：
  查看项目目录下的`node_modules`文件夹，若存在`hexo-deployer-git`文件夹则安装成功。


#### 七、执行博客部署
- **操作1：清理本地缓存**
  在Git Bash中输入：
  
  ```bash
  hexo clean
  ```
  （终端显示“INFO Deleted database.”“INFO Deleted public folder.”即清理完成）
  
- **操作2：生成静态文件**
  输入：
  ```bash
  hexo generate  # 可简写为 hexo g
  ```
  （终端显示“INFO Generated: xxx.html”等信息，项目目录会生成`public`文件夹，里面是博客的静态文件）

- **操作3：部署到GitHub**
  输入：
  ```bash
  hexo deploy  # 可简写为 hexo d
  ```
- **反馈**：
  终端显示“INFO Deploy done: git”，且中间会显示Git推送记录（如“To github.com:lycaonide/lycaonide.github.io.git”）。

#### 八、验证部署结果（确认博客在线）

1. **查看GitHub仓库文件**：
   进入`lycaonide.github.io`仓库页面，代码区域会显示`public`文件夹中的文件（如`index.html`、`css`文件夹），说明文件已成功上传。

2. **访问博客网址**：
   打开浏览器，输入`https://lycaonide.github.io`（注意：需等待1-3分钟，GitHub Pages需要同步文件），若显示与本地预览一致的博客页面，则部署成功。

3. **若页面无法访问**：
   进入仓库→点击“Settings”→左侧选择“Pages”→确认“Source”选择的是`main`分支 + `/(root)`目录，若显示“Your site is published at [https://lycaonide.github.io](https://lycaonide.github.io)”则状态正常，重新等待同步即可。

#### 九、博客发布步骤

##### 1.  新建博客文章

- **操作**：
  打开Git Bash，进入Hexo项目目录（如桌面的`my-hexo-blog`）：
  
  ```bash
  cd ~/Desktop/my-hexo-blog  # 替换为你的Hexo项目路径
  ```
  输入命令新建文章，替换为你的博客标题：
  ```bash
  hexo new "我的第一篇Hexo博客"
  ```
- **反馈**：
  终端显示“INFO Created: source/_posts/我的第一篇Hexo博客.md”，表示文章文件已生成。
- **文件位置**：
  文章存放在Hexo项目的`source/_posts/`目录下，文件名是`我的第一篇Hexo博客.md`。

##### 2. 编辑博客内容

- **操作**

​	打开文章文件：用任意Markdown编辑器打开`source/_posts/我的第一篇Hexo博客.md`文件。

​	配置文章信息：文件开头的“Front-matter”是Hexo识别文章属性的区域（必须保留），示例说明：

```markdown
---
title: 我的第一篇Hexo博客  # 博客标题（会显示在页面顶部）
date: 2026-01-25 10:00:00  # 发布日期（自动生成，可修改）
tags: [Hexo, 博客]  # 文章标签（多个标签用数组包裹）
categories: 技术笔记  # 文章分类（可自定义分类名）
---
```
​	说明：格式必须严格（冒号后加空格），否则Hexo会解析失败。

​	编写正文内容（Markdown语法）：在`---`下方编写博客正文，示例：

```markdown
# 一级标题
这是我的第一篇Hexo博客，终于成功部署啦！

## 二级标题：Hexo的优点
- 轻量化，部署简单
- 支持Markdown编辑，写作体验好
- 可自定义主题（后续会分享主题更换方法）

### 三级标题：插入图片
把图片放到Hexo项目的`source/images/`目录下，引用方式：
![示例图片](/images/我的图片.jpg)  # 路径从public目录根开始

### 三级标题：添加链接
推荐Hexo官网：[Hexo官方文档](https://hexo.io/zh-cn/docs/)
```


##### 3. 本地预览博客效果
- **操作**：
  在Git Bash的Hexo项目目录下，输入命令启动本地服务：
  
  ```bash
  hexo clean  # 先清理旧缓存（可选，但建议执行）
  hexo s      # 启动本地预览
  ```
- **验证**：
  打开浏览器访问`http://localhost:4000`，在“文章”列表中找到《我的第一篇Hexo博客》，点击进入查看格式、图片、链接是否正常显示。
- **关闭预览**：
  在Git Bash中按`Ctrl+C`终止服务。


##### 4. 发布新博客到线上
- **操作**：
  在Git Bash的Hexo项目目录下，依次执行命令（更新线上博客）：
  
  ```bash
  hexo clean  # 清理本地缓存
  hexo g      # 重新生成包含新文章的静态文件
  hexo d      # 部署到GitHub仓库
  ```
- **反馈**：
  终端显示“INFO Deploy done: git”即部署完成。


##### 五、验证线上效果
等待1-3分钟后，打开浏览器访问`https://lycaonide.github.io`，刷新页面后即可看到新发布的《我的第一篇Hexo博客》出现在文章列表中。


##### 补充注意事项
1. **图片存放**：博客中用到的图片，需放到Hexo项目的`source/images/`目录下，引用路径写`/images/图片名.jpg`（Hexo会自动将`source/images`映射到网站根目录）；
2. **修改已发布文章**：直接编辑`source/_posts/`下对应的MD文件，重复“本地预览→hexo clean→hexo g→hexo d”步骤即可更新线上内容；
3. **删除文章**：删除`source/_posts/`下对应的MD文件，再执行部署命令，线上文章会同步删除。
