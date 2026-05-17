import clientPromise from '../../lib/mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('weight');

  if (req.method === 'GET') {
    const year = parseInt(req.query['year']);
    const month = parseInt(req.query['month']);
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endMonth = month === 12 ? 1 : month + 1;
    const endYear = month === 12 ? year + 1 : year;
    const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;
    const results = await collection.find({
      date: { $gte: startDate, $lt: endDate }
    }).sort({ date: 1 }).toArray();
    return res.status(200).json(results);

  } else if (req.method === 'POST') {
    const { date, weight } = req.body;
    await collection.deleteMany({ date });
    await collection.insertOne({ date, weight: parseFloat(weight) });
    return res.status(200).json({ success: true });

  } else if (req.method === 'DELETE') {
    const { date } = req.body;
    await collection.deleteMany({ date });
    return res.status(200).json({ success: true });

  } else {
    return res.status(405).json({ error: 'Method not allowed' });
  }
}
