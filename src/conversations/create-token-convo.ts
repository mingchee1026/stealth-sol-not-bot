import { type Conversation } from '@grammyjs/conversations';
import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

import { MainContext } from '@root/context';
import Token from '@root/models/token-model';

type MyConversation = Conversation<MainContext>;

async function createTokenConvo(
  conversation: MyConversation,
  ctx: MainContext,
) {
  console.log(`current step: ${ctx.session.bundleId} ${ctx.session.step}`);
  const res = await ctx.reply(ctx.t(ctx.session.step), {
    parse_mode: 'HTML',
    reply_markup: { force_reply: true },
  });

  // do {
  const { message } = await conversation.wait();
  /*  if (ctx.session.step === 'msg-input-token-logo') {
    if (message?.document) {
      const file = await ctx.api.getFile(message.document.file_id);
      const path = (await file.file_path) || '';
      const fileName = message?.document.file_name || '';

      await saveLogoImage(
        ctx.session.bundleId,
        ctx.session.step,
        path,
        fileName,
      );
    }
  }
*/
  if (message?.text) {
    // await saveTokenData(ctx.session.bundleId, ctx.session.step, message.text);
    await saveTokenInfo(conversation, ctx.session.step, message.text);
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

async function saveTokenInfo(
  conversation: MyConversation,
  field: string,
  value: any,
) {
  if (field === 'msg-input-token-name') {
    conversation.session.createToken.name = value;
  } else if (field === 'msg-input-token-symbol') {
    conversation.session.createToken.symbol = value;
  } else if (field === 'msg-input-token-decimal') {
    conversation.session.createToken.decimals = value;
  } else if (field === 'msg-input-token-supply') {
    conversation.session.createToken.supply = value;
  } else if (field === 'msg-input-token-logo') {
    conversation.session.createToken.image = value;
  } else if (field === 'msg-input-token-description') {
    conversation.session.createToken.description = value;
  } else if (field === 'msg-input-token-website') {
    conversation.session.createToken.socials.website = value;
  } else if (field === 'msg-input-token-twitter') {
    conversation.session.createToken.socials.twitter = value;
  } else if (field === 'msg-input-token-telegram') {
    conversation.session.createToken.socials.telegram = value;
  } else if (field === 'msg-input-token-discord') {
    conversation.session.createToken.socials.discord = value;
  } else if (field === 'msg-input-token-immutable') {
    conversation.session.createToken.immutable = value;
  } else if (field === 'msg-input-token-revoke-mint') {
    conversation.session.createToken.revokeMint = value;
  } else if (field === 'msg-input-token-revoke-freeze') {
    conversation.session.createToken.revokeFreeze = value;
  }
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

async function saveLogoImage(
  bundle_id: string,
  step: string,
  file_path: string,
  file_name: string,
) {
  try {
    const fileUrl = `https://api.telegram.org/file/bot${process.env.BOT_TOKEN}/${file_path}`;
    console.log(fileUrl);
    const response = await axios.get(fileUrl, { responseType: 'stream' });
    const filePath = path.join(`${file_name}`);
    const fileStream = fs.createWriteStream(filePath);
    response.data.pipe(fileStream);
    fileStream.on('finish', async () => {
      const destinationFileName = `${Date.now()}_${file_name}`;
      // Move the uploaded file to the specified folder
      const destinationPath = path.join('./src/images', destinationFileName);
      fs.renameSync(filePath, destinationPath);

      await saveTokenData(bundle_id, step, destinationPath);
    });
  } catch (error) {
    console.error(error);
    // bot.sendMessage(chatId, 'Error processing the uploaded file.');
  }
}

export default createTokenConvo;
