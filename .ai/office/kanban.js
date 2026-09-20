const statuses = [
  ['backlog', 'Backlog'],
  ['in_progress', 'In progress'],
  ['blocked', 'Blocked'],
  ['review', 'Review'],
  ['done', 'Done'],
  ['unconfirmed', 'Confirm status'],
];
const levels = { epic: 'Epic', story: 'User story', task: 'Task' };
const statusLabels = Object.fromEntries(statuses);
const boardState = { project: '', agent: '', level: 'task', search: '' };
let listenersReady = false;
let lastBoard = { items: [], indexing: true, scanned: 0, issues: [], updatedAt: null };
let lastAgents = [];

const $ = selector => document.querySelector(selector);
const text = value => String(value ?? '').trim();
const matches = (item, search) => !search || [item.title, item.project, item.agentName, item.provider, item.detail, item.source]
  .join(' ').toLowerCase().includes(search);

function optionValues(select) { return [...select.options].map(option => option.value); }
function updateOptions(selector, values, emptyLabel) {
  const select = $(selector);
  const next = ['', ...values];
  if (JSON.stringify(optionValues(select)) !== JSON.stringify(next)) {
    const selected = select.value;
    select.replaceChildren(...next.map(value => new Option(value || emptyLabel, value)));
    select.value = next.includes(selected) ? selected : '';
  }
}

function setListeners() {
  if (listenersReady) return;
  listenersReady = true;
  for (const [id, key] of [['board-project', 'project'], ['board-agent', 'agent'], ['board-level', 'level']]) {
    $(`#${id}`).addEventListener('change', event => { boardState[key] = event.target.value; draw(); });
  }
  $('#board-search').addEventListener('input', event => { boardState.search = event.target.value.trim().toLowerCase(); draw(); });
  $('#board-size').addEventListener('click', () => {
    $('#kanban').classList.toggle('board-expanded');
    const expanded = $('#kanban').classList.contains('board-expanded');
    $('#board-size').textContent = expanded ? 'Use compact board' : 'More board space';
    $('#board-size').setAttribute('aria-pressed', String(expanded));
  });
}

function card(item) {
  const article = document.createElement('article');
  article.className = `board-card board-card-${item.type}`;
  article.dataset.status = item.status;
  const badge = document.createElement('span'); badge.className = 'board-level'; badge.textContent = levels[item.type] || 'Task';
  const title = document.createElement('h4'); title.textContent = item.title || 'Untitled work item';
  const owner = document.createElement('div'); owner.className = 'board-owner'; owner.textContent = `${item.agentName || 'Unknown agent'} · ${item.project || 'Unknown project'}`;
  const source = document.createElement('div'); source.className = 'board-source'; source.textContent = `${item.source || 'Observed'}${item.inferred ? ' · grouped automatically' : ''}`;
  article.append(badge, title, owner, source);
  if (item.detail) { const detail = document.createElement('p'); detail.className = 'board-detail'; detail.textContent = item.detail; article.append(detail); }
  if (item.blockedBy?.length) { const blocked = document.createElement('div'); blocked.className = 'board-blocked-by'; blocked.textContent = `Blocked by ${item.blockedBy.join(', ')}`; article.append(blocked); }
  return article;
}

function draw() {
  const board = lastBoard || { items: [] };
  const all = Array.isArray(board.items) ? board.items : [];
  const agents = Array.isArray(lastAgents) ? lastAgents : [];
  const projects = [...new Set(all.map(item => text(item.project)).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  const agentNames = [...new Set(all.map(item => text(item.agentKey || item.agentName)).filter(Boolean))]
    .map(key => ({ key, label: all.find(item => (item.agentKey || item.agentName) === key)?.agentName || key }))
    .sort((a, b) => a.label.localeCompare(b.label));
  updateOptions('#board-project', projects, 'All projects');
  updateOptions('#board-agent', agentNames.map(agent => agent.key), 'All agents');
  for (const option of $('#board-agent').options) {
    if (option.value) option.textContent = agentNames.find(agent => agent.key === option.value)?.label || option.value;
  }
  const visible = all.filter(item => (!boardState.project || item.project === boardState.project)
    && (!boardState.agent || (item.agentKey || item.agentName) === boardState.agent)
    && (!boardState.level || item.type === boardState.level)
    && matches(item, boardState.search));
  const columns = $('#board-columns');
  columns.replaceChildren();
  for (const [status, label] of statuses) {
    const column = document.createElement('section'); column.className = 'kanban-column'; column.dataset.status = status;
    const heading = document.createElement('div'); heading.className = 'kanban-column-heading';
    const headingTitle = document.createElement('h3'); headingTitle.textContent = label;
    const count = document.createElement('span'); count.textContent = String(visible.filter(item => item.status === status).length);
    heading.append(headingTitle, count); column.append(heading);
    const rows = visible.filter(item => item.status === status).sort((a, b) => Date.parse(b.updatedAt || '') - Date.parse(a.updatedAt || '') || a.title.localeCompare(b.title));
    if (!rows.length) { const empty = document.createElement('div'); empty.className = 'board-empty'; empty.textContent = 'No matching work'; column.append(empty); }
    else rows.forEach(item => column.append(card(item)));
    columns.append(column);
  }
  const taskCount = visible.filter(item => item.type === 'task').length;
  const projectCount = new Set(visible.map(item => item.project)).size;
  const agentCount = new Set(visible.map(item => item.agentKey || item.agentName)).size;
  const indexState = board.indexing ? ' · indexing agent plans' : '';
  $('#board-summary').textContent = `${visible.length} work items · ${projectCount} projects · ${agentCount} agents${indexState}`;
  const issueText = board.issues?.length ? ` · ${board.issues.length} source${board.issues.length === 1 ? '' : 's'} unavailable` : '';
  const observed = agents.length ? ` · ${agents.length} live observers` : '';
  $('#board-coverage').textContent = `${taskCount} tasks shown${observed} · ${board.scanned || 0} plan sources scanned${issueText}`;
}

export function renderBoard(board, agents = []) {
  setListeners();
  if (board) lastBoard = board;
  lastAgents = agents;
  draw();
}
