// server.js
const mineflayer = require('mineflayer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');

const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null;
let connectTimeout;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] }
});

// Rota principal serve o HTML embutido
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>ByteBot - Controle & Visão</title>
<style>
  body {
    background: #111;
    color: #fff;
    font-family: sans-serif;
    text-align: center;
    padding: 1rem;
  }
  iframe {
    width: 90vw;
    height: 60vh;
    border: 2px solid #333;
    border-radius: 10px;
    margin-bottom: 20px;
  }
  #joystick {
    width: 200px;
    height: 200px;
    margin: auto;
  }
</style>
</head>
<body>
  <h1>🤖 ByteBot - Controle & Visão</h1>
  <iframe src="/viewer" allowfullscreen></iframe>

  <div id="joystick"></div>

  <script src="https://cdn.socket.io/4.7.2/socket.io.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/nipplejs/0.9.0/nipplejs.min.js"></script>
  <script>
    const socket = io();

    socket.on('connect', () => {
      console.log('✅ Conectado ao servidor WebSocket');
    });

    const joystick = nipplejs.create({
      zone: document.getElementById('joystick'),
      mode: 'static',
      position: { left: '50%', top: '50%' },
      color: 'white'
    });

    let currentDir = null;
    let timeout = null;

    joystick.on('dir', (evt, data) => {
      const dir = data.direction?.angle;
      if (!dir) return;

      let moveDir = {
        up: 'forward',
        down: 'back',
        left: 'left',
        right: 'right'
      }[dir];

      if (moveDir && moveDir !== currentDir) {
        socket.emit('move', moveDir);
        currentDir = moveDir;

        clearTimeout(timeout);
        timeout = setTimeout(() => {
          socket.emit('move', 'stop');
          currentDir = null;
        }, 400);
      }
    });

    joystick.on('end', () => {
      socket.emit('move', 'stop');
      currentDir = null;
    });
  </script>
</body>
</html>  
  `);
});

function logVision(text) {
  console.log(`[${new Date().toISOString()}] ${text}`);
}

function createBot() {
  if (bot) return logVision('⚠️ Bot já está rodando');

  const username = `ByteBot_${Math.floor(Math.random() * 9999)}`;
  logVision(`🤖 Iniciando bot: ${username}`);

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username,
    version: VERSION,
    auth: 'offline',
  });

  connectTimeout = setTimeout(() => {
    logVision('⏰ Timeout de conexão');
    bot.quit();
    cleanupBot();
    scheduleReconnect();
  }, 15000);

  bot.once('spawn', () => {
    clearTimeout(connectTimeout);
    logVision(`✅ Bot conectado: ${bot.username}`);
    mineflayerViewer(bot, { port: server, path: '/viewer' });
    logVision('🎥 Viewer disponível em /viewer');
  });

  bot.on('login', () => logVision('🔐 Login realizado'));
  bot.on('end', () => { logVision('🔌 Desconectado'); cleanupBot(); scheduleReconnect(); });
  bot.on('kicked', reason => { logVision(`🚫 Kickado: ${reason}`); cleanupBot(); scheduleReconnect(); });
  bot.on('error', err => { logVision(`❌ Erro: ${err.message}`); cleanupBot(); scheduleReconnect(); });
}

function cleanupBot() {
  clearTimeout(connectTimeout);
  if (bot) {
    try { bot.quit(); } catch {}
    bot = null;
  }
}

function scheduleReconnect() {
  logVision('🔄 Tentando reconectar em 10 segundos...');
  setTimeout(createBot, 10000);
}

// WebSocket para controle
io.on('connection', (socket) => {
  logVision(`📡 Cliente conectado via WebSocket: ${socket.id}`);

  socket.onAny((event, args) => {
    logVision(`📥 Evento recebido: ${event} → ${JSON.stringify(args)}`);
  });

  socket.on('move', (dir) => {
    if (!bot) return logVision('⚠️ Bot não disponível!');
    bot.clearControlStates();

    if (dir && dir !== 'stop') {
      bot.setControlState(dir, true);
      logVision(`➡️ Movendo: ${dir}`);
    } else {
      logVision('⛔ Parando movimento');
    }
  });
});

server.listen(3000, () => {
  logVision('🚀 Servidor rodando em http://localhost:3000');
});

createBot();
