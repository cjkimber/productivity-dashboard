import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('daily_tasks');

  if (req.method === 'GET') {
    const { date, year, month } = req.query;

    if (date) {
      const entries = await collection.find({ date: date }).toArray();
      return res.status(200).json(entries);
    }

    if (year && month) {
      const monthStr = String(month).padStart(2, '0');
      const prefix = `${year}-${monthStr}`;
      const entries = await collection.find({ date: { $regex: `^${prefix}` } }).toArray();
      return res.status(200).json(entries);
    }

    const entries = await collection.find({}).toArray();
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const { date, category, task, done, todoId } = req.body;
    if (!date) return res.status(400).json({ error: 'date required' });
    await collection.deleteOne({ date });
    await collection.insertOne({ date, category, task, done: !!done, todoId: todoId || null });
    return res.status(200).json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'date required' });
    await collection.deleteOne({ date });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
