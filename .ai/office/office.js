const states = { started: 'Reviewing', resumed: 'Reviewing · resumed', progress: 'Reviewing', completed: 'Completed', failed: 'Failed', authentication_required: 'Sign-in needs attention', timed_out: 'Timed out', skipped_usage_limit: 'Waiting for quota', deferred: 'Waiting for quota', interrupted: 'Interrupted' };
const element = (tag, text, cls) => { const el = document.createElement(tag); el.textContent = text; if (cls) el.className = cls; return el; };
async function refresh() {
  try {
    const response = await fetch('/api/status');
    if (!response.ok) throw new Error('Unavailable');
    const data = await response.json();
    document.querySelector('#connection').textContent = data.connected ? '● Live · local only' : 'Feed error · showing last known state';
    const cards = data.agents.map(agent => {
      const card = element('article', ''); card.dataset.active = String(agent.status === 'active');
      card.append(element('h2', `${agent.provider.toUpperCase()} · ${agent.project}`), element('div', agent.title, 'status'));
      card.append(element('div', agent.detail, 'meta'));
      card.append(element('div', `Updated ${new Date(agent.updated_at).toLocaleTimeString()}`, 'meta'));
      return card;
    });
    document.querySelector('#workers').replaceChildren(...cards);
    document.querySelector('#history').replaceChildren(...data.recent.slice().reverse().map(e => element('div', `${new Date(e.timestamp).toLocaleTimeString()}  ${e.worker} / ${e.phase} — ${states[e.event]}`)));
  } catch { document.querySelector('#connection').textContent = 'Disconnected · reconnecting…'; }
  setTimeout(refresh, 1500);
}
refresh();
