import mongoose from 'mongoose';

const connectDatabase = async (uri: string): Promise<void> => {
  try {
    await mongoose.connect(uri);
    console.log('Connected to MongoDB ✅');
  } catch (error) {
    console.log('MongoDB connection error:', error);
  }
};

export default connectDatabase;
