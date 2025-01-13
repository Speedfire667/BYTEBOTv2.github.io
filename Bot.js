const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const { Configuration, OpenAIApi } = require('openai');

// Configuração da IA
const openaiConfig = new Configuration({
    apiKey: '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' // Substitua pela sua chave da OpenAI
});
const openai = new OpenAIApi(openaiConfig);

// Configuração do bot
const bot = mineflayer.createBot({
    host: 'BYTEserver.aternos.me', // Altere para o endereço do servidor
    port: 12444, // Altere para a porta do servidor
    username: 'OfflineBot', // Nome do bot
    version: '1.16.1', // Altere para a versão desejada
    offline: true
});

bot.loadPlugin(pathfinder);

bot.once('spawn', () => {
    bot.chat('Olá! Estou online. Pergunte sobre blocos ou peça para minerar algo!');
});

bot.on('chat', async (username, message) => {
    if (username === bot.username) return;

    if (message.startsWith('qual seu bloco')) {
        const block = bot.blockAtCursor(); // Pega o bloco que o bot está olhando
        if (!block) {
            bot.chat('Não estou olhando para nenhum bloco.');
            return;
        }

        const question = `Me diga informações sobre o bloco ${block.name}, ele tem ID ${block.type} e está no Minecraft.`;
        try {
            const response = await openai.createCompletion({
                model: 'text-davinci-003',
                prompt: question,
                max_tokens: 150,
            });
            bot.chat(response.data.choices[0].text.trim());
        } catch (err) {
            bot.chat('Erro ao obter informações do bloco.');
            console.error(err);
        }
    }

    if (message.startsWith('minerar')) {
        const blockName = message.split(' ')[1];
        const blockToMine = bot.findBlock({
            matching: (block) => block.name === blockName,
            maxDistance: 64
        });

        if (!blockToMine) {
            bot.chat(`Não encontrei nenhum bloco ${blockName} por perto.`);
            return;
        }

        bot.chat(`Indo minerar o bloco ${blockName}!`);
        const mcData = require('minecraft-data')(bot.version);
        const movements = new Movements(bot, mcData);
        bot.pathfinder.setMovements(movements);
        bot.pathfinder.setGoal(new goals.GoalBlock(blockToMine.position.x, blockToMine.position.y, blockToMine.position.z));

        bot.once('goal_reached', () => {
            bot.dig(blockToMine, (err) => {
                if (err) {
                    bot.chat('Houve um erro ao minerar o bloco.');
                    console.error(err);
                } else {
                    bot.chat(`Bloco ${blockName} minerado com sucesso!`);
                }
            });
        });
    }
});
