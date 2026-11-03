#!/usr/bin/env bash
set -euo pipefail
# Explicit, manual setup: no sudo, system Node changes, or package install scripts.
NODE_VERSION='24.11.0'
DSH_VERSION='0.2.1-rc.5'
ROOT="$HOME/.local/share/dsh-wsl-workspaces/runtime"
if [[ "$(uname -s)" != Linux || "$(uname -m)" != x86_64 ]]; then
  echo 'This release supports Linux x86_64 WSL distributions only.' >&2
  exit 1
fi
for executable in curl sha256sum tar xz python3 flock; do
  command -v "$executable" >/dev/null || { echo "Missing prerequisite: $executable" >&2; exit 1; }
done
mkdir -p "$ROOT/downloads"
exec 9>"$ROOT/setup.lock"
flock -n 9 || { echo 'Another runtime setup is already running.' >&2; exit 1; }
cd "$ROOT/downloads"
ARCHIVE="node-v${NODE_VERSION}-linux-x64.tar.xz"
if [[ ! -x "$ROOT/node-v${NODE_VERSION}-linux-x64/bin/node" ]]; then
  curl --proto '=https' --tlsv1.2 --fail --location --retry 2 "https://nodejs.org/dist/v${NODE_VERSION}/$ARCHIVE" -o "$ARCHIVE"
  curl --proto '=https' --tlsv1.2 --fail --location --retry 2 "https://nodejs.org/dist/v${NODE_VERSION}/SHASUMS256.txt" -o SHASUMS256.txt
  grep "  $ARCHIVE$" SHASUMS256.txt | sha256sum --check -
  tar -xJf "$ARCHIVE" -C "$ROOT"
fi
export PATH="$ROOT/node-v${NODE_VERSION}-linux-x64/bin:$PATH"
[[ "$(node --version)" == "v$NODE_VERSION" ]] || { echo 'Unexpected dedicated Node version.' >&2; exit 1; }
npm install --prefix "$ROOT/dsh" --ignore-scripts --no-audit --no-fund --save-exact "@deepseek-ai/dsh@$DSH_VERSION"
node "$ROOT/dsh/node_modules/@deepseek-ai/dsh/lib/bin.js" --version
printf '\nRuntime ready: %s\nReturn to the workspace picker and check runtime status.\n' "$ROOT"
