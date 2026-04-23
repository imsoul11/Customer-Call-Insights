const path = require('path');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const User = require('../Models/user');
const { hashPassword } = require('../utils/password');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  const [, , eid, nextPassword] = process.argv;

  if (!eid || !nextPassword) {
    throw new Error('Usage: node backend/scripts/reset-user-password.js <EID> <new-password>');
  }

  await mongoose.connect(process.env.MONGODB_CONNECTION_STRING, {
    dbName: process.env.MONGODB_DATABASE_NAME,
  });

  try {
    const updatedUser = await User.findOneAndUpdate(
      { eid },
      { $set: { password: hashPassword(nextPassword) } },
      { new: true }
    ).lean();

    if (!updatedUser) {
      throw new Error(`User ${eid} was not found.`);
    }

    console.log(JSON.stringify({
      success: true,
      eid,
      password_updated: true,
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
