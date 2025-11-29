import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:5000/ws/file-cleanup');

ws.on('open', () => {
    console.log('✅ Connected to WebSocket server');
    ws.close();
});

ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error.message);
});

ws.on('close', (code, reason) => {
    console.log(`Connection closed: ${code} ${reason}`);
});
