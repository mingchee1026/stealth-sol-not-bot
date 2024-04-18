import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage } from './helpers';
import { getPrimaryWallet } from '@root/services/wallet-service';
import { CreateTokenInput } from '@root/web3';
import { serviceOpenmarket } from '@root/services';
import { saveOpenmarket } from '@root/services/market-service';
import { QUOTE_ADDRESS } from '@root/configs';

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
  .text((ctx) => `--- ${ctx.t('label-base-token')} ---`)
  .row()
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.quoteMint;
      return `${value === 'SOL' ? '✅ ' : ''} SOL`;
    },
    async (ctx: any) => {
      ctx.session.createMarket.quoteMint = 'SOL';
      ctx.menu.update();
    },
  )
  .text(
    async (ctx: any) => {
      const value = ctx.session.createMarket.quoteMint;
      return `${value === 'USDT' ? '✅ ' : ''} USDT`;
    },
    async (ctx: any) => {
      ctx.session.createMarket.quoteMint = 'USDT';
      ctx.menu.update();
    },
  )
  .row()
  .submenu((ctx) => ctx.t('label-lot-size'), 'custom-lot-menu')
  .submenu((ctx) => ctx.t('label-tick-size'), 'custom-tick-menu')
  .row()
  .text((ctx) => `--- ${ctx.t('label-advance-options')} ---`)
  .row()
  .text((ctx) => ctx.t('label-event-length'), inputEventLengthCbQH)
  .text((ctx) => ctx.t('label-request-length'), inputRequestLengthCbQH)
  .row()
  .text((ctx) => ctx.t('label-orderbook-length'), inputOrderbookLengthCbQH)
  .row()
  .text((ctx) => ctx.t('label-create-market'), fireCreateMarketCbQH)
  .row()
  // .text('🔙  Close', doneCbQH);
  .back('❌  Close', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  });

const customLotMenu = new Menu<MainContext>('custom-lot-menu')
  .back('100', async (ctx) => {
    ctx.session.createMarket.baseLogSize = 100;
  })
  .row()
  .back('1000', async (ctx) => {
    ctx.session.createMarket.baseLogSize = 1000;
  })
  .row()
  .text((ctx) => ctx.t('label-custom'), inputLotSizeCbQH)
  .row()
  .back('🔙  Go back');

const customTickMenu = new Menu<MainContext>('custom-tick-menu')
  .back('0.0000001', async (ctx) => {
    ctx.session.createMarket.tickSize = 0.0000001;
  })
  .row()
  .back('0.00000001', async (ctx) => {
    ctx.session.createMarket.tickSize = 0.00000001;
  })
  .row()
  .text((ctx) => ctx.t('label-custom'), inputTickSizeCbQH)
  .row()
  .back('🔙  Go back');

createMarketMenu.register(customLotMenu);
createMarketMenu.register(customTickMenu);

bot.use(createMarketMenu);

router.route('IDLE', (_, next) => next());
router.route(Route.MARKET_BASE_TOKEN, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_LOT_SIZE, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_TICK_SIZE, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_EVENT_LENGTH, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_REQUEST_LENGTH, fireMarketInfomationRouteHandler);
router.route(Route.MARKET_ORDERBOOK_LENGTH, fireMarketInfomationRouteHandler);

bot.use(router);

export { bot, createMarketMenu };

// export async function createTokenCommandHandler(ctx: MainContext) {
//   const welcomeMessage = await generateWalletsMessage(ctx);
//   await ctx.reply(welcomeMessage, {
//     parse_mode: 'HTML',
//     reply_markup: createTokenMenu,
//   });
// }

async function inputBaseTokenCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.MARKET_BASE_TOKEN;

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
    ctx.session.step = Route.MARKET_LOT_SIZE;

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
    ctx.session.step = Route.MARKET_TICK_SIZE;

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
        ctx.session.createMarket.baseMint = text;
        break;
      case Route.MARKET_LOT_SIZE:
        ctx.session.createMarket.baseLogSize = Number(text);
        break;
      case Route.MARKET_TICK_SIZE:
        ctx.session.createMarket.tickSize = Number(text);
        break;
      case Route.MARKET_EVENT_LENGTH:
        ctx.session.createMarket.eventLength = Number(text);
        break;
      case Route.MARKET_REQUEST_LENGTH:
        ctx.session.createMarket.requestLength = Number(text);
        break;
      case Route.MARKET_ORDERBOOK_LENGTH:
        ctx.session.createMarket.orderbookLength = Number(text);
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
    // console.log(ctx.session.createMarket);

    const deployWallet = await getPrimaryWallet(ctx.chat!.id);
    if (!deployWallet) {
      await ctx.reply('Please select Primary Wallet!');
      return;
    }

    const quoteMint =
      ctx.session.createMarket.quoteMint === 'SOL'
        ? QUOTE_ADDRESS.SOL_ADDRESS
        : ctx.session.createMarket.quoteMint === 'USDT'
          ? QUOTE_ADDRESS.USDT_ADDRESS
          : QUOTE_ADDRESS.USDC_ADDRESS;

    const ret = await serviceOpenmarket.createOpenMarket({
      baseMint: ctx.session.createMarket.baseMint,
      quoteMint,
      lotSize: ctx.session.createMarket.baseLogSize,
      tickSize: ctx.session.createMarket.tickSize,
      eventQueueLength: ctx.session.createMarket.eventLength,
      orderbookLength: ctx.session.createMarket.orderbookLength,
      requestQueueLength: ctx.session.createMarket.requestLength,
      deployWallet: deployWallet.privateKey,
      solTxnsTip: 0.0001,
    });

    if (!ret) {
      throw 'Failed create market';
    } else {
      await ctx.reply(
        `Market successfully created.
        Market Id:       ${ret.marketId}
        <a href="https://openbook-explorer.xyz/market/${ret.marketId}?network=devnet">To Market</a>
        Transaction URL: https://explorer.solana.com/tx/${ret.txSignature}`,
        { parse_mode: 'HTML' },
      );
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
  } catch (err: any) {
    await ctx.reply('Failed create market.');
  }
}
