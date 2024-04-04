import { type Conversation } from '@grammyjs/conversations';
import { MainContext } from '../context';
import LiquidityPool from '@root/models/liquidity-pool-model';

type MyConversation = Conversation<MainContext>;

async function createLiquidityPoolConvo(
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
    await savePoolData(ctx.session.bundleId, ctx.session.step, message.text);
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

async function savePoolData(bundleId: string, field: string, value: any) {
  const existingPool = await LiquidityPool.findOne({
    bundleId,
  });

  if (!existingPool) {
    return;
  }

  if (field === 'msg-input-base-token') {
    existingPool.baseToken = value;
  } else if (field === 'msg-input-quote-token') {
    existingPool.quoteToken = value;
  } else if (field === 'msg-input-quote-token-liquidity') {
    existingPool.tokenLiquidity = value;
  } else if (field === 'msg-input-deploy-private-key') {
    existingPool.deployWallet = value;
  } else if (field === 'msg-input-buyer1-sol-amount') {
    existingPool.buyerInfos[0].buyAmount = value;
  } else if (field === 'msg-input-buyer1-private-key') {
    existingPool.buyerInfos[0].buyerAuthority = value;
  } else if (field === 'msg-input-buyer2-sol-amount') {
    existingPool.buyerInfos[1].buyAmount = value;
  } else if (field === 'msg-input-buyer2-private-key') {
    existingPool.buyerInfos[1].buyerAuthority = value;
  } else if (field === 'msg-input-buyer3-sol-amount') {
    existingPool.buyerInfos[2].buyAmount = value;
  } else if (field === 'msg-input-buyer3-private-key') {
    existingPool.buyerInfos[2].buyerAuthority = value;
  }

  await LiquidityPool.updateOne({ bundleId: bundleId }, existingPool);
}

export default createLiquidityPoolConvo;
