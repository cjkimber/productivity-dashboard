import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const col = db.collection('saved_foods');

  if (req.method === 'GET') {
    const docs = await col.find({}).sort({ type: 1, name: 1 }).toArray();
    return res.json(docs);
  }

  if (req.method === 'POST') {
    const { name, type } = req.body;
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const foodType = type || 'meal';
    const existing = await col.findOne({ name: { $regex: `^${name}$`, $options: 'i' }, type: foodType });
    if (existing) return res.json({ success: true, id: existing._id, exists: true });
    const result = await col.insertOne({ name, type: foodType, addedAt: new Date().toISOString() });
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
