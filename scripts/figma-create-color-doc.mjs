/**
 * Figma 컬러 토큰 문서 생성
 * tokens.ts의 컬러 시스템을 Figma 문서로 작성
 */
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const CHANNEL = process.argv[2] || 'xyk932av';

class FC {
  constructor() { this.ws = null; this.p = new Map(); }
  connect() {
    return new Promise((res, rej) => {
      this.ws = new WebSocket('ws://localhost:3055');
      this.ws.on('open', () => res());
      this.ws.on('message', (d) => {
        try {
          const m = JSON.parse(d.toString());
          if (m.type === 'broadcast' && m.sender === 'User' && m.message?.id) {
            const { id, result, error } = m.message;
            if (this.p.has(id)) { const r = this.p.get(id); clearTimeout(r.t); error ? r.j(new Error(error)) : r.r(result); this.p.delete(id); }
          }
          if (m.type === 'system' && m.message?.id && this.p.has(m.message.id)) {
            const r = this.p.get(m.message.id); clearTimeout(r.t); r.r(m.message.result || m.message); this.p.delete(m.message.id);
          }
        } catch {}
      });
      this.ws.on('error', rej);
    });
  }
  cmd(c, params = {}) {
    return new Promise((r, j) => {
      const id = randomUUID();
      const t = setTimeout(() => { this.p.delete(id); j(new Error(`Timeout: ${c}`)); }, 30000);
      this.p.set(id, { r, j, t });
      this.ws.send(JSON.stringify({
        id, type: c === 'join' ? 'join' : 'message',
        ...(c === 'join' ? { channel: params.channel } : { channel: CHANNEL }),
        message: { id, command: c, params: { ...params, commandId: id } },
      }));
    });
  }
  close() { this.ws?.close(); }
}

function h2c(hex) {
  return { r: parseInt(hex.slice(1,3),16)/255, g: parseInt(hex.slice(3,5),16)/255, b: parseInt(hex.slice(5,7),16)/255 };
}

// ---- 데이터 ----
const BASE = {
  'Warm Grey (Primary/Neutral)': [
    ['2','#FEFEFD'],['5','#FDFCFC'],['8','#F9F9F8'],['10','#F5F5F3'],['20','#EFEEEC'],['30','#E7E6E4'],
    ['40','#DCDBD9'],['50','#C8C7C5'],['60','#AFAEAC'],['70','#939291'],['80','#777675'],['90','#575655'],
    ['95','#424140'],['96','#373635'],['98','#242322'],['99','#161514'],
  ],
  'Blue (Accent)': [
    ['5','#F5F8FC'],['10','#E6EEF7'],['20','#C2D4EB'],['30','#9EBADF'],['40','#7AA0D3'],['50','#5686C7'],
    ['60','#326CBB'],['70','#2559A5'],['80','#1C4387'],['90','#16366C'],['95','#112851'],['99','#0B1B36'],
  ],
  'Red (Error)': [
    ['5','#FEF6F5'],['10','#FCE8E6'],['20','#F7C4BF'],['30','#F2A098'],['40','#ED7C71'],['50','#E8584A'],
    ['60','#D4402F'],['70','#C23829'],['80','#BB332A'],['90','#962922'],['95','#711F19'],['99','#4B1511'],
  ],
};

const SEMANTIC = [
  ['Background & Primary', [
    ['background-primary','#242322','primary-98'],['foreground-onprimary','#FDFCFC','primary-5'],
    ['background-primarycontainer','#EFEEEC','primary-20'],['foreground-onprimarycontainer','#242322','primary-98'],
  ]],
  ['Accent', [
    ['foreground-accent','#326CBB','accent-60'],['background-accent','#2559A5','accent-70'],
    ['background-accentcontainer','#C2D4EB','accent-20'],['foreground-onaccent','#F5F8FC','accent-5'],
    ['foreground-onaccentcontainer','#1C4387','accent-80'],
  ]],
  ['Surface', [
    ['surface-surface','#FEFEFD','neutral-2'],['surface-surfacedim','#F5F5F3','neutral-10'],
    ['surface-surfacebright','#FFFFFF','white'],['surface-containerlowest','#FDFCFC','neutral-5'],
    ['surface-containerlow','#F9F9F8','neutral-8'],['surface-container','#F5F5F3','neutral-10'],
    ['surface-containerhigh','#EFEEEC','neutral-20'],['surface-containerhighest','#E7E6E4','neutral-30'],
    ['surface-inverse','#373635','neutral-96'],
  ]],
  ['Error', [
    ['background-error','#BB332A','error-80'],['foreground-onerror','#FEF6F5','error-5'],
    ['foreground-error','#BB332A','error-80'],
  ]],
  ['Foreground / Text', [
    ['foreground-onsurface','#242322','neutral-98'],['foreground-onsurfacevar','#242322','@64%',0.64],
    ['foreground-onsurfacemuted','#242322','@36%',0.36],['foreground-onsurfacedisabled','#242322','@24%',0.24],
    ['foreground-onsurfaceinverse','#FDFCFC','neutral-5'],
  ]],
  ['Border', [
    ['border-borderlight','#242322','@8%',0.08],['border-border','#242322','@16%',0.16],
    ['border-borderbold','#C8C7C5','primary-50'],
  ]],
];

const HUES = [
  ['grey','#777675'],['greybrown','#948A78'],['brown','#A87F43'],['darkred','#61131B'],
  ['red','#BB332A'],['orange','#CA5100'],['yellow','#DBA04C'],['lime','#BFAC27'],
  ['green','#80A109'],['teal','#29A195'],['lightblue','#7C88EF'],['blue','#1C4387'],
  ['purple','#60329A'],['lavender','#A370BA'],
];

