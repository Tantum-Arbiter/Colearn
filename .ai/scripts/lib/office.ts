import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { readEvents } from './events.ts';
import type { OfficeEvent } from './events.ts';
import { resolveInside } from './fsx.ts';

export const officeWorkers = ['claude-pro', 'codex-1', 'codex-2'] as const;
const labels = ['Claude Pro · QA', 'Codex 1 · Tests / security', 'Codex 2 · Final review'];
type Message = Record<string, unknown>;
export function activityMessages(e: OfficeEvent): Message[] {
  const id = officeWorkers.indexOf(e.worker as typeof officeWorkers[number]) + 1;
  if (!id) return [];
  const active = ['started', 'resumed', 'progress'].includes(e.event);
  return [{ type: 'agentToolsClear', id }, { type: 'agentStatus', id, status: active ? 'active' : 'waiting', awaitingInput: false },
    ...(active ? [{ type: 'agentToolStart', id, toolId: `${e.run_id}.${e.phase}`, status: `Reviewing: ${e.phase}`, toolName: 'Read' }] : [])];
}
export function latestEvents(events: OfficeEvent[]): OfficeEvent[] {
  const latest = new Map<string, OfficeEvent>();
  for (const e of events) if (officeWorkers.includes(e.worker as typeof officeWorkers[number])) latest.set(e.worker, e);
  return [...latest.values()];
}

export function observedEvents(events: OfficeEvent[], stateDir: string): OfficeEvent[] {
  let alive = false;
  try {
    const pid = Number(readFileSync(resolveInside(stateDir, 'dispatcher.lock/pid'), 'utf8'));
    if (Number.isSafeInteger(pid) && pid > 0) { process.kill(pid, 0); alive = true; }
  } catch { /* No dispatcher: historical active states must not look live. */ }
  return latestEvents(events).map(e => !alive && ['started', 'resumed', 'progress'].includes(e.event) ?
    { ...e, event: 'interrupted', activity: 'waiting' } : e);
}

export async function startOffice(aiDir: string, port = 4317): Promise<{ url: string; close: () => Promise<void> }> {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid office port');
  const dist = resolveInside(aiDir, 'office-dist');
  let assets: { messages: Message[]; layout: object };
  try { assets = JSON.parse(readFileSync(join(dist, 'assets.json'), 'utf8')) as typeof assets; }
  catch { throw new Error('Office assets missing. Run npm run office:setup in .ai first.'); }
  let events = readEvents(resolveInside(aiDir, 'state'));
  const observed = (): OfficeEvent[] => observedEvents(events, resolveInside(aiDir, 'state'));
  let lastObserved = JSON.stringify(observed());
  let feedError = false;
  let origin = '';
  const ws = new WebSocketServer({ noServer: true, maxPayload: 4096, perMessageDeflate: false });
  const send = (socket: WebSocket, messages: Message[]): void => {
    for (const message of messages) if (socket.readyState === WebSocket.OPEN) socket.send(JSON.stringify(message));
  };
  const snapshot = (): Message[] => [
    { type: 'providerCapabilities', readingTools: ['Read'], subagentToolNames: [] }, ...assets.messages,
    { type: 'settingsLoaded', soundEnabled: false, lastSeenVersion: '1.4', extensionVersion: '1.4.1', watchAllSessions: false,
      alwaysShowLabels: true, ghostHeadlessAgents: false, hooksEnabled: false, hooksInfoShown: true, externalAssetDirectories: [], showAreas: false },
    { type: 'areaMappingsLoaded', mappings: {} },
    { type: 'existingAgents', agents: [1, 2, 3], agentMeta: { 1: { palette: 0 }, 2: { palette: 1 }, 3: { palette: 2 } },
      folderNames: Object.fromEntries(labels.map((l, i) => [i + 1, l])), externalAgents: { 1: true, 2: true, 3: true } },
    { type: 'layoutLoaded', layout: assets.layout }, ...observed().flatMap(activityMessages),
  ];
  ws.on('connection', socket => {
    let initialized = false;
    socket.on('error', () => socket.terminate());
    socket.on('message', data => {
      try {
        const message = JSON.parse(data.toString()) as Record<string, unknown>;
        if (message.type === 'webviewReady' && !initialized) { initialized = true; send(socket, snapshot()); }
        // No other protocol handlers: cannot launch agents, install hooks or mutate settings.
      } catch { socket.close(1008, 'Invalid message'); }
    });
  });
  const server = createServer((req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'self'");
    if (`http://${req.headers.host}` !== origin || req.headers.origin && req.headers.origin !== origin) { res.writeHead(403).end(); return; }
    if (req.method !== 'GET') { res.writeHead(405).end(); return; }
    try {
      const path = new URL(req.url ?? '/', origin).pathname;
      if (path === '/api/status') {
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ connected: !feedError, workers: officeWorkers, latest: observed(), recent: events.slice(-40) })); return;
      }
      const file = path.startsWith('/pixel/') ? resolveInside(join(dist, 'pixel'), decodeURIComponent(path.slice(7)) || 'index.html') :
        path === '/' ? join(aiDir, 'office/index.html') : path === '/office.js' ? join(aiDir, 'office/office.js') : null;
      if (!file) { res.writeHead(404).end(); return; }
      const types: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
      res.setHeader('Content-Type', types[extname(file)] ?? 'application/octet-stream');
      res.end(readFileSync(file));
    } catch { res.writeHead(404).end(); }
  });
  server.on('upgrade', (req, socket, head) => {
    if (req.url !== '/ws' || `http://${req.headers.host}` !== origin || req.headers.origin !== origin) { socket.destroy(); return; }
    ws.handleUpgrade(req, socket, head, client => ws.emit('connection', client, req));
  });
  await new Promise<void>((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve); });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Office did not bind');
  origin = `http://127.0.0.1:${address.port}`;
  const timer = setInterval(() => {
    try {
      const next = readEvents(resolveInside(aiDir, 'state'));
      events = next; feedError = false;
      const current = JSON.stringify(observed());
      if (current !== lastObserved) for (const client of ws.clients) send(client, observed().flatMap(activityMessages));
      lastObserved = current;
    } catch { feedError = true; }
  }, 750);
  return { url: origin, close: async () => {
    clearInterval(timer);
    for (const client of ws.clients) client.terminate();
    ws.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}
