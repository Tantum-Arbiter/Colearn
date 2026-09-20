import { createHash } from 'node:crypto';
import { closeSync, existsSync, openSync, readSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { safeDisplay } from './text.ts';
import type { ObservedAgent } from './discovery.ts';

export type WorkStatus = 'backlog' | 'in_progress' | 'blocked' | 'review' | 'done' | 'unconfirmed';
export interface WorkItem {
  id: string; type: 'epic' | 'story' | 'task'; title: string; project: string; projectId: string;
  parentId: string | null; agentKey: string; agentName: string; provider: string;
  status: WorkStatus; updatedAt: string; source: string; inferred: boolean; detail: string; blockedBy: string[];
}
interface Session { key: string; title: string; project: string; projectId: string; provider: string; path: string }
interface PlannedTask { id: string; title: string; status: WorkStatus; updatedAt: string; source: string; detail: string; blockedBy: string[] }
type RecordData = Record<string, any>;
const hash = (value: string): string => createHash('sha256').update(value).digest('hex').slice(0, 16);
const clean = (value: unknown, max = 240): string => safeDisplay(typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '', max);
const taskStatus = (value: unknown): WorkStatus => ({ pending: 'backlog', in_progress: 'in_progress', inProgress: 'in_progress', completed: 'done', blocked: 'blocked', review: 'review' }[String(value)] as WorkStatus | undefined) ?? 'backlog';
function project(cwd: string): { project: string; projectId: string } {
  const root = cwd.split('/.claude/worktrees/')[0]!;
  return { project: basename(root) || 'Unknown project', projectId: `project:${hash(root)}` };
}

// Only explicit planning fields are projected. Tool output, general prompts,
// reasoning and other transcript content are never included in the board.
export class PlanReader {
  tasks = new Map<string, PlannedTask>();
  pending = new Map<string, { name: string; input: RecordData; time: string }>();
  session: Session;
  constructor(session: Session) { this.session = session; }
  consume(record: RecordData): void {
    const time = typeof record.timestamp === 'string' && Number.isFinite(Date.parse(record.timestamp)) ? record.timestamp : new Date(0).toISOString();
    if (record.cwd && typeof record.cwd === 'string') Object.assign(this.session, project(record.cwd));
    if (record.type === 'custom-title') this.session.title = clean(record.customTitle) || this.session.title;
    const payload = record.payload ?? record;
    if (payload.type === 'function_call' && /(?:^|\.)update_plan$/.test(payload.name ?? '')) {
      try { this.pending.set(payload.call_id, { name: 'update_plan', input: JSON.parse(payload.arguments), time }); } catch { /* partial/invalid call */ }
    } else if (payload.type === 'function_call_output') {
      const call = this.pending.get(payload.call_id);
      if (call && /plan updated/i.test(String(payload.output))) this.apply(call.name, call.input, call.time);
      this.pending.delete(payload.call_id);
    }
    if (record.type === 'plan' && typeof record.text === 'string') this.markdown(record.text, time, 'Codex plan');
    if (payload.type === 'message' && payload.role === 'assistant' && Array.isArray(payload.content)) {
      for (const content of payload.content) if (typeof content.text === 'string') {
        const plan = content.text.match(/<proposed_plan>([\s\S]*?)<\/proposed_plan>/);
        if (plan) this.markdown(plan[1]!, time, 'Codex proposed plan');
      }
    }
    const content = record.message?.content;
    if (!Array.isArray(content)) return;
    for (const item of content) {
      if (item.type === 'tool_use' && ['TodoWrite', 'TaskCreate', 'TaskUpdate'].includes(item.name) && item.input && typeof item.input === 'object') {
        this.pending.set(item.id, { name: item.name, input: item.input, time });
      } else if (item.type === 'tool_result') {
        const call = this.pending.get(item.tool_use_id);
        if (call && !item.is_error) {
          const result = typeof item.content === 'string' ? item.content : JSON.stringify(item.content);
          const id = result?.match(/Task #([^\s]+) created successfully/)?.[1];
          if (call.name !== 'TaskCreate' || id) this.apply(call.name, { ...call.input, createdId: id }, call.time);
        }
        this.pending.delete(item.tool_use_id);
      } else if (item.type === 'text' && record.type === 'assistant' && typeof item.text === 'string' && /(?:^|\n)\s*[-*] \[[ xX]\]/.test(item.text)) {
        this.markdown(item.text, time, 'Claude checklist');
      }
    }
  }
  apply(name: string, input: RecordData, time: string): void {
    if (name === 'update_plan' || name === 'TodoWrite') {
      const steps = name === 'update_plan' ? input.plan : input.todos;
      if (!Array.isArray(steps)) return;
      for (const step of steps) {
        const title = clean(step?.step ?? step?.content); if (!title) continue;
        const id = `step:${hash(title.toLowerCase())}`;
        this.tasks.set(id, { id, title, status: taskStatus(step.status), updatedAt: time, source: name === 'update_plan' ? 'Codex plan step' : 'Claude todo', detail: '', blockedBy: [] });
      }
    } else if (name === 'TaskCreate') {
      const title = clean(input.subject); if (!title || !input.createdId) return;
      const id = `task:${input.createdId}`;
      this.tasks.set(id, { id, title, status: 'backlog', updatedAt: time, source: 'Claude task', detail: clean(input.description, 600), blockedBy: [] });
    } else if (name === 'TaskUpdate') {
      const id = `task:${input.taskId}`; const task = this.tasks.get(id); if (!task) return;
      if (input.status === 'deleted') { this.tasks.delete(id); return; }
      if (input.subject) task.title = clean(input.subject);
      if (input.description) task.detail = clean(input.description, 600);
      if (input.status) task.status = taskStatus(input.status);
      if (Array.isArray(input.addBlockedBy)) task.blockedBy = [...new Set([...task.blockedBy, ...input.addBlockedBy.map((id: unknown) => clean(String(id), 80))])];
      task.updatedAt = time;
    }
  }
  markdown(text: string, time: string, source: string): void {
    for (const line of text.split('\n')) {
      const match = line.match(/^\s*(?:[-*] \[([ xX])\]\s+|\d+[.)]\s+|[-*]\s+)((?:`?[A-Z]+-\d+[^\n]*)|(?:[^\n]+))$/);
      if (!match) continue;
      // Prose plans are candidates in Backlog. Checkmarks alone mean done.
      const title = clean(match[2]); if (!title || title.length < 8) continue;
      const id = `step:${hash(title.toLowerCase())}`;
      if (this.tasks.has(id) && match[1] === undefined) continue;
      this.tasks.set(id, { id, title, status: /x/i.test(match[1] ?? '') ? 'done' : 'backlog', updatedAt: time, source, detail: '', blockedBy: [] });
    }
  }
}

interface Cursor { reader: PlanReader; offset: number; remainder: string; skipping: boolean }
export interface BoardSnapshot { items: WorkItem[]; indexing: boolean; scanned: number; issues: string[]; updatedAt: string | null }
export class WorkBoard {
  private files = new Map<string, Cursor>();
  private running = false;
  private indexed = false;
  private issues: string[] = [];
  private updatedAt: string | null = null;
  private home: string;
  constructor(home = homedir()) { this.home = home; }
  private sessions(): Session[] {
    const sessions: Session[] = [];
    for (const profile of ['.codex', '.codex-1', '.codex-2']) {
      const path = join(this.home, profile, 'state_5.sqlite'); if (!existsSync(path)) continue;
      let db: DatabaseSync | undefined;
      try {
        db = new DatabaseSync(path, { readOnly: true });
        for (const row of db.prepare('SELECT id,title,cwd,rollout_path FROM threads').all() as RecordData[]) {
          if (typeof row.rollout_path !== 'string') continue;
          sessions.push({ key: `codex:${row.id}`, title: clean(row.title), provider: 'codex', path: row.rollout_path, ...project(String(row.cwd)) });
        }
      } catch { this.issues.push(`${profile}: plan index unavailable`); } finally { db?.close(); }
    }
    for (const profile of ['.claude', '.claude-pro']) {
      const root = join(this.home, profile, 'projects'); if (!existsSync(root)) continue;
      try {
        for (const file of readdirSync(root, { recursive: true, withFileTypes: true })) {
          if (!file.isFile() || !file.name.endsWith('.jsonl')) continue;
          const path = join(file.parentPath, file.name); const id = basename(path, '.jsonl');
          sessions.push({ key: `claude:${id}`, title: `Claude session ${id.slice(0, 8)}`, provider: 'claude', path, project: 'Unknown project', projectId: `unknown:${id}` });
        }
      } catch { this.issues.push(`${profile}: sessions unavailable`); }
    }
    return sessions;
  }
  async refresh(): Promise<void> {
    if (this.running) return;
    this.running = true; this.issues = [];
    try {
      for (const session of this.sessions()) {
        try {
          const size = statSync(session.path).size;
          let cursor = this.files.get(session.path);
          if (!cursor || size < cursor.offset) {
            cursor = { reader: new PlanReader(session), offset: 0, remainder: '', skipping: false }; this.files.set(session.path, cursor);
          }
          const fd = openSync(session.path, 'r');
          try {
            const buffer = Buffer.alloc(512 * 1024);
            while (cursor.offset < size) {
              const bytes = readSync(fd, buffer, 0, Math.min(buffer.length, size - cursor.offset), cursor.offset); if (!bytes) break;
              cursor.offset += bytes;
              // Buffer UTF-8 bytes as latin1 until a whole JSON line is available.
              const lines: string[] = (cursor.remainder + buffer.subarray(0, bytes).toString('latin1')).split('\n');
              cursor.remainder = lines.pop() ?? '';
              for (const line of lines) {
                if (cursor.skipping) { cursor.skipping = false; continue; }
                if (!/update_plan|function_call_output|tool_use|tool_result|custom-title|"cwd"|proposed_plan|"type"\s*:\s*"plan"|\[[ xX]\]/.test(line)) continue;
                try { cursor.reader.consume(JSON.parse(Buffer.from(line, 'latin1').toString('utf8'))); } catch { /* tolerate partial or malformed source records */ }
              }
              if (cursor.remainder.length > 4 * 1024 * 1024) { cursor.remainder = ''; cursor.skipping = true; }
              await new Promise<void>(resolve => setImmediate(resolve));
            }
          } finally { closeSync(fd); }
        } catch { this.issues.push(`${session.provider}: one session could not be indexed`); }
      }
      this.updatedAt = new Date().toISOString(); this.indexed = true;
    } finally { this.running = false; }
  }
  snapshot(agents: ObservedAgent[], now = Date.now()): BoardSnapshot {
    const items: WorkItem[] = []; const used = new Set<string>(); const epics = new Map<string, WorkItem>();
    const add = (session: Session, tasks: PlannedTask[], fallback?: ObservedAgent): void => {
      if (!tasks.length && !fallback) return;
      const live = agents.find(agent => agent.key === session.key); used.add(session.key);
      const epicId = `epic:${session.projectId}`; const storyId = `story:${hash(session.key)}`;
      const base = { project: session.project, projectId: session.projectId, agentKey: session.key, agentName: live?.title ?? session.title, provider: session.provider, updatedAt: live?.updated_at ?? tasks.at(-1)?.updatedAt ?? '', blockedBy: [] };
      if (!epics.has(epicId)) epics.set(epicId, { ...base, id: epicId, type: 'epic', parentId: null, title: `${session.project} delivery`, status: 'backlog', source: 'Project grouping', inferred: true, detail: 'Automatically grouped by project; not an agent-authored epic.' });
      items.push({ ...base, id: storyId, type: 'story', parentId: epicId, title: live?.title ?? session.title, status: 'backlog', source: 'Session outcome', inferred: true, detail: 'Inferred user-story grouping from the session title. User persona and acceptance criteria have not been specified.' });
      const rows = tasks.length ? tasks : [{ id: 'session', title: fallback!.title, status: fallback!.status === 'active' ? 'in_progress' : fallback!.status === 'failed' ? 'blocked' : fallback!.status === 'completed' ? 'review' : 'backlog', updatedAt: fallback!.updated_at, source: 'Session activity only', detail: fallback!.detail, blockedBy: [] } satisfies PlannedTask];
      for (const task of rows) {
        let status = task.status;
        const blockedBy = task.blockedBy.filter(id => tasks.some(other => other.id === `task:${id}` && other.status !== 'done'));
        if (status !== 'done' && blockedBy.length) status = 'blocked';
        if (status === 'in_progress' && live?.status === 'failed') status = 'blocked';
        else if (status === 'in_progress' && (!live || live.status !== 'active' || now - Date.parse(live.updated_at) > 30 * 60 * 1000)) status = 'unconfirmed';
        items.push({ ...base, ...task, blockedBy, id: `${storyId}:${task.id}`, type: 'task', parentId: storyId, status, inferred: !tasks.length });
      }
    };
    for (const cursor of this.files.values()) add(cursor.reader.session, [...cursor.reader.tasks.values()]);
    for (const agent of agents) if (!used.has(agent.key)) add({ key: agent.key, title: agent.title, provider: agent.provider, project: agent.project, projectId: `observed:${hash(agent.project)}`, path: '' }, [], agent);
    items.unshift(...epics.values());
    for (const type of ['story', 'epic']) for (const item of items.filter(item => item.type === type)) {
      const children = items.filter(child => child.parentId === item.id);
      item.status = children.every(child => child.status === 'done') ? 'done' : children.some(child => child.status === 'blocked') ? 'blocked' : children.some(child => child.status === 'in_progress') ? 'in_progress' : children.some(child => child.status === 'unconfirmed') ? 'unconfirmed' : children.some(child => child.status === 'review') ? 'review' : 'backlog';
    }
    return { items, indexing: this.running || !this.indexed, scanned: this.files.size, issues: [...new Set(this.issues)], updatedAt: this.updatedAt };
  }
}
