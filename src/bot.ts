import Debug from 'debug';
import { Bot, GrammyError, HttpError, Keyboard } from 'grammy';
import { run, RunnerHandle } from '@grammyjs/runner';

import { ENV } from '@root/configs';
import { MainContext } from '@root/configs/context';
import initialSession from './middlewares/session';
import i18n from '@root/middlewares/i18n';
import mainMenu from '@root/composers/main';
import { bot as walletsComposer } from '@root/composers/wallets';
import { bot as settingsComposer } from '@root/composers/settings';
import { bot as createTokenComposer } from '@root/composers/create-token';
import { bot as createMarketComposer } from '@root/composers/create-market';
import { bot as createPoolComposer } from '@root/composers/create-pool';

export const Route = {
  idle: 'IDLE',
};

const rootLog = Debug(`bot:root`);

export const start = async (): Promise<{
  runnerHandle: RunnerHandle;
}> => {
  // Create new instance bot
  const bot = new Bot<MainContext>(ENV.BOT_TOKEN);

  // Attach a session middleware and specify the initial data
  bot.use(initialSession);
  bot.use(i18n);
  bot.use(mainMenu);
  bot.use(walletsComposer);
  bot.use(settingsComposer);
  bot.use(createTokenComposer);
  bot.use(createMarketComposer);
  bot.use(createPoolComposer);

  bot.catch(errorHandler);

  // async function startHandler(ctx: MainContext) {
  //   const log = rootLog.extend('startHandler');
  //   log('start: %O', ctx.message);

  //   await setBotCommands(ctx);

  //   const welcomeMessage = await generateWelcomeMessage(ctx);

  //   return ctx.reply(welcomeMessage, {
  //     parse_mode: 'HTML',
  //     reply_markup: mainMenu,
  //   });
  // }

  function helpHandler(ctx: MainContext) {
    const log = rootLog.extend('helpHandler');
    log('help: %O', ctx.message);

    // return ctx.reply(ctx.i18n.t('help'), {
    //   parse_mode: 'Markdown',
    //   reply_markup: createMainKeyboard(ctx),
    // });
  }

  // function setBotCommands(ctx: MainContext) {
  //   const log = rootLog.extend('setBotCommands');
  //   log('Setting bot commands...');
  //   const myCommands: { command: string; description: string }[] = [];

  //   for (const val of Object.values(command)) {
  //     myCommands.push({
  //       command: val as string,
  //       description: ctx.t(`command-${val}`),
  //     });
  //   }
  //   log('myCommands: %O', myCommands);

  //   return ctx.api.setMyCommands(myCommands);
  // }

  function errorHandler(err: any) {
    const ctx = err.ctx;
    console.error(`Error while handling update ${ctx.update.update_id}:`);
    const e = err.error;
    if (e instanceof GrammyError) {
      console.error('Error in request:', e.description);
    } else if (e instanceof HttpError) {
      console.error('Could not contact Telegram:', e);
    } else {
      console.error('Unknown error:', e);
    }
  }

  const runnerHandle = run(bot);
  console.log(`Bot started and running ... 🤖`);

  return { runnerHandle };
};
