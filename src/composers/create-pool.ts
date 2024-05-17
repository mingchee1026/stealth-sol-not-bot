import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage, generateCreatePoolMessage } from './helpers';
import { getPrimaryWallet } from '@root/services/wallet-service';
import {
  serviceSettings,
  serviceOpenmarket,
  serviceLiquidityPool,
  serviceToken,
} from '@root/services';
import { BundlerInputData } from '@root/configs/types';
import { QUOTE_ADDRESS } from '@root/configs';
import { command } from './constants';

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
  //     return `${value === 'USDC' ? '✅ ' : ''} USDC`;
  //   },
  //   async (ctx: any) => {
  //     ctx.session.createPool.quoteToken = 'USDC';
  //     ctx.menu.update();
  //   },
  // )
  // .row()
  .text((ctx) => ctx.t('label-liquidity-percent'), inputLiquidityPercentCbQH)
  .text((ctx) => ctx.t('label-liquidity-amount'), inputLiquidityAmountCbQH)
  .row()
  .text(
    (ctx) => `🛒 Buyers Information`,
    (ctx: any) => {
      return false;
    },
  )
  .row()
  .text('Buyer 1 Sol Account', inputBuyer1SolAmountCbQH)
  .text('Buyer 1 Private Key', inputBuyer1PrivateKeyCbQH)
  .row()
  .text('Buyer 2 Sol Account', inputBuyer2SolAmountCbQH)
  .text('Buyer 2 Private Key', inputBuyer2PrivateKeyCbQH)
  .row()
  .text('Buyer 3 Sol Account', inputBuyer3SolAmountCbQH)
  .text('Buyer 3 Private Key', inputBuyer3PrivateKeyCbQH)
  .row()
  .back('🔙 Back', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  })
  .text(
    (ctx) => '🗑 Clear Information',
    async (ctx: MainContext) => {
      const initialized = isInitialized(ctx);
      if (initialized) {
        return;
      }

      initSessionData(ctx);

      try {
        const message = await generateCreatePoolMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      } catch (err) {
        if (err) {
          console.log(err);
        }
      }
    },
  )
  .row()
  .text('⚡ Bundle', fireCreatePoolCbQH);
// .row()
// .text('❌🔙  Close', doneCbQH);
// .back('🔙  Close', async (ctx) => {
//   const welcomeMessage = await generateWelcomeMessage(ctx);
//   await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
// });

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

// createPoolMenu.register(customLotMenu);
// createPoolMenu.register(customTickMenu);

bot.use(createPoolMenu);

bot.command(command.CREATE_LIQUIDITY, createPoolCommandHandler);

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

export async function createPoolCommandHandler(ctx: MainContext) {
  ctx.session.topMsgId = 0;
  const message = await generateCreatePoolMessage(ctx);
  const ret = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: createPoolMenu,
  });
  ctx.session.createPool.msgId = ret.message_id;
}

async function inputMarketIdCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.POOL_MARKET_ID;

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
        const marketInfo = await serviceOpenmarket.getOpenmarketById(
          ctx.chat!.id,
          text,
        );
        if (!marketInfo) {
          await ctx.reply('🔴 Please enter the correct Market ID.');
          return;
        }
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
        let amountOfPercentage = Number(text);
        if (amountOfPercentage < 0.0001) {
          amountOfPercentage = 0.0001;
        }
        if (amountOfPercentage > 100) {
          amountOfPercentage = 100;
        }
        ctx.session.createPool.amountOfPercentage = amountOfPercentage;
        break;
      case Route.POOL_BUYER_1_SOL:
        if (ctx.session.createPool.buyerInfos[0]) {
          ctx.session.createPool.buyerInfos[0].amount = Number(text);
        } else {
          ctx.session.createPool.buyerInfos[0] = {
            id: 0,
            amount: Number(text),
            privateKey: '',
          };
        }
        break;
      case Route.POOL_BUYER_1_PRIVATE_KEY:
        if (ctx.session.createPool.buyerInfos[0]) {
          ctx.session.createPool.buyerInfos[0].privateKey = text;
        } else {
          ctx.session.createPool.buyerInfos[0] = {
            id: 0,
            amount: 0,
            privateKey: text,
          };
        }
        break;
      case Route.POOL_BUYER_2_SOL:
        if (ctx.session.createPool.buyerInfos[1]) {
          ctx.session.createPool.buyerInfos[1].amount = Number(text);
        } else {
          ctx.session.createPool.buyerInfos[1] = {
            id: 1,
            amount: Number(text),
            privateKey: '',
          };
        }
        break;
      case Route.POOL_BUYER_2_PRIVATE_KEY:
        if (ctx.session.createPool.buyerInfos[1]) {
          ctx.session.createPool.buyerInfos[1].privateKey = text;
        } else {
          ctx.session.createPool.buyerInfos[1] = {
            id: 1,
            amount: 0,
            privateKey: text,
          };
        }
        break;
      case Route.POOL_BUYER_3_SOL:
        if (ctx.session.createPool.buyerInfos[2]) {
          ctx.session.createPool.buyerInfos[2].amount = Number(text);
        } else {
          ctx.session.createPool.buyerInfos[2] = {
            id: 2,
            amount: Number(text),
            privateKey: '',
          };
        }
        break;
      case Route.POOL_BUYER_3_PRIVATE_KEY:
        if (ctx.session.createPool.buyerInfos[2]) {
          ctx.session.createPool.buyerInfos[2].privateKey = text;
        } else {
          ctx.session.createPool.buyerInfos[2] = {
            id: 2,
            amount: 0,
            privateKey: text,
          };
        }
        break;
      default:
        break;
    }
  } catch (err: any) {
    console.log(err);
  } finally {
    ctx.session.step = 'IDLE';

    try {
      await ctx.api.deleteMessage(ctx.chat!.id, ctx.msg!.message_id);
      await ctx.api.deleteMessage(
        ctx.chat!.id,
        ctx.update.message!.reply_to_message!.message_id,
      );

      debug('ctx.session.topMsgId', ctx.session.topMsgId);
      debug('ctx.session.createPool.msgId', ctx.session.createPool.msgId);

      const message = await generateCreatePoolMessage(ctx);

      if (ctx.session.topMsgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.topMsgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: createPoolMenu,
          },
        );
      }

      if (ctx.session.createPool.msgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.createPool.msgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: createPoolMenu,
          },
        );
      }
    } catch (err) {}
  }
}

