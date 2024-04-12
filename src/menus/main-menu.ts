import { MenuTemplate } from 'grammy-inline-menu';

import { MainContext } from '../context';
import liquidityPoolMenu from './create-liquidity-pool-menu';
import createTokenMenu from './create-token-menu';
import openMarketMenu from './open-market-menu';

const mainMenu = new MenuTemplate<MainContext>((ctx) => {
  return ctx.t('main-greetings', {
    name: ctx.from!.first_name,
    parse_mode: 'HTML',
  });
});

mainMenu.submenu('token-creator', createTokenMenu, {
  text: 'Create Token',
});

mainMenu.submenu('openmarket-creator', openMarketMenu, {
  text: 'Create Market',
  joinLastRow: true,
});

mainMenu.submenu('token-liquidity-pool', liquidityPoolMenu, {
  text: 'Add Liquidity & Snipe',
});

mainMenu.submenu('remove-LP', createTokenMenu, {
  text: 'Remove LP',
});

mainMenu.submenu('burn-tokens', openMarketMenu, {
  text: 'Burn Tokens',
  joinLastRow: true,
});

mainMenu.submenu('wallet', createTokenMenu, {
  text: 'Wallet',
});

mainMenu.submenu('bot-settings', openMarketMenu, {
  text: 'Bot Settings',
  joinLastRow: true,
});

mainMenu.submenu('help-faq', createTokenMenu, {
  text: 'Help / FAQ',
});

export default mainMenu;
