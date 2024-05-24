import Debug from 'debug';
import { Composer } from 'grammy';
import { Router } from '@grammyjs/router';
import { Menu } from '@grammyjs/menu';

import { MainContext } from '@root/configs/context';
import {
  saveSolTxTip,
  getSettings,
  saveBundleTip,
  saveAntiMev,
} from '@root/services/setting-service';
import { command } from './constants';
import { generateWelcomeMessage, generateSettingsMessage } from './helpers';

export enum Route {
  SOLANA_TX_TIP = 'SETTINGS|SOLANA_TX_TIP',
  BUNDLE_TX_TIP = 'SETTINGS|BUNDLE_TIP',
}

const debug = Debug(`bot:settings`);

const bot = new Composer<MainContext>();
const router = new Router<MainContext>((ctx) => ctx.session.step);

const settingsMenu = new Menu<MainContext>('settings-menu')
  .text((ctx) => ctx.t('label-solana-tx-tip'), inputSolanaTipCbQH)
  .row()
  .text((ctx) => ctx.t('label-bundle-tip'), inputBundleTipCbQH)
  .row()
  .text(
    async (ctx: any) => {
      const settings = await getSettings(ctx.chat.id);
      return `${settings?.isAntiMev ? '✅ ' : '❌ '} ${ctx.t('label-enable-anti-mev')}`;
    },
    async (ctx: any) => {
      await saveAntiMev(ctx.chat.id);
      ctx.menu.update();
    },
  )
  .row()
  // .text('❌  Close', doneCbQH);
  .back('🔙  Close', async (ctx) => {
    const welcomeMessage = await generateWelcomeMessage(ctx);
    await ctx.editMessageText(welcomeMessage, { parse_mode: 'HTML' });
  });

bot.use(settingsMenu);

bot.command(command.SETTINGS, settingsCommandHandler);

router.route('IDLE', (_, next) => next());
router.route(Route.SOLANA_TX_TIP, fireSolanaTipRouteHandler);
router.route(Route.BUNDLE_TX_TIP, fireBundleTipRouteHandler);

bot.use(router);

export { bot, settingsMenu };

export async function settingsCommandHandler(ctx: MainContext) {
  const message = await generateSettingsMessage(ctx);
  await ctx.reply(message, {
    parse_mode: 'HTML',
    reply_markup: settingsMenu,
  });
}

async function doneCbQH(ctx: MainContext) {
  ctx.session.step = 'IDLE';
  return ctx.deleteMessage();
}

async function inputSolanaTipCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.SOLANA_TX_TIP;

    await ctx.reply(ctx.t('settings-enter-sol-tip'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function inputBundleTipCbQH(ctx: MainContext) {
  try {
    ctx.session.step = Route.BUNDLE_TX_TIP;

    await ctx.reply(ctx.t('settings-enter-bundle-tip'), {
      parse_mode: 'HTML',
      reply_markup: {
        force_reply: true,
      },
    });
  } catch (err: any) {
    debug(err);
  }
}

async function fireSolanaTipRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    let solTip = Number(text);
    if (solTip < 0.0001) {
      solTip = 0.0001;
    }
    if (solTip > 3) {
      solTip = 3;
    }

    // Save solana tx tip info to the database
    await saveSolTxTip(ctx.chat!.id, solTip);
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

    const message = await generateSettingsMessage(ctx);
    await ctx.api.editMessageText(ctx.chat!.id, ctx.session.topMsgId, message, {
      parse_mode: 'HTML',
      reply_markup: settingsMenu,
    });
  }
}

async function fireBundleTipRouteHandler(ctx: MainContext) {
  try {
    const text = ctx.msg!.text as string;
    let bundleTip = Number(text);
    if (bundleTip < 0.0001) {
      bundleTip = 0.0001;
    }
    if (bundleTip > 3) {
      bundleTip = 3;
    }

    // Save bundle tip info to the database
    await saveBundleTip(ctx.chat!.id, bundleTip);
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

    const message = await generateSettingsMessage(ctx);
    await ctx.api.editMessageText(ctx.chat!.id, ctx.session.topMsgId, message, {
      parse_mode: 'HTML',
      reply_markup: settingsMenu,
    });
  }
}
