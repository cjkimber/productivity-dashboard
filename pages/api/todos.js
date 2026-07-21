import clientPromise from '../../lib/mongodb';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('todo_items');

  if (req.method === 'GET') {
    const { list } = req.query;
    const query = list ? { list } : {};
    const items = await collection.find(query).sort({ order: 1 }).toArray();
    return res.status(200).json(items);
  }

  if (req.method === 'POST') {
    const { action } = req.body;

    if (action === 'reorder') {
      const { ids } = req.body;
      if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids required' });
      await Promise.all(ids.map((id, index) =>
        collection.updateOne({ _id: new ObjectId(id) }, { $set: { order: index } })
      ));
      return res.status(200).json({ ok: true });
    }

    const { id, list, text, done } = req.body;

    if (id) {
      const update = {};
      if (text !== undefined) update.text = text;
      if (done !== undefined) {
        update.done = !!done;
        update.completedDate = done ? new Date().toISOString() : null;
      }
      await collection.updateOne({ _id: new ObjectId(id) }, { $set: update });
      return res.status(200).json({ ok: true });
    }

    if (!list || !text) return res.status(400).json({ error: 'list and text required' });
    const count = await collection.countDocuments({ list });
    const doc = { list, text, done: false, completedDate: null, order: count };
    const result = await collection.insertOne(doc);
    return res.status(200).json({ ok: true, id: result.insertedId });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });
    await collection.deleteOne({ _id: new ObjectId(id) });
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
