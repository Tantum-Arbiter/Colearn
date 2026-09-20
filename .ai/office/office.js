const states = { started: 'Reviewing', resumed: 'Reviewing · resumed', progress: 'Reviewing', completed: 'Completed', failed: 'Failed', authentication_required: 'Sign-in needs attention', timed_out: 'Timed out', skipped_usage_limit: 'Waiting for quota', deferred: 'Waiting for quota', interrupted: 'Interrupted' };
import { renderBoard } from './kanban.js';
const labels = { active: 'Working', waiting: 'Waiting', failed: 'Needs attention', stale: 'Status unconfirmed', completed: 'Finished' };
const rank = { failed: 0, stale: 1, active: 2, waiting: 3, completed: 4 };
const $ = selector => document.querySelector(selector);
const element = (tag, text = '', cls) => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el; };
let snapshot = { agents: [], recent: [] };
let lastGoodSync = null;
const openTasks = new Set();
const expand = $('#expand');
const office = $('#pixel-office');
const dashboard = $('#dashboard');

function setExpanded(focused) {
  document.body.classList.toggle('office-focus', focused);
  dashboard.hidden = !focused;
  expand.textContent = focused ? 'Exit expanded view' : 'Expand office';
  expand.setAttribute('aria-pressed', String(focused));
  // Keep keyboard navigation within the expanded workspace.
  for (const child of document.body.children) if (child !== $('.office-wrap')) child.inert = focused;
  if (!focused) expand.focus({ preventScroll: true });
}
expand.addEventListener('click', () => setExpanded(!document.body.classList.contains('office-focus')));
const escape = event => { if (event.key === 'Escape' && document.body.classList.contains('office-focus')) setExpanded(false); };
document.addEventListener('keydown', escape);
office.addEventListener('load', () => office.contentDocument?.addEventListener('keydown', escape));
// Fit the entire room into a narrow office pane. Resize the iframe's viewport
// before scaling so canvas and character overlays use the same coordinates.
new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  if (!width || !height) return;
  const scale = Math.min(1, width / 760, height / 450);
  office.style.width = `${width / scale}px`;
  office.style.height = `${height / scale}px`;
  office.style.transform = `scale(${scale})`;
}).observe($('.scene'));

