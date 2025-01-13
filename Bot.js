const mineflayer = require('mineflayer');
const { OpenAI } = require('openai');  // Novo import
const openai = new OpenAI({
  apiKey: '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', // Substitua pela sua chave!
});

function createBot() {
  const bot = mineflayer.createBot({
    host: 'BYTEserver.aternos.me', // IP do servidor
    port: 12444, // Porta do servidor
    username: 'Bot', // Nome do bot
  });

  bot.once('spawn', () => {
    bot.chat("Olá! Estou conectado e pronto para responder suas perguntas!");
  });

  bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    bot.chat("Processando sua pergunta...");

    const prompt = `Meu nome é Bot e eu vivo dentro do Minecraft. Aqui estão algumas informações: - Posição atual: X=${bot.entity.position.x}, Y=${bot.entity.position.y}, Z=${bot.entity.position.z}. - Bloco abaixo de mim: ${bot.blockAt(bot.entity.position.offset(0, -1, 0))?.name || 'nenhum'}.

    Pergunta do jogador: "${message}"

    Responda com base nas informações acima.`;

    try {
      const response = await openai.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'gpt-3.5-turbo',
      });

      const answer = response.choices[0].message.content.trim();
      bot.chat(answer);
    } catch (err) {
      console.error('Erro ao chamar a API OpenAI:', err);
      bot.chat("Desculpe, ocorreu um erro ao processar sua solicitação.");
    }
  });

  bot.on('kicked', (reason) => console.log(`Bot foi desconectado: ${reason}`));
  bot.on('error', (err) => console.log(`Erro: ${err.message}`));
}

createBot();
