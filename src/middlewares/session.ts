import { session } from 'grammy';
import { MemorySessionStorage } from 'grammy';
import {
  SessionData,
  createInitialSessionData,
} from '@root/configs/sessiondata';

const initialSession = session({
  getSessionKey,
  initial: createInitialSessionData,
  // storage: new FileAdapter<SessionData>(),
  storage: new MemorySessionStorage<SessionData>(48 * 60 * 60 * 1000),
});

// Stores data per user-chat combination.
function getSessionKey(ctx: any): string | undefined {
  // Give every user their one personal session storage per chat with the bot
  // (an independent session for each group and their private chat)

  return ctx.from === undefined || ctx.chat === undefined
    ? undefined
    : `${ctx.from.id}_${ctx.chat.id}`;
}

export default initialSession;
