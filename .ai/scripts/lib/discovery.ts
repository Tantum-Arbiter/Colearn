import { execFileSync } from 'node:child_process';
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { safeDisplay } from './text.ts';

export type AgentProvider = 'codex' | 'claude' | 'review';
export type AgentStatus = 'active' | 'waiting' | 'completed' | 'failed';
export interface ObservedAgent {
  key: string;
  provider: AgentProvider;
  title: string;
  project: string;
  status: AgentStatus;
  detail: string;
  updated_at: string;
}

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
const clip = (value: unknown, limit: number): string => safeDisplay(String(value ?? '').replace(/\s+/g, ' ').trim(), limit);

export function claudeSessionIds(processList: string): Set<string> {
  const ids = new Set<string>();
  for (const line of processList.split('\n')) {
    if (!/(?:^|\/)claude(?:\s|$)/.test(line)) continue;
    const match = line.match(/--resume[=\s]([0-9a-f-]{36})/i);
    if (match && UUID.test(match[1]!)) ids.add(match[1]!);
  }
  return ids;
}

function findSessions(root: string, wanted: Set<string>, found = new Map<string, string>()): Map<string, string> {
  if (!wanted.size) return found;
  let entries;
  try { entries = readdirSync(root, { withFileTypes: true }); } catch { return found; }
  for (const entry of entries) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) findSessions(path, wanted, found);
    else if (entry.isFile() && entry.name.endsWith('.jsonl')) {
      const id = entry.name.slice(0, -6);
      if (wanted.has(id)) { found.set(id, path); wanted.delete(id); }
    }
  }
  return found;
}

function readTail(path: string, bytes = 256 * 1024): string {
  const size = statSync(path).size;
  const length = Math.min(size, bytes);
  const buffer = Buffer.alloc(length);
  const fd = openSync(path, 'r');
  try { readSync(fd, buffer, 0, length, size - length); } finally { closeSync(fd); }
  const text = buffer.toString('utf8');
  return size > length ? text.slice(text.indexOf('\n') + 1) : text;
}

export function parseClaudeTranscript(text: string, path: string, now = new Date()): ObservedAgent {
  const records: Record<string, unknown>[] = [];
  for (const line of text.split('\n')) {
    try { const value = JSON.parse(line); if (value && typeof value === 'object') records.push(value as Record<string, unknown>); } catch { /* ignore incomplete tail line */ }
  }
  const last = records.at(-1) ?? {};
  const session = [...records].reverse().find(r => typeof r.sessionId === 'string')?.sessionId as string | undefined ?? basename(path, '.jsonl');
  const title = [...records].reverse().find(r => r.type === 'custom-title' && typeof r.customTitle === 'string')?.customTitle;
  const prompt = [...records].reverse().find(r => r.type === 'last-prompt' && typeof r.lastPrompt === 'string')?.lastPrompt;
  const cwd = [...records].reverse().find(r => typeof r.cwd === 'string')?.cwd as string | undefined;
  let tool = '';
  for (const record of [...records].reverse()) {
    const message = record.message as Record<string, unknown> | undefined;
    const content = Array.isArray(message?.content) ? message.content as Record<string, unknown>[] : [];
    const use = content.find(item => item?.type === 'tool_use' && typeof item.name === 'string');
    if (use) { tool = clip(use.name, 50); break; }
  }
  const timestamp = typeof last.timestamp === 'string' && Number.isFinite(Date.parse(last.timestamp)) ? String(last.timestamp) : now.toISOString();
  const stopped = last.type === 'system' && last.subtype === 'stop_hook_summary';
  return {
    key: `claude:${session}`,
    provider: 'claude',
    title: clip(title || prompt || `Claude ${session.slice(0, 8)}`, 120),
    project: clip(cwd ? basename(cwd) : 'Claude', 80),
    status: stopped ? 'waiting' : 'active',
    detail: stopped ? 'Open · waiting' : tool ? `Using ${tool}` : 'Working',
    updated_at: timestamp,
  };
}

interface CodexRow { id: string; title: string; cwd: string; updated_at_ms: number; status: string | null }
export function mapCodexRows(rows: readonly CodexRow[]): ObservedAgent[] {
  return rows.map(row => ({
    key: `codex:${row.id}`,
    provider: 'codex' as const,
    title: clip(row.title || `Codex ${row.id.slice(0, 8)}`, 120),
    project: clip(basename(row.cwd || 'Codex'), 80),
    status: row.status === 'inProgress' ? 'active' as const : row.status === 'failed' ? 'failed' as const : 'completed' as const,
    detail: row.status === 'inProgress' ? 'Working' : row.status === 'failed' ? 'Failed' : 'Completed',
    updated_at: new Date(row.updated_at_ms).toISOString(),
  }));
}

function discoverCodex(home: string, now: Date): ObservedAgent[] {
  const state = join(home, '.codex/state_5.sqlite');
  const history = join(home, '.codex/thread_history_1.sqlite');
  const db = new DatabaseSync(state, { readOnly: true });
  try {
    db.exec(`ATTACH DATABASE '${history.replaceAll("'", "''")}' AS history`);
    const recent = now.getTime() - 6 * 60 * 60 * 1000;
    const rows = db.prepare(`SELECT t.id,t.title,t.cwd,t.updated_at_ms,
      (SELECT h.status FROM history.thread_turns h WHERE h.thread_id=t.id ORDER BY COALESCE(h.started_at,0) DESC LIMIT 1) status
      FROM threads t WHERE t.archived=0 AND (t.updated_at_ms >= ? OR EXISTS
      (SELECT 1 FROM history.thread_turns h WHERE h.thread_id=t.id AND h.status='inProgress'))
      ORDER BY CASE WHEN status='inProgress' THEN 0 ELSE 1 END, t.updated_at_ms DESC LIMIT 12`).all(recent) as unknown as CodexRow[];
    return mapCodexRows(rows);
  } finally { db.close(); }
}

function discoverClaude(home: string, now: Date): ObservedAgent[] {
  const processList = execFileSync('/bin/ps', ['ax', '-o', 'command='], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  const ids = claudeSessionIds(processList);
  const paths = new Map<string, string>();
  for (const root of [join(home, '.claude/projects'), join(home, '.claude-pro/projects')]) {
    if (!existsSync(root)) continue;
    findSessions(root, new Set(ids), paths);
    try {
      const recent = execFileSync('/usr/bin/find', [root, '-type', 'f', '-name', '*.jsonl', '-mmin', '-5', '-print'], { encoding: 'utf8', maxBuffer: 1024 * 1024 });
      for (const path of recent.split('\n').filter(Boolean)) paths.set(basename(path, '.jsonl'), path);
    } catch { /* a profile may have no projects directory */ }
  }
  return [...paths.entries()].map(([, path]) => parseClaudeTranscript(readTail(path), path, now));
}

export function discoverLocalAgents(home = homedir(), now = new Date()): ObservedAgent[] {
  const agents: ObservedAgent[] = [];
  try { agents.push(...discoverCodex(home, now)); } catch { /* unsupported/missing internal store: fail closed */ }
  try { agents.push(...discoverClaude(home, now)); } catch { /* process/session discovery is best-effort */ }
  return agents.sort((a, b) => Number(b.status === 'active') - Number(a.status === 'active') || b.updated_at.localeCompare(a.updated_at));
}
