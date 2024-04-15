import 'dotenv/config';

import { ENV } from '@root/configs';
import mongoose from 'mongoose';

import * as bot from './bot';
import connectDatabase from '@root/configs/connectDatabase';
class SubstrateBot {
  runnerHandle: any;

  constructor() {
    this.runnerHandle = null;
  }

  async run() {
    // Connect to mongodb
    await connectDatabase(ENV.MONGODB_URI);

    const ret = await bot.start();
    this.runnerHandle = ret.runnerHandle;
  }

  async stop() {
    await this.runnerHandle.stop();
    console.log('Bot stopped ✅');
    await mongoose.connection.close(false);
    console.log('MongoDb connection closed ✅');
    process.exit(0);
  }
}

let substrateBot: SubstrateBot;
async function main() {
  substrateBot = new SubstrateBot();
  await substrateBot.run();

  process.once('SIGINT', () => {
    if (substrateBot) {
      substrateBot.stop();
    }
  });

  process.once('SIGTERM', () => {
    if (substrateBot) {
      substrateBot.stop();
    }
  });
}

main();
