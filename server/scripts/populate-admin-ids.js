import mongoose from 'mongoose';
import User from '../models/User.js';

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/civil-elite';

const createAdminId = (seq) => {
  const year = new Date().getFullYear();
  if (typeof seq === 'number') return `ADM-${year}-${String(seq).padStart(6, '0')}`;
  return `ADM-${year}-${String(Math.floor(Math.random() * 900000) + 100000)}`;
};

const run = async () => {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const admins = await User.find({ role: 'admin' }).sort({ createdAt: 1 }).lean();
  let updated = 0;

  // Derive the next sequence number from any existing adminIds
  let maxSeq = 0;
  for (const a of admins) {
    if (a.adminId) {
      const m = a.adminId.match(/-(\d{6})$/);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > maxSeq) maxSeq = n;
      }
    }
  }

  let seq = maxSeq + 1;
  for (const a of admins) {
    if (a.adminId) continue;
    let candidate = createAdminId(seq);
    // Just in case, ensure uniqueness
    while (await User.findOne({ adminId: candidate })) {
      seq++;
      candidate = createAdminId(seq);
    }
    await User.updateOne({ _id: a._id }, { $set: { adminId: candidate } });
    console.log(`Set adminId ${candidate} for ${a.email}`);
    updated++;
    seq++;
  }

  console.log(`Updated ${updated} admin(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => {
  console.error(err);
  process.exit(1);
});
