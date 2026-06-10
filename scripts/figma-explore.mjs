/**
 * Figma 문서 탐색 - 컬러 노드 찾기
 */
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const CHANNEL = process.argv[2] || 'xyk932av';
const WS_URL = 'ws://localhost:3055';

class FigmaClient {
  constructor(url, channel) {
    this.url = url;
    this.channel = channel;
    this.ws = null;
    this.pendingRequests = new Map();
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(this.url);
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
          if (msg.type === 'system' && msg.message?.id) {
            const id = msg.message.id;
            if (this.pendingRequests.has(id)) {
              const req = this.pendingRequests.get(id);
              clearTimeout(req.timeout);
              req.resolve(msg.message.result || msg.message);
              this.pendingRequests.delete(id);
            }
          }
        } catch (e) {}
      });
      this.ws.on('error', reject);
    });
  }

  send(command, params = {}) {
    return new Promise((resolve, reject) => {
      const id = randomUUID();
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Timeout: ${command}`));
      }, 15000);
      this.pendingRequests.set(id, { resolve, reject, timeout });
      this.ws.send(JSON.stringify({
        id,
        type: command === 'join' ? 'join' : 'message',
        ...(command === 'join' ? { channel: params.channel } : { channel: this.channel }),
        message: { id, command, params: { ...params, commandId: id } },
      }));
    });
  }

  async join() {
    await this.send('join', { channel: this.channel });
    console.log(`✓ Joined ${this.channel}`);
  }

  close() { this.ws?.close(); }
}

async function main() {
  const client = new FigmaClient(WS_URL, CHANNEL);
  await client.connect();
  console.log('✓ Connected');
  await client.join();

  // Foundation 섹션 탐색
  console.log('\n--- Foundation 섹션 (68403:150717) 탐색 ---');
  const foundation = await client.send('get_node_info', { nodeId: '68403:150717' });
  const children = foundation.children || [];
  console.log(`Children (${children.length}):`);
  for (const child of children) {
    console.log(`  ${child.id} | ${child.type} | ${child.name}`);
  }

  // M3 Baseline Theme Tokens 섹션 탐색
  console.log('\n--- M3 Baseline Theme Tokens (73399:82760) 탐색 ---');
  const m3 = await client.send('get_node_info', { nodeId: '73399:82760' });
  const m3children = m3.children || [];
  console.log(`Children (${m3children.length}):`);
  for (const child of m3children) {
    console.log(`  ${child.id} | ${child.type} | ${child.name}`);
  }

  // 컬러 관련 프레임 더 깊이 탐색
  for (const child of [...children, ...m3children]) {
    if (child.name.toLowerCase().includes('color') || child.name.toLowerCase().includes('colour') || child.name.toLowerCase().includes('semantic')) {
      console.log(`\n--- ${child.name} (${child.id}) 상세 ---`);
      const info = await client.send('get_node_info', { nodeId: child.id });
      const subchildren = info.children || [];
      for (const sub of subchildren.slice(0, 20)) {
        console.log(`  ${sub.id} | ${sub.type} | ${sub.name}`);
      }
    }
  }

  client.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
