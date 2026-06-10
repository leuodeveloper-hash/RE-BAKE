/**
 * Figma 컬러 스와치 전체 스캔 - Label과 Color 노드 매핑
 */
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const CHANNEL = process.argv[2] || 'xyk932av';

class FigmaClient {
  constructor() { this.ws = null; this.pending = new Map(); }
  connect() {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket('ws://localhost:3055');
      this.ws.on('open', () => resolve());
      this.ws.on('message', (data) => {
        try {
          const msg = JSON.parse(data.toString());
          if (msg.type === 'broadcast' && msg.sender === 'User' && msg.message?.id) {
            const { id, result, error } = msg.message;
            if (this.pending.has(id)) { const r = this.pending.get(id); clearTimeout(r.t); error ? r.rej(new Error(error)) : r.res(result); this.pending.delete(id); }
          }
          if (msg.type === 'system' && msg.message?.id && this.pending.has(msg.message.id)) {
            const r = this.pending.get(msg.message.id); clearTimeout(r.t); r.res(msg.message.result || msg.message); this.pending.delete(msg.message.id);
          }
        } catch {}
      });
      this.ws.on('error', reject);
    });
  }
  send(cmd, params = {}) {
    return new Promise((res, rej) => {
      const id = randomUUID();
      const t = setTimeout(() => { this.pending.delete(id); rej(new Error(`Timeout: ${cmd}`)); }, 15000);
      this.pending.set(id, { res, rej, t });
      this.ws.send(JSON.stringify({
        id, type: cmd === 'join' ? 'join' : 'message',
        ...(cmd === 'join' ? { channel: params.channel } : { channel: CHANNEL }),
        message: { id, command: cmd, params: { ...params, commandId: id } },
      }));
    });
  }
  close() { this.ws?.close(); }
}

function rgbToHex(c) {
  if (!c) return null;
  const r = Math.round(c.r * 255).toString(16).padStart(2, '0');
  const g = Math.round(c.g * 255).toString(16).padStart(2, '0');
  const b = Math.round(c.b * 255).toString(16).padStart(2, '0');
  return `#${r}${g}${b}`.toUpperCase();
}

// Display frame IDs from metadata
const DISPLAY_IDS = [
  '73399:83742',  // Primary
  '73399:84172',  // Display 2
  '73399:84336',  // Display 3
  '73399:84391',  // Display 4
  '73405:84606',  // State tokens
];

async function main() {
  const client = new FigmaClient();
  await client.connect();
  await client.send('join', { channel: CHANNEL });
  console.log('✓ Connected\n');

  const colorMap = []; // { label, colorNodeId, currentHex, sectionName }

  for (const displayId of DISPLAY_IDS) {
    const display = await client.send('get_node_info', { nodeId: displayId });
    const sectionName = display.children?.find(c => c.name === 'Attribute Name')?.id;
    let sectionLabel = '';
    if (sectionName) {
      const sn = await client.send('get_node_info', { nodeId: sectionName });
      sectionLabel = sn.characters || '';
    }
    console.log(`=== ${sectionLabel || display.name} (${displayId}) ===`);

    // Find Frame 1321317139 (container of Style frames)
    const container = display.children?.find(c => c.type === 'FRAME' && c.name.startsWith('Frame'));
    if (!container) continue;

    const containerInfo = await client.send('get_node_info', { nodeId: container.id });
    for (const styleFrame of (containerInfo.children || [])) {
      const style = await client.send('get_node_info', { nodeId: styleFrame.id });

      let label = '';
      let colorNodeId = null;
      let currentHex = null;

      for (const child of (style.children || [])) {
        if (child.name === 'Label' && child.type === 'TEXT') {
          const textInfo = await client.send('get_node_info', { nodeId: child.id });
          label = textInfo.characters || '';
        }
        if (child.name === 'Color' && child.type === 'RECTANGLE') {
          colorNodeId = child.id;
          const rectInfo = await client.send('get_node_info', { nodeId: child.id });
          if (rectInfo.fills?.[0]?.color) {
            currentHex = rgbToHex(rectInfo.fills[0].color);
          }
        }
      }

      if (label && colorNodeId) {
        colorMap.push({ label, colorNodeId, currentHex, section: sectionLabel });
        console.log(`  ${label.padEnd(25)} | node: ${colorNodeId} | fill: ${currentHex || 'variable-bound'}`);
      }
    }
  }

  console.log(`\n--- Total: ${colorMap.length} color swatches ---`);
  console.log(JSON.stringify(colorMap, null, 2));

  client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
