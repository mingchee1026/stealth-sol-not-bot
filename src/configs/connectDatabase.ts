import mongoose from 'mongoose';

const connectDatabase = (url: string) => {
  mongoose.connect(url);

  const db = mongoose.connection;
  db.on('error', console.error.bind(console, 'MongoDB connection error:'));
  db.once('open', () => {
    console.log('Connected to MongoDB ✅');
  });
};

export default connectDatabase;
