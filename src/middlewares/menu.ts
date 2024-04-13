import { Bot } from 'grammy';
import { MenuMiddleware } from 'grammy-inline-menu';
import { v4 as uuidv4 } from 'uuid';

import { MainContext, initialData } from '@root/context';
import { mainMenu } from '@root/menus';
import User from '@root/models/user-model';
import Token from '@root/models/token-model';
import LiquidityPool from '@root/models/liquidity-pool-model';
import OpenMarket from '@root/models/open-market-model';

export default function initMenu(bot: Bot<MainContext>): void {
  // Create new menu middleware
  const menuMiddleware = new MenuMiddleware('/', mainMenu);

  // Add commands to the bot
  bot.command('start', async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    delete ctx.session.conversation;

    try {
      const chatId = ctx.chat.id;
      const username = ctx.from?.username;

      // Check if the user's wallet already exists in the database
      const existingUser = await User.findOne({ chatId });

      if (!existingUser) {
        // Save user wallet info to the database
        const user = new User({
          chatId,
          username,
        });

        user
          .save()
          .then(() => console.log('User info saved to the database'))
          .catch((error) =>
            console.error('Error saving user info to the database:', error),
          );
      }

      const tokenMintId = uuidv4();
      menuMiddleware.replyToContext(ctx);

      const newToken = new Token({
        chartId: ctx.chat?.id,
        bundleId: tokenMintId,
      });
      await newToken.save();

      const newPool = new LiquidityPool({
        chartId: ctx.chat?.id,
        bundleId: tokenMintId,
        buyerInfos: [
          { id: 1, buyAmount: 0, buyerAuthority: '' },
          { id: 2, buyAmount: 0, buyerAuthority: '' },
          { id: 3, buyAmount: 0, buyerAuthority: '' },
        ],
      });
      await newPool.save();

      const newMarket = new OpenMarket({
        chartId: ctx.chat?.id,
        bundleId: tokenMintId,
        baseLogSize: 0,
        tickSize: 0,
      });
      await newMarket.save();

      ctx.session.bundleId = tokenMintId;
    } catch (error) {
      console.log(error);
      ctx.reply('Something went wrong, please try again later');
    }
  });

  bot.command('reset', (ctx) => {
    ctx.session = initialData();
  });

  // Using menu middleware on bot
  bot.use(menuMiddleware);
}
