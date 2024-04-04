import { type Conversation } from '@grammyjs/conversations';
import { MainContext } from '../context';
import Token from '@root/models/token-model';

type MyConversation = Conversation<MainContext>;

async function createTokenConvo(
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
    await saveTokenData(ctx.session.bundleId, ctx.session.step, message.text);
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

async function saveTokenData(bundleId: string, field: string, value: any) {
  const existingToken = await Token.findOne({
    bundleId,
  });

  if (!existingToken) {
    return;
  }

  if (field === 'msg-input-token-name') {
    existingToken.name = value;
  } else if (field === 'msg-input-token-symbol') {
    existingToken.symbol = value;
  } else if (field === 'msg-input-token-decimal') {
    existingToken.decimal = value;
  } else if (field === 'msg-input-token-supply') {
    existingToken.supply = value;
  } else if (field === 'msg-input-token-logo') {
    existingToken.logo = value;
  } else if (field === 'msg-input-token-description') {
    existingToken.description = value;
  } else if (field === 'msg-input-token-website') {
    existingToken.website = value;
  } else if (field === 'msg-input-token-twitter') {
    existingToken.twitter = value;
  } else if (field === 'msg-input-token-telegram') {
    existingToken.telegram = value;
  } else if (field === 'msg-input-token-discord') {
    existingToken.discord = value;
  } else if (field === 'msg-input-token-deploy-wallet') {
    existingToken.deployWallet = value;
  }

  await Token.updateOne({ bundleId: bundleId }, existingToken);
}

export default createTokenConvo;
