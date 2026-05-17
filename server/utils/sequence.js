import Counter from "../models/Counter.js";

export const getNextSequence = async (name) => {
  const r = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return r.seq;
};
