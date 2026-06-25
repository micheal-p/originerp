import mongoose from 'mongoose';

export async function connectDB(uri) {
  mongoose.set('strictQuery', true);
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      autoIndex: true,
    });
    console.log(`[db] connected → ${uri.replace(/\/\/([^@]*@)?/, '//')}`);
  } catch (err) {
    console.error('[db] connection failed:', err.message);
    throw err;
  }

  mongoose.connection.on('disconnected', () => console.warn('[db] disconnected'));
  mongoose.connection.on('reconnected', () => console.log('[db] reconnected'));
  return mongoose.connection;
}
