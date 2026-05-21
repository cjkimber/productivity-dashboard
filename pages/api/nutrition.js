import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const col = db.collection('nutrition_log');

  if (req.method === 'GET') {
    const { year, month, date } = req.query;
    if (date) {
      const docs = await col.find({ date }).sort({ time: 1 }).toArray();
      return res.json(docs);
    }
    if (year && month) {
      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const docs = await col.find({ date: { $regex: `^${prefix}` } }).sort({ date: 1, time: 1 }).toArray();
      return res.json(docs);
    }
    return res.json([]);
  }

  if (req.method === 'POST') {
    const { date, time, food } = req.body;
    if (!date || !time || !food) return res.status(400).json({ error: 'Missing fields' });
    const result = await col.insertOne({ date, time, food });
    return res.json({ success: true, id: result.insertedId });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await col.deleteOne({ _id: new ObjectId(id) });
    return res.json({ success: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
}
