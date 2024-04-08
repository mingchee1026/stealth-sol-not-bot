import { MenuTemplate, getMenuOfPath } from 'grammy-inline-menu';
import { MainContext } from '../context';
import menuBack from './general';

const menu = new MenuTemplate<MainContext>(async (ctx) => {
  return 'Input informations to create Token:';
});

menu.interact('token-name', {
  text: 'Token Name',
  do: async (ctx, path) => {
    return true;
  },
});

menu.interact('token-symbol', {
  text: 'Token Symbol',
  do: async (ctx, path) => {
    return true;
  },
  joinLastRow: true,
});

menu.interact('token-decimals', {
  text: 'Decimals',
  async do(ctx, path) {
    return true;
  },
});

menu.interact('token-supply', {
  text: 'Token Supply',
  do: async (ctx, path) => {
    return true;
  },
  joinLastRow: true,
});

menu.interact('logo-url', {
  text: 'Logo URL',
  do: async (ctx, path) => {
    return true;
  },
});

menu.interact('token-website', {
  text: 'Website',
  do: async (ctx, path) => {
    return true;
  },
});

menu.interact('token-twitter', {
  text: 'Twitter',
  do: async (ctx, path) => {
    return true;
  },
  joinLastRow: true,
});

menu.interact('token-telegram', {
  text: 'Telegram',
  do: async (ctx, path) => {
    return true;
  },
});

menu.interact('token-discord', {
  text: 'Discord',
  do: async (ctx, path) => {
    return true;
  },
  joinLastRow: true,
});

menu.interact('deploy-wallet', {
  text: 'Deploy Wallet (Private Key)',
  do: async (ctx, path) => {
    return true;
  },
});

menu.interact('create-token', {
  text: 'Create Token',
  do: async (ctx, path) => {
    return true;
  },
});

menu.manualRow(menuBack);

export default menu;
