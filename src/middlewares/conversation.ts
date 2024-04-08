import { Bot } from 'grammy';
import { conversations, createConversation } from '@grammyjs/conversations';
import { MainContext } from '@root/context';
import createLiquidityPoolConvo from '@root/conversations/create-liquidity-pool-convo';
import setOpenMarketConvo from '@root/conversations/set-open-market-convo';

export default function initConversation(bot: Bot<MainContext>): void {
  // Middleware for managing sessions on bot
  bot.use(conversations());
  //   bot.use(createConversation(createTokenConvo, 'create-token-convo'));
  bot.use(createConversation(setOpenMarketConvo, 'set-open-market-convo'));
  bot.use(
    createConversation(createLiquidityPoolConvo, 'create-liquidity-pool-convo'),
  );
}
