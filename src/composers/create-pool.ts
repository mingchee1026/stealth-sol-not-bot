import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage } from './helpers';
import { getPrimaryWallet } from '@root/services/wallet-service';
import {
  serviceSettings,
  serviceOpenmarket,
  serviceLiquidityPool,
  serviceToken,
} from '@root/services';
import { BundlerInputData } from '@root/configs/types';
import { QUOTE_ADDRESS } from '@root/configs';

export enum Route {
  POOL_MARKET_ID = 'CREATE_POOL|POOL_MARKET_ID',
  POOL_BASE_TOKEN = 'CREATE_POOL|POOL_BASE_TOKEN',
  POOL_QUOTE_TOKEN = 'CREATE_POOL|POOL_QUOTE_TOKEN',
  POOL_LOT_SIZE = 'CREATE_POOL|POOL_LOT_SIZE',
  POOL_TICK_SIZE = 'CREATE_POOL|POOL_TICK_SIZE',
  POOL_BUYER_1_SOL = 'CREATE_POOL|POOL_BUYER_1_SOL',
  POOL_LIQUIDITY_AMOUNT = 'CREATE_POOL|POOL_LIQUIDITY_AMOUNT',
  POOL_LIQUIDITY_PERCENT = 'CREATE_POOL|POOL_LIQUIDITY_PERCENT',
  POOL_BUYER_1_PRIVATE_KEY = 'CREATE_POOL|POOL_BUYER_1_PRIVATE_KEY',
  POOL_BUYER_2_SOL = 'CREATE_POOL|POOL_BUYER_2_SOL',
  POOL_BUYER_2_PRIVATE_KEY = 'CREATE_POOL|POOL_BUYER_2_PRIVATE_KEY',
  POOL_BUYER_3_SOL = 'CREATE_POOL|POOL_BUYER_3_SOL',
  POOL_BUYER_3_PRIVATE_KEY = 'CREATE_POOL|POOL_BUYER_3_PRIVATE_KEY',
}

const bolckEngines: Record<string, string> = {
  Amsterdam: 'amsterdam.mainnet.block-engine.jito.wtf',
  Frankfurt: 'frankfurt.mainnet.block-engine.jito.wtf',
  'New York': 'ny.mainnet.block-engine.jito.wtf',
  Tokyo: 'tokyo.mainnet.block-engine.jito.wtf',
};

const debug = Debug(`bot:create pool`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const createPoolMenu = new Menu<MainContext>('create-pool-menu')
  // .text((ctx) => ctx.t('label-token-address'), inputBaseTokenCbQH)
  .text((ctx) => '🏪 Market ID', inputMarketIdCbQH)
  .row()
  // .text((ctx) => `--- ${ctx.t('label-base-token')} ---`)
  // .row()
  // .submenu((ctx) => ctx.t('label-lot-size'), 'custom-lot-menu')
  // .submenu((ctx) => ctx.t('label-tick-size'), 'custom-tick-menu')
  // .row()
  // .text(
  //   async (ctx: any) => {
  //     const value = ctx.session.createPool.quoteToken;
  //     return `${value === 'SOL' ? '✅ ' : ''} SOL`;
  //   },
  //   async (ctx: any) => {
  //     ctx.session.createPool.quoteToken = 'SOL';
  //     ctx.menu.update();
  //   },
  // )
  // .text(
  //   async (ctx: any) => {
  //     const value = ctx.session.createPool.quoteToken;
  //     return `${value === 'USDT' ? '✅ ' : ''} USDT`;
  //   },
  //   async (ctx: any) => {
  //     ctx.session.createPool.quoteToken = 'USDT';
  //     ctx.menu.update();
  //   },
  // )
  // .row()
  .text((ctx) => ctx.t('label-liquidity-amount'), inputLiquidityAmountCbQH)
  .text((ctx) => ctx.t('label-liquidity-percent'), inputLiquidityPercentCbQH)
  .row()
  .text((ctx) => `🛒 Buyers Information`)
  .row()
  .text('Buyer 1 Sol Account', inputBuyer1SolAmountCbQH)
  .text('Buyer 1 Private Key', inputBuyer1PrivateKeyCbQH)
  .row()
  .text('Buyer 1 Sol Account', inputBuyer2SolAmountCbQH)
  .text('Buyer 1 Private Key', inputBuyer2PrivateKeyCbQH)
  .row()
  .text('Buyer 1 Sol Account', inputBuyer3SolAmountCbQH)
  .text('Buyer 1 Private Key', inputBuyer3PrivateKeyCbQH)
  .row()
  .text('⚡ Bundle', fireCreateMarketCbQH)
  .row()
  // .text('❌🔙  Close', doneCbQH);
  .back('🔙  Close', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  });

