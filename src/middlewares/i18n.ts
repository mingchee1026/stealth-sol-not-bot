import { I18n } from '@grammyjs/i18n';
import { MainContext } from '@root/configs/context';

const defaultLanguage = 'en';

const params = {
  directory: 'locales',
  defaultLanguage: defaultLanguage,
  defaultLanguageOnMissing: true,
  sessionName: 'session',
  useSession: true,
  allowMissing: false,
  templateData: {
    uppercase: (value: string) => value.toUpperCase(),
  },
};

const i18n = new I18n<MainContext>(params);

export const locales = ['en'];

export default i18n;
