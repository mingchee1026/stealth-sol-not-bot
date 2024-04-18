import { Schema, model } from 'mongoose';

interface IToken {
  chatId: number;
  name: string;
  symbol: string;
  decimals: number;
  supply: number;
  image: string;
  description: string;
  socialLinks: {
    website: string;
    twitter: string;
    telegram: string;
    discord: string;
  };
  immutable: boolean;
  revokeMint: boolean;
  revokeFreeze: boolean;
  deployWallet: string;
  mintAddress: string;
  txAddress: string;
  timestamp: Date;
}

const tokenSchema = new Schema<IToken>({
  chatId: { type: Number, required: true },
  name: { type: String, require: false },
  symbol: { type: String, require: false },
  decimals: { type: Number, require: false },
  supply: { type: Number, require: false },
  image: { type: String, require: false },
  description: { type: String, require: false },
  socialLinks: {
    website: { type: String, require: false },
    twitter: { type: String, require: false },
    telegram: { type: String, require: false },
    discord: { type: String, require: false },
  },
  immutable: { type: Boolean, require: false },
  revokeMint: { type: Boolean, require: false },
  revokeFreeze: { type: Boolean, require: false },
  deployWallet: { type: String, require: false },
  mintAddress: { type: String, required: false },
  txAddress: { type: String, required: false },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Token = model<IToken>('Token', tokenSchema);

export default Token;
