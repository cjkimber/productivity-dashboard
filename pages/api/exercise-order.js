import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const col = db.collection('exercise_order');

  if (req.method === 'GET') {
    const data = await col.find({}).toArray();
    return res.json(data);
  }

  if (req.method === 'POST') {
    const { bodyPart, exercises } = req.body;
    await col.deleteMany({ bodyPart });
    await col.insertOne({ bodyPart, exercises });
    return res.json({ ok: true });
  }

  res.status(405).end();
}
