---
draft: false
title: WorldMem项目部署记录
published: 2026-01-24
tags: ["上下文长视频", "项目部署"]
category: 技术笔记
---

#### 一、环境与工具准备
1. 安装Anaconda/Miniconda：官网下载默认路径安装，自动配置环境变量。
2. 安装Git：下载Git for Windows，勾选「Git Bash Here」选项（确保Git Bash支持`wget`命令，后续统一用Git Bash操作）。
3. 创建Conda环境：打开Anaconda Prompt，执行以下命令创建专属环境（避免依赖冲突）：
   ```bash
   conda create -n worldmem python=3.10 -y
   ```
4. 激活Conda环境（Anaconda Prompt中）：
   ```bash
   conda activate worldmem
   ```
5. 安装带CUDA的PyTorch（核心依赖，GPU加速必备）：
   ```bash
   pip uninstall torch torchvision torchaudio -y  # 卸载可能存在的CPU版本
   pip3 install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118
   ```
6. 验证CUDA生效：执行以下命令，输出`True`说明GPU适配成功：
   ```bash
   python -c "import torch; print(torch.cuda.is_available())"
   ```
7. Git克隆项目代码：打开Git Bash（右键桌面→「Git Bash Here」），执行克隆命令：
   ```bash
   cd /c/Users/13062/Desktop  # 切换到桌面目录
   git clone https://github.com/zeqixiao/worldmem-video-demo.git  # 克隆项目
   ```
   克隆后项目路径：`C:\Users\13062\Desktop\worldmem-video-demo\WorldMem`（后续所有操作均基于此路径）。

#### 二、Git Bash配置Conda环境（统一终端+激活环境）
> 提示：所有后续操作（安装依赖、下载资源、执行脚本）均需在`worldmem`环境中进行，Git Bash默认不支持Conda激活，必须先配置，否则依赖安装、命令执行都会失效。

1. 配置Git Bash加载Conda脚本：
   - 右键项目文件夹（`worldmem-video-demo\WorldMem`）→「Git Bash Here」，打开Git Bash终端；
   - 执行以下命令创建并编辑配置文件：
     ```bash
     touch ~/.bashrc  # 创建Conda配置文件
     nano ~/.bashrc    # 打开编辑器
     ```
   - 在编辑器中粘贴以下内容（Conda脚本默认路径，若Anaconda安装路径修改需对应调整）：
     ```bash
     source /c/Users/13062/anaconda3/etc/profile.d/conda.sh
     ```
   - 保存退出：按`Ctrl+O`→回车确认文件名→按`Ctrl+X`退出编辑器。
2. 生效配置并激活`worldmem`环境：
   - 执行以下命令加载配置：
     ```bash
     source ~/.bashrc
     ```
   - 激活`worldmem`环境（终端开头显示`(worldmem)`即成功）：
     ```bash
     conda activate worldmem
     ```
   - 验证环境：执行`python --version`，输出`Python 3.10.x`（与创建环境时指定版本一致），说明环境配置完成。

#### 三、项目依赖安装（Conda环境内统一执行）
> 前置条件：已在Git Bash中激活`worldmem`环境，所有依赖均安装在该环境内，不影响系统Python。

1. 切换到项目根目录：
   ```bash
   cd /c/Users/13062/Desktop/worldmem-video-demo/WorldMem
   ```
2. 安装项目依赖：
   - 先安装`requirements.txt`（若项目包含该文件，一次性安装基础依赖）：
   
   ```bash
   pip install -r requirements.txt
   ```
   
   - 按报错补充缺失依赖（运行项目时若提示「ModuleNotFoundError」，逐个安装以下核心依赖）：
     ```bash
     pip install hydra-core lpips gradio wandb  # 核心功能依赖
     pip install torchvision pillow numpy scipy opencv-python  # 数据处理依赖
     ```
3. 验证依赖安装：执行`pip list | grep gradio`（或其他依赖名），能看到对应版本即安装成功。

#### 四、本地资源准备+代码修改
##### 1. 镜像站下载案例文件（`case1.npz~case4.npz`）
在Git Bash（已激活`worldmem`环境）中执行以下命令，创建目录并下载文件：
```bash
# 1. 创建案例文件目录（项目根目录下）
mkdir -p assets/examples && cd assets/examples
# 2. 镜像站下载
wget https://hf-mirror.com/yslan/worldmem/resolve/main/assets/examples/case1.npz
wget https://hf-mirror.com/yslan/worldmem/resolve/main/assets/examples/case2.npz
wget https://hf-mirror.com/yslan/worldmem/resolve/main/assets/examples/case3.npz
wget https://hf-mirror.com/yslan/worldmem/resolve/main/assets/examples/case4.npz
```
下载完成后，4个`.npz`文件存入`assets/examples`目录，终端显示下载进度条及完成提示。

