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
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// API básica
app.get('/', (req, res) => {
  res.send('🟢 ByteBot com Viewer rodando!');
});

function logVision(text) {
  console.log(`[${new Date().toISOString()}] ${text}`);
}

// Criação do bot
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

    // Viewer em http://localhost:3000/viewer
    mineflayerViewer(bot, { port: server, path: '/viewer' });
    logVision('🎥 Viewer ativado em /viewer');
  });

  bot.on('login', () => logVision('🔐 Login realizado'));
  bot.once('end', () => { logVision('🔌 Desconectado'); cleanupBot(); scheduleReconnect(); });
  bot.once('kicked', reason => { logVision(`🚫 Kickado: ${reason}`); cleanupBot(); scheduleReconnect(); });
  bot.on('error', err => { logVision(`❌ Erro: ${err.message}`); cleanupBot(); scheduleReconnect(); });
}

function cleanupBot() {
  clearTimeout(connectTimeout);
  if (bot) {
    try { bot.quit(); } catch { }
    bot = null;
  }
}

function scheduleReconnect() {
  logVision('🔄 Reconectando em 10 segundos...');
  setTimeout(createBot, 10000);
}

// Socket.io para controle
io.on('connection', (socket) => {
  logVision('📡 Controle conectado via WebSocket');

  socket.on('move', (dir) => {
    if (!bot) return;
    bot.clearControlStates();

    if (dir !== 'stop') {
      bot.setControlState(dir, true);
      logVision(`➡️ Movendo: ${dir}`);
    } else {
      logVision('⛔ Parando movimento');
    }
  });
});

server.listen(3000, () => {
  logVision('🚀 API + Viewer em http://localhost:3000');
});

createBot();
