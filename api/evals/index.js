/**
 * API endpoint for listing and creating evals
 * GET /api/evals - List all public evals
 * POST /api/evals - Create a new eval
 */

import { getEvals, createEval, initDb } from '../../lib/db.js';
import { v4 as uuidv4 } from 'uuid';

export default async function handler(req, res) {
  // Initialize database on first request
  await initDb();

  if (req.method === 'GET') {
    try {
      const { sort = 'elo', order = 'desc', limit = 100 } = req.query;
      const evals = await getEvals(sort, order, parseInt(limit));
      res.status(200).json({ evals });
    } catch (error) {
      console.error('Error fetching evals:', error);
      res.status(500).json({ error: 'Failed to fetch evals' });
    }
  } else if (req.method === 'POST') {
    try {
      const { name, description, author, eval_config, is_public = true } = req.body;

      if (!name || !eval_config) {
        return res.status(400).json({ error: 'Name and eval_config are required' });
      }

      const id = uuidv4();
      const evalConfigJson = typeof eval_config === 'string'
        ? eval_config
        : JSON.stringify(eval_config);

      await createEval(id, name, description, author, evalConfigJson, is_public);

      res.status(200).json({
        success: true,
        id,
        message: 'Eval submitted successfully. Note: ELO calculation is not available in serverless mode.'
      });
    } catch (error) {
      console.error('Error submitting eval:', error);
      res.status(500).json({ error: 'Failed to submit eval' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
