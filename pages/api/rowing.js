import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('rowing_sessions');

  if (req.method === 'GET') {
    const entries = await collection.find({}).sort({ date: 1 }).toArray();
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const {
      date, category, description, workTimeSeconds, workDistance,
      strokeRate, strokeCount, avgHeartRate, dragFactor, comments,
    } = req.body;
    const entry = {
      logId: null,
      date,
      category,
      description: description || category,
      workTimeSeconds: workTimeSeconds !== '' && workTimeSeconds != null ? parseFloat(workTimeSeconds) : null,
      workDistance: workDistance !== '' && workDistance != null ? parseFloat(workDistance) : null,
      strokeRate: strokeRate !== '' && strokeRate != null ? parseFloat(strokeRate) : null,
      strokeCount: strokeCount !== '' && strokeCount != null ? parseFloat(strokeCount) : null,
      avgWatts: null,
      calHour: null,
      totalCal: null,
      avgHeartRate: avgHeartRate !== '' && avgHeartRate != null ? parseFloat(avgHeartRate) : null,
      dragFactor: dragFactor !== '' && dragFactor != null ? parseFloat(dragFactor) : null,
      comments: comments || null,
      source: 'manual',
    };
    const result = await collection.insertOne(entry);
    return res.status(201).json({ ...entry, _id: result.insertedId });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