##### 2. 修改`app.py`跳过自动下载
打开项目根目录下的`app.py`文件，找到`download_assets_if_needed()`函数，修改如下（仅注释原下载逻辑，保留本地检查）：
```python
import os
import requests
def download_assets_if_needed():
    asset_dir = "assets/examples"
    os.makedirs(asset_dir, exist_ok=True)
    cases = ["case1.npz", "case2.npz", "case3.npz", "case4.npz"]
    for case in cases:
        local_path = os.path.join(asset_dir, case)
        if os.path.exists(local_path):
            print(f"✅ 本地已找到 {case}，跳过下载")
            continue
        # 注释原下载逻辑（已手动下载，避免超时）
        # url = f"https://huggingface.co/spaces/yslan/worldmem/resolve/main/assets/examples/{case}"
        # resp = requests.get(url, timeout=30)
        # with open(local_path, "wb") as f:
        #     f.write(resp.content)
```
保存文件即可生效，后续启动项目时会自动跳过下载步骤。

##### 3. 镜像站下载模型权重（`diffusion_only.ckpt`等3个文件）
在Git Bash中切换到权重目录，执行下载命令（模型权重是核心，必须完整下载）：
```bash
# 1. 回到项目根目录，创建权重目录
cd /c/Users/13062/Desktop/worldmem-video-demo/WorldMem
mkdir -p assets/checkpoints && cd assets/checkpoints
# 2. 镜像站下载权重文件
wget https://hf-mirror.com/zeqixiao/worldmem_checkpoints/resolve/main/diffusion_only.ckpt
wget https://hf-mirror.com/zeqixiao/worldmem_checkpoints/resolve/main/vae_only.ckpt
wget https://hf-mirror.com/zeqixiao/worldmem_checkpoints/resolve/main/pose_prediction_model_only.ckpt
```
下载完成后，3个`.ckpt`文件存入`assets/checkpoints`目录（总大小约5GB，确保磁盘空间充足）。

##### 4. 修改配置文件路径（指向本地权重）
打开项目根目录下`configurations/huggingface.yaml`文件，将权重路径改为本地目录（确保项目能找到下载的权重）：
```yaml
diffusion_path: assets/checkpoints/diffusion_only.ckpt
vae_path: assets/checkpoints/vae_only.ckpt
pose_prediction_path: assets/checkpoints/pose_prediction_model_only.ckpt
```
保存文件，配置修改完成。

#### 五、首次启动app.py（界面成功，视频生成功能缺失）
1. 启动命令（Git Bash中，已激活`worldmem`环境，项目根目录下）：
   ```bash
   python app.py
   ```
2. 运行现象：
   - 终端日志正常输出「✅ 本地已找到 case1.npz」「🚀 初始化设备: cuda」「✅ 所有模型切换到eval模式」；
   - 浏览器自动弹出`http://127.0.0.1:7860`，成功进入Gradio界面，可选择场景、输入动作序列；
   - 点击「🎬 Generate!」按钮后，界面卡住无视频输出，终端无额外日志（无报错）。
3. 产生问题原因：视频生成依赖`ffmpeg`工具进行帧序列转MP4格式，本地未安装`ffmpeg`，项目无法调用该工具，导致视频生成功能加载失败。
4. 关闭项目：按`Ctrl+C`终止终端进程，关闭浏览器。

#### 六、ffmpeg下载与安装配置（补全视频生成依赖）
##### 1. 推荐安装路径（Windows系统必看）
- 必须安装在「无中文、无空格」的目录，否则环境变量配置失败，项目无法调用。

- 首选路径：`C:\Program Files\ffmpeg`（解压后文件夹命名为`ffmpeg`，内部包含`bin`/`doc`等子目录）。

##### 2. 安装与配置步骤
1. 下载ffmpeg：
   - 访问ffmpeg官网（https://ffmpeg.org/download.html），选择Windows「Full Build」版本；
   - 或通过国内镜像站下载（避免境外超时），下载后得到压缩包（如`ffmpeg-7.0-full_build.7z`）。
2. 解压安装：用7-Zip等工具将压缩包解压到推荐路径（如`C:\Program Files\ffmpeg`）。
3. 配置环境变量（关键步骤）：
   - 右键「此电脑」→「属性」→「高级系统设置」→「环境变量」；
   - 在「系统变量」中找到「Path」→「编辑」→「新建」，添加`ffmpeg`的`bin`目录路径（如`C:\Program Files\ffmpeg\bin`）；
   - 点击「确定」保存，**关闭所有Git Bash终端**（环境变量需重启终端生效）。
4. 验证生效：打开新的Git Bash（自动激活`worldmem`环境），执行：
   ```bash
   ffmpeg -version
   ```
   终端输出ffmpeg版本信息（如「ffmpeg version 7.0 Copyright (c) 2000-2023」），说明安装配置成功。

#### 七、重新启动app.py（视频生成加载成功，内存不足失败）
1. 启动命令（新打开的Git Bash中，项目根目录下）：
   ```bash
   python app.py
   ```
2. 运行现象：
   - 终端日志正常初始化，视频生成组件加载成功（终端显示「ffmpeg相关初始化日志」）；
   - 加载`diffusion_model`权重（3605MB）时，终端卡住，随后输出「Segmentation fault」，进程终止；
   - 任务管理器显示：CPU内存占用飙升至15.0GB+（总物理内存15.22GB），剩余可用内存不足200MB，触发内存溢出。
