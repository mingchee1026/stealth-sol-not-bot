import { Schema, model } from 'mongoose';

interface IToken {
  chartId: number;
  bundleId: string;
  name: string;
  symbol: string;
  decimal: number;
  supply: number;
  logo: string;
  description: string;
  website: string;
  twitter: string;
  telegram: string;
  discord: string;
  deployWallet: string;
  immutable: boolean;
  revokeMint: boolean;
  revokeFreeze: boolean;
  timestamp: Date;
}

const tokenSchema = new Schema<IToken>({
  chartId: { type: Number, required: true },
  bundleId: { type: String, required: true },
  name: { type: String, require: false },
  symbol: { type: String, require: false },
  decimal: { type: Number, require: false },
  supply: { type: Number, require: false },
  logo: { type: String, require: false },
  description: { type: String, require: false },
  website: { type: String, require: false },
  twitter: { type: String, require: false },
  telegram: { type: String, require: false },
  discord: { type: String, require: false },
  deployWallet: { type: String, require: false },
  immutable: { type: Boolean, require: false },
  revokeMint: { type: Boolean, require: false },
  revokeFreeze: { type: Boolean, require: false },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Token = model<IToken>('Token', tokenSchema);

export default Token;
