/**
 * API endpoint for individual eval operations
 * GET /api/evals/:id - Get eval details
 * PUT /api/evals/:id - Update an eval
 * DELETE /api/evals/:id - Delete an eval
 */

import { getEval, updateEval, deleteEval, initDb } from '../../../lib/db.js';

export default async function handler(req, res) {
  await initDb();
  
  const { id } = req.query;

  if (req.method === 'GET') {
    try {
      const evalData = await getEval(id);

      if (!evalData) {
        return res.status(404).json({ error: 'Eval not found' });
      }

      // Parse the eval_config JSON
      if (evalData.eval_config) {
        try {
          evalData.eval_config = JSON.parse(evalData.eval_config);
        } catch (e) {
          // Keep as string if parsing fails
        }
      }

      res.status(200).json({ eval: evalData });
    } catch (error) {
      console.error('Error fetching eval:', error);
      res.status(500).json({ error: 'Failed to fetch eval' });
    }
  } else if (req.method === 'PUT') {
    try {
      const existing = await getEval(id);
      if (!existing) {
        return res.status(404).json({ error: 'Eval not found' });
      }

      const { name, description, author, eval_config, is_public } = req.body;
      const updates = {};

      if (name !== undefined) updates.name = name;
      if (description !== undefined) updates.description = description;
      if (author !== undefined) updates.author = author;
      if (eval_config !== undefined) {
        updates.eval_config = typeof eval_config === 'string'
          ? eval_config
          : JSON.stringify(eval_config);
        // Reset ELO if config changed
        updates.elo = null;
        updates.games_played = 0;
        updates.wins = 0;
        updates.losses = 0;
        updates.draws = 0;
      }
      if (is_public !== undefined) updates.is_public = is_public ? 1 : 0;

      await updateEval(id, updates);
      res.status(200).json({ success: true, message: 'Eval updated' });
    } catch (error) {
      console.error('Error updating eval:', error);
      res.status(500).json({ error: 'Failed to update eval' });
    }
  } else if (req.method === 'DELETE') {
    try {
      const deleted = await deleteEval(id);

      if (!deleted) {
        return res.status(404).json({ error: 'Eval not found' });
      }

      res.status(200).json({ success: true, message: 'Eval deleted' });
    } catch (error) {
      console.error('Error deleting eval:', error);
      res.status(500).json({ error: 'Failed to delete eval' });
    }
  } else {
    res.setHeader('Allow', ['GET', 'PUT', 'DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
