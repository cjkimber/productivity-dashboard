import clientPromise from '../../lib/mongodb';
import importData from '../../data/rowing-import.json';

// Upserts by logId, so this is safe to run more than once — already-imported
// sessions are left untouched and only new ones are added.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const client = await clientPromise;
  const db = client.db('productivity');
  const collection = db.collection('rowing_sessions');

  let inserted = 0;
  let alreadyPresent = 0;

  for (const doc of importData) {
    const result = await collection.updateOne(
      { logId: doc.logId },
      { $setOnInsert: doc },
      { upsert: true }
    );
    if (result.upsertedCount > 0) inserted++;
    else alreadyPresent++;
  }

  return res.status(200).json({ total: importData.length, inserted, alreadyPresent });
}
