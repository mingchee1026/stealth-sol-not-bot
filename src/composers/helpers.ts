import Debug from 'debug';
import { Keyboard, InlineKeyboard } from 'grammy';
import axios from 'axios';

import { MainContext } from '@root/configs/context';
import { IWallet } from '@root/models/wallet-model';
import { getWalletsByUser } from '@root/services/wallet-service';

const debug = Debug('bot:transactions:helpers');

const generateWelcomeMessage = async (ctx: MainContext) => {
  const log = debug.extend('generateWelcomeMessage');

  //   log('start: %O', ctx.message);

  if (ctx.session.solPrice === 0) {
    const price = await getSolPrice();
    if (price) {
      ctx.session.solPrice = price;
      ctx.session.priceUpdated = new Date().getTime();
    }
  } else {
    const current = new Date().getTime();
    if (current - ctx.session.priceUpdated > 1000 * 60 * 60) {
      const price = await getSolPrice();
      if (price) {
        ctx.session.solPrice = price;
        ctx.session.priceUpdated = new Date().getTime();
      }
    }
  }

  let wallets: IWallet[] = [];
  if (ctx.chat) {
    wallets = await getWalletsByUser(ctx.chat.id);
  }

  const primaryWallet = wallets.find((wallet) => wallet.isPrimary);
  const totalSol = wallets.reduce(
    (total, wallet) => total + (wallet.balance || 0),
    0,
  );

  const primaryWalletSol = primaryWallet?.balance || 0;

  let welcomeMessage: string = ctx.t('main-welcome', {
    countOfWallet: wallets.length,
    totalDollar: (ctx.session.solPrice * totalSol).toFixed(2),
    primaryWallet: primaryWallet?.publicKey || 'NOT SPECIFIED',
    promarySol: primaryWalletSol,
  });

  welcomeMessage = welcomeMessage.concat(
    `\n\n   <a href="https://solscan.io/account/${primaryWallet?.publicKey}">View on Explorer</a>`,
  );

  return welcomeMessage;
};

const generateWalletsMessage = async (ctx: MainContext) => {
  const log = debug.extend('generateWalletsMessage');

  let wallets: IWallet[] = [];
  if (ctx.chat) {
    wallets = await getWalletsByUser(ctx.chat.id);
  }

  const primaryWallet = wallets.find((wallet) => wallet.isPrimary);
  const totalSol = wallets.reduce(
    (total, wallet) => total + (wallet.balance || 0),
    0,
  );
  const primaryWalletSol = primaryWallet?.balance || 0;

  let welcomeMessage: string = ctx.t('wallets-title', {
    countofWallets: wallets.length,
    totalSol: totalSol,
    primarySol: primaryWalletSol,
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

const getSolPrice = async () => {
  debug('Update sol price.');
  try {
    const url =
      'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd';
    const { data } = await axios.get(url);
    const price = Number(data.solana.usd);
    return price;
  } catch (err) {
    debug(err);
    return null;
  }
};

export { generateWelcomeMessage, generateWalletsMessage };
