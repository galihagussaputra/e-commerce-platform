const mongoose = require('mongoose');
const config = require('./index');

const connectDatabase = async (uri = config.mongodbUri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
};

const disconnectDatabase = async () => mongoose.disconnect();

const supportsTransactions = () =>
  mongoose.connection?.client?.topology?.description?.type === 'ReplicaSet';

const withTransaction = async (work) => {
  if (!supportsTransactions()) return work(null);
  const session = await mongoose.startSession();
  try {
    let result;
    await session.withTransaction(async () => {
      result = await work(session);
    });
    return result;
  } finally {
    await session.endSession();
  }
};

module.exports = { connectDatabase, disconnectDatabase, supportsTransactions, withTransaction };
