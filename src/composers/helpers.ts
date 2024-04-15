import Debug from 'debug';
import { Keyboard, InlineKeyboard } from 'grammy';

import { MainContext } from '@root/configs/context';
import Wallet, { IWallet } from '@root/models/wallet-model';
import { getWalletsByUser } from '@root/services/wallet-service';

const debug = Debug('bot:transactions:helpers');

const generateWelcomeMessage = async (ctx: MainContext) => {
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
};

const createMainKeyboard = (ctx: MainContext) => {
  return new InlineKeyboard()
    .text(ctx.t('label-create-market'))
    .row()
    .text(ctx.t('label-add-liquidity'))
    .row()
    .text(ctx.t('label-remove-lp'))
    .text(ctx.t('label-burn-tokens'))
    .row()
    .text(ctx.t('label-wallet'))
    .text(ctx.t('label-bot-settings'))
    .row()
    .text(ctx.t('label-help'));
  // .resized()
};

export { generateWelcomeMessage, createMainKeyboard };
