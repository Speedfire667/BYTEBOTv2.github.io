const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

// 🎯 CONFIG DO SERVIDOR MINECRAFT
const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null, moveInterval, connectTimeout;

// 🌐 EXPRESS / SOCKET.IO
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// 🎮 INTERFACE HTML EMBUTIDA
const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <title>Controle do Bot</title>
  <style>
    body { background: #111; color: #fff; font-family: sans-serif; text-align: center; margin-top: 50px; }
    button { padding: 15px 30px; font-size: 18px; margin: 5px; background: #333; color: white; border: none; border-radius: 8px; cursor: pointer; }
    .grid { display: grid; grid-template-columns: repeat(3, 100px); grid-template-rows: repeat(3, 100px); gap: 10px; justify-content: center; }
  </style>
</head>
<body>
  <h1>🎮 Controle do Bot</h1>
  <div class="grid">
    <div></div>
    <button onclick="move('forward')">⬆️</button>
    <div></div>
    <button onclick="move('left')">⬅️</button>
    <button onclick="move('jump')">🆙</button>
    <button onclick="move('right')">➡️</button>
    <div></div>
    <button onclick="move('back')">⬇️</button>
    <div></div>
  </div>
  <p style="margin-top:40px;">👁️ <a href="http://localhost:3007" target="_blank">Abrir viewer</a></p>
  <script src="/socket.io/socket.io.js"></script>
  <script>
    const socket = io();
    function move(dir) {
      socket.emit('move', dir);
    }
  </script>
</body>
</html>
`;

// Serve o HTML direto na raiz
app.get('/', (req, res) => {
  res.send(html);
});

// ========= LOG FORMATADO =========
function logVision(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
}

// ========= CRIA O BOT =========
function createBot() {
  if (bot) return logVision('⚠️ Bot já está ativo');

  const username = `ByteBot_${Math.floor(Math.random() * 9999)}`;
  logVision(`🤖 Iniciando bot: ${username}`);

  bot = mineflayer.createBot({
    host: MC_HOST,
    port: MC_PORT,
    username,
    version: VERSION,
    auth: 'offline'
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
    mineflayerViewer(bot, { port: 3007, firstPerson: false });
    logVision('🎥 Viewer 3ª pessoa: http://localhost:3007');
  });

  bot.on('login', () => logVision('🔐 Login com sucesso'));
  bot.once('end', () => { logVision('🔌 Desconectado'); cleanupBot(); scheduleReconnect(); });
  bot.once('kicked', reason => { logVision(`🚫 Kickado: ${reason}`); cleanupBot(); scheduleReconnect(); });
  bot.on('error', err => { logVision(`❌ Erro: ${err.message}`); cleanupBot(); scheduleReconnect(); });
}

// ========= LIMPA O BOT =========
function cleanupBot() {
  clearInterval(moveInterval);
  clearTimeout(connectTimeout);
  if (bot) try { bot.quit(); } catch { } finally { bot = null; }
}

// ========= RECONNECT =========
function scheduleReconnect() {
  logVision('🔄 Tentando reconectar em 10s...');
  setTimeout(() => createBot(), 10000);
}

// ========= CONTROLE SOCKET =========
io.on('connection', socket => {
  logVision('🕹️ Controle conectado');
  socket.on('move', dir => {
    if (!bot) return;
    bot.clearControlStates();
    bot.setControlState(dir, true);
    setTimeout(() => bot.clearControlStates(), 500);
  });
});

// ========= INICIA SERVIDOR WEB E BOT =========
server.listen(3000, () => {
  logVision('🌐 Interface de controle: http://localhost:3000');
});

createBot();
