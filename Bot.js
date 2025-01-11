const mineflayer = require('mineflayer');
const { mineflayer: mineflayerViewer } = require('prismarine-viewer');
const express = require('express');

const app = express();
const port = 3000;

const bot = mineflayer.createBot({
  host: 'BYTEserver.aternos.me', // Endereço do servidor
  port: 12444, // Porta do servidor
  username: 'Bot', // Nome do bot
  version: '1.16.4', // Versão do Minecraft (você pode alterar conforme necessário)
  offline: true // Modo offline para testes locais
});

bot.once('spawn', () => {
  // Inicia o visualizador do bot
  mineflayerViewer(bot, { port: 3001, firstPerson: true });
  console.log('Bot conectado e visualizador iniciado em http://localhost:3001');
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Visão do Bot</title>
      </head>
      <body>
        <h1>Visão do Bot</h1>
        <iframe src="http://localhost:3001" width="800" height="600"></iframe>
      </body>
    </html>
  `);
});

app.listen(port, () => {
  console.log(`Servidor web rodando em http://localhost:${port}`);
});
