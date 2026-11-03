# WSL 工作区 · DeepSeek Harness

[English](README.en.md) · MIT © 2026 dpj135

新建工作区时选择 **Windows 本地** 或 **WSL 发行版 + Linux 目录**。WSL 工作区使用独立 Linux Harness 后端，在系统浏览器中打开；不是将 Windows 工作目录改成 WSL 路径。工作区不支持创建后切换环境。

## 从 GitHub 添加插件

在 Harness **插件 → 添加插件** 中输入：

```text
https://github.com/dpj135/dsh-wsl-workspace
```

Harness `0.2.1-rc.5` 的安装解析器支持此原始仓库 URL，要求 Harness 安装进程能调用 Git 并访问 GitHub。仓库根目录已包含可执行插件包，不需要 npm 账号，也不需要安装时构建。

发布稳定版本后建议使用固定 tag。不要同时启用本项目与旧的 `@local/wsl-workspace` 开发版：它们使用相同工具名和接口路径。

**验证状态：**本地运行与工具链已验证；原始 URL 的完整干净安装验收尚待最终发布提交推送后进行。不要把“URL 解析支持”理解为所有环境的安装成功保证。

## 要求

- Windows + WSL 2，x86_64 Linux 发行版（已在 Ubuntu-22.04 测试）。
- Harness `0.2.1-rc.5`；其他版本未验证，清单有严格兼容性限制。
- WSL 中已有 `bash`、`python3`、`curl`、`sha256sum`、`tar`、`xz`、`flock`。
- Windows 的 Harness 安装进程可使用 Git。WSL 内有 Git 不代表 Windows 安装器能调用 Git。

<a id="initial-setup"></a>
## 首次初始化

1. 添加插件后，新建工作区并选择 WSL。
2. 选择发行版，检查运行时状态。
3. 若未就绪，阅读下载说明，勾选同意并点击初始化。操作仅在用户明确确认后开始；安装插件本身不会自动下载运行时。
4. 页面显示初始化状态和有界日志。成功后选择 Linux 目录，点击准备工作区，再点击在浏览器中打开。
5. 新后端中配置模型服务；不复制 Windows 密钥或登录状态。

初始化会下载 Node.js `24.11.0`，校验 SHA-256，然后安装 Harness `0.2.1-rc.5`，禁用 npm 生命周期脚本。安装目录为 Linux 用户的 `~/.local/share/dsh-wsl-workspaces/runtime`，不使用 sudo、不替换系统 Node。不会自动安装系统缺失依赖或 WSL 发行版。

手动备选：在 WSL 中运行本仓库 `setup-runtime.sh`。请先审阅脚本。

## 数据与生命周期

- 最近工作区：Windows `%LOCALAPPDATA%/dsh-wsl-workspace/workspaces.json`，不写插件安装目录；不含启动令牌。
- 每个发行版 + 规范目录对应独立 profile：Linux `~/.local/share/dsh-wsl-workspaces/homes/<identity>`。
- 关闭浏览器标签页不停止后端。卸载插件或退出管理进程时通过控制管道清理自己的 Linux 进程组；主动脱离进程组的程序不在完整清理保证内。
- 初始化可从失败状态重试；卸载时停止进行中的初始化。不会删除用户工作区、历史或已安装运行时。
- 多个独立桌面进程同时修改最近记录可能出现最后写入者覆盖。

## 验证与边界

已测试真实 Linux 后端启动、认证、目录浏览、文件 read/write、glob/grep、Bash，以及通过标准服务创建的子 Agent 继承相同预设和 Linux 工作目录；父子命令均返回 Linux。退出后端后端口关闭。

未验证真实模型回合、模型自主委派、团队编排、PTY 终端和全部第三方插件；未有浏览器控制完成视觉验收。本机 WSL Landlock ABI 较旧，报告部分约束。WSL 互操作仍可显式调用 Windows 程序，因此该插件不提供额外的完全安全沙箱。

图形化初始化另有离线生命周期测试；网络下载会受代理、GitHub/npm/Node 下载源和发行版依赖影响。

## 开发

```sh
npm test
npm run check
npm pack --ignore-scripts
```

运行文件已提交，安装不需要 `prepare` 或 `postinstall`。运行时初始化由明确用户操作单独完成。请勿提交密钥、最近目录记录、日志或本机测试结果。
