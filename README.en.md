# WSL Workspaces for DeepSeek Harness

[中文](README.md) · MIT © 2026 dpj135

Choose Windows or a fixed WSL distribution and Linux directory when adding a workspace. WSL workspaces run an independent Linux Harness backend, opened in the external browser. Existing Windows conversations are not migrated.

## GitHub installation

In **Plugins → Add plugin**, enter:

```text
https://github.com/dpj135/dsh-wsl-workspace
```

Harness 0.2.1-rc.5 explicitly accepts this raw repository URL. Git must be available to the Windows Harness installer; Git inside WSL alone is insufficient. The package is at the repository root and ships executable files without prepare/postinstall scripts. No npm account is needed.

The final clean remote-URL install still needs verification after the final commit is pushed. Do not enable this package alongside the old `@local/wsl-workspace` development bundle: their route and tool names conflict.

## Initial setup

Requires Windows + WSL2, x86_64 Linux, Harness 0.2.1-rc.5, and bash/python3/curl/sha256sum/tar/xz/flock inside the selected distribution.

Select WSL, choose the distribution, and check runtime status. If missing, read the download explanation, explicitly consent, and start initialization. The UI shows bounded progress logs. Setup downloads Node 24.11.0 with SHA-256 verification and installs Harness 0.2.1-rc.5 with npm lifecycle scripts disabled. It uses the Linux user's `~/.local/share/dsh-wsl-workspaces/runtime`, never sudo or system Node replacement. Missing system packages and WSL distributions must be installed separately.

Once ready, select a Linux directory, prepare it, and open its authenticated browser link. Configure model access in the new backend; Windows secrets are never copied. Manual fallback: review and run `setup-runtime.sh` from WSL.

## Data and safety

Recent directories live outside the installed package, under `%LOCALAPPDATA%/dsh-wsl-workspace`. Per-workspace Linux profiles live under `~/.local/share/dsh-wsl-workspaces/homes/<identity>`. Recent data contains no launch tokens. Multiple independent desktop processes have last-writer-wins recent-list semantics.

Closing a browser tab does not stop the backend. Plugin disposal closes its control pipe and terminates its supervised Linux process group. Detached third-party sessions are not fully covered. Disposal stops ongoing initialization; user workspaces/history/runtime are not automatically deleted.

Actual Linux read/write/search/Bash and inherited child-Agent tools have been tested, along with auth and backend shutdown. Real model turns, autonomous delegation, team orchestration, PTY terminals, arbitrary external plugins and visual rendering have not all been verified. Older WSL Landlock ABI may yield partial enforcement. WSL interoperability remains available; this plugin is not an additional complete security sandbox.

## Development

```sh
npm test
npm run check
npm pack --ignore-scripts
```

No build is required for installation. Never commit credentials, local directory records, logs or machine-specific test reports.
