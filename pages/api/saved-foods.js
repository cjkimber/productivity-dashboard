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
    const { id, name, type, carbsPer100, proteinPer100, fatPer100, defaultGrams } = req.body;
    const foodType = type || 'meal';

    // Editing an existing food
    if (id) {
      const update = { type: foodType };
      if (name !== undefined) update.name = name;
      if (carbsPer100 !== undefined) update.carbsPer100 = Number(carbsPer100) || 0;
      if (proteinPer100 !== undefined) update.proteinPer100 = Number(proteinPer100) || 0;
      if (fatPer100 !== undefined) update.fatPer100 = Number(fatPer100) || 0;
      if (defaultGrams !== undefined) update.defaultGrams = Number(defaultGrams) || 100;
      await col.updateOne({ _id: new ObjectId(id) }, { $set: update });
      return res.json({ success: true, id });
    }

    // Adding a new food
    if (!name) return res.status(400).json({ error: 'Missing name' });
    const existing = await col.findOne({ name: { $regex: `^${name}$`, $options: 'i' }, type: foodType });
    if (existing) return res.json({ success: true, id: existing._id, exists: true });
    const result = await col.insertOne({
      name,
      type: foodType,
      carbsPer100: Number(carbsPer100) || 0,
      proteinPer100: Number(proteinPer100) || 0,
      fatPer100: Number(fatPer100) || 0,
      defaultGrams: Number(defaultGrams) || 100,
      addedAt: new Date().toISOString(),
    });
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