async function main() {
  const f = new FC();
  await f.connect();
  await f.cmd('join', { channel: CHANNEL });
  console.log('✓ Connected\n');

  // 메인 프레임
  const main = await f.cmd('create_frame', {
    x: 2000, y: 100, width: 1320, height: 100, name: 'Color System — tokens.ts',
    fillColor: { r: 1, g: 1, b: 1, a: 1 },
  });
  const P = main.id;
  console.log(`✓ Frame: ${P}`);

  let Y = 40;

  // 타이틀
  await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: 'Bakecycle Color System', fontSize: 28, fontWeight: 700, fontColor: { r: 0.14, g: 0.14, b: 0.13, a: 1 } });
  Y += 44;
  await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: 'Generated from src/constants/tokens.ts  •  Light Mode', fontSize: 14, fontWeight: 400, fontColor: { r: 0.47, g: 0.46, b: 0.46, a: 1 } });
  Y += 48;

  // ===== Base Colors =====
  await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: 'Base Colors', fontSize: 22, fontWeight: 700, fontColor: { r: 0.14, g: 0.14, b: 0.13, a: 1 } });
  Y += 40;

  for (const [family, colors] of Object.entries(BASE)) {
    await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: family, fontSize: 14, fontWeight: 600, fontColor: { r: 0.34, g: 0.34, b: 0.33, a: 1 } });
    Y += 28;
    let X = 60;
    for (const [lv, hex] of colors) {
      const c = h2c(hex);
      const rect = await f.cmd('create_rectangle', { parentId: P, x: X, y: Y, width: 48, height: 48, name: `swatch-${lv}` });
      await f.cmd('set_fill_color', { nodeId: rect.id, color: { ...c, a: 1 } });
      await f.cmd('set_corner_radius', { nodeId: rect.id, radius: 6 });
      await f.cmd('create_text', { parentId: P, x: X, y: Y + 52, text: lv, fontSize: 10, fontWeight: 500, fontColor: { r: 0.47, g: 0.46, b: 0.46, a: 1 } });
      await f.cmd('create_text', { parentId: P, x: X, y: Y + 64, text: hex, fontSize: 9, fontWeight: 400, fontColor: { r: 0.58, g: 0.57, b: 0.57, a: 1 } });
      X += 72;
    }
    Y += 90;
    console.log(`  ✓ ${family}`);
  }
  Y += 32;

  // ===== Semantic Colors =====
  await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: 'Semantic Colors — Light Mode', fontSize: 22, fontWeight: 700, fontColor: { r: 0.14, g: 0.14, b: 0.13, a: 1 } });
  Y += 40;

  for (const [cat, tokens] of SEMANTIC) {
    await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: cat, fontSize: 14, fontWeight: 600, fontColor: { r: 0.34, g: 0.34, b: 0.33, a: 1 } });
    Y += 28;
    for (const tok of tokens) {
      const [name, hex, desc, alpha] = tok;
      const a = alpha || 1.0;
      const c = h2c(hex);
      const rect = await f.cmd('create_rectangle', { parentId: P, x: 60, y: Y, width: 40, height: 40, name: `sem-${name}` });
      await f.cmd('set_fill_color', { nodeId: rect.id, color: { ...c, a } });
      await f.cmd('set_corner_radius', { nodeId: rect.id, radius: 6 });
      await f.cmd('create_text', { parentId: P, x: 112, y: Y + 12, text: name, fontSize: 13, fontWeight: 500, fontColor: { r: 0.14, g: 0.14, b: 0.13, a: 1 } });
      await f.cmd('create_text', { parentId: P, x: 420, y: Y + 12, text: hex + (a < 1 ? ` @${Math.round(a*100)}%` : ''), fontSize: 13, fontWeight: 400, fontColor: { r: 0.47, g: 0.46, b: 0.46, a: 1 } });
      await f.cmd('create_text', { parentId: P, x: 600, y: Y + 12, text: desc, fontSize: 12, fontWeight: 400, fontColor: { r: 0.58, g: 0.57, b: 0.57, a: 1 } });
      Y += 52;
    }
    Y += 16;
    console.log(`  ✓ ${cat}`);
  }
  Y += 32;

  // ===== Custom Hues =====
  await f.cmd('create_text', { parentId: P, x: 60, y: Y, text: 'Custom Hues (Recipe Categories)', fontSize: 22, fontWeight: 700, fontColor: { r: 0.14, g: 0.14, b: 0.13, a: 1 } });
  Y += 40;
  let X = 60;
  for (const [name, hex] of HUES) {
    const c = h2c(hex);
    const rect = await f.cmd('create_rectangle', { parentId: P, x: X, y: Y, width: 48, height: 48, name: `hue-${name}` });
    await f.cmd('set_fill_color', { nodeId: rect.id, color: { ...c, a: 1 } });
    await f.cmd('set_corner_radius', { nodeId: rect.id, radius: 6 });
    await f.cmd('create_text', { parentId: P, x: X, y: Y + 52, text: name, fontSize: 10, fontWeight: 500, fontColor: { r: 0.47, g: 0.46, b: 0.46, a: 1 } });
    await f.cmd('create_text', { parentId: P, x: X, y: Y + 64, text: hex, fontSize: 9, fontWeight: 400, fontColor: { r: 0.58, g: 0.57, b: 0.57, a: 1 } });
    X += 80;
  }
  Y += 90;
  console.log('  ✓ Custom Hues');

  // 프레임 높이 맞춤
  await f.cmd('resize_node', { nodeId: P, width: 1320, height: Y + 40 });
  console.log(`\n✓ 완료! Figma에서 "Color System — tokens.ts" 프레임 확인하세요.`);
  f.close();
}

main().catch(e => { console.error(e.message); process.exit(1); });
