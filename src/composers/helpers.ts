import Debug from 'debug';
import axios from 'axios';

import { MainContext } from '@root/configs/context';
import { IWallet } from '@root/models/wallet-model';
import { serviceSettings, serviceWallets } from '@root/services';
import { ENV } from '@root/configs';

const debug = Debug('bot:transactions:helpers');

const readDocsUrl = 'https://read.docs.com';
const watchTutorialUrl = 'https://watch.tutorial.com';

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
    wallets = await serviceWallets.getWalletsByUser(ctx.chat.id);
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
    wallets = await serviceWallets.getWalletsByUser(ctx.chat.id);
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

const generateSettingsMessage = async (ctx: MainContext) => {
  const log = debug.extend('generateWalletsMessage');

  let settings = null;
  if (ctx.chat) {
    settings = await serviceSettings.getSettings(ctx.chat.id);
  }

  let solTip = settings?.solTxTip
    ? toPlainString(settings?.solTxTip.toString())
    : '0';
  let bundleTip = settings?.bundleTip
    ? toPlainString(settings?.bundleTip.toString())
    : '0';

  let message: string = ctx.t('settings-title', {
    solTip,
    bundleTip,
  });

  return message;
};

const generateCreateTokenMessage = async (ctx: MainContext) => {
  let desc = ctx.session.createToken.description;
  if (desc.length > 33) {
    desc = desc.replace(/(.{15})(.*?)(.{15})$/, '$1...$3');
  }
  let message: string = ctx.t('create-token-title', {
    name: ctx.session.createToken.name,
    symbol: ctx.session.createToken.symbol,
    decimals: ctx.session.createToken.decimals,
    supply: ctx.session.createToken.supply,
    image: ctx.session.createToken.image,
    description: desc,
    website: ctx.session.createToken.socials.website,
    telegram: ctx.session.createToken.socials.telegram,
    twitter: ctx.session.createToken.socials.twitter,
    totalFees: ENV.CREATE_TOKEN_TOTAL_FEES_SOL,
  });

  message = message.concat(
    `\n    <a href="${readDocsUrl}">Read Docs</a> | <a href="${watchTutorialUrl}">Watch Tutorial</a>`,
  );

  return message;
};

const generateCreateMarketMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('create-market-title', {
    baseToken: ctx.session.createMarket.baseMint
      ? `\n    ${ctx.session.createMarket.baseMint.replace(
          /(.{10})(.*?)(.{10})$/,
          '$1...$3',
        )}`
      : '',
    quoteToken: ctx.session.createMarket.quoteMint,
    minBuy: ctx.session.createMarket.baseLogSize,
    tickSize: toPlainString(ctx.session.createMarket.tickSize.toString()),
    eventLength: ctx.session.createMarket.eventLength,
    requestLength: ctx.session.createMarket.requestLength,
    orderbookLength: ctx.session.createMarket.orderbookLength,
    totalFees: ENV.CREATE_MARKET_TOTAL_FEES_SOL,
  });

  message = message.concat(
    `\n    <a href="${readDocsUrl}">Read Docs</a> | <a href="${watchTutorialUrl}">Watch Tutorial</a>`,
  );

  return message;
};

const generateCreatePoolMessage = async (ctx: MainContext) => {
  let buyersInfo = '';
  for (const buyer of ctx.session.createPool.buyerInfos) {
    if (buyersInfo === '') {
      buyersInfo += `\n     ${buyer.id + 1}. ${
        buyer.privateKey.replace(/(.{8})(.*?)(.{8})$/, '$1...$3') || ''
      } | ${buyer.amount || '0'} SOL`;
    } else {
      buyersInfo += `\n     ${buyer.id + 1}. ${
        buyer.privateKey.replace(/(.{8})(.*?)(.{8})$/, '$1...$3') || ''
      } | ${buyer.amount || '0'} SOL`;
    }
  }
  let message: string = ctx.t('create-pool-title', {
    marketId: ctx.session.createPool.marketId
      ? `\n       ${ctx.session.createPool.marketId.replace(
          /(.{15})(.*?)(.{15})$/,
          '$1...$3',
        )}`
      : '',
    amountPercent: toPlainString(
      ctx.session.createPool.amountOfPercentage.toString(),
    ),
    tokenLiquidity: ctx.session.createPool.tokenLiquidity,
    buyers: buyersInfo,
    totalFees: ENV.CREATE_POOL_TOTAL_FEES_SOL,
  });

  message = message.concat(
    `\n    <a href="${readDocsUrl}">Read Docs</a> | <a href="${watchTutorialUrl}">Watch Tutorial</a>`,
  );

  return message;
};

const generateBurnTokensMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('burn-tokens-title', {
    tokenAddress: ctx.session.burnLiquidity.tokenAddress
      ? `\n       ${ctx.session.burnLiquidity.tokenAddress.replace(
          /(.{10})(.*?)(.{10})$/,
          '$1...$3',
        )}`
      : '',
    amount: ctx.session.burnLiquidity.burnAmount,
    totalFees: ENV.BURN_TOKENS_TOTAL_FEES_SOL,
  });

  message = message.concat(
    `\n    <a href="${readDocsUrl}">Read Docs</a> | <a href="${watchTutorialUrl}">Watch Tutorial</a>`,
  );

  return message;
};

const generateRemoveLPMessage = async (ctx: MainContext) => {
  let message: string = ctx.t('remove-liquidity-title', {
    tokenAddress: ctx.session.removeLiquidity.tokenAddress
      ? `\n       ${ctx.session.removeLiquidity.tokenAddress.replace(
          /(.{10})(.*?)(.{10})$/,
          '$1...$3',
        )}`
      : '',
    totalFees: ENV.REMOVE_LP_TOTAL_FEES_SOL,
  });

  message = message.concat(
    `\n    <a href="${readDocsUrl}">Read Docs</a> | <a href="${watchTutorialUrl}">Watch Tutorial</a>`,
  );

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
  generateSettingsMessage,
  generateWalletsMessage,
  generateCreateTokenMessage,
  generateCreateMarketMessage,
  generateCreatePoolMessage,
  generateBurnTokensMessage,
  generateRemoveLPMessage,
};
