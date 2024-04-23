import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import { generateWelcomeMessage } from './helpers';
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
      ctx.session.burnLiquidity.burnAmount = 100;
      ctx.menu.update();
    },
  )
  .text(async (ctx: any) => {
    const value = ctx.session.burnLiquidity.burnAmount;
    return `${value < 100 ? '✅ ' : ''} X%`;
  }, inputBurnAmountCbQH)
  .row()
  .text((ctx) => ctx.t('label-burn-liquidity'), fireBurnLiquidityCbQH)
  .row()
  // .text('🔙  Close', doneCbQH);
  .back('🔙  Close', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  });

bot.use(burnLiquidityMenu);

bot.command(command.BURN, burnLiquidityCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.BASE_TOKEN, fireBurnLiquidityRouteHandler);
router.route(Route.BURN_AMOUNT, fireBurnLiquidityRouteHandler);

bot.use(router);

export { bot, burnLiquidityMenu };

export async function burnLiquidityCommandHandler(ctx: MainContext) {
  const message = ctx.t('burn-tokens-title');
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: burnLiquidityMenu,
  });
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

async function fireBurnLiquidityCbQH(ctx: MainContext) {
  let processMessageId = 0;
  try {
    console.log(ctx.session.burnLiquidity);

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
    const mintDecimals = mintToken.decimals;
    const burnPercent = ctx.session.burnLiquidity.burnAmount;

    const res = await serviceBurnTokens.burnTokens(
      walletPrivateKey,
      mintAddress,
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
