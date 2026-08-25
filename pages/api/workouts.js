import clientPromise from '../../lib/mongodb';

// Slot is derived from workout type, never trusted from the client.
// Weight-training types are always 'primary'; cardio types can share a day
// as 'secondary'. This guarantees you can never have two weight sessions,
// or two cardio sessions, on the same date.
const CARDIO_TYPES = ['R', 'KB', 'XT'];
function slotForType(type) {
  return CARDIO_TYPES.includes(type) ? 'secondary' : 'primary';
}

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('workouts');
  if (req.method === 'GET') {
    const { month, year } = req.query;
    const query = {};
    if (month && year) {
      const m = String(month).padStart(2, '0');
      const prefix = `${year}-${m}`;
      query['date'] = { $regex: `^${prefix}` };
    }
    const entries = await collection.find(query).toArray();
    return res.status(200).json(entries);
  }
  if (req.method === 'POST') {
    const { date, type, intensity } = req.body;
    const slot = slotForType(type);
    // Replace only this slot's entry for the date — the other slot (if any) is left alone.
    await collection.deleteOne({ date, slot });
    if (slot === 'primary') await collection.deleteOne({ date, slot: { $exists: false } });
    const entry = { date, type, slot, intensity: type === 'rowing' ? null : intensity };
    await collection.insertOne(entry);
    return res.status(201).json(entry);
  }
  if (req.method === 'DELETE') {
    const { date, slot } = req.body;
    if (slot) {
      await collection.deleteOne({ date, slot });
      // Legacy records saved before the slot field existed default to primary.
      if (slot === 'primary') await collection.deleteOne({ date, slot: { $exists: false } });
      await db.collection('exercise_log').deleteOne({ date, sessionSlot: slot });
      if (slot === 'primary') await db.collection('exercise_log').deleteOne({ date, sessionSlot: { $exists: false } });
      await db.collection('exercise_draft').deleteOne({ date, sessionSlot: slot });
      if (slot === 'primary') await db.collection('exercise_draft').deleteOne({ date, sessionSlot: { $exists: false } });
    } else {
      // No slot specified — wipe the whole day (both sessions), preserving old behaviour.
      await collection.deleteMany({ date });
      await db.collection('exercise_log').deleteMany({ date });
      await db.collection('exercise_draft').deleteMany({ date });
    }
    return res.status(200).json({ deleted: true });
  }
  res.status(405).end();
}
