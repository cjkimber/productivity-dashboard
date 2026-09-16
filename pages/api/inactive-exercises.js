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
    // Supports two independent updates: renaming (exercise) and permanently
    // hiding a hardcoded default (deleted). Either or both can be sent.
    const { id, exercise, deleted } = req.body;
    if (!id) return res.status(400).json({ error: 'Missing id' });
    const update = {};
    if (exercise !== undefined) update.exercise = exercise;
    if (deleted !== undefined) update.deleted = deleted;
    if (Object.keys(update).length === 0) return res.status(400).json({ error: 'Nothing to update' });
    await collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
    return res.status(200).json({ updated: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
