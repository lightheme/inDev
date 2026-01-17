import mongoose from 'mongoose';

beforeAll(async () => {
  await mongoose.connect('mongodb://localhost:27017/auction_test?replicaSet=rs0');
});

afterAll(async () => {
  await mongoose.disconnect();
});

afterEach(async () => {
  // Clean up database between tests
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await mongoose.connection.dropDatabase();
  }
});
