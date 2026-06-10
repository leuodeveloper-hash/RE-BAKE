/**
 * Figma WebSocket 디버그 스크립트 - 모든 메시지 로깅
 */
import { randomUUID } from 'crypto';
import WebSocket from 'ws';

const CHANNEL = process.argv[2] || 'xyk932av';
const WS_URL = 'ws://localhost:3055';

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✓ Connected');

  // Join channel
  const joinId = randomUUID();
  ws.send(JSON.stringify({
    id: joinId,
    type: 'join',
    channel: CHANNEL,
    message: {
      id: joinId,
      command: 'join',
      params: { channel: CHANNEL, commandId: joinId },
    },
  }));

  // After a small delay, send get_selection
  setTimeout(() => {
    const selId = randomUUID();
    console.log(`\n→ Sending get_selection (id: ${selId.slice(0, 8)})`);
    ws.send(JSON.stringify({
      id: selId,
      type: 'message',
      channel: CHANNEL,
      message: {
        id: selId,
        command: 'get_selection',
        params: { commandId: selId },
      },
    }));
  }, 1000);

  // After another delay, send get_document_info
  setTimeout(() => {
    const docId = randomUUID();
    console.log(`\n→ Sending get_document_info (id: ${docId.slice(0, 8)})`);
    ws.send(JSON.stringify({
      id: docId,
      type: 'message',
      channel: CHANNEL,
      message: {
        id: docId,
        command: 'get_document_info',
        params: { commandId: docId },
      },
    }));
  }, 2000);

  // Close after 8 seconds
  setTimeout(() => {
    console.log('\n--- Done ---');
    ws.close();
  }, 8000);
});

ws.on('message', (data) => {
  const raw = data.toString();
  console.log('\n← RAW MESSAGE:');
  // Pretty print, truncate if too long
  try {
    const parsed = JSON.parse(raw);
    const pretty = JSON.stringify(parsed, null, 2);
    console.log(pretty.length > 2000 ? pretty.slice(0, 2000) + '\n... (truncated)' : pretty);
  } catch {
    console.log(raw.slice(0, 2000));
  }
});

ws.on('error', (err) => {
  console.error('WS Error:', err.message);
});
