const mineflayer = require('mineflayer');
const { viewer } = require('prismarine-viewer');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let bot;
let wsClients = [];
let reconnecting = false;

function randomName() {
  return 'Bot' + Math.floor(Math.random() * 9999999);
}

function connectBot() {
  const username = randomName();
  console.log(`🤖 Conectando como ${username}...`);

  bot = mineflayer.createBot({
    host: 'Speedfire1237.aternos.me',
    port: 36424,
    version: 1.12.2
    username
  });

  bot.once('spawn', () => {
    console.log('✅ Spawnado!');
    viewer(bot, { express: app, defaultViewDistance: 6, firstPerson: true });
  });

  bot.on('end', () => {
    console.log('🔁 Bot desconectado. Reconnectando...');
    reconnect();
  });

  bot.on('error', err => {
    console.log('⚠️ Erro:', err.message);
  });

  setInterval(() => {
    if (bot?.entity) {
      const data = JSON.stringify({
        position: bot.entity.position,
        yaw: bot.entity.yaw,
        pitch: bot.entity.pitch
      });
      wsClients.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) ws.send(data);
      });
    }
  }, 100);
}

function reconnect() {
  if (reconnecting) return;
  reconnecting = true;
  setTimeout(() => {
    reconnecting = false;
    connectBot();
  }, 5000);
}

// API REST simples
app.get('/api/status', (req, res) => {
  if (!bot || !bot.entity) return res.json({ online: false });
  res.json({
    online: true,
    position: bot.entity.position,
    yaw: bot.entity.yaw,
    pitch: bot.entity.pitch,
    username: bot.username
  });
});

app.get('/api/randomname', (req, res) => {
  res.json({ name: randomName() });
});

// Serve frontend
app.get('/', (_, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

wss.on('connection', ws => {
  wsClients.push(ws);
  ws.on('message', msg => {
    const data = JSON.parse(msg);
    if (!bot || !bot.entity) return;
    if (data.action === 'move') {
      bot.setControlState(data.direction, data.state);
    }
  });

  ws.on('close', () => {
    wsClients = wsClients.filter(client => client !== ws);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Servidor ouvindo na porta ${PORT}`);
});

connectBot();
