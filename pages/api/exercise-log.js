import clientPromise from '../../lib/mongodb';
export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('exercise_log');
  if (req.method === 'GET') {
    const entries = await collection.find({}).toArray();
    return res.status(200).json(entries);
  }
  if (req.method === 'POST') {
    const { date, workoutType, workoutLabel, exercises, noData, rowingType, rowingValue, cardioNote, sessionSlot, sessionNotes } = req.body;
    const slot = sessionSlot || 'primary';
    await collection.deleteOne({ date, sessionSlot: { $in: [slot, slot === 'primary' ? undefined : slot] } });
    // For primary slot, also match docs that have no sessionSlot field (legacy records)
    if (slot === 'primary') {
      await collection.deleteOne({ date, sessionSlot: { $exists: false } });
    }
    const entry = { date, workoutType, workoutLabel, exercises: exercises || [], noData: !!noData, rowingType, rowingValue, cardioNote, sessionNotes, sessionSlot: slot, completedAt: new Date().toISOString() };
    await collection.insertOne(entry);
    return res.status(201).json(entry);
  }
  if (req.method === 'DELETE') {
    const { date, sessionSlot } = req.body;
    if (sessionSlot) {
      await collection.deleteOne({ date, sessionSlot });
      // Also catch legacy primary records with no sessionSlot field
      if (sessionSlot === 'primary') await collection.deleteOne({ date, sessionSlot: { $exists: false } });
    } else {
      await collection.deleteMany({ date });
    }
    return res.status(200).json({ deleted: true });
  }
  res.status(405).end();
}
