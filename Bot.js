const express = require('express');
const mineflayer = require('mineflayer');
const mineflayerViewer = require('prismarine-viewer').mineflayer;

const app = express();
const WEB_PORT = 3000;
const VIEWER_PORT = 3007;

// Página inicial com design aprimorado
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Bot Viewer Selection</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          text-align: center;
          background-color: #1e1e2f;
          color: #f5f5f5;
          margin: 0;
          padding: 0;
        }
        h1 {
          margin-top: 20px;
          font-size: 2.5em;
          color: #ff6f61;
        }
        .container {
          display: flex;
          justify-content: center;
          gap: 20px;
          margin-top: 50px;
        }
        .mode {
          border: 2px solid #ff6f61;
          border-radius: 10px;
          overflow: hidden;
          width: 300px;
          transition: transform 0.3s;
          background-color: #2e2e4e;
          cursor: pointer;
        }
        .mode:hover {
          transform: scale(1.1);
        }
        .mode img {
          width: 100%;
          height: 200px;
          object-fit: cover;
        }
        .mode button {
          width: 100%;
          padding: 15px;
          background-color: #ff6f61;
          color: #fff;
          font-size: 1.2em;
          border: none;
          cursor: pointer;
          outline: none;
        }
        .mode button:hover {
          background-color: #ff3b2e;
        }
        footer {
          margin-top: 50px;
          font-size: 0.9em;
          color: #aaa;
        }
      </style>
    </head>
    <body>
      <h1>Selecione o modo de visualização</h1>
      <div class="container">
        <div class="mode" onclick="selectView('3D')">
          <img src="https://via.placeholder.com/300x200?text=3D+View" alt="3D View">
          <button>Modo 3D</button>
        </div>
        <div class="mode" onclick="selectView('1P')">
          <img src="https://via.placeholder.com/300x200?text=1P+View" alt="1P View">
          <button>Modo 1P</button>
        </div>
      </div>
      <footer>
        <p>Feito para você aproveitar o mundo do Minecraft de diferentes maneiras!</p>
      </footer>
      <script>
        function selectView(view) {
          fetch(\`/start?view=\${view}\`)
            .then((response) => {
              if (response.ok) {
                alert('Iniciando o bot em modo ' + view + '...');
              } else {
                alert('Erro ao iniciar o bot.');
              }
            })
            .catch((error) => {
              console.error('Erro:', error);
            });
        }
      </script>
    </body>
    </html>
  `);
});

// Rota para iniciar o bot com o modo selecionado
app.get('/start', (req, res) => {
  const view = req.query.view;

  if (view !== '3D' && view !== '1P') {
    return res.status(400).send('Modo inválido.');
  }

  const firstPerson = view === '1P';

  // Criar e configurar o bot
  const bot = mineflayer.createBot({
    host: 'BYTEServer.aternos.me', // Endereço do servidor
    port: 12444, // Porta do servidor
    username: 'AFKBot', // Nome do bot
    version: '1.12.1', // Versão do Minecraft
  });

  bot.once('spawn', () => {
    console.log(`Bot conectado! Acesse http://localhost:${VIEWER_PORT} para visualizar em modo ${view}.`);
    mineflayerViewer(bot, { port: VIEWER_PORT, firstPerson });
  });

  bot.on('error', (err) => {
    console.error('Erro ao conectar ao servidor:', err);
  });

  bot.on('end', () => {
    console.log('Bot desconectado do servidor.');
  });

  res.send(`Bot iniciado em modo ${view}.`);
});

// Iniciar o servidor web
app.listen(WEB_PORT, () => {
  console.log(`Servidor web rodando em http://localhost:${WEB_PORT}`);
});
