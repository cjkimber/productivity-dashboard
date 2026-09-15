import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('inactive_exercises');

  if (req.method === 'GET') {
    const entries = await collection.find({}).toArray();
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const { bodyPart, exercise } = req.body;
    const existing = await collection.findOne({ bodyPart, exercise });
    if (!existing) {
      await collection.insertOne({ bodyPart, exercise });
    }
    return res.status(201).json({ bodyPart, exercise });
  }

  if (req.method === 'PATCH') {
    const { id, exercise } = req.body;
    if (!id || !exercise) return res.status(400).json({ error: 'Missing fields' });
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: { exercise } });
    return res.status(200).json({ updated: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
