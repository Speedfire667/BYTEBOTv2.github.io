const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null;
let connectTimeout;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8" />
<title>Controle + Viewer do Bot</title>
<style>
  body { background: #111; color: #fff; font-family: sans-serif; margin: 0; padding: 0; }
  h1 { text-align: center; padding: 15px 0; }
  #container { display: flex; height: 90vh; }
  #controls {
    width: 300px; background: #222; padding: 20px; box-sizing: border-box;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 15px;
  }
  button {
    padding: 15px 25px;
    font-size: 20px;
    background: #333;
    color: white;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    user-select: none;
  }
  button:active {
    background: #555;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(3, 80px);
    grid-template-rows: repeat(3, 80px);
    gap: 10px;
    justify-content: center;
  }
  iframe {
    flex-grow: 1;
    border: none;
  }
  p { text-align:center; margin:0; padding: 10px 0; }
</style>
</head>
<body>
  <h1>🎮 Controle + Viewer do Bot</h1>
  <div id="container">
    <div id="controls">
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
    </div>
    <iframe src="http://localhost:3007" title="Viewer do Bot"></iframe>
  </div>
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

app.get('/', (req, res) => {
  res.send(html);
});

function logVision(text) {
  console.log(\`[\${new Date().toISOString()}] \${text}\`);
}

function createBot() {
  if (bot) return logVision('⚠️ Bot já ativo');

  const username = \`ByteBot_\${Math.floor(Math.random() * 9999)}\`;
  logVision(\`🤖 Iniciando bot: \${username}\`);

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
    logVision(\`✅ Bot conectado: \${bot.username}\`);
    mineflayerViewer(bot, { port: 3007, firstPerson: false });
    logVision('🎥 Viewer rodando na porta 3007 (iframe embutido)');
  });

  bot.on('login', () => logVision('🔐 Logado com sucesso'));
  bot.once('end', () => { logVision('🔌 Desconectado'); cleanupBot(); scheduleReconnect(); });
  bot.once('kicked', reason => { logVision(\`🚫 Kickado: \${reason}\`); cleanupBot(); scheduleReconnect(); });
  bot.on('error', err => { logVision(\`❌ Erro: \${err.message}\`); cleanupBot(); scheduleReconnect(); });
}

function cleanupBot() {
  clearTimeout(connectTimeout);
  if (bot) try { bot.quit(); } catch { } finally { bot = null; }
}

function scheduleReconnect() {
  logVision('🔄 Reconectando em 10s...');
  setTimeout(createBot, 10000);
}

io.on('connection', socket => {
  logVision('🕹️ Controle conectado');
  socket.on('move', dir => {
    if (!bot) return;
    bot.clearControlStates();
    bot.setControlState(dir, true);
    setTimeout(() => bot.clearControlStates(), 500);
  });
});

server.listen(3000, () => {
  logVision('🌐 Interface: http://localhost:3000');
});

createBot();
