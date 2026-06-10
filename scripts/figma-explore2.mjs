import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const CHANNEL = process.argv[2] || 'xyk932av';
const NODE_ID = process.argv[3] || '49823:12142'; // Color Guidance

class FigmaClient {
  constructor() {
    this.ws = null;
    this.pendingRequests = new Map();
  }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:3055');
      this.ws.on('open', () => resolve());
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'broadcast' && msg.sender === 'User' && msg.message?.id) {
            const { id, result, error } = msg.message;
            if (this.pendingRequests.has(id)) {
              const req = this.pendingRequests.get(id);
              clearTimeout(req.timeout);
              error ? req.reject(new Error(error)) : req.resolve(result);
              this.pendingRequests.delete(id);
            }
          }
          if (msg.type === 'system' && msg.message?.id && this.pendingRequests.has(msg.message.id)) {
            const req = this.pendingRequests.get(msg.message.id);
            clearTimeout(req.timeout);
            req.resolve(msg.message.result || msg.message);
            this.pendingRequests.delete(msg.message.id);
          }
        } catch {}
      });
      this.ws.on('error', reject);
    });
  }
  send(command, params = {}) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timeout = setTimeout(() => { this.pendingRequests.delete(id); reject(new Error(`Timeout: ${command}`)); }, 15000);
      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify({
        id, type: command === 'join' ? 'join' : 'message',
        ...(command === 'join' ? { channel: params.channel } : { channel: CHANNEL }),
        message: { id, command, params: { ...params, commandId: id } },
      }));
    });
  }
  close() { this.ws?.close(); }
}

async function deepExplore(client, nodeId, depth = 0, maxDepth = 4) {
  if (depth > maxDepth) return;
  const info = await client.send('get_node_info', { nodeId });
  const prefix = '  '.repeat(depth);
  const fills = info.fills?.map(f => {
    if (f.type === 'SOLID') {
      const c = f.color;
      const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
      const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
      const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
      return `#${r}${g}${b}`;
    }
    return f.type;
  }) || [];
  const fillStr = fills.length ? ` [${fills.join(',')}]` : '';
  const chars = info.characters ? ` "${info.characters.slice(0, 40)}"` : '';
  console.log(`${prefix}${info.id} | ${info.type} | ${info.name}${fillStr}${chars}`);

  if (info.children) {
    for (const child of info.children.slice(0, 30)) {
      await deepExplore(client, child.id, depth + 1, maxDepth);
    }
  }
}

async function main() {
  const client = new FigmaClient();
  await client.connect();
  await client.send('join', { channel: CHANNEL });
  console.log(`✓ Exploring node ${NODE_ID}\n`);
  await deepExplore(client, NODE_ID, 0, 3);
  client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
