import 'dotenv/config';
import { Bot } from 'grammy';
import { hydrateFiles } from '@grammyjs/files';

import connectDatabase from './configs/connectDatabase';

import { MainContext } from './context';
import {
  middlewareSession,
  middlewareI18n,
  middlewareConversation,
  middlewareMenu,
} from './middlewares';

// Create new instance bot
const bot = new Bot<MainContext>(process.env.BOT_TOKEN!);

// Using session middleware on bot
middlewareSession(bot);

// Using i18n middleware on the bot
middlewareI18n(bot);

// Using conversation middleware on bot
middlewareConversation(bot);

// Using menu middleware on bot
middlewareMenu(bot);

bot.api.config.use(hydrateFiles(bot.token));

// Set bot commands
bot.api.setMyCommands([
  { command: 'start', description: 'Open the main menu' },
  { command: 'reset', description: 'Reset bot' },
]);

// Starting bot
bot.start({
  onStart(botInfo) {
    console.log(`Bot started and running as ${botInfo.username}... 🤖`);
  },
});

// Connecting to MongoDB
connectDatabase(process.env.MONGODB_CONNECTION!);