const customLotMenu = new Menu<MainContext>('custom-lot-menu')
  .back('100', async (ctx) => {
    ctx.session.createPool.baseLogSize = 100;
  })
  .row()
  .back('1000', async (ctx) => {
    ctx.session.createPool.baseLogSize = 1000;
  })
  .row()
  .text((ctx) => ctx.t('label-custom'), inputLotSizeCbQH)
  .row()
  .back('🔙  Go back');

const customTickMenu = new Menu<MainContext>('custom-tick-menu')
  .back('0.0000001', async (ctx) => {
    ctx.session.createPool.tickSize = 0.0000001;
  })
  .row()
  .back('0.00000001', async (ctx) => {
    ctx.session.createPool.tickSize = 0.00000001;
  })
  .row()
  .text((ctx) => ctx.t('label-custom'), inputTickSizeCbQH)
  .row()
  .back('🔙  Go back');

createPoolMenu.register(customLotMenu);
createPoolMenu.register(customTickMenu);

bot.use(createPoolMenu);

router.route('IDLE', (_, next) => next());
router.route(Route.POOL_MARKET_ID, firePoolInfomationRouteHandler);
router.route(Route.POOL_BASE_TOKEN, firePoolInfomationRouteHandler);
router.route(Route.POOL_LOT_SIZE, firePoolInfomationRouteHandler);
router.route(Route.POOL_TICK_SIZE, firePoolInfomationRouteHandler);
router.route(Route.POOL_LIQUIDITY_AMOUNT, firePoolInfomationRouteHandler);
router.route(Route.POOL_LIQUIDITY_PERCENT, firePoolInfomationRouteHandler);
router.route(Route.POOL_BUYER_1_SOL, firePoolInfomationRouteHandler);
router.route(Route.POOL_BUYER_1_PRIVATE_KEY, firePoolInfomationRouteHandler);
router.route(Route.POOL_BUYER_2_SOL, firePoolInfomationRouteHandler);
router.route(Route.POOL_BUYER_2_PRIVATE_KEY, firePoolInfomationRouteHandler);
router.route(Route.POOL_BUYER_3_SOL, firePoolInfomationRouteHandler);
router.route(Route.POOL_BUYER_3_PRIVATE_KEY, firePoolInfomationRouteHandler);

bot.use(router);

export { bot, createPoolMenu };

// export async function createTokenCommandHandler(ctx: MainContext) {
//   const welcomeMessage = await generateWalletsMessage(ctx);
//   await ctx.reply(welcomeMessage, {
//     parse_mode: 'HTML',
//     reply_markup: createTokenMenu,
//   });
// }

