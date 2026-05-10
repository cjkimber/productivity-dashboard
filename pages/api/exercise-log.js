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
    const { date, workoutType, workoutLabel, exercises, noData, rowingType, rowingValue, cardioNote } = req.body;
    await collection.deleteOne({ date });
    const entry = { date, workoutType, workoutLabel, exercises: exercises || [], noData: !!noData, rowingType, rowingValue, cardioNote, completedAt: new Date().toISOString() };
    await collection.insertOne(entry);
    return res.status(201).json(entry);
  }

  if (req.method === 'DELETE') {
    const { date } = req.body;
    await collection.deleteOne({ date });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
