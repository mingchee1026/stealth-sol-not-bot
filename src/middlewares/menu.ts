import { Bot } from 'grammy';
import { MenuMiddleware } from 'grammy-inline-menu';
import { v4 as uuidv4 } from 'uuid';

import { MainContext, initialData } from '../context';
import { mainMenu } from '../menus';
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
      const tokenMintId = uuidv4();
      menuMiddleware.replyToContext(ctx);

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
      ctx.session.dbField = '';
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
