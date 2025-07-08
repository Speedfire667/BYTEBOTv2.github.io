const mineflayer = require('mineflayer');
const express = require('express');
const WebSocket = require('ws');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');

const app = express();
const http = require('http').createServer(app);
const wss = new WebSocket.Server({ server: http });

const PORT = process.env.PORT || 8080;
const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null;
let clients = [];

function broadcast(data) {
  const json = JSON.stringify(data);
  clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) ws.send(json);
  });
}

function logVision(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
  broadcast({ log: line });
}

function createBot() {
  if (bot) return;

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username: 'ByteBot_' + Math.floor(Math.random() * 9999),
    version: VERSION,
    auth: 'offline',
  });

  bot.once('spawn', () => {
    logVision(`✅ Bot conectado: ${bot.username}`);

    mineflayerViewer(bot, { port: 3007, firstPerson: true });

    setInterval(() => {
      if (!bot.entity) return;
      const pos = bot.entity.position;
      const players = Object.values(bot.players).map(p => ({
        username: p.username,
        pos: p.entity ? p.entity.position : null,
      }));
      broadcast({ position: pos, players });
    }, 1000);
  });

  bot.on('chat', (username, msg) => {
    if (username !== bot.username) {
      logVision(`💬 ${username}: ${msg}`);
    }
  });

  bot.on('end', () => {
    logVision('🔴 Bot desconectado');
    bot = null;
    setTimeout(createBot, 10000);
  });

  bot.on('error', err => {
    logVision(`❌ Erro: ${err.message}`);
  });
}

wss.on('connection', ws => {
  clients.push(ws);
  logVision('📡 Novo cliente conectado');
  ws.on('message', msg => {
    try {
      const data = JSON.parse(msg);
      if (data.type === 'move') {
        bot.clearControlStates();
        bot.setControlState(data.direction, true);
        setTimeout(() => bot.clearControlStates(), 500);
      }
    } catch (err) {
      console.error(err);
    }
  });
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
  });
});

const html = `
<!DOCTYPE html>
<html>
<head>
  <title>ByteBot Viewer</title>
  <style>
    body { margin: 0; font-family: sans-serif; background: #111; color: #eee; }
    iframe { width: 100%; height: 50vh; border: none; }
    canvas { background: #222; display: block; margin: 16px auto; border: 2px solid #444; }
    #log { max-height: 200px; overflow-y: auto; padding: 10px; background: #000; }
    #log li { border-bottom: 1px solid #333; font-size: 13px; padding: 4px 0; }
    #controls button { margin: 5px; padding: 10px; font-size: 16px; }
    #controls { text-align: center; margin-bottom: 10px; }
  </style>
</head>
<body>
  <h1 style="text-align:center;">👁️ ByteBot Viewer + HUD</h1>
  <iframe src="http://localhost:3007"></iframe>

  <canvas id="radar" width="400" height="400"></canvas>
  <div id="controls">
    <button onclick="move('forward')">⬆️ Frente</button>
    <button onclick="move('back')">⬇️ Trás</button>
    <button onclick="move('left')">⬅️ Esquerda</button>
    <button onclick="move('right')">➡️ Direita</button>
    <button onclick="move('jump')">🕴️ Pular</button>
  </div>

  <ul id="log"></ul>

  <script>
    const canvas = document.getElementById('radar');
    const ctx = canvas.getContext('2d');
    const logEl = document.getElementById('log');
    let botPos = { x: 0, z: 0 };
    let players = [];

    const socket = new WebSocket('ws://' + location.host);
    socket.onmessage = e => {
      const data = JSON.parse(e.data);
      if (data.position) botPos = data.position;
      if (data.players) players = data.players;
      if (data.log) {
        const li = document.createElement('li');
        li.textContent = data.log;
        logEl.prepend(li);
        if (logEl.children.length > 50) logEl.removeChild(logEl.lastChild);
      }
    };

    function move(dir) {
      socket.send(JSON.stringify({ type: "move", direction: dir }));
    }

    function draw() {
      ctx.clearRect(0, 0, 400, 400);
      const cx = 200, cz = 200;
      ctx.fillStyle = 'lime';
      ctx.beginPath();
      ctx.arc(cx, cz, 6, 0, 2 * Math.PI);
      ctx.fill();

      players.forEach(p => {
        if (!p.pos) return;
        const dx = (p.pos.x - botPos.x) * 2;
        const dz = (p.pos.z - botPos.z) * 2;
        ctx.fillStyle = 'red';
        ctx.beginPath();
        ctx.arc(cx + dx, cz + dz, 4, 0, 2 * Math.PI);
        ctx.fill();
      });

      requestAnimationFrame(draw);
    }
    draw();
  </script>
</body>
</html>
`;

app.get('/', (req, res) => {
  res.send(html);
});

http.listen(PORT, () => {
  console.log(`🌐 Servidor Web rodando em http://localhost:${PORT}`);
  createBot();
});
