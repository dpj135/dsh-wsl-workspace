# dsh-wsl-workspace

Choose **Windows** or a fixed **WSL distribution + Linux directory** when creating a workspace in DeepSeek Harness. A WSL workspace runs in an independent Linux Harness backend; it is not a Windows directory-path toggle and cannot be converted after creation.

## Install from GitHub

In **Plugins → Add plugin**, paste:

```text
https://github.com/dpj135/dsh-wsl-workspace
```

The installed Harness `0.2.1-rc.5` plugin manager accepts this raw GitHub repository URL. Git must be available to Harness. Pin a release tag when reproducibility matters:

```text
https://github.com/dpj135/dsh-wsl-workspace#v0.1.0
```

The package is published as a prebuilt bundle: no `prepare`, `postinstall`, or build step is required.

## Requirements

- DeepSeek Harness `0.2.1-rc.5` or a compatible release
- Windows with WSL 2
- An x86_64 Linux WSL distribution
- `python3`, `curl`, `sha256sum`, `tar`, `xz`, and `flock` inside that distribution for setup
- Git available to the Harness plugin installer

## First WSL setup

Installing the plugin does **not** silently download a runtime. In the WSL distribution you intend to use, run the included script from PowerShell:

```powershell
wsl.exe -d Ubuntu-22.04 --exec bash <path-to-cloned-repository>/setup-runtime.sh
```

The workspace picker can check runtime status and displays a distribution-specific command. The setup script downloads pinned Node.js `24.11.0`, verifies its SHA-256 checksum, installs Harness `0.2.1-rc.5` with npm lifecycle scripts disabled, and never changes system Node or uses sudo. Review the script before running it.

After setup, open the WSL picker, choose the distribution and Linux directory, and click **Prepare workspace** → **Open in browser**. The WSL backend has separate model configuration and browser authentication; Windows credentials are not copied.

## What is isolated

Files, search, Bash, built-in tools, Agent creation, and inherited child Agent execution were tested in the Linux backend. The workspace identity is fixed to the selected distribution and canonical Linux directory. Closing the desktop/plugin attempts to terminate the backend's supervised Linux process group. Programs that deliberately create their own session are outside that cleanup guarantee.

The WSL backend is not a security boundary against deliberate Windows interoperability from inside Linux. The current WSL kernel reports partial Landlock enforcement, so this release does not claim full sandbox isolation.

## Development and tests

The repository contains runtime-independent source files and no user credentials or local recent-workspace data. Run syntax checks with:

```powershell
node --check index.js
node --check backend.js
node --check client.js
```

The isolated acceptance fixture used during development tested normal `read`, `write`, `glob`, `grep`, and `bash` registry tools plus a child Agent inheriting the standard preset and Linux cwd. It did not test model round trips, PTY terminals, team orchestration, or visual rendering.

## License

MIT © 2026 dpj135
