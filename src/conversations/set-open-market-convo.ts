import { type Conversation } from '@grammyjs/conversations';
import { MainContext } from '../context';
import OpenMarket from '@root/models/open-market-model';

type MyConversation = Conversation<MainContext>;

async function setOpenMarketConvo(
  conversation: MyConversation,
  ctx: MainContext,
) {
  console.log('current step:', ctx.chat?.id, ctx.session.bundleId);
  const res = await ctx.reply(ctx.t(ctx.session.step), {
    parse_mode: 'HTML',
    reply_markup: { force_reply: true },
    // reply_parameters: { message_id: ctx.msg?.message_id || 0 },
  });

  // do {
  const { message } = await conversation.wait();
  if (message?.text) {
    await saveMarketData(ctx.session.bundleId, ctx.session.step, message.text);
  } else {
    // await ctx.reply('Retry.');
  }
  // } while (!latlong);

  try {
    if (ctx.chat && message) {
      ctx.api.deleteMessage(ctx.chat?.id, res.message_id);
      ctx.api.deleteMessage(ctx.chat?.id, message?.message_id);
    }
  } catch (error) {
    console.log(error);
  }

  return;
}

async function saveMarketData(bundleId: string, field: string, value: any) {
  const existingMarket = await OpenMarket.findOne({
    bundleId,
  });

  if (!existingMarket) {
    return;
  }

  if (field === 'msg-input-market-base-lot-size') {
    existingMarket.baseLogSize = value;
  } else if (field === 'msg-input-market-tick-size') {
    existingMarket.tickSize = value;
  }

  await OpenMarket.updateOne({ bundleId: bundleId }, existingMarket);
}

export default setOpenMarketConvo;
