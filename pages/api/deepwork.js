import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('deepwork');

  if (req.method === 'GET') {
    const { month, year } = req.query;
    const query = {};
    if (month && year) {
      const m = String(month).padStart(2, '0');
      const prefix = `${year}-${m}`;
      query['date'] = { $regex: `^${prefix}` };
    }
    const entries = await collection.find(query).toArray();
    return res.status(200).json(entries);
  }

  if (req.method === 'POST') {
    const { date, hours, subject, replace } = req.body;
    const existing = await collection.findOne({ date });
    if (existing && !replace) {
      const newHours = parseFloat((existing.hours + parseFloat(hours)).toFixed(2));
      await collection.updateOne({ date }, { $set: { hours: newHours, subject } });
      return res.status(200).json({ date, hours: newHours, subject });
    } else {
      await collection.deleteOne({ date });
      const entry = { date, hours: parseFloat(hours), subject };
      await collection.insertOne(entry);
      return res.status(201).json(entry);
    }
  }

  if (req.method === 'DELETE') {
    const { date } = req.body;
    await collection.deleteOne({ date });
    return res.status(200).json({ deleted: true });
  }

  res.status(405).end();
}
