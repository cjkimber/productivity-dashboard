import clientPromise from '../../lib/mongodb';
import importData from '../../data/rowing-import.json';

// Upserts by logId in a single batched bulkWrite, so this stays well within
// Vercel's function timeout even for hundreds of records. Safe to run more
// than once — already-imported sessions are left untouched.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('rowing_sessions');

  const ops = importData.map(doc => ({
    updateOne: {
      filter: { logId: doc.logId },
      update: { $setOnInsert: doc },
      upsert: true,
    },
  }));

  const result = await collection.bulkWrite(ops, { ordered: false });

  return res.status(200).json({
    total: importData.length,
    inserted: result.upsertedCount,
    alreadyPresent: importData.length - result.upsertedCount,
  });
}