function relative(timestamp) {
  const seconds = (Date.now() - Date.parse(timestamp)) / 1000;
  if (!Number.isFinite(seconds)) return 'Time unknown';
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}
function kind(agent) {
  const age = Date.now() - Date.parse(agent.updated_at);
  return agent.status === 'active' && (!Number.isFinite(age) || age > 30 * 60 * 1000) ? 'stale' : agent.status;
}
function counts(agents) {
  const result = { active: 0, waiting: 0, failed: 0, stale: 0, completed: 0 };
  for (const agent of agents) result[kind(agent)]++;
  return result;
}
function advice(agent) {
  const status = kind(agent);
  if (status === 'stale') return 'Confirm this agent is still running. Its source reports activity, but there has been no recorded update for over 30 minutes; it is excluded from Working.';
  if (status === 'failed' && /sign-in|auth/i.test(agent.detail)) return 'Restore this account’s sign-in, then retry the blocked review.';
  if (status === 'failed') return 'Inspect the failed task in its agent app, resolve the issue, then retry.';
  if (status === 'waiting' && /quota/i.test(agent.detail)) return 'Check when the account’s quota resets, then resume the queued review.';
  if (status === 'waiting') return 'Check whether the agent needs input or is ready for its next task.';
  if (status === 'completed') return 'Review the output and acceptance checks before treating this work as delivered.';
  return 'Let the current task run; review its output when the agent finishes.';
}
function replace(selector, nodes) {
  const target = $(selector);
  const focusKey = target.contains(document.activeElement) ? document.activeElement.dataset.focusKey : null;
  target.replaceChildren(...nodes);
  if (focusKey) [...target.querySelectorAll('[data-focus-key]')].find(node => node.dataset.focusKey === focusKey)?.focus({ preventScroll: true });
}
function selectWork(project, status = '') {
  $('#project-filter').value = project;
  $('#status-filter').value = status;
  $('#task-search').value = '';
  renderDashboard();
  $('.work-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
for (const selector of ['#project-filter', '#status-filter', '#task-search']) $(selector).addEventListener('input', renderDashboard);
$('#task-list').addEventListener('toggle', event => {
  if (!event.target.matches('details')) return;
  if (event.target.open) openTasks.add(event.target.dataset.key); else openTasks.delete(event.target.dataset.key);
}, true);

function renderDashboard() {
  const agents = snapshot.agents;
  const totals = counts(agents);
  const projects = [...new Set(agents.map(agent => agent.project))].sort();
  const attention = agents.filter(agent => ['failed', 'stale', 'waiting'].includes(kind(agent)))
    .sort((a, b) => rank[kind(a)] - rank[kind(b)]);
  $('#dashboard-summary').textContent = `${projects.length} projects · ${agents.length} observed tasks${totals.stale ? ` · ${totals.stale} ${totals.stale === 1 ? 'status' : 'statuses'} to confirm` : ''}`;
  $('#office-count').textContent = `${agents.length} agents`;
  replace('#metrics', [['active', totals.active, 'Working'], ['failed', totals.failed + totals.stale, 'Attention'], ['waiting', totals.waiting, 'Waiting'], ['completed', totals.completed, 'Finished']].map(([status, count, label]) => {
    const metric = element('button', '', 'metric'); metric.type = 'button'; metric.dataset.kind = status; metric.dataset.focusKey = status;
    metric.append(element('strong', String(count)), element('span', label));
    metric.title = status === 'failed' ? 'Failures and unconfirmed activity' : `${label} observed tasks`;
    metric.addEventListener('click', () => selectWork('', status === 'failed' ? 'attention' : status));
    return metric;
  }));
  const filter = $('#project-filter');
  const options = ['', ...projects];
  if (JSON.stringify([...filter.options].map(option => option.value)) !== JSON.stringify(options)) {
    const selected = filter.value;
    filter.replaceChildren(...options.map(project => new Option(project || 'All projects', project)));
    filter.value = options.includes(selected) ? selected : '';
  }
  $('#project-count').textContent = `${projects.length} observed`;
  replace('#projects', projects.length ? projects.map(project => {
    const items = agents.filter(agent => agent.project === project); const c = counts(items);
    const state = ['failed', 'stale', 'active', 'waiting', 'completed'].find(status => c[status]);
    const row = element('button', '', 'project-row'); row.type = 'button'; row.dataset.focusKey = project;
    row.setAttribute('aria-pressed', String(filter.value === project));
    row.title = `Filter task monitor to ${project}`;
    const top = element('div', '', 'project-top');
    const status = element('span', labels[state], 'project-state'); status.dataset.kind = state;
    top.append(element('span', project, 'project-name'), status);
    const bar = element('div', '', 'project-bar'); bar.setAttribute('aria-hidden', 'true');
    for (const [status, count] of Object.entries(c)) if (count) { const segment = element('span'); segment.dataset.kind = status; segment.style.flex = String(count); bar.append(segment); }
    const breakdown = Object.entries(c).filter(([, count]) => count).map(([status, count]) => `${count} ${labels[status].toLowerCase()}`).join(' · ');
    row.append(top, bar, element('div', breakdown, 'project-counts'));
    row.addEventListener('click', () => selectWork(filter.value === project ? '' : project));
    return row;
  }) : [element('div', 'No projects detected yet.', 'empty-state')]);
  $('#attention-count').textContent = `${attention.length} follow-ups`;
  replace('#attention', attention.length ? attention.map(agent => {
    const card = element('div', '', 'attention-card');
    card.append(element('div', `${agent.project} · ${labels[kind(agent)]}`, 'attention-project'), element('div', agent.title, 'attention-title'), element('p', advice(agent)));
    return card;
  }) : [element('div', 'No failures, waiting tasks or stale activity in the current feed.', 'empty-state')]);

  const status = $('#status-filter').value;
  const search = $('#task-search').value.trim().toLowerCase();
  const visible = agents.filter(agent => (!filter.value || agent.project === filter.value)
    && (!status || (status === 'attention' ? ['failed', 'stale'].includes(kind(agent)) : kind(agent) === status))
    && `${agent.title} ${agent.project} ${agent.provider} ${agent.detail}`.toLowerCase().includes(search))
    .sort((a, b) => rank[kind(a)] - rank[kind(b)] || Date.parse(b.updated_at) - Date.parse(a.updated_at));
  $('#task-count').textContent = `${visible.length} of ${agents.length}`;
  replace('#task-list', visible.length ? visible.map(agent => {
    const state = kind(agent); const card = element('details', '', 'task-card'); card.dataset.key = agent.key; card.open = openTasks.has(agent.key);
    const summary = element('summary'); summary.dataset.focusKey = agent.key;
    const top = element('div', '', 'task-top'); const badge = element('span', labels[state], 'status-badge'); badge.dataset.kind = state;
    top.append(element('span', `${agent.provider.toUpperCase()} · ${agent.project}`, 'task-owner'), badge);
    const bottom = element('div', '', 'task-bottom'); const time = element('time', relative(agent.updated_at)); time.dateTime = agent.updated_at; time.title = new Date(agent.updated_at).toLocaleString();
    bottom.append(element('span', state === 'stale' ? 'Last recorded update' : agent.detail), time);
    summary.append(top, element('div', agent.title, 'task-title'), bottom);
    const detail = element('div', '', 'task-detail');
    for (const [label, value] of [['Reported activity', agent.detail], ['Updated', new Date(agent.updated_at).toLocaleString()], ['Suggested next step', advice(agent)]]) {
      const line = element('p'); line.append(element('strong', `${label}: `), document.createTextNode(value)); detail.append(line);
    }
    card.append(summary, detail); return card;
  }) : [element('div', 'No tasks match these filters. Try another project or status.', 'empty-state')]);

  // These are timestamped source updates, not inferred milestones or a history
  // reconstructed from polling. Review events carry their own timestamps.
  const updates = [
    ...agents.filter(agent => agent.provider !== 'review' && (!filter.value || agent.project === filter.value)).map(agent => ({ time: agent.updated_at, title: `${labels[kind(agent)]} · ${agent.title}`, context: `${agent.provider.toUpperCase()} · ${agent.project}` })),
    ...snapshot.recent.filter(() => !filter.value || filter.value === 'Review orchestrator').map(event => ({ time: event.timestamp, title: `${states[event.event] ?? event.event} · ${event.phase.replaceAll('_', ' ')}`, context: event.worker })),
  ].sort((a, b) => Date.parse(b.time) - Date.parse(a.time)).slice(0, 8);
  replace('#activity-list', updates.length ? updates.map(update => {
    const row = element('div', '', 'update-row'); row.append(element('p', update.title), element('span', `${update.context} · ${relative(update.time)}`)); row.title = new Date(update.time).toLocaleString(); return row;
  }) : [element('div', 'No updates available for this project.', 'empty-state')]);
}

function connection(online) {
  $('#connection').textContent = online ? '● Live · local only' : 'Disconnected · showing last known state';
  $('#dashboard-live').textContent = online ? '● Live' : '● Feed unavailable';
  $('#dashboard-live').dataset.offline = String(!online);
  $('#last-sync').textContent = lastGoodSync ? `Last sync ${lastGoodSync.toLocaleTimeString()}` : 'Awaiting first update';
}
async function refresh() {
  try {
    const response = await fetch('/api/status', { signal: AbortSignal.timeout(8000) });
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    if (!Array.isArray(data.agents) || !Array.isArray(data.recent)) throw new Error('Invalid feed');
    snapshot = data;
    if (data.connected) lastGoodSync = new Date();
    connection(data.connected);
    replace('#workers', data.agents.map(agent => {
      const card = element('article'); card.dataset.active = String(kind(agent) === 'active');
      card.append(element('h2', `${agent.provider.toUpperCase()} · ${agent.project}`), element('div', agent.title, 'status'), element('div', kind(agent) === 'stale' ? 'Status unconfirmed · no recent update' : agent.detail, 'meta'), element('div', `Updated ${relative(agent.updated_at)}`, 'meta'));
      return card;
    }));
    replace('#history', data.recent.slice().reverse().map(event => element('div', `${new Date(event.timestamp).toLocaleString()}  ${event.worker} / ${event.phase} — ${states[event.event]}`)));
  } catch { connection(false); }
  renderDashboard();
  setTimeout(refresh, 1500);
  renderBoard(snapshot.board, snapshot.agents);
}
refresh();
