import { Schema, model } from 'mongoose';

interface IUser {
  chatId: number;
  username: string;
  timestamp: Date;
}

const userSchema = new Schema<IUser>({
  chatId: {
    type: Number,
    required: true,
  },
  username: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const User = model<IUser>('User', userSchema);

export default User;
