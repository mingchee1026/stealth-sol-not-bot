import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage, generateCreateMarketMessage } from './helpers';
import { getPrimaryWallet } from '@root/services/wallet-service';
import {
  serviceSettings,
  serviceOpenmarket,
  serviceToken,
} from '@root/services';
import { saveOpenmarket } from '@root/services/market-service';
import { QUOTE_ADDRESS } from '@root/configs';
import { command } from './constants';

export enum Route {
  MARKET_BASE_TOKEN = 'CREATE_MARKET|MARKET_BASE_TOKEN',
  MARKET_QUOTE_TOKEN = 'CREATE_MARKET|MARKET_QUOTE_TOKEN',
  MARKET_LOT_SIZE = 'CREATE_MARKET|MARKET_LOT_SIZE',
  MARKET_TICK_SIZE = 'CREATE_MARKET|MARKET_TICK_SIZE',
  MARKET_EVENT_LENGTH = 'CREATE_MARKET|MARKET_EVENT_LENGTH',
  MARKET_REQUEST_LENGTH = 'CREATE_MARKET|MARKET_REQUEST_LENGTH',
  MARKET_ORDERBOOK_LENGTH = 'CREATE_MARKET|MARKET_ORDERBOOK_LENGTH',
}

const debug = Debug(`bot:create openmarket`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const createMarketMenu = new Menu<MainContext>('create-market-menu')
  .text((ctx) => ctx.t('label-token-address'), inputBaseTokenCbQH)
  .row()
  .text(
    (ctx) => `--- ${ctx.t('label-quote-token')} ---`,
    (ctx: any) => {
      return false;
    },
  )
  .row()
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.quoteMint;
      return `${value === 'SOL' ? '✅ ' : ''} SOL`;
    },
    async (ctx: any) => {
      if (ctx.session.createMarket.quoteMint !== 'SOL') {
        ctx.session.createMarket.quoteMint = 'SOL';
        const message = await generateCreateMarketMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      }
    },
  )
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.quoteMint;
      return `${value === 'USDC' ? '✅ ' : ''} USDC`;
    },
    async (ctx: any) => {
      if (ctx.session.createMarket.quoteMint !== 'USDC') {
        ctx.session.createMarket.quoteMint = 'USDC';
        const message = await generateCreateMarketMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      }
    },
  )
  .row()
  .submenu((ctx) => ctx.t('label-lot-size'), 'custom-lot-menu')
  .submenu((ctx) => ctx.t('label-tick-size'), 'custom-tick-menu')
  .row()
  .text(
    (ctx) => `--- ${ctx.t('label-advance-options')} ---`,
    (ctx: any) => {
      return false;
    },
  )
  .row()
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.marketPrice;
      return `${value === 0.4 ? '✅ ' : ''} 0.4 SOL`;
    },
    async (ctx: any) => {
      if (ctx.session.createMarket.marketPrice !== 0.4) {
        ctx.session.createMarket.marketPrice = 0.4;
        ctx.session.createMarket.eventLength = 128;
        ctx.session.createMarket.requestLength = 9;
        ctx.session.createMarket.orderbookLength = 201;
        const message = await generateCreateMarketMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      }
    },
  )
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.marketPrice;
      return `${value === 1.5 ? '✅ ' : ''} 1.5 SOL`;
    },
    async (ctx: any) => {
      if (ctx.session.createMarket.marketPrice !== 1.5) {
        ctx.session.createMarket.marketPrice = 1.5;
        ctx.session.createMarket.eventLength = 1400;
        ctx.session.createMarket.requestLength = 63;
        ctx.session.createMarket.orderbookLength = 450;
        const message = await generateCreateMarketMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      }
    },
  )
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.marketPrice;
      return `${value === 2.8 ? '✅ ' : ''} 2.8 SOL`;
    },
    async (ctx: any) => {
      if (ctx.session.createMarket.marketPrice !== 2.8) {
        ctx.session.createMarket.marketPrice = 2.8;
        ctx.session.createMarket.eventLength = 2978;
        ctx.session.createMarket.requestLength = 63;
        ctx.session.createMarket.orderbookLength = 909;
        const message = await generateCreateMarketMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      }
    },
  )
  .row()
  .text((ctx) => ctx.t('label-event-length'), inputEventLengthCbQH)
  .text((ctx) => ctx.t('label-request-length'), inputRequestLengthCbQH)
  .row()
  .text((ctx) => ctx.t('label-orderbook-length'), inputOrderbookLengthCbQH)
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
        const message = await generateCreateMarketMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      } catch (err) {
        if (err) {
          console.log(err);
        }
      }
    },
  )
  .row()
  .text((ctx) => ctx.t('label-create-openpool-market'), fireCreateMarketCbQH);
// .row()
// .text('❌🔙  Close', doneCbQH);
// .back('🔙  Close', async (ctx) => {
//   const welcomeMessage = await generateWelcomeMessage(ctx);
//   await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
// });

