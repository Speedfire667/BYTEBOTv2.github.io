const mineflayer = require('mineflayer');
const radarPlugin = require('mineflayer-radar')(mineflayer);
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 8080;
const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null, clients = [], reconnectTimeout;
let moveInterval, updateInterval, connectTimeout;

function broadcast(data) {
  const json = JSON.stringify(data);
  clients.forEach(ws => ws.readyState === WebSocket.OPEN && ws.send(json));
}

function logVision(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
  broadcast({ log: line });
}

function createBot() {
  if (bot) return logVision('⚠️ Bot já ativo');
  const username = `ByteBot_${Math.floor(Math.random()*9999)}`;
  logVision(`🤖 Iniciando bot: ${username}`);

  bot = mineflayer.createBot({ host: MC_HOST, port: MC_PORT, username, version: VERSION, auth: 'offline' });

  radarPlugin(bot, { port: 9000 });
  logVision('🕹️ Radar + controle na web: http://localhost:9000');

  connectTimeout = setTimeout(() => {
    logVision('⏰ Timeout conexão');
    bot.quit(); cleanupBot(); scheduleReconnect();
  }, 15000);

  bot.once('spawn', () => {
    clearTimeout(connectTimeout);
    logVision(`✅ Bot conectado: ${bot.username}`);

    mineflayerViewer(bot, { port: 3007, firstPerson: true });
    logVision('🎥 FPV ativo: http://localhost:3007');

    if (moveInterval) clearInterval(moveInterval);
    moveInterval = setInterval(() => {
      if (!bot.entity) return;
      const dirs = ['forward','back','left','right'];
      const dir = dirs[Math.floor(Math.random()*dirs.length)];
      const jump = Math.random()<0.4;
      bot.clearControlStates();
      bot.setControlState(dir, true);
      if (jump) bot.setControlState('jump', true);
      setTimeout(() => bot.clearControlStates(), 800);
    }, 8000);

    if (updateInterval) clearInterval(updateInterval);
    updateInterval = setInterval(() => {
      if (!bot.entity) return;
      broadcast({
        position: bot.entity.position,
        players: Object.values(bot.players).map(p => ({
          username: p.username,
          pos: p.entity ? p.entity.position : null
        }))
      });
    }, 1000);
  });

  bot.on('chat', (u, msg) => {
    if (u !== bot.username) logVision(`💬 ${u}: ${msg}`);
  });

  bot.once('end', () => {
    logVision('🔌 Bot end');
    cleanupBot();
    scheduleReconnect();
  });
  bot.once('kicked', (reason) => {
    logVision(`🚫 Kickado: ${reason}`);
    cleanupBot();
    scheduleReconnect();
  });
  bot.on('error', (err) => {
    logVision(`❌ Erro: ${err.message}`);
    cleanupBot();
    scheduleReconnect();
  });
  bot.on('login', () => logVision('🔐 Logado com sucesso'));
}

function cleanupBot() {
  clearInterval(moveInterval);
  clearInterval(updateInterval);
  clearTimeout(connectTimeout);
  if (bot) try { bot.quit() } catch{} finally { bot = null }
}

function scheduleReconnect() {
  if (reconnectTimeout) return;
  logVision('🔄 Reconectando em 10s...');
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, 10000);
}

// Aqui você coloca seu HTML se quiser servir interface web no mesmo server
const html = `<!DOCTYPE html><html><body><h1>Radar & Controle</h1><p>Implemente aqui sua interface.</p></body></html>`;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    res.writeHead(200, {'Content-Type': 'text/html'});
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

const wss = new WebSocket.Server({ server });
wss.on('connection', ws => {
  clients.push(ws);
  logVision('📡 Cliente conectado');
  ws.on('close', () => {
    clients = clients.filter(c => c !== ws);
    logVision('🔌 Cliente desconectado');
  });
  ws.on('error', e => logVision(`❗ WS erro: ${e.message}`));
});

server.listen(PORT, () => {
  console.log(`🌐 Interface radar: http://localhost:${PORT}`);
  createBot();
});
