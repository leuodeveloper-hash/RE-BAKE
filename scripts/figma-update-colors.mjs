/**
 * Figma 컬러 토큰 업데이트 스크립트
 * tokens.ts Light mode 값으로 Figma Color Guidance 노드 업데이트
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

function hexToRgb01(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16) / 255,
    g: parseInt(hex.slice(3, 5), 16) / 255,
    b: parseInt(hex.slice(5, 7), 16) / 255,
  };
}

// ---- tokens.ts Light mode에서 해석한 최종 컬러 값 ----
// Label → { hex, a } (a = alpha, 기본 1.0)
const colorUpdates = [
  // === Primary 섹션 ===
  { nodeId: '73399:83748', label: 'primary',              hex: '#242322', a: 1.0 },  // background-primary = warmgrey-98
  { nodeId: '73399:83758', label: 'pn-primary',           hex: '#FDFCFC', a: 1.0 },  // foreground-onprimary = warmgrey-5
  { nodeId: '73399:83763', label: 'primary-container',    hex: '#EFEEEC', a: 1.0 },  // background-primarycontainer = primary-20 (warmgrey-20)
  { nodeId: '73399:83768', label: 'on-primary-container', hex: '#242322', a: 1.0 },  // foreground-onprimarycontainer = primary-98

  // === Accent 섹션 ===
  { nodeId: '73399:84178', label: 'accent',               hex: '#326CBB', a: 1.0 },  // foreground-accent = accent-60 (blue-60)
  { nodeId: '73399:84188', label: 'on-accent',            hex: '#F5F8FC', a: 1.0 },  // foreground-onaccent = accent-5 (blue-5)
  { nodeId: '73399:84193', label: 'accent-container',     hex: '#C2D4EB', a: 1.0 },  // background-accentcontainer = accent-20 (blue-20)
  { nodeId: '73399:84198', label: 'on-accent-container',  hex: '#1C4387', a: 1.0 },  // foreground-onaccentcontainer = accent-80 (blue-80)

  // === Error 섹션 ===
  { nodeId: '73399:84342', label: 'error',                hex: '#BB332A', a: 1.0 },  // background-error = error-80 (red-80)
  { nodeId: '73399:84347', label: 'on-error',             hex: '#FEF6F5', a: 1.0 },  // foreground-onerror = error-5 (red-5)
  { nodeId: '73399:84352', label: 'error-container',      hex: '#BB332A', a: 0.12 }, // background-errorcontainer = rgba(187,51,42,0.12)
  { nodeId: '73399:84357', label: 'on-error-container',   hex: '#BB332A', a: 1.0 },  // foreground-onerrorcontainer = error-80

  // === Border 섹션 ===
  { nodeId: '73399:84402', label: 'border-light',         hex: '#242322', a: 0.08 }, // border-borderlight = rgba(36,35,34,0.08)
  { nodeId: '73399:84397', label: 'border',               hex: '#242322', a: 0.16 }, // border-border = rgba(36,35,34,0.16)
  { nodeId: '73399:84407', label: 'border-bold',          hex: '#C8C7C5', a: 1.0 },  // border-borderbold = primary-50 (warmgrey-50)

  // === State Tokens 섹션 ===
  { nodeId: '73405:84611', label: 'hover_focused',        hex: '#777675', a: 0.08 }, // statelayers-primaryhover = warmgrey-80 at 8%
  { nodeId: '73405:84616', label: 'on-primary',           hex: '#FDFCFC', a: 1.0 },  // foreground-onprimary = warmgrey-5
  { nodeId: '73405:84621', label: 'primary-container',    hex: '#EFEEEC', a: 1.0 },  // background-primarycontainer
  { nodeId: '73405:84626', label: 'on-primary-container', hex: '#242322', a: 1.0 },  // foreground-onprimarycontainer
];

async function main() {
  const client = new FigmaClient();
  await client.connect();
  await client.send('join', { channel: CHANNEL });
  console.log(`✓ Connected to channel: ${CHANNEL}\n`);

  let success = 0;
  let fail = 0;

  for (const update of colorUpdates) {
    const { r, g, b } = hexToRgb01(update.hex);
    try {
      await client.send('set_fill_color', {
        nodeId: update.nodeId,
        r, g, b, a: update.a,
      });
      console.log(`✓ ${update.label.padEnd(25)} → ${update.hex} (a=${update.a})`);
      success++;
    } catch (err) {
      console.log(`✗ ${update.label.padEnd(25)} → FAILED: ${err.message}`);
      fail++;
    }
  }

  console.log(`\n--- 완료: ${success} 성공, ${fail} 실패 ---`);
  client.close();
}

main().catch(e => { console.error(e); process.exit(1); });
