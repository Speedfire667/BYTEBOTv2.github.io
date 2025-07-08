const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');

const MC_HOST = 'Speedfire1237.aternos.me';
const MC_PORT = 36424;
const VERSION = '1.12.2';

let bot = null, moveInterval, connectTimeout;

function logVision(text) {
  const line = `[${new Date().toISOString()}] ${text}`;
  console.log(line);
}

function createBot() {
  if (bot) return logVision('⚠️ Bot já ativo');
  const username = `ByteBot_${Math.floor(Math.random()*9999)}`;
  logVision(`🤖 Iniciando bot: ${username}`);

  bot = mineflayer.createBot({ host: MC_HOST, port: MC_PORT, username, version: VERSION, auth: 'offline' });

  connectTimeout = setTimeout(() => {
    logVision('⏰ Timeout conexão');
    bot.quit(); cleanupBot(); scheduleReconnect();
  }, 15000);

  bot.once('spawn', () => {
    clearTimeout(connectTimeout);
    logVision(`✅ Bot conectado: ${bot.username}`);

    // Aqui está o viewer, só ele na porta 3007
    mineflayerViewer(bot, { port: 3007, firstPerson: true });
    logVision('🎥 FPV ativo: http://localhost:3007');

    if (moveInterval) clearInterval(moveInterval);
    moveInterval = setInterval(() => {
      if (!bot.entity) return;
      const dirs = ['forward','back','left','right'];
      const dir = dirs[Math.floor(Math.random()*dirs.length)];
      const jump = Math.random() < 0.4;
      bot.clearControlStates();
      bot.setControlState(dir, true);
      if (jump) bot.setControlState('jump', true);
      setTimeout(() => bot.clearControlStates(), 800);
    }, 8000);
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
  clearTimeout(connectTimeout);
  if (bot) try { bot.quit() } catch{} finally { bot = null }
}

function scheduleReconnect() {
  logVision('🔄 Reconectando em 10s...');
  setTimeout(() => {
    createBot();
  }, 10000);
}

createBot();
