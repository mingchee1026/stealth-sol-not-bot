import { Bot } from 'grammy';
import { I18n } from '@grammyjs/i18n';
import { MainContext } from '../context';

export default function initI18n(bot: Bot<MainContext>): void {
  // Create an instance of I18n
  const i18n = new I18n<MainContext>({
    defaultLocale: 'id',
    directory: 'locales',
  });

  bot.use(i18n);
}
