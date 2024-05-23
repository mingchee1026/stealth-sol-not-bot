import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage, generateRemoveLPMessage } from './helpers';
import {
  serviceSettings,
  serviceWallets,
  serviceLiquidityPool,
  serviceRemovePool,
} from '@root/services';
import { command } from './constants';

export enum Route {
  BASE_TOKEN = 'REMOVE_LIQUIDITY|BASE_TOKEN',
}

const debug = Debug(`bot:remove liquidity`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const removeLiquidityMenu = new Menu<MainContext>('remove-liquidity-menu')
  .text((ctx) => ctx.t('label-token-address'), inputBaseTokenCbQH)
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
        const message = await generateRemoveLPMessage(ctx);
        ctx.editMessageText(message, { parse_mode: 'HTML' });
      } catch (err) {
        if (err) {
          console.log(err);
        }
      }
    },
  )
  .row()
  .text((ctx) => ctx.t('label-remove-liquidity'), fireRemoveLiquidityCbQH);
// .row()
// .text('🔙  Close', doneCbQH);
// .back('🔙  Close', async (ctx) => {
//   const welcomeMessage = await generateWelcomeMessage(ctx);
//   await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
// });

bot.use(removeLiquidityMenu);

bot.command(command.REMOVE, removeLiquidityCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.BASE_TOKEN, fireRouteHandler);

bot.use(router);

export { bot, removeLiquidityMenu };

export async function removeLiquidityCommandHandler(ctx: MainContext) {
  ctx.session.topMsgId = 0;
  const message = await generateRemoveLPMessage(ctx);
  const ret = await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: removeLiquidityMenu,
  });
  ctx.session.removeLiquidity.msgId = ret.message_id;
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

async function fireRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    switch (ctx.session.step) {
      case Route.BASE_TOKEN:
        ctx.session.removeLiquidity.tokenAddress = text;
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
      debug(
        'ctx.session.removeLiquidity.msgId',
        ctx.session.removeLiquidity.msgId,
      );

      const message = await generateRemoveLPMessage(ctx);

      if (ctx.session.topMsgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.topMsgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: removeLiquidityMenu,
          },
        );
      }

      if (ctx.session.removeLiquidity.msgId > 0) {
        await ctx.api.editMessageText(
          ctx.chat!.id,
          ctx.session.removeLiquidity.msgId,
          message,
          {
            parse_mode: 'HTML',
            reply_markup: removeLiquidityMenu,
          },
        );
      }
    } catch (err) {}
  }
}

async function fireRemoveLiquidityCbQH(ctx: MainContext) {
  let processMessageId = 0;
  try {
    const pool = await serviceLiquidityPool.getLiquidityPool(
      ctx.chat!.id,
      ctx.session.removeLiquidity.tokenAddress,
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

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);

    const msg = await ctx.reply(
      'Token remove in progress. Please wait a moment...',
    );

    processMessageId = msg.message_id;

    const res = await serviceRemovePool.removeLiquidityPool(
      walletPrivateKey,
      poolId,
      botSettings?.solTxTip || 0.0001,
    );

    if (res.Ok) {
      const message = `🟢 Successfully removed, Check <a href="https://explorer.solana.com/tx/${res.tx}">here</a>.`;
      if (processMessageId > 0) {
        await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
          parse_mode: 'HTML',
        });
      } else {
        await ctx.reply(message, { parse_mode: 'HTML' });
      }
    } else {
      throw res.err;
    }
  } catch (err: any) {
    const message = '🔴 Failed remove Liquidity Pool.';
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
  ctx.session.removeLiquidity.tokenAddress = '';
};

const isInitialized = (ctx: MainContext) => {
  if (ctx.session.removeLiquidity.tokenAddress !== '') {
    return false;
  }
  return true;
};