async function fireCreatePoolCbQH(ctx: MainContext) {
  let processMessageId = 0;
  try {
    const marketInfo = await serviceOpenmarket.getOpenmarketById(
      ctx.chat!.id,
      ctx.session.createPool.marketId,
    );
    if (!marketInfo) {
      await ctx.reply('🔴 Please enter the correct Market ID.');
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

    if (!ctx.session.createPool.tokenLiquidity) {
      await ctx.reply('🔴 Please enter Token Liquidity.');
      return;
    }

    if (!ctx.session.createPool.amountOfPercentage) {
      await ctx.reply('🔴 Please enter Amount Percentage.');
      return;
    }

    if (ctx.session.createPool.buyerInfos.length === 0) {
      await ctx.reply('🔴 Please enter Buyers Information.');
      return;
    }

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);
    if (!botSettings) {
      await ctx.reply('🔴 Please enter Bot settings.');
      return;
    }

    const msg = await ctx.reply(
      'Pool creating in progress. Please wait a moment...',
    );

    processMessageId = msg.message_id;

    const bundleTip = botSettings.bundleTip || 0.0015;
    const solTxnTip = botSettings.solTxTip || 0.0001;

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
        buyerCount: ctx.session.createPool.buyerInfos.length,
        buyers: ctx.session.createPool.buyerInfos,
        blockEngin: bolckEngines[ctx.session.createPool.blockEngine],
      },
    };

    // console.log(inputData);

    const res = await serviceLiquidityPool.launchLiquidityPool(
      inputData,
      solTxnTip,
    );

    console.log('Create Pool Result:', res);

    if (!res) {
      throw 'Bundle Failed.';
    } else if (res.err) {
      throw res.err;
    } else if (
      res.poolId &&
      res.bundleId
      // doBundle.bundleRes.bundleId
    ) {
      const message = `
      🟢 Success Transaction, check <a href='https://explorer.jito.wtf/bundle/${res.bundleId}' target='_blank'>here</a>.
         Pool ID: ${res.poolId}`;

      if (processMessageId > 0) {
        await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
          parse_mode: 'HTML',
        });
      } else {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }

      await serviceLiquidityPool.saveLiquidityPool({
        chatId: ctx.chat!.id,
        poolId: res.poolId,
        baseToken: inputData.createTokenInfo.address,
        quoteToken: inputData.marketSettings.quoteTokenAddress,
        tokenLiquidity: ctx.session.createPool.tokenLiquidity,
        amountOfPercentage: ctx.session.createPool.amountOfPercentage,
        buyerInfos: ctx.session.createPool.buyerInfos,
        blockEngine: ctx.session.createPool.blockEngine,
        deployWallet: deployWallet.publicKey,
        bundleId: res.bundleRes?.bundleId,
      });

      // initSessionData(ctx);
    } else {
      throw 'Bundle Failed.';
    }
  } catch (err: any) {
    console.log(err);

    const message = `🔴 Transaction Failed : ${err}`;
    if (processMessageId > 0) {
      await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(message);
    }
  }
}

const initSessionData = (ctx: MainContext) => {
  ctx.session.createPool.marketId = '';
  ctx.session.createPool.tokenLiquidity = 0;
  ctx.session.createPool.amountOfPercentage = 0;
  ctx.session.createPool.buyerInfos = [];
};

const isInitialized = (ctx: MainContext) => {
  if (
    ctx.session.createPool.marketId !== '' ||
    ctx.session.createPool.tokenLiquidity !== 0 ||
    ctx.session.createPool.amountOfPercentage !== 0 ||
    ctx.session.createPool.buyerInfos.length !== 0
  ) {
    return false;
  }
  return true;
};
