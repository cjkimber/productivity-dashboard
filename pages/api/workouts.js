import clientPromise from '../../lib/mongodb';

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
    await collection.deleteOne({ date });
    const entry = { date, type, intensity: type === 'rowing' ? null : intensity };
    await collection.insertOne(entry);
    return res.status(201).json(entry);
  }

  if (req.method === 'DELETE') {
    const { date } = req.body;
    await collection.deleteOne({ date });
    // Also clear any exercise log and draft entries for this date
    await db.collection('exercise_log').deleteOne({ date });
    await db.collection('exercise_draft').deleteOne({ date });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
