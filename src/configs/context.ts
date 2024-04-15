import type { Context, SessionFlavor } from 'grammy';
import { I18nFlavor } from '@grammyjs/i18n';
import { SessionData } from './sessiondata';

export type MainContext = Context & SessionFlavor<SessionData> & I18nFlavor;
