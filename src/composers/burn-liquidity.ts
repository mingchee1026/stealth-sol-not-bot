import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage, generateBurnTokensMessage } from './helpers';
import {
  serviceLiquidityPool,
  serviceSettings,
  serviceWallets,
} from '@root/services';
import { serviceToken } from '@root/services';
import { serviceBurnTokens } from '@root/services';
import { command } from './constants';

export enum Route {
  BASE_TOKEN = 'BURN_TOKENS|BASE_TOKEN',
  BURN_AMOUNT = 'BURN_TOKENS|BURN_AMOUNT',
}

const debug = Debug(`bot:create openmarket`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const burnLiquidityMenu = new Menu<MainContext>('burn-liquidity-menu')
  .text((ctx) => ctx.t('label-token-address'), inputBaseTokenCbQH)
  .row()
  .text(
    (ctx) => `--- ${ctx.t('label-base-amount')} ---`,
    (ctx) => {
      return true;
    },
  )
  .row()
  .text(
    async (ctx: any) => {
      const value = ctx.session.burnLiquidity.burnAmount;
      return `${value === 100 ? '✅ ' : ''} 100%`;
    },
    async (ctx: any) => {
      if (ctx.session.burnLiquidity.burnAmount !== 100) {
        ctx.session.burnLiquidity.burnAmount = 100;
        const message = await generateBurnTokensMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      }
    },
  )
  .text(async (ctx: any) => {
    const value = ctx.session.burnLiquidity.burnAmount;
    return `${value < 100 ? '✅ ' : ''} X%`;
  }, inputBurnAmountCbQH)
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
        const message = await generateBurnTokensMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      } catch (err) {
        if (err) {
          console.log(err);
        }
      }
    },
  )
  .row()
  .text((ctx) => ctx.t('label-burn-liquidity'), fireBurnLiquidityCbQH);
// .row()
// .text('🔙  Close', doneCbQH);
// .back('🔙  Close', async (ctx) => {
//   const welcomeMessage = await generateWelcomeMessage(ctx);
//   await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
// });

bot.use(burnLiquidityMenu);

bot.command(command.BURN, burnLiquidityCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.BASE_TOKEN, fireBurnLiquidityRouteHandler);
router.route(Route.BURN_AMOUNT, fireBurnLiquidityRouteHandler);

bot.use(router);

export { bot, burnLiquidityMenu };

export async function burnLiquidityCommandHandler(ctx: MainContext) {
  debug('burnLiquidityCommandHandler');
  ctx.session.topMsgId = 0;
  const message = await generateBurnTokensMessage(ctx);
  const ret = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: burnLiquidityMenu,
  });
  ctx.session.burnLiquidity.msgId = ret.message_id;
}

async function inputBaseTokenCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.BASE_TOKEN;

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

async function inputBurnAmountCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.BURN_AMOUNT;

    ctx.session.burnLiquidity.burnAmount = 50;

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

async function fireBurnLiquidityRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    switch (ctx.session.step) {
      case Route.BASE_TOKEN:
        ctx.session.burnLiquidity.tokenAddress = text;
        break;
      case Route.BURN_AMOUNT:
        ctx.session.burnLiquidity.burnAmount = Number(text);
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
      debug('ctx.session.burnLiquidity.msgId', ctx.session.burnLiquidity.msgId);

      const message = await generateBurnTokensMessage(ctx);
      debug('fireBurnLiquidityRouteHandler');
      if (ctx.session.topMsgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.topMsgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: burnLiquidityMenu,
          },
        );
      }

      if (ctx.session.burnLiquidity.msgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.burnLiquidity.msgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: burnLiquidityMenu,
          },
        );
      }
    } catch (err) {}
  }
}

async function fireBurnLiquidityCbQH(ctx: MainContext) {
  let processMessageId = 0;
  try {
    const pool = await serviceLiquidityPool.getLiquidityPool(
      ctx.chat!.id,
      ctx.session.burnLiquidity.tokenAddress,
    );
    if (!pool) {
      await ctx.reply('🔴 Cannot find the target pool for Token.');
      return;
    }

    const primaryWallet = await serviceWallets.getPrimaryWallet(ctx.chat!.id);
    if (!primaryWallet) {
      await ctx.reply('🔴 Please select Primary Wallet.');
      return;
    }

    const walletPrivateKey = primaryWallet.privateKey;
    const poolId = pool.poolId;
    const burnPercent = ctx.session.burnLiquidity.burnAmount;

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);

    const msg = await ctx.reply(
      'Token burn in progress. Please wait a moment...',
    );

    processMessageId = msg.message_id;

    /*    const walletPrivateKey =
      '26cxXRQDbbtMFmviHXMxdFJRGX8CGAbVQxwsSYcge9hRhpFSGMp1so6LFstY7fRyyArGoGqg6uXGAPDbYA6zAxp8';
    const mintAddress = '8DwbunBFEDSebL1tWUFrgGHHspY6n4qaU1Qf6HEBF6Tp';
    const poolId = '100000000';
    const burnPercent = 5;
*/
    const res = await serviceBurnTokens.burnTokens(
      walletPrivateKey,
      poolId,
      burnPercent,
      botSettings?.solTxTip || 0.0001,
    );

    if (!res.Ok) {
      throw res.err;
    }

    const message = `🔥 Successful burn, Check <a href="https://explorer.solana.com/tx/${res.tx}">here</a>.`;
    if (processMessageId > 0) {
      await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (err: any) {
    const message = `🔴 ${err}`;
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
  ctx.session.burnLiquidity.tokenAddress = '';
  ctx.session.burnLiquidity.burnAmount = 100;
};

const isInitialized = (ctx: MainContext) => {
  if (
    ctx.session.burnLiquidity.tokenAddress !== '' ||
    ctx.session.burnLiquidity.burnAmount !== 100
  ) {
    return false;
  }
  return true;
};
