const clients = new Map(); // userId -> Set<res>

function addClient(userId, res) {
  const id = userId.toString();
  if (!clients.has(id)) clients.set(id, new Set());
  clients.get(id).add(res);
}

function removeClient(userId, res) {
  const id = userId.toString();
  const set = clients.get(id);
  if (set) {
    set.delete(res);
    if (set.size === 0) clients.delete(id);
  }
}

function sendEvent(userId, event, data) {
  const set = clients.get(userId.toString());
  if (!set) return;
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  set.forEach((res) => res.write(msg));
}

module.exports = { addClient, removeClient, sendEvent };
