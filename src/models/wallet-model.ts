import { Schema, model } from 'mongoose';

export interface IWallet {
  chatId: number;
  privateKey: string;
  publicKey: string;
  isPrimary: boolean;
  balance?: number;
  timestamp?: Date;
}

const walletSchema = new Schema<IWallet>({
  chatId: {
    type: Number,
    required: true,
  },
  privateKey: {
    type: String,
    required: true,
  },
  publicKey: {
    type: String,
    required: true,
  },
  isPrimary: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const Wallet = model<IWallet>('Wallet', walletSchema);

export default Wallet;
