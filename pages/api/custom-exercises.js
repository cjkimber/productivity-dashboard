import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const col = db.collection('custom_exercises');

  if (req.method === 'GET') {
    // Return all custom exercises, optionally filtered by bodyPart
    const { bodyPart } = req.query;
    const query = bodyPart ? { bodyPart } : {};
    const docs = await col.find(query).toArray();
    return res.json(docs);
  }

  if (req.method === 'POST') {
    const { bodyPart, exercise } = req.body;
    if (!bodyPart || !exercise) return res.status(400).json({ error: 'Missing fields' });
    // Avoid duplicates
    const existing = await col.findOne({ bodyPart, exercise });
    if (existing) return res.json(existing);
    const result = await col.insertOne({ bodyPart, exercise, createdAt: new Date() });
    return res.json({ _id: result.insertedId, bodyPart, exercise });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    await col.deleteOne({ _id: new ObjectId(id) });
    return res.json({ deleted: true });
  }

  res.status(405).end();
}