async function inputMarketIdCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BASE_TOKEN;

    await ctx.reply(`Enter Market ID:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBaseTokenCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BASE_TOKEN;

    await ctx.reply(`Enter ${ctx.t('label-token-address')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputLotSizeCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_LOT_SIZE;

    await ctx.reply(`Enter ${ctx.t('label-lot-size')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputTickSizeCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_TICK_SIZE;

    await ctx.reply(`Enter ${ctx.t('label-tick-size')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputLiquidityAmountCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_LIQUIDITY_AMOUNT;

    await ctx.reply(`Enter ${ctx.t('label-liquidity-amount')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputLiquidityPercentCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_LIQUIDITY_PERCENT;

    await ctx.reply(`Enter ${ctx.t('label-liquidity-percent')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBuyer1SolAmountCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BUYER_1_SOL;

    await ctx.reply(`Enter buyer 1 SOL account:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBuyer1PrivateKeyCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BUYER_1_PRIVATE_KEY;

    await ctx.reply(`Enter buyer 1 private key:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBuyer2SolAmountCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BUYER_2_SOL;

    await ctx.reply(`Enter buyer 2 SOL account:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBuyer2PrivateKeyCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BUYER_2_PRIVATE_KEY;

    await ctx.reply(`Enter buyer 2 private key:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBuyer3SolAmountCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BUYER_3_SOL;

    await ctx.reply(`Enter buyer 3 SOL account:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBuyer3PrivateKeyCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_BUYER_3_PRIVATE_KEY;

    await ctx.reply(`Enter buyer 3 private key:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function firePoolInfomationRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    switch (ctx.session.step) {
      case Route.POOL_MARKET_ID:
        ctx.session.createPool.marketId = text;
        break;
      case Route.POOL_BASE_TOKEN:
        ctx.session.createPool.baseToken = text;
        break;
      case Route.POOL_LOT_SIZE:
        ctx.session.createPool.baseLogSize = Number(text);
        break;
      case Route.POOL_TICK_SIZE:
        ctx.session.createPool.tickSize = Number(text);
        break;
      case Route.POOL_LIQUIDITY_AMOUNT:
        ctx.session.createPool.tokenLiquidity = Number(text);
        break;
      case Route.POOL_LIQUIDITY_PERCENT:
        ctx.session.createPool.amountOfPercentage = Number(text);
        break;
      case Route.POOL_BUYER_1_SOL:
        ctx.session.createPool.buyerInfos[0].buyAmount = Number(text);
        break;
      case Route.POOL_BUYER_1_PRIVATE_KEY:
        ctx.session.createPool.buyerInfos[0].buyerAuthority = text;
        break;
      case Route.POOL_BUYER_2_SOL:
        ctx.session.createPool.buyerInfos[1].buyAmount = Number(text);
        break;
      case Route.POOL_BUYER_2_PRIVATE_KEY:
        ctx.session.createPool.buyerInfos[1].buyerAuthority = text;
        break;
      case Route.POOL_BUYER_3_SOL:
        ctx.session.createPool.buyerInfos[2].buyAmount = Number(text);
        break;
      case Route.POOL_BUYER_3_PRIVATE_KEY:
        ctx.session.createPool.buyerInfos[2].buyerAuthority = text;
        break;
      default:
        break;
    }
  } catch (err: any) {
    console.log(err);
  } finally {
    // ctx.session.step = 'IDLE';

    try {
      await ctx.api.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);
      await ctx.api.deleteMessage(
        ctx.chat!.id,
        ctx.update.message!.reply_to_message!.message_id,
      );
    } catch (err) {}

    // const walletsMessage = await generateWalletsMessage(ctx);
    // await ctx.api.editMessageText(
    //   ctx.chat!.id,
    //   ctx.session.topMsgId,
    //   walletsMessage,
    //   {
    //     parse_mode: 'HTML',
    //     reply_markup: createTokenMenu,
    //   },
    // );
  }
}

async function fireCreateMarketCbQH(ctx: MainContext) {
  try {
    // console.log(ctx.chat!.id);

    const marketInfo = await serviceOpenmarket.getOpenmarket(
      ctx.chat!.id,
      ctx.session.createPool.marketId,
    );
    if (!marketInfo) {
      await ctx.reply('🔴 Please enter Market ID.');
      return;
    }

    const tokenInfo = await serviceToken.getMintToken(
      ctx.chat!.id,
      marketInfo!.baseMint,
    );
    if (!tokenInfo) {
      await ctx.reply('🔴 Token information not found.');
      return;
    }

    const deployWallet = await getPrimaryWallet(ctx.chat!.id);
    if (!deployWallet) {
      await ctx.reply('🔴 Please select Primary Wallet.');
      return;
    }

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);
    if (!botSettings) {
      await ctx.reply('🔴 Please enter Bot settings.');
      return;
    }

    if (!ctx.session.createPool.tokenLiquidity) {
      await ctx.reply('🔴 Failed generate Bundle data.');
      return;
    }

    const bundleTip = LAMPORTS_PER_SOL * (botSettings.bundleTip || 0.0015);
    const solTxnTip = LAMPORTS_PER_SOL * (botSettings.solTxTip || 0.0001);

    const supply = tokenInfo!.supply;
    const quoteMint =
      marketInfo.quoteMint === 'SOL'
        ? QUOTE_ADDRESS.SOL_ADDRESS
        : QUOTE_ADDRESS.USDC_ADDRESS;

    const inputData: BundlerInputData = {
      createTokenInfo: {
        address: marketInfo!.baseMint,
        supply: tokenInfo!.supply,
      },
      marketSettings: {
        marketId: ctx.session.createPool.marketId,
        quoteTokenAddress: quoteMint,
        baseLogSize: ctx.session.createPool.baseLogSize,
        tickSize: ctx.session.createPool.tickSize,
      },
      bundleSetup: {
        baseliquidityAmount:
          supply * (ctx.session.createPool.amountOfPercentage / 100),
        quoteliquidityAmount: ctx.session.createPool.tokenLiquidity,
        bundleTip: bundleTip,
        deployWallet: deployWallet.privateKey,
        buyerCount: 3,
        buyers: [
          {
            id: ctx.session.createPool.buyerInfos[0].id,
            amount: ctx.session.createPool.buyerInfos[0].buyAmount,
            privateKey: ctx.session.createPool.buyerInfos[0].buyerAuthority,
          },
          {
            id: ctx.session.createPool.buyerInfos[1].id,
            amount: ctx.session.createPool.buyerInfos[1].buyAmount,
            privateKey: ctx.session.createPool.buyerInfos[1].buyerAuthority,
          },
          {
            id: ctx.session.createPool.buyerInfos[2].id,
            amount: ctx.session.createPool.buyerInfos[2].buyAmount,
            privateKey: ctx.session.createPool.buyerInfos[2].buyerAuthority,
          },
        ],
        blockEngin: bolckEngines[ctx.session.createPool.blockEngine],
      },
    };

    // const inputData: BundlerInputData = {
    //   createTokenInfo: {
    //     address: marketInfo!.baseMint, // '9uadnK9nZ9MoXuYP43jH4mEjdgy1F4qXnFHRRWVmWQbP',
    //     supply: supply,
    //   },
    //   marketSettings: {
    //     marketId: ctx.session.createPool.marketId,
    //     quoteTokenAddress: quoteMint,
    //     baseLogSize: 1,
    //     tickSize: 1,
    //   },
    //   bundleSetup: {
    //     baseliquidityAmount: supply,
    //     quoteliquidityAmount: 0.01,
    //     bundleTip: 1500000,

    //     deployWallet: deployWallet.privateKey,
    //     // '3LBufA58uyUpqP4noSijhGtadMG6TZoiBFKP5UTD1rivFZgtcbbRaPnFTSf1YqPCkoyJeSaZNPYkSkhRmkHPJ18U',
    //     buyerCount: 3,
    //     buyers: [
    //       {
    //         id: 0,
    //         amount: 0.001,
    //         privateKey:
    //           '2Dg2VAWQ2mZ1vZoYPnq8yiM5MD9eZq2hPwj5GDJy5GD8yQQAieSjd9RGrrDprdnjXsJGYNoeyY7EozssMr2yDvPt',
    //       },
    //       {
    //         id: 1,
    //         amount: 0.001,
    //         privateKey:
    //           '4cCMpMirkfwBy44W4PgGFM2ocDgVCocZzuCAZNMU6axbuHo7p4khZ12rdFsooFWtwzFARerCwR5kbjdEMuNeYpvN',
    //       },
    //       {
    //         id: 2,
    //         amount: 0.006,
    //         privateKey:
    //           '5WZWJSSndqLbWS8XoNGLKidY3eTKSjUcwsmXSqPRXA2VEm3DvFm4gfYs5Yqzh7r1hZ6AirHiKkvrcU2Fjo6sSocb',
    //       },
    //     ],
    //     blockEngin: 'amsterdam.mainnet.block-engine.jito.wtf',
    //   },
    // };

    const doBundle = await serviceLiquidityPool.launchLiquidityPool(
      inputData,
      solTxnTip,
    );

    console.log(doBundle);

    if (!doBundle) {
      throw '';
    } else if (doBundle.bundleRes && doBundle.bundleRes.bundleId) {
      await ctx.reply(
        `🟢 Success Transaction, check <a href='https://explorer.jito.wtf/bundle/${doBundle.bundleRes.bundleId}' target='_blank'>here</a>.
            Pool ID: ${doBundle.poolId}`,
        {
          parse_mode: 'HTML',
        },
      );

      await serviceLiquidityPool.saveLiquidityPool({
        chatId: ctx.chat!.id,
        poolId: doBundle.poolId,
        baseToken: inputData.createTokenInfo.address,
        quoteToken: inputData.marketSettings.quoteTokenAddress,
        tokenLiquidity: ctx.session.createPool.tokenLiquidity,
        amountOfPercentage: ctx.session.createPool.amountOfPercentage,
        buyerInfos: ctx.session.createPool.buyerInfos,
        blockEngine: ctx.session.createPool.blockEngine,
        deployWallet: deployWallet.publicKey,
        bundleId: doBundle.bundleRes?.bundleId,
      });
    } else {
      throw 'Bundle Failed.';
    }
  } catch (err: any) {
    console.log(err);
    await ctx.reply(`🔴 Transaction Failed : ${err}`);
  }
}
