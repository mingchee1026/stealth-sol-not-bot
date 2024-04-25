import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateBurnTokensMessage } from './helpers';
import { serviceSettings, serviceWallets } from '@root/services';
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
        ctx.editMessageText(message);
      }
    },
  )
  .text(async (ctx: any) => {
    const value = ctx.session.burnLiquidity.burnAmount;
    return `${value < 100 ? '✅ ' : ''} X%`;
  }, inputBurnAmountCbQH)
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
    console.log(ctx.session.burnLiquidity);
    console.log(ctx.chat!.id, ctx.session.burnLiquidity.tokenAddress);
    const mintToken = await serviceToken.getMintToken(
      ctx.chat!.id,
      ctx.session.burnLiquidity.tokenAddress,
    );
    if (!mintToken) {
      await ctx.reply('🔴 Token information not found.');
      return;
    }

    const primaryWallet = await serviceWallets.getPrimaryWallet(ctx.chat!.id);
    if (!primaryWallet) {
      await ctx.reply('🔴 Please select Primary Wallet.');
      return;
    }

    const botSettings = await serviceSettings.getSettings(ctx.chat!.id);

    const msg = await ctx.reply(
      'Token burn in progress. Please wait a moment...',
    );

    processMessageId = msg.message_id;

    const walletPrivateKey = primaryWallet.privateKey;
    const mintAddress = mintToken.mintAddress;
    const mintSupply = mintToken.supply;
    const mintDecimals = mintToken.decimals;
    const burnPercent = ctx.session.burnLiquidity.burnAmount;

    const res = await serviceBurnTokens.burnTokens(
      walletPrivateKey,
      mintAddress,
      mintSupply,
      mintDecimals,
      burnPercent,
      botSettings?.solTxTip || 0.0001,
    );

    if (!res) {
      throw 'Failed burn';
    }

    const message = `🔥 Successful burn, Check <a href="https://explorer.solana.com/tx/${res.txid}">here</a>.`;
    if (processMessageId > 0) {
      await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(message, { parse_mode: 'HTML' });
    }
  } catch (err: any) {
    const message = '🔴 Failed to burn tokens.';
    if (processMessageId > 0) {
      await ctx.api.editMessageText(ctx.chat!.id, processMessageId, message, {
        parse_mode: 'HTML',
      });
    } else {
      await ctx.reply(message);
    }
  }
}
