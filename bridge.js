export const inject = ['connection', 'workspaceRegistry'];
export function apply(ctx) {
  if (process.platform !== 'linux') throw new Error('WSL bridge requires a Linux backend.');
  ctx.connection.fetch.register({
    path: '/api/wsl-initialize', methods: ['POST'], requestBody: 'streaming',
    async fetch(request) {
      try {
        const reader = request.body?.getReader();
        if (!reader) throw new Error('Expected a JSON body.');
        const chunks = []; let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read(); if (done) break;
            size += value.byteLength;
            if (size > 16384) { await reader.cancel(); throw new Error('Request too large.'); }
            chunks.push(Buffer.from(value));
          }
        } finally { reader.releaseLock(); }
        const input = JSON.parse(Buffer.concat(chunks).toString('utf8'));
        if (!input || Array.isArray(input) || Object.keys(input).some(key => key !== 'path') || input.path !== process.cwd()) throw new Error('Workspace must match the backend launch directory.');
        const workspace = await ctx.workspaceRegistry.create(process.cwd(), `WSL · ${process.cwd().split('/').filter(Boolean).pop() || '/'}`);
        return Response.json({ id: workspace.id, path: workspace.path, platform: process.platform }, { headers: { 'Cache-Control': 'no-store' } });
      } catch (error) { return Response.json({ error: error.message }, { status: 400, headers: { 'Cache-Control': 'no-store' } }); }
    },
  });
}
