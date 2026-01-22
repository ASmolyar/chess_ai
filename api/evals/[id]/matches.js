/**
 * API endpoint for eval matches
 * GET /api/evals/:id/matches - Get matches for an eval
 */

import { getMatches, initDb } from '../../../lib/db.js';

export default async function handler(req, res) {
  await initDb();
  
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const matches = await getMatches(id, 100);
      res.status(200).json({ matches });
    } catch (error) {
      console.error('Error fetching matches:', error);
      res.status(500).json({ error: 'Failed to fetch matches' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