3. 问题原因：`ffmpeg`安装后，视频生成组件初始化增加了内存占用，叠加3.6GB的模型权重加载，16GB物理内存不足以承载，导致段错误。

#### 八、训练脚本执行
1. 补充训练依赖（若之前未安装）：
   ```bash
   pip install wandb  # 训练日志监控依赖
   ```
2. 修复训练脚本配置：打开项目根目录下`train_stage_1.sh`文件，将`algorithm.metrics=[lpips,psnr]`改为`+algorithm.metrics=[lpips,psnr]`（适配Hydra配置语法，避免报错）。
3. 执行训练脚本（Git Bash中，项目根目录下）：
   ```bash
   sh train_stage_1.sh
   ```
   （注：若内存充足，脚本会正常启动训练；若内存不足，会出现与启动app.py类似的内存溢出报错）

#### 九、Git Bash环境常用命令速查表
| 操作目的                  | 执行命令                                                     |
| ------------------------- | ------------------------------------------------------------ |
| 激活Conda环境（Git Bash） | 打开Git Bash自动激活（或`conda activate worldmem`）          |
| 切换到项目根目录          | `cd /c/Users/13062/Desktop/worldmem-video-demo/WorldMem`     |
| 启动项目                  | `python app.py`                                              |
| 执行训练脚本              | `sh train_stage_1.sh`                                        |
| 安装缺失依赖              | `pip install [依赖名]`（如`pip install gradio`）             |
| 验证CUDA生效              | `python -c "import torch; print(torch.cuda.is_available())"` |
| 验证ffmpeg生效            | `ffmpeg -version`                                            |
| 克隆项目代码              | `git clone https://github.com/zeqixiao/worldmem-video-demo.git` |
| 镜像站下载文件（通用）    | `wget [镜像站链接]`（需在对应目录下执行）                    |

#### 十、核心问题与解决方案汇总（按遇到顺序排列）
| 问题现象                     | 根本原因                                             | 解决方案                                                     |
| ---------------------------- | ---------------------------------------------------- | ------------------------------------------------------------ |
| Git Bash无法激活Conda环境    | Git Bash默认不加载Conda脚本                          | 配置`.bashrc`文件，添加Conda脚本路径，生效后自动激活         |
| 项目依赖安装失败/缺失        | 未在`worldmem`环境中执行安装命令                     | 切换到项目根目录，在激活环境的Git Bash中执行`pip install`命令 |
| 境外资源下载超时             | GitHub/ Hugging Face境外链接访问不稳定               | 使用镜像站链接下载案例文件和模型权重                         |
| 首次启动视频生成功能加载失败 | 未安装`ffmpeg`，视频格式转换依赖该工具               | 按指定路径安装`ffmpeg`，配置环境变量并验证生效               |
| 训练脚本Hydra配置报错        | `algorithm.metrics`参数语法不符合Hydra要求           | 在参数前加`+`，改为`+algorithm.metrics=[lpips,psnr]`         |
| 重新启动app.py内存溢出       | 16GB物理内存不足以承载模型权重（3.6GB）+视频处理组件 | 扩展虚拟内存（20-40GB）或升级物理内存（≥32GB）               |

#### 十一、项目核心用途总结
WorldMem 是一个「基于动作交互的3D世界模拟与长视频生成工具」，核心价值是解决“单张场景图→上下文连贯长视频”的创作痛点，具体功能与场景如下：
1. 核心功能：
   - 6种预设场景（向日葵平原、沙漠、冰原等），支持任意场景作为初始帧；
   - 动作交互（W/A/S/D/Q/E等按键组合），可实现转向、移动、使用物品等操作；
   - 长视频生成：连续点击「Generate」扩展视频长度，自动维护场景3D结构、物体位置的一致性（新帧用红框标记）；
   - 模型训练：通过`train_stage_1.sh`脚本训练自定义模型，优化生成效果。
2. 应用场景：
   - 游戏开发：快速生成开放世界视频片段，无需手动建模动画；
   - 虚拟模拟：基于简单指令模拟虚拟环境视角移动与交互；
   - 内容创作：为动画、影视领域提供低成本场景扩展工具。

#### 关键注意事项
1. 流程逻辑优先级：必须先配置Git Bash的Conda环境，再安装依赖、下载资源——无环境则所有依赖安装、命令执行都会失效，这是最关键的前置步骤。
2. `ffmpeg`安装红线：路径必须无中文、无空格，环境变量必须指向`bin`目录，否则视频生成功能始终加载失败。
3. 内存是核心瓶颈：16GB物理内存仅能满足基础界面启动，视频生成+模型权重加载需≥32GB物理内存，或扩展20-40GB虚拟内存。
4. 终端统一原则：全程使用Git Bash操作，避免切换Anaconda Prompt/CMD导致环境不一致，减少报错概率。
5. 资源完整性：案例文件（4个`.npz`）和模型权重（3个`.ckpt`）必须完整下载，缺失任一文件会导致项目启动失败。

