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

const generateCreateTokenMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('create-token-title', {
    name: ctx.session.createToken.name,
    symbol: ctx.session.createToken.symbol,
    decimals: ctx.session.createToken.decimals,
    supply: ctx.session.createToken.supply,
    image: ctx.session.createToken.image,
    description: ctx.session.createToken.description,
    website: ctx.session.createToken.socials.website,
    telegram: ctx.session.createToken.socials.telegram,
    twitter: ctx.session.createToken.socials.twitter,
  });

  return message;
};

const generateCreateMarketMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('create-market-title', {
    baseToken: ctx.session.createMarket.baseMint,
    quoteToken: ctx.session.createMarket.quoteMint,
    minBuy: ctx.session.createMarket.baseLogSize,
    tickSize: toPlainString(ctx.session.createMarket.tickSize.toString()),
    eventLength: ctx.session.createMarket.eventLength,
    requestLength: ctx.session.createMarket.requestLength,
    orderbookLength: ctx.session.createMarket.orderbookLength,
  });

  return message;
};

const generateCreatePoolMessage = async (ctx: MainContext) => {
  let buyersInfo = '';
  for (const buyer of ctx.session.createPool.buyerInfos) {
    if (buyersInfo === '') {
      buyersInfo += `${buyer.privateKey || ''} : ${buyer.amount || '0'} SOL`;
    } else {
      buyersInfo += `\n\n${buyer.privateKey || ''} : ${buyer.amount || '0'} SOL`;
    }
  }
  let message: string = ctx.t('create-pool-title', {
    marketId: ctx.session.createPool.marketId,
    tokenLiquidity: ctx.session.createPool.tokenLiquidity,
    amountPercent: ctx.session.createPool.amountOfPercentage,
    buyers: buyersInfo,
  });

  return message;
};

const generateBurnTokensMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('burn-tokens-title', {
    tokenAddress: ctx.session.burnLiquidity.tokenAddress,
    amount: ctx.session.burnLiquidity.burnAmount,
  });

  return message;
};

const generateRemoveLPMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('remove-liquidity-title', {
    tokenAddress: ctx.session.removeLiquidity.tokenAddress,
  });

  return message;
};

const toPlainString = (num: string): string => {
  return ('' + +num).replace(
    /(-?)(\d*)\.?(\d*)e([+-]\d+)/,
    function (a, b, c, d, e) {
      return e < 0
        ? b + '0.' + Array(1 - +e - c.length).join('0') + c + d
        : b + c + d + Array(+e - d.length + 1).join('0');
    },
  );
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

export {
  generateWelcomeMessage,
  generateWalletsMessage,
  generateCreateTokenMessage,
  generateCreateMarketMessage,
  generateCreatePoolMessage,
  generateBurnTokensMessage,
  generateRemoveLPMessage,
};
