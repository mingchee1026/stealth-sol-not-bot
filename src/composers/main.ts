import Debug from 'debug';
import { Composer } from 'grammy';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { command } from './constants';
import { walletsMenu } from './wallets';
import { settingsMenu } from './settings';
import { createTokenMenu } from './create-token';
import { createMarketMenu } from './create-market';
import { createPoolMenu } from './create-pool';
import { generateWelcomeMessage, generateWalletsMessage } from './helpers';

const debug = Debug(`bot:main`);

const bot = new Composer<MainContext>();

const mainMenu = new Menu<MainContext>('Welcome')
  .submenu(
    (ctx) => ctx.t('label-create-token'),
    'create-token-menu',
    async (ctx) => {
      const tokenMessage = ctx.t('create-token-title');
      ctx.editMessageText(tokenMessage, { parse_mode: 'HTML' });
    },
  )
  .submenu(
    (ctx) => ctx.t('label-create-market'),
    'create-market-menu',
    async (ctx) => {
      const tokenMessage = ctx.t('create-market-title');
      ctx.editMessageText(tokenMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  .submenu(
    (ctx) => ctx.t('label-add-liquidity'),
    'create-pool-menu',
    async (ctx) => {
      const tokenMessage = ctx.t('create-pool-title');
      ctx.editMessageText(tokenMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  .text((ctx) => ctx.t('label-remove-lp'))
  .text((ctx) => ctx.t('label-burn-tokens'))
  .row()
  .submenu(
    (ctx) => ctx.t('label-wallet'),
    'wallets-menu',
    async (ctx) => {
      const walletsMessage = await generateWalletsMessage(ctx);
      ctx.editMessageText(walletsMessage, { parse_mode: 'HTML' });
    },
  )
  .submenu(
    (ctx) => ctx.t('label-bot-settings'),
    'settings-menu',
    async (ctx) => {
      const settingsMessage = ctx.t('settings-title');
      ctx.editMessageText(settingsMessage, { parse_mode: 'HTML' });
    },
  )
  .row()
  .text((ctx) => ctx.t('label-help'));

mainMenu.register(walletsMenu);
mainMenu.register(settingsMenu);
mainMenu.register(createTokenMenu);
mainMenu.register(createMarketMenu);
mainMenu.register(createPoolMenu);
bot.use(mainMenu);

bot.command(command.START, startCommandHandler);

export default bot;

async function startCommandHandler(ctx: MainContext) {
  const log = debug.extend('startCommandHandler');
  log('Entered the startCommandHandler...');

  await setBotCommands(ctx);

  const welcomeMessage = await generateWelcomeMessage(ctx);
  const ret = await ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: mainMenu,
  });

  ctx.session.topMsgId = ret.message_id;
}

function setBotCommands(ctx: MainContext) {
  const log = debug.extend('setBotCommands');
  log('Setting bot commands...');
  const myCommands: { command: string; description: string }[] = [];

  for (const val of Object.values(command)) {
    myCommands.push({
      command: val as string,
      description: ctx.t(`command-${val}`),
    });
  }
  log('myCommands: %O', myCommands);

  return ctx.api.setMyCommands(myCommands);
}
