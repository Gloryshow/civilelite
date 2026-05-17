import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/civil-elite';

const createAdminId = () => `ADM-${new Date().getFullYear()}-${Math.floor(Math.random() * 900000) + 100000}`;

const run = async () => {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const admins = await User.find({ role: 'admin' }).lean();
  let updated = 0;

  for (const a of admins) {
    if (a.adminId) continue;
    let candidate = createAdminId();
    // Ensure uniqueness
    while (await User.findOne({ adminId: candidate })) {
      candidate = createAdminId();
    }
    await User.updateOne({ _id: a._id }, { $set: { adminId: candidate } });
    console.log(`Set adminId ${candidate} for ${a.email}`);
    updated++;
  }

  console.log(`Updated ${updated} admin(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