const customLotMenu = new Menu<MainContext>('custom-lot-menu')
  .back('100', async (ctx) => {
    ctx.session.createMarket.baseLogSize = 100;
    const message = await generateCreateMarketMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .back('1000', async (ctx) => {
    ctx.session.createMarket.baseLogSize = 1000;
    const message = await generateCreateMarketMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .text((ctx) => ctx.t('label-custom'), inputLotSizeCbQH)
  .row()
  .back('🔙  Go back');

const customTickMenu = new Menu<MainContext>('custom-tick-menu')
  .back('0.0000001', async (ctx) => {
    ctx.session.createMarket.tickSize = 0.0000001;
    const message = await generateCreateMarketMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .back('0.00000001', async (ctx) => {
    ctx.session.createMarket.tickSize = 0.00000001;
    const message = await generateCreateMarketMessage(ctx);
    ctx.editMessageText(message, { parse_mode: 'HTML' });
  })
  .row()
  .text((ctx) => ctx.t('label-custom'), inputTickSizeCbQH)
  .row()
  .back('🔙  Go back');

createMarketMenu.register(customLotMenu);
createMarketMenu.register(customTickMenu);

bot.use(createMarketMenu);

bot.command(command.CREATE_MARKET, createTokenCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.MARKET_BASE_TOKEN, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_LOT_SIZE, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_TICK_SIZE, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_EVENT_LENGTH, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_REQUEST_LENGTH, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_ORDERBOOK_LENGTH, fireMarketInfomationRouteHandler);

bot.use(router);

export { bot, createMarketMenu };

export async function createTokenCommandHandler(ctx: MainContext) {
  ctx.session.topMsgId = 0;
  const message = await generateCreateMarketMessage(ctx);
  const ret = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: createMarketMenu,
  });
  ctx.session.createMarket.msgId = ret.message_id;
}

async function inputBaseTokenCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.MARKET_BASE_TOKEN;

    await ctx.reply(`Enter Token Address:`, {
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
    ctx.session.step = Route.MARKET_LOT_SIZE;

    await ctx.reply(`Enter Minimum Buy (Order Size):`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err) {
    debug(err);
  }
}

async function inputTickSizeCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.MARKET_TICK_SIZE;

    await ctx.reply(`Enter Tick Size (Min Price Cgange):`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputEventLengthCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.MARKET_EVENT_LENGTH;

    await ctx.reply(`Enter ${ctx.t('label-event-length')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputRequestLengthCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.MARKET_REQUEST_LENGTH;

    await ctx.reply(`Enter ${ctx.t('label-request-length')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputOrderbookLengthCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.MARKET_ORDERBOOK_LENGTH;

    await ctx.reply(`Enter ${ctx.t('label-orderbook-length')}:`, {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function fireMarketInfomationRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    switch (ctx.session.step) {
      case Route.MARKET_BASE_TOKEN:
        const market = await serviceOpenmarket.getOpenmarketByToken(
          ctx.chat!.id,
          text,
        );

        if (market) {
          await ctx.reply('🔴 Token have already been used to create market.');
          return;
        }

        const baseToken = await serviceToken.getMintToken(ctx.chat!.id, text);
        if (!baseToken) {
          await ctx.reply('🔴 Token information not found.');
        } else {
          ctx.session.createMarket.baseMint = text;
          const supply = 90_000_000_000; //baseToken.supply;
          if (supply <= 100_000) {
            ctx.session.createMarket.baseLogSize = 0.01;
            ctx.session.createMarket.tickSize = 0.0001;
          } else if (supply <= 1_000_000) {
            ctx.session.createMarket.baseLogSize = 0.1;
            ctx.session.createMarket.tickSize = 0.00001;
          } else if (supply <= 10_000_000) {
            ctx.session.createMarket.baseLogSize = 1;
            ctx.session.createMarket.tickSize = 0.000001;
          } else if (supply <= 100_000_000) {
            ctx.session.createMarket.baseLogSize = 10;
            ctx.session.createMarket.tickSize = 0.0000001;
          } else if (supply <= 1_000_000_000) {
            ctx.session.createMarket.baseLogSize = 100;
            ctx.session.createMarket.tickSize = 0.00000001;
          } else if (supply <= 10_000_000_000) {
            ctx.session.createMarket.baseLogSize = 1000;
            ctx.session.createMarket.tickSize = 0.000000001;
          } else if (supply <= 100_000_000_000) {
            ctx.session.createMarket.baseLogSize = 10000;
            ctx.session.createMarket.tickSize = 0.0000000001;
          }
        }
        break;
      case Route.MARKET_LOT_SIZE:
        ctx.session.createMarket.baseLogSize = Number(text);
        break;
      case Route.MARKET_TICK_SIZE:
        ctx.session.createMarket.tickSize = Number(text);
        break;
      case Route.MARKET_EVENT_LENGTH:
        const value1 = Number(text);
        ctx.session.createMarket.eventLength =
          value1 < 128 ? 128 : value1 > 2978 ? 2978 : value1;
        break;
      case Route.MARKET_REQUEST_LENGTH:
        const value2 = Number(text);
        ctx.session.createMarket.requestLength =
          value2 < 9 ? 9 : value2 > 63 ? 63 : value2;
        break;
      case Route.MARKET_ORDERBOOK_LENGTH:
        const value3 = Number(text);
        ctx.session.createMarket.orderbookLength =
          value3 < 201 ? 201 : value3 > 909 ? 909 : value3;
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
      debug('ctx.session.createMarket.msgId', ctx.session.createMarket.msgId);

      const message = await generateCreateMarketMessage(ctx);

      if (ctx.session.topMsgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.topMsgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: createMarketMenu,
          },
        );
      }

      if (ctx.session.createMarket.msgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.createMarket.msgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: createMarketMenu,
          },
        );
      }
    } catch (err) {}
  }
}

async function fireCreateMarketCbQH(ctx: MainContext) {
  let processMessageId = 0;
  try {
    // console.log(ctx.session.createMarket);

    if (!ctx.session.createMarket.baseMint) {
      await ctx.reply('🔴 Please enter Token Address.');
      return;
    }

    const market = await serviceOpenmarket.getOpenmarketByToken(
      ctx.chat!.id,
      ctx.session.createMarket.baseMint,
    );

    if (market) {
      await ctx.reply('🔴 Token have already been used to create market.');
      return;
    }

    const deployWallet = await getPrimaryWallet(ctx.chat!.id);
    if (!deployWallet) {
      await ctx.reply('🔴 Please select Primary Wallet.');
      return;
    }

    const quoteMint =
      ctx.session.createMarket.quoteMint === 'SOL'
        ? QUOTE_ADDRESS.SOL_ADDRESS
        : QUOTE_ADDRESS.USDC_ADDRESS;

    const msg = await ctx.reply(
      'Market creating in progress. Please wait a moment...',
    );

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);

    processMessageId = msg.message_id;

    const ret = await serviceOpenmarket.createOpenMarket({
      baseMint: ctx.session.createMarket.baseMint,
      quoteMint,
      lotSize: ctx.session.createMarket.baseLogSize,
      tickSize: ctx.session.createMarket.tickSize,
      eventQueueLength: ctx.session.createMarket.eventLength,
      orderbookLength: ctx.session.createMarket.orderbookLength,
      requestQueueLength: ctx.session.createMarket.requestLength,
      deployWallet: deployWallet.privateKey,
      solTxnsTip: botSettings?.solTxTip || 0.0001,
    });

    if (!ret) {
      throw 'Failed create market';
    } else {
      const message = `
      🟢 Market successfully created.
          Market Id:       ${ret.marketId}
          Check <a href="https://openbook-explorer.xyz/market/${ret.marketId}">Market</a> and <a href="https://explorer.solana.com/tx/${ret.txSignature}">transaction</a>.`;

      if (processMessageId > 0) {
        await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
          parse_mode: 'HTML',
        });
      } else {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }

      await saveOpenmarket(
        ctx.chat!.id,
        ctx.session.createMarket.baseMint,
        ctx.session.createMarket.quoteMint,
        ctx.session.createMarket.baseLogSize,
        ctx.session.createMarket.tickSize,
        ctx.session.createMarket.eventLength,
        ctx.session.createMarket.requestLength,
        ctx.session.createMarket.orderbookLength,
        ret.marketId,
        ret.txSignature,
      );

      // initSessionData(ctx);
    }
  } catch (err: any) {
    const message = '🔴 Failed create market.';
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
  ctx.session.createMarket.baseMint = '';
  ctx.session.createMarket.quoteMint = 'SOL';
  ctx.session.createMarket.baseLogSize = 0;
  ctx.session.createMarket.tickSize = 0;
  ctx.session.createMarket.marketPrice = 0.4;
  ctx.session.createMarket.eventLength = 128;
  ctx.session.createMarket.requestLength = 9;
  ctx.session.createMarket.orderbookLength = 201;
};

const isInitialized = (ctx: MainContext) => {
  if (
    ctx.session.createMarket.baseMint !== '' ||
    ctx.session.createMarket.quoteMint !== 'SOL' ||
    ctx.session.createMarket.baseLogSize !== 0 ||
    ctx.session.createMarket.tickSize !== 0 ||
    ctx.session.createMarket.marketPrice !== 0.4 ||
    ctx.session.createMarket.eventLength !== 128 ||
    ctx.session.createMarket.requestLength !== 9 ||
    ctx.session.createMarket.orderbookLength !== 201
  ) {
    return false;
  }
  return true;
};
