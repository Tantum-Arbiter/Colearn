const names = { 'claude-pro': 'Claude Pro · QA review', 'codex-1': 'Codex 1 · Tests / security', 'codex-2': 'Codex 2 · Final review' };
const states = { started: 'Reviewing', resumed: 'Reviewing · resumed', progress: 'Reviewing', completed: 'Completed', failed: 'Failed', authentication_required: 'Sign-in needs attention', timed_out: 'Timed out', skipped_usage_limit: 'Waiting for quota', deferred: 'Waiting for quota', interrupted: 'Interrupted' };
const element = (tag, text, cls) => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el; };
async function refresh() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    document.querySelector('#connection').textContent = data.connected ? '● Live · local only' : 'Feed error · showing last known state';
    const cards = data.workers.map(worker => {
      const event = data.latest.find(e => e.worker === worker);
      const card = element('article', ''); card.dataset.active = String(!!event && ['started', 'resumed', 'progress'].includes(event.event));
      card.append(element('h2', names[worker]), element('div', event ? states[event.event] : 'Not started', 'status'));
      card.append(element('div', event ? `${event.phase.replaceAll('_', ' ')} · ${event.run_id}` : 'Ready for an orchestrated review', 'meta'));
      if (event) card.append(element('div', `Updated ${new Date(event.timestamp).toLocaleTimeString()}${event.available_at ? ` · retry after ${new Date(event.available_at).toLocaleString()}` : ''}`, 'meta'));
      return card;
    });
    document.querySelector('#workers').replaceChildren(...cards);
    document.querySelector('#history').replaceChildren(...data.recent.slice().reverse().map(e => element('div', `${new Date(e.timestamp).toLocaleTimeString()}  ${e.worker} / ${e.phase} — ${states[e.event]}`)));
  } catch { document.querySelector('#connection').textContent = 'Disconnected · reconnecting…'; }
  setTimeout(refresh, 1500);
}
refresh();
