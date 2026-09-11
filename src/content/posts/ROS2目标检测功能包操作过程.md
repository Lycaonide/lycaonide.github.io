---
draft: false
title: ROS2目标检测功能包操作过程
published: 2026-03-25
tags: ["ROS2", "目标检测", "MediaPipe", "项目部署"]
category: 技术笔记
---

#### 一、远程传输所有工程文件到虚拟机工作空间

将 `object_detect_service`、`msg_srv` 功能包传输至虚拟机 `~/first_ws/src/` 目录。

#### 二、编写 `camera_node.py` 和 `detect_node.py`，在 `setup.py` 中注册节点

- **`camera_node.py`**：实现等待目标检测服务、打开摄像头、读取图像帧、调用服务、显示图像的功能。

- **`detect_node.py`**：实现提供目标检测服务、接收图像请求、运行 MediaPipe 检测、返回结果的功能。

- **`setup.py` 配置 `entry_points`**：

  ```python
  entry_points={
      'console_scripts': [
          'camera_node = object_detect_service.camera_node:main',
          'detect_node = object_detect_service.detect_node:main',
      ],
  },
  ```

#### 三、安装依赖

在终端依次执行以下命令，安装指定版本依赖库：

```bash
pip install "numpy<2.0"
pip install "opencv-python==4.10.0.84" "opencv-contrib-python==4.10.0.84"
pip install mediapipe
```

#### 四、安装摄像头测试工具

执行命令安装 `cheese` 摄像头硬件测试工具：

```bash
sudo apt update
sudo apt install cheese -y
```

#### 五、编译功能包

进入工作空间根目录，先编译消息服务包，再编译目标检测功能包：

```bash
cd ~/first_ws
colcon build --packages-select msg_srv
colcon build --packages-select object_detect_service
```

#### 六、加载环境变量

每次新开终端，均需执行以下命令加载编译后的环境变量：

```bash
source install/setup.bash
```

#### 七、配置虚拟机 USB 兼容性与摄像头连接

##### 7.1 初次测试摄像头（失败）

连接摄像头后，授予权限：

```bash
sudo chmod 777 /dev/video*
```

使用 `cheese` 测试：

```bash
source install/setup.bash
cheese
```

（此时 `cheese` 未成功弹出画面，且终端出现大量 `select() timeout` 警告）

##### 7.2 解决警告：修改 USB 兼容性

因虚拟机摄像头兼容性问题导致终端警告，修改 USB 设置：

1. 关闭虚拟机
2. 打开 VMware 虚拟机设置 → USB 控制器
3. 将 USB 兼容性选择为 **USB 3.1**，保存设置后启动虚拟机
4. 重新连接摄像头：虚拟机菜单栏 → 可移动设备 → 选择摄像头 → 连接

##### 7.3 再次测试摄像头（意外成功）

再次执行 `cheese` 测试：

```bash
source install/setup.bash
cheese
```

（此时 `cheese` 成功弹出摄像头实时画面，硬件连接与警告问题解决）

#### 八、改进：修改 `camera_node.py` 代码适配虚拟机环境

##### 8.1 关键修改：指定 V4L 后端

在 `camera_node.py` 中修改摄像头初始化代码，指定 V4L 后端适配虚拟机：

```python
# 原代码：self.cap = cv2.VideoCapture(0)
# 【关键改动】添加 cv2.CAP_V4L 后端，设备号根据实际情况修改
self.cap = cv2.VideoCapture(0 + cv2.CAP_V4L)
if not self.cap.isOpened():
    self.get_logger().error("无法打开摄像头")
    return
```

##### 8.2 简化版自动遍历（可选，应对设备号变化）

若设备号频繁变化，在 `camera_node.py` 中添加简化遍历逻辑：

```python
# 【关键改动】自动遍历 /dev/video* 设备，配合 V4L 后端
import glob
self.cap = None
for dev in glob.glob("/dev/video*"):
    dev_id = int(dev.replace("/dev/video", ""))
    self.cap = cv2.VideoCapture(dev_id + cv2.CAP_V4L)
    if self.cap.isOpened():
        break
if not self.cap or not self.cap.isOpened():
    self.get_logger().error("无法打开摄像头")
    return
```

重新编译：

```bash
colcon build --packages-select object_detect_service
source install/setup.bash
```

#### 九、解决 Qt 平台插件报错

启动 `camera_node` 时出现 `qt.qpa.xcb: could not connect to display` 错误，可选择以下两种方式之一解决：

##### 方式一：终端临时设置环境变量（推荐，不修改代码）

在启动 `camera_node` 前执行：

```bash
export DISPLAY=:0
```

此方式仅对当前终端生效，新开终端需重新执行。

##### 方式二：代码层面禁用 GUI（永久解决，无需手动设置）

在 `camera_node.py` 文件最顶部添加代码，强制 Qt 运行在无头模式，避免图形界面依赖：

```python
import os
# 【关键改动】禁用 Qt GUI，彻底解决 display 连接问题
os.environ["QT_QPA_PLATFORM"] = "offscreen"
```

修改后重新编译：

```bash
colcon build --packages-select object_detect_service
source install/setup.bash
```

#### 十、节点启动顺序（关键）

##### 10.1 启动 `detect_node`（服务端）

新开终端，执行：

```bash
source install/setup.bash
ros2 run object_detect_service detect_node
```

服务端启动后无输出或打印「检测服务已启动」日志，代表服务正常运行。

##### 10.2 启动 `camera_node`（客户端）

- 若使用**方式一**：

  ```bash
  source install/setup.bash
  export DISPLAY=:0
  ros2 run object_detect_service camera_node
  ```

- 若使用**方式二**：

  ```bash
  source install/setup.bash
  ros2 run object_detect_service camera_node
  ```

  客户端启动后：

- 若服务未上线，循环打印「服务未上线，正在等待...」

- 服务上线后，打开摄像头（使用 V4L 后端），弹出 `frame` 窗口显示实时画面，开始采集图像并调用检测服务

#### 十一、结果

（一开始 `cheese` 未成功，且终端出现 `select() timeout` 警告；修改 USB 兼容性为 3.1 后，再次用 `cheese` 测试意外成功弹出画面）

- `detect_node` 服务后台稳定运行，`camera_node` 成功连接服务并打开摄像头
- 弹出 `frame` 窗口显示实时画面，完成「服务等待 → 图像采集 → 服务调用 → 图像显示」完整流程
