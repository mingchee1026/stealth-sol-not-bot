import { Bot, session } from 'grammy';
import { FileAdapter } from '@grammyjs/storage-file';
import { MemorySessionStorage } from 'grammy';
import { MainContext, SessionData, initialData } from '../context';

export default function initSession(bot: Bot<MainContext>): void {
  // Middleware for managing sessions on bot
  bot.use(
    session({
      initial: initialData,
      // storage: new FileAdapter<SessionData>(),
      storage: new MemorySessionStorage<SessionData>(48 * 60 * 60 * 1000),
    }),
  );
}
