import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('exercise_draft');

  if (req.method === 'GET') {
    const entries = await collection.find({}).toArray();
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const body = req.body;
    await collection.deleteOne({ date: body.date });
    await collection.insertOne({ ...body, savedAt: new Date().toISOString() });
    return res.status(201).json(body);
  }

  if (req.method === 'DELETE') {
    const { date } = req.body;
    await collection.deleteOne({ date });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
