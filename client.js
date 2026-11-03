window.__ModuleLoader__.load({
  id: 'dsh-wsl-workspace',
  factory(require) {
    const React = require('react');
    const { createElement: h, useEffect, useRef, useState, useId, useSyncExternalStore } = React;
    const dictionaries = {"en":{"meta":{"title":"WSL Workspaces","description":"Choose a WSL distribution and Linux directory, then open its independent Harness backend in your browser."},"setupNotice":"First use: manually install the dedicated Harness runtime inside your chosen WSL distribution before preparing a workspace. Installing this plugin does not install that runtime. Windows folders need no WSL setup.","setupGuide":"Initial setup instructions","setupUrl":"https://github.com/dpj135/dsh-wsl-workspace#initial-setup","title":"Choose workspace environment","launcher":"WSL workspaces","windows":"Windows local","wsl":"WSL / Linux","notice":"WSL workspaces open in a separate browser tab with an independent Linux backend. Existing Windows sessions are not moved. Configure your model in that backend if needed.","native":"Choose Windows folder","distro":"Distribution","path":"Linux directory","browse":"Browse","up":"Parent directory","home":"Home directory","prepare":"Prepare workspace","open":"Open in browser","cancel":"Cancel","close":"Close","loading":"Loading…","starting":"Preparing Linux backend…","empty":"No subdirectories.","noDistros":"No WSL distributions found. Install a distribution, then retry.","retry":"Reload","recent":"Recent WSL workspaces","noneRecent":"No recent WSL workspaces.","truncated":"Only part of this directory is shown. Enter an exact path to continue.","ready":"Workspace ready. Open the authenticated link below in your browser.","error":"Request failed","invalidUrl":"The backend returned an unsafe URL. Only loopback HTTP(S) links are accepted.","invalidPath":"Enter an absolute Linux directory beginning with /.","busy":"The workspace is being adopted. Please wait.","stopNotice":"Closing this dialog cancels the request, but does not stop a backend already started."},"zh":{"meta":{"title":"WSL 工作区","description":"选择 WSL 发行版和 Linux 目录，在浏览器中打开独立的 Harness 后端。"},"setupNotice":"首次使用：请先在所选 WSL 发行版中手动安装专用 Harness 运行时，再准备工作区。安装本插件不会自动安装该运行时。Windows 文件夹无需进行 WSL 初始化。","setupGuide":"查看首次初始化说明","setupUrl":"https://github.com/dpj135/dsh-wsl-workspace","title":"选择工作区环境","launcher":"WSL 工作区","windows":"Windows 本地","wsl":"WSL / Linux","notice":"WSL 工作区将在新的浏览器标签页中使用独立 Linux 后端。现有 Windows 会话不会迁移；如有需要，请在新后端配置模型。","native":"选择 Windows 文件夹","distro":"发行版","path":"Linux 目录","browse":"浏览","up":"上级目录","home":"主目录","prepare":"准备工作区","open":"在浏览器中打开","cancel":"取消","close":"关闭","loading":"正在加载…","starting":"正在准备 Linux 后端…","empty":"没有子目录。","noDistros":"未找到 WSL 发行版。请安装发行版后重试。","retry":"重新加载","recent":"最近的 WSL 工作区","noneRecent":"暂无最近的 WSL 工作区。","truncated":"仅显示部分目录。可输入精确路径继续。","ready":"工作区已就绪。请通过下方授权链接在浏览器中打开。","error":"请求失败","invalidUrl":"后端返回了不安全的网址，仅允许本机回环 HTTP(S) 链接。","invalidPath":"请输入以 / 开头的 Linux 绝对目录。","busy":"正在添加工作区，请稍候。","stopNotice":"关闭此窗口会取消请求，但不会停止已经启动的后端。"}};
    const css = `
.wslw-dialog{box-sizing:border-box;width:min(580px,calc(100vw - 32px));max-height:85vh;overflow:auto;padding:24px;border:1px solid var(--dsw-alias-border-l1);border-radius:16px;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary);font:inherit}
.wslw-dialog::backdrop{background:color-mix(in srgb,var(--dsw-alias-label-primary) 35%,transparent)}
.wslw-dialog h2{margin:0 0 16px;font-size:18px}.wslw-dialog p{line-height:1.5}.wslw-row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}.wslw-field{display:grid;gap:6px;margin:14px 0}.wslw-dialog button,.wslw-dialog input,.wslw-dialog select,.wslw-link,.wslw-launcher{font:inherit;color:inherit;border:1px solid var(--dsw-alias-border-l1);border-radius:8px;background:var(--dsw-alias-bg-base);padding:8px 12px}.wslw-dialog input{min-width:0;flex:1}.wslw-dialog button,.wslw-link,.wslw-launcher{cursor:pointer}.wslw-dialog button:disabled{opacity:.5;cursor:default}.wslw-dialog button:hover:not(:disabled),.wslw-link:hover,.wslw-launcher:hover{background:var(--dsw-alias-bg-layer-2)}.wslw-dialog :focus-visible,.wslw-launcher:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:2px}.wslw-dialog button[aria-pressed=true],.wslw-link{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}.wslw-note{color:var(--dsw-alias-label-secondary);font-size:13px}.wslw-error{padding:10px;border:1px solid var(--dsw-alias-state-error-primary);border-radius:8px;white-space:pre-wrap;overflow-wrap:anywhere}.wslw-list{display:grid;gap:4px;max-height:190px;overflow:auto;margin:10px 0}.wslw-list button{text-align:left;overflow-wrap:anywhere}.wslw-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:18px}.wslw-link{display:inline-block;text-decoration:none}.wslw-ready{overflow-wrap:anywhere}.wslw-launcher{padding:6px;font-size:12px}.wslw-dialog fieldset{border:0;padding:0;margin:0;min-width:0}
`;
    return {
      inject: ['slots', 'locale', 'uiWorkspace'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register('dsh-wsl-workspace', dictionaries));
        const t = ctx.locale.bind('dsh-wsl-workspace');
        const subscribe = fn => ctx.locale.subscribe(fn);
        const snapshot = () => ctx.locale.getSnapshot();
        function useLocale() { useSyncExternalStore(subscribe, snapshot, snapshot); return t; }
        async function api(action, params, signal) {
          const response = await fetch('api/wsl-workspace', {
            method: 'POST', credentials: 'same-origin', signal,
            headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...params }),
          });
          let value;
          try { value = await response.json(); } catch { throw new Error(`${t('error')} (${response.status})`); }
          if (!response.ok || value?.error) throw new Error(value?.error || `${t('error')} (${response.status})`);
          return value;
        }
        function safeUrl(value) {
          const url = new URL(value);
          if (!['http:', 'https:'].includes(url.protocol) || !['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname) || url.username || url.password) throw new Error(t('invalidUrl'));
          return url.href;
        }
        function Picker(props) {
          const tr = useLocale();
          const dialog = useRef(null), generation = useRef(0), request = useRef(null), nativePending = useRef(false);
          const latest = useRef(props); latest.current = props;
          const titleId = useId(), pathId = useId(), distroId = useId();
          const [mode, setMode] = useState(props.wslOnly ? 'wsl' : 'windows');
          const [distros, setDistros] = useState([]), [distro, setDistro] = useState('');
          const [path, setPath] = useState(''), [listing, setListing] = useState(null), [recent, setRecent] = useState([]);
          const [pending, setPending] = useState(''), [error, setError] = useState(''), [ready, setReady] = useState(null);
          const stop = () => { generation.current++; request.current?.abort(); request.current = null; };
          function cancel() { if (latest.current.busy) return; stop(); dialog.current?.close(); latest.current.onCancel(); }
          async function run(kind, operation) {
            stop(); const version = generation.current; const controller = new AbortController(); request.current = controller;
            setPending(kind); setError(''); setReady(null);
            try {
              const result = await operation(controller.signal);
              if (version !== generation.current || !latest.current.open) return;
              return result;
            } catch (e) {
              if (version === generation.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : tr('error'));
            } finally {
              if (version === generation.current) { setPending(''); request.current = null; }
            }
          }
          function initialize() {
            void run('load', async signal => {
              const [d, r] = await Promise.all([api('distros', {}, signal), api('recent', {}, signal)]);
              if (signal.aborted) return;
              setDistros(d.distros); setDistro(d.distros[0] || ''); setRecent(r.workspaces); setListing(null); setPath('');
            });
          }
          useEffect(() => {
            if (!props.open) return;
            setError(''); setReady(null); setListing(null); setPath(''); setMode(props.wslOnly ? 'wsl' : 'windows');
            if (!dialog.current.open) dialog.current.showModal();
            setPending('');
            if (props.wslOnly) initialize();
            return () => { stop(); dialog.current?.close(); };
          }, [props.open]);
          async function browse(nextPath, nextDistro = distro) {
            if (props.busy || pending || !nextDistro) return;
            await run('list', async signal => {
              const value = await api('list', { distro: nextDistro, ...(nextPath ? { path: nextPath } : {}) }, signal);
              if (signal.aborted) return;
              setDistro(nextDistro); setPath(value.path); setListing(value);
            });
          }
          async function prepare() {
            if (!path.startsWith('/') || path.includes('\0')) { setError(tr('invalidPath')); return; }
            await run('open', async signal => {
              const value = await api('open', { distro, path }, signal);
              const url = safeUrl(value.url);
              if (!signal.aborted) setReady({ ...value, url });
            });
          }
          async function native() {
            if (pending || nativePending.current || props.busy) return;
            stop(); const version = generation.current; nativePending.current = true; setPending('native'); setError('');
            // A native picker must not compete with the HTML modal for focus.
            dialog.current?.close();
            try {
              const selected = await ctx.uiWorkspace.pickDirectory();
              if (version !== generation.current || !latest.current.open) return;
              if (selected) latest.current.onPicked(selected); else latest.current.onCancel();
            } catch (e) {
              if (version === generation.current && latest.current.open) {
                setError(e instanceof Error ? e.message : tr('error'));
                dialog.current?.showModal();
              }
            } finally { nativePending.current = false; if (version === generation.current) setPending(''); }
          }
          const disabled = !!pending || props.busy;
          const button = (label, onClick, extra = {}) => h('button', { type: 'button', disabled, onClick, ...extra }, label);
          return h(React.Fragment, null, h('style', null, css), h('dialog', {
            ref: dialog, className: 'wslw-dialog', 'aria-labelledby': titleId,
            onCancel: e => { e.preventDefault(); cancel(); },
          }, h('h2', { id: titleId }, tr('title')),
          !props.wslOnly && h('div', { className: 'wslw-row' }, ...['windows', 'wsl'].map(m => button(tr(m), () => { stop(); setPending(''); setMode(m); setReady(null); setError(''); if (m === 'wsl') initialize(); }, { key: m, disabled: !!props.busy || pending === 'native', 'aria-pressed': mode === m }))),
          mode === 'windows' ? h('p', null, button(tr('native'), native)) : h(React.Fragment, null,
            h('p', { className: 'wslw-note' }, tr('notice')),
            h('p', { className: 'wslw-note' }, tr('setupNotice'), ' ', h('a', { href: tr('setupUrl'), target: '_blank', rel: 'noreferrer noopener' }, tr('setupGuide'))),
            h('fieldset', { disabled },
              h('div', { className: 'wslw-field' }, h('label', { htmlFor: distroId }, tr('distro')),
                h('select', { id: distroId, value: distro, onChange: e => { setDistro(e.target.value); setPath(''); setListing(null); setReady(null); setError(''); } }, ...distros.map(d => h('option', { key: d, value: d }, d)))),
              !distros.length && !pending && h('p', null, tr('noDistros')),
              h('div', { className: 'wslw-field' }, h('label', { htmlFor: pathId }, tr('path')),
                h('div', { className: 'wslw-row' }, h('input', { id: pathId, value: path, spellCheck: false, autoComplete: 'off', placeholder: '/home', onChange: e => { setPath(e.target.value); setReady(null); }, onKeyDown: e => { if (e.key === 'Enter') { e.preventDefault(); void browse(path); } } }), button(tr('browse'), () => browse(path), { disabled: disabled || !distro }))),
              h('div', { className: 'wslw-row' }, button(tr('home'), () => browse(''), { disabled: disabled || !distro }), button(tr('up'), () => browse(listing.parent), { disabled: disabled || !listing?.parent }), button(tr('retry'), initialize)),
              listing && h('div', { className: 'wslw-list' }, listing.directories.length ? listing.directories.map(d => button(d.name, () => browse(d.path), { key: d.path })) : h('p', null, tr('empty'))),
              listing?.truncated && h('p', { className: 'wslw-note' }, tr('truncated')),
              h('details', null, h('summary', null, tr('recent')), h('div', { className: 'wslw-list' }, recent.length ? recent.map(w => button(`${w.distro} · ${w.path}`, () => browse(w.path, w.distro), { key: `${w.distro}\0${w.path}` })) : h('p', null, tr('noneRecent')))),
              button(tr('prepare'), prepare, { disabled: disabled || !distro || !path.startsWith('/') })
            ),
            ready && h('div', { className: 'wslw-ready', role: 'status' }, h('p', null, tr('ready')), h('p', null, `${ready.distro} · ${ready.path}`), h('a', { className: 'wslw-link', href: ready.url, target: '_blank', rel: 'noreferrer noopener', onClick: () => cancel() }, tr('open')))
          ),
          error && h('p', { className: 'wslw-error', role: 'alert' }, error),
          h('div', { role: 'status', 'aria-live': 'polite' }, props.busy ? tr('busy') : pending ? tr(pending === 'open' ? 'starting' : 'loading') : ''),
          pending === 'open' && h('p', { className: 'wslw-note' }, tr('stopNotice')),
          h('div', { className: 'wslw-footer' }, button(tr(ready ? 'close' : 'cancel'), cancel, { disabled: !!props.busy }))));
        }
        function Launcher() {
          const tr = useLocale(); const [open, setOpen] = useState(false);
          return h(React.Fragment, null, h('style', null, css), h('button', { type: 'button', className: 'wslw-launcher', title: tr('launcher'), 'aria-label': tr('launcher'), onClick: () => setOpen(true) }, 'WSL'), h(Picker, { open, busy: false, wslOnly: true, onCancel: () => setOpen(false) }));
        }
        for (const name of ['sidebar.workspaces.directoryFlow', 'conversation.hero.workspace.directoryFlow']) {
          ctx.slots.inject(name, () => ctx.slots.register({ name, priority: -50 }, Picker));
        }
        ctx.slots.inject('sidebar.footer.action', () => ctx.slots.register({ name: 'sidebar.footer.action', id: 'dsh-wsl-workspace', order: 50, label: () => t('launcher') }, Launcher));
      },
    };
  },
});
