import Debug from 'debug';
import { Composer } from 'grammy';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { IWallet } from '@root/models/wallet-model';
import { getWalletsByUser } from '@root/services/wallet-service';
import { command } from './constants';
import walletMenu from './wallets';

const debug = Debug(`bot:main`);

const bot = new Composer<MainContext>();

const mainMenu = new Menu<MainContext>('Welcome')
  .text((ctx) => ctx.t('label-create-token'))
  .text((ctx) => ctx.t('label-create-market'))
  .row()
  .text((ctx) => ctx.t('label-add-liquidity'))
  .row()
  .text((ctx) => ctx.t('label-remove-lp'))
  .text((ctx) => ctx.t('label-burn-tokens'))
  .row()
  .text(
    (ctx) => ctx.t('label-wallet'),
    async (ctx: MainContext) => {
      await ctx.api.sendMessage(ctx.chat!.id, '/wallet');
    },
  )
  .text((ctx) => ctx.t('label-bot-settings'))
  .row()
  .text((ctx) => ctx.t('label-help'));

bot.use(mainMenu);

bot.command(command.START, startCommandHandler);

export default bot;

async function generateWelcomeMessage(ctx: MainContext) {
  const log = debug.extend('generateWelcomeMessage');

  //   log('start: %O', ctx.message);

  let wallets: IWallet[] = [];
  if (ctx.chat) {
    wallets = await getWalletsByUser(ctx.chat.id);
  }

  log('wallets: %O', wallets.length);

  const primaryWallet = wallets.find((wallet) => wallet.isPrimary);
  const totalSol = wallets.reduce(
    (total, wallet) => total + (wallet.balance || 0),
    0,
  );
  const primaryWalletSol = primaryWallet?.balance || 0;

  let welcomeMessage: string = ctx.t('main-welcome', {
    countOfWallet: wallets.length,
    totalDollar: totalSol,
    primaryWallet: primaryWallet?.publicKey || 'NOT SPECIFIED',
    promarySol: primaryWalletSol,
  });

  return welcomeMessage;
}

async function startCommandHandler(ctx: MainContext) {
  const log = debug.extend('startCommandHandler');
  log('Entered the startCommandHandler...');

  await setBotCommands(ctx);

  const welcomeMessage = await generateWelcomeMessage(ctx);
  return ctx.reply(welcomeMessage, {
    parse_mode: 'HTML',
    reply_markup: mainMenu,
  });
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
