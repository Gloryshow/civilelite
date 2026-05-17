import mongoose from 'mongoose';
import Applicant from '../models/Applicant.js';

const MONGO = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/civil-elite';

const createSerial = (seq) => seq;

const run = async () => {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to DB');

  const applicants = await Applicant.find().sort({ createdAt: 1 }).lean();
  let updated = 0;

  // find max existing serial
  let maxSeq = 0;
  for (const a of applicants) {
    if (typeof a.serial === 'number') {
      if (a.serial > maxSeq) maxSeq = a.serial;
    }
  }

  let seq = maxSeq + 1;
  for (const a of applicants) {
    if (typeof a.serial === 'number') continue;
    const candidate = createSerial(seq);
    await Applicant.updateOne({ _id: a._id }, { $set: { serial: candidate } });
    console.log(`Set serial ${candidate} for applicant ${a.applicantId || a._id}`);
    updated++;
    seq++;
  }

  console.log(`Updated ${updated} applicant(s).`);
  await mongoose.disconnect();
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });
