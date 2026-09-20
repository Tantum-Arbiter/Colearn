import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { WebSocketServer, WebSocket } from 'ws';
import { readEvents } from './events.ts';
import type { OfficeEvent } from './events.ts';
import { resolveInside } from './fsx.ts';
import { discoverLocalAgents } from './discovery.ts';
import type { ObservedAgent } from './discovery.ts';
import { WorkBoard } from './kanban.ts';

export const officeWorkers = ['claude-pro', 'codex-1', 'codex-2'] as const;
const labels: Record<string, string> = { 'claude-pro': 'Claude Pro · QA', 'codex-1': 'Codex 1 · Tests / security', 'codex-2': 'Codex 2 · Final review' };
const eventLabels: Record<string, string> = {
  started: 'Reviewing', resumed: 'Reviewing · resumed', progress: 'Reviewing', completed: 'Completed', failed: 'Failed',
  authentication_required: 'Sign-in needs attention', timed_out: 'Timed out', skipped_usage_limit: 'Waiting for quota',
  deferred: 'Waiting for quota', interrupted: 'Interrupted',
};
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

function reviewAgents(events: OfficeEvent[], stateDir: string): ObservedAgent[] {
  return observedEvents(events, stateDir).map(e => ({
    key: `review:${e.worker}`,
    provider: 'review',
    title: labels[e.worker] ?? e.worker,
    project: 'Review orchestrator',
    status: ['started', 'resumed', 'progress'].includes(e.event) ? 'active' :
      ['failed', 'authentication_required', 'timed_out', 'interrupted'].includes(e.event) ? 'failed' :
      e.event === 'completed' ? 'completed' : 'waiting',
    detail: `${eventLabels[e.event] ?? e.event.replaceAll('_', ' ')} · ${e.phase.replaceAll('_', ' ')}`,
    updated_at: e.timestamp,
  }));
}

export function mergeAgents(review: ObservedAgent[], discovered: ObservedAgent[]): ObservedAgent[] {
  const merged = new Map<string, ObservedAgent>();
  for (const agent of [...review, ...discovered]) merged.set(agent.key, agent);
  return [...merged.values()].sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.updated_at.localeCompare(a.updated_at));
}

export async function startOffice(aiDir: string, port = 4317, discover: () => ObservedAgent[] = discoverLocalAgents, board = new WorkBoard()): Promise<{ url: string; close: () => Promise<void> }> {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Invalid office port');
  const dist = resolveInside(aiDir, 'office-dist');
  let assets: { messages: Message[]; layout: object };
  try { assets = JSON.parse(readFileSync(join(dist, 'assets.json'), 'utf8')) as typeof assets; }
  catch { throw new Error('Office assets missing. Run npm run office:setup in .ai first.'); }
  let events = readEvents(resolveInside(aiDir, 'state'));
  let agents = mergeAgents(reviewAgents(events, resolveInside(aiDir, 'state')), discover());
  void board.refresh().catch(() => {});
  let lastDiscovery = Date.now();
  const agentIds = new Map<string, number>();
  let nextId = 1;
  const idFor = (key: string): number => { let id = agentIds.get(key); if (!id) { id = nextId++; agentIds.set(key, id); } return id; };
  for (const agent of agents) idFor(agent.key);
  const messagesFor = (agent: ObservedAgent): Message[] => {
    const id = idFor(agent.key); const active = agent.status === 'active';
    return [{ type: 'agentToolsClear', id }, { type: 'agentStatus', id, status: active ? 'active' : 'waiting', awaitingInput: false },
      ...(active ? [{ type: 'agentToolStart', id, toolId: agent.key, status: agent.detail, toolName: 'Read' }] :
        agent.status === 'failed' ? [{ type: 'agentToolPermission', id }] : [])];
  };
  let lastObserved = JSON.stringify(agents);
  let lastIdlePulse = 0;
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
    { type: 'existingAgents', agents: agents.map(a => idFor(a.key)),
      agentMeta: Object.fromEntries(agents.map((a, i) => [idFor(a.key), { palette: i % 6 }])),
      folderNames: Object.fromEntries(agents.map(a => [idFor(a.key), `${a.provider.toUpperCase()} · ${a.title}`])),
      externalAgents: Object.fromEntries(agents.map(a => [idFor(a.key), true])) },
    { type: 'layoutLoaded', layout: assets.layout }, ...agents.flatMap(messagesFor),
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
        res.end(JSON.stringify({ connected: !feedError, agents, recent: events.slice(-40), board: board.snapshot(agents) })); return;
      }
      const file = path.startsWith('/pixel/') ? resolveInside(join(dist, 'pixel'), decodeURIComponent(path.slice(7)) || 'index.html') :
        path === '/' ? join(aiDir, 'office/index.html') : ['/office.js', '/office.css', '/kanban.js'].includes(path) ? join(aiDir, 'office', path.slice(1)) : null;
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
  const boardTimer = setInterval(() => { void board.refresh().catch(() => {}); }, 15_000);
  const timer = setInterval(() => {
    try {
      const next = readEvents(resolveInside(aiDir, 'state'));
      events = next; feedError = false;
      const discovered = Date.now() - lastDiscovery >= 3_000 ? discover() : agents.filter(a => a.provider !== 'review');
      if (Date.now() - lastDiscovery >= 3_000) lastDiscovery = Date.now();
      const nextAgents = mergeAgents(reviewAgents(events, resolveInside(aiDir, 'state')), discovered);
      const current = JSON.stringify(nextAgents);
      if (current !== lastObserved) {
        const old = new Map(agents.map(a => [a.key, a])); const fresh = new Map(nextAgents.map(a => [a.key, a]));
        for (const [key] of old) if (!fresh.has(key)) for (const client of ws.clients) send(client, [{ type: 'agentClosed', id: idFor(key) }]);
        for (const agent of nextAgents) {
          const created = !old.has(agent.key); const id = idFor(agent.key);
          const update = [...(created ? [{ type: 'agentCreated', id, folderName: `${agent.provider.toUpperCase()} · ${agent.title}`, isExternal: true, palette: (id - 1) % 6 }] : []), ...messagesFor(agent)];
          for (const client of ws.clients) send(client, update);
        }
        agents = nextAgents;
      }
      // Pixel Agents' native idle check bubble fades after two seconds. Refresh
      // only waiting characters so their compact icon persists while active
      // characters keep their full working/tool overlay.
      if (Date.now() - lastIdlePulse >= 1_500) {
        const idle = agents.filter(agent => agent.status === 'waiting' || agent.status === 'completed');
        for (const client of ws.clients) send(client, idle.map(agent => ({ type: 'agentStatus', id: idFor(agent.key), status: 'waiting', awaitingInput: false })));
        lastIdlePulse = Date.now();
      }
      lastObserved = current;
    } catch { feedError = true; }
  }, 750);
  return { url: origin, close: async () => {
    clearInterval(timer);
    clearInterval(boardTimer);
    for (const client of ws.clients) client.terminate();
    ws.close();
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
  } };
}
