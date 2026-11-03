# 发布步骤

维护者在已登录 GitHub 的终端中执行。提交已在本地仓库准备，不需要把 Token 发给其他人。

```bash
git status --short
git push origin main
git tag -a v0.1.0 -m "WSL Workspaces v0.1.0"
git push origin v0.1.0
```

不要覆盖已经存在的 tag。标签推送触发 `.github/workflows/release.yml`：检查版本、语法和测试，打包后创建 GitHub Release 并上传 `.tgz`。

查看 GitHub Actions 的 Release 工作流是否成功。仓库需允许 GitHub Actions 使用 `contents: write` 权限；否则可在 GitHub Releases 页面手动选择已有 tag，上传本地 `pnpm pack` / `npm pack --ignore-scripts` 生成的归档。

最终安装验收：在 Windows Harness 中禁用旧 `@local/wsl-workspace` 开发版后，通过插件页面添加原始 URL `https://github.com/dpj135/dsh-wsl-workspace`，检查安装结果、工作区选择器和初始化按钮。不需要 npm 发布。

如果安装进程没有 Windows Git，仓库 URL 路径可能失败。可安装 Git 并重启 Harness，或使用 Release 的 `.tgz` 资产链接（不是 Release HTML 页面或 zip）。不能把 WSL 中已装 Git 当作 Windows 进程具备 Git。

不要在测试中替换或输出现有模型密钥。WSL 后端模型配置保持独立。
