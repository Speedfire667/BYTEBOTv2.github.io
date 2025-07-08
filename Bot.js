const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// ======= CONFIGURAÇÕES DO MINECRAFT =======
const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

// ======= VARIÁVEIS GLOBAIS =======
let bot = null, moveInterval, connectTimeout;

// ======= EXPRESS E SOCKET.IO =======
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static('public')); // Interface web na pasta /public

// ======= LOG FORMATADO =======
function logVision(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
}

// ======= CRIAR BOT =======
function createBot() {
  if (bot) return logVision('⚠️ Bot já ativo');

  const username = `ByteBot_${Math.floor(Math.random() * 9999)}`;
  logVision(`🤖 Iniciando bot: ${username}`);

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username,
    version: VERSION,
    auth: 'offline'
  });

  // Timeout de conexão
  connectTimeout = setTimeout(() => {
    logVision('⏰ Timeout conexão');
    bot.quit();
    cleanupBot();
    scheduleReconnect();
  }, 15000);

  bot.once('spawn', () => {
    clearTimeout(connectTimeout);
    logVision(`✅ Bot conectado: ${bot.username}`);

    // Ativa o viewer em primeira pessoa na porta 3007
    mineflayerViewer(bot, { port: 3007, firstPerson: true });
    logVision('🎥 Viewer ativo: http://localhost:3007');

    // Movimentação automática (pode remover se quiser só analógico)
    if (moveInterval) clearInterval(moveInterval);
    moveInterval = setInterval(() => {
      if (!bot.entity) return;
      const dirs = ['forward', 'back', 'left', 'right'];
      const dir = dirs[Math.floor(Math.random() * dirs.length)];
      const jump = Math.random() < 0.4;
      bot.clearControlStates();
      bot.setControlState(dir, true);
      if (jump) bot.setControlState('jump', true);
      setTimeout(() => bot.clearControlStates(), 800);
    }, 8000);
  });

  // Eventos
  bot.on('login', () => logVision('🔐 Logado com sucesso'));
  bot.once('end', () => { logVision('🔌 Bot end'); cleanupBot(); scheduleReconnect(); });
  bot.once('kicked', reason => { logVision(`🚫 Kickado: ${reason}`); cleanupBot(); scheduleReconnect(); });
  bot.on('error', err => { logVision(`❌ Erro: ${err.message}`); cleanupBot(); scheduleReconnect(); });
}

// ======= LIMPA O BOT =======
function cleanupBot() {
  clearInterval(moveInterval);
  clearTimeout(connectTimeout);
  if (bot) try { bot.quit(); } catch { } finally { bot = null; }
}

// ======= RECONEXÃO =======
function scheduleReconnect() {
  logVision('🔄 Reconectando em 10s...');
  setTimeout(() => createBot(), 10000);
}

// ======= CONTROLE VIA ANALÓGICO (SOCKET.IO) =======
io.on('connection', socket => {
  logVision('🕹️ Cliente conectado ao controle');

  socket.on('move', direction => {
    if (!bot) return;
    bot.clearControlStates();
    bot.setControlState(direction, true);
    setTimeout(() => bot.clearControlStates(), 500);
  });
});

// ======= INICIA SERVIDOR DE INTERFACE E BOT =======
server.listen(3000, () => {
  logVision('🌐 Interface web: http://localhost:3000');
});

createBot(); // Inicia o bot automaticamente
