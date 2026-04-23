const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../Models/user');
const { hashPassword, isPasswordHashed } = require('../utils/password');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const DEMO_PASSWORD_OVERRIDES = {
  EID05358: 'DemoEmployee2026!',
  EID23672: 'DemoManager2026!',
};

async function run() {
  const connectionString = process.env.MONGODB_CONNECTION_STRING;
  const databaseName = process.env.MONGODB_DATABASE_NAME;

  if (!connectionString || !databaseName) {
    throw new Error('MONGODB_CONNECTION_STRING and MONGODB_DATABASE_NAME are required.');
  }

  await mongoose.connect(connectionString, {
    dbName: databaseName,
  });

  try {
    const users = await User.find({}).lean();
    let updatedCount = 0;
    const updatedDemoCredentials = [];

    for (const user of users) {
      const overridePassword = DEMO_PASSWORD_OVERRIDES[user.eid];
      const nextPlainPassword = overridePassword || String(user.password || '').trim();

      if (!nextPlainPassword) {
        continue;
      }

      const shouldUpdate =
        Boolean(overridePassword) ||
        !isPasswordHashed(user.password);

      if (!shouldUpdate) {
        continue;
      }

      await User.updateOne(
        { _id: user._id },
        { $set: { password: hashPassword(nextPlainPassword) } }
      );

      updatedCount += 1;

      if (overridePassword) {
        updatedDemoCredentials.push({
          eid: user.eid,
          password: overridePassword,
        });
      }
    }

    console.log(JSON.stringify({
      success: true,
      database_name: databaseName,
      updated_users: updatedCount,
      demo_credentials: updatedDemoCredentials,
    }));
  } finally {
    await mongoose.disconnect();
  }
}

run().catch((error) => {
  console.error(JSON.stringify({
    success: false,
    message: error.message,
  }));
  process.exit(1);
});
