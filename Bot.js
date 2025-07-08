const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null;
let connectTimeout;

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*", // Libera para qualquer origem (como GitHub Pages)
    methods: ["GET", "POST"]
  }
});

// Serve API simples
app.get('/', (req, res) => {
  res.send('🟢 Bot ativo!');
});

// Viewer é externo na porta 3007
function logVision(text) {
  console.log(`[${new Date().toISOString()}] ${text}`);
}

function createBot() {
  if (bot) return logVision('⚠️ Bot já ativo');

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
    logVision('⏰ Timeout conexão');
    bot.quit();
    cleanupBot();
    scheduleReconnect();
  }, 15000);

  bot.once('spawn', () => {
    clearTimeout(connectTimeout);
    logVision(`✅ Bot conectado: ${bot.username}`);
    mineflayerViewer(bot, { port: 3007, firstPerson: false });
    logVision('🎥 Viewer em: http://SEU_IP_PUBLICO:3007');
  });

  bot.on('login', () => logVision('🔐 Logado com sucesso'));
  bot.once('end', () => { logVision('🔌 Desconectado'); cleanupBot(); scheduleReconnect(); });
  bot.once('kicked', reason => { logVision(`🚫 Kickado: ${reason}`); cleanupBot(); scheduleReconnect(); });
  bot.on('error', err => { logVision(`❌ Erro: ${err.message}`); cleanupBot(); scheduleReconnect(); });
}

function cleanupBot() {
  clearTimeout(connectTimeout);
  if (bot) try { bot.quit(); } catch { } finally { bot = null; }
}

function scheduleReconnect() {
  logVision('🔄 Reconectando em 10s...');
  setTimeout(createBot, 10000);
}

// Controle remoto via WebSocket
io.on('connection', socket => {
  logVision('📡 Controle conectado via WebSocket');
  socket.on('move', dir => {
    if (!bot) return;
    bot.clearControlStates();
    if (dir !== 'stop') {
      bot.setControlState(dir, true);
    }
  });
});

server.listen(3000, () => {
  logVision('🚀 API ativa: http://localhost:3000');
});

createBot();
