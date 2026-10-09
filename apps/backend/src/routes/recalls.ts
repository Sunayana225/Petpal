import { Router } from 'express';
import type { RecallSnapshot } from '../services/recallSources';
import { dataFilePath, readJsonFile } from '../utils/dataFiles';
import { conditionalJson } from '../utils/conditionalJson';

export function createRecallRouter(): Router {
  const router = Router();
  const snapshot = readJsonFile<RecallSnapshot | null>(dataFilePath('recalls.fda.json'), null);
  router.get('/', (req, res) => {
    const allowed = ['q', 'limit', 'offset', 'status'];
    if (Object.keys(req.query).some(key => !allowed.includes(key)) || Object.values(req.query).some(value => typeof value !== 'string')) {
      res.status(400).json({ error: 'Invalid query', message: 'Use q, limit, offset and status as scalar parameters.' }); return;
    }
    const q = String(req.query.q ?? '').trim().toLowerCase();
    const limitText = String(req.query.limit ?? '20');
    const offsetText = String(req.query.offset ?? '0');
    const status = req.query.status;
    const limit = Number(limitText), offset = Number(offsetText);
    if (q.length > 100 || !/^\d+$/.test(limitText) || !/^\d+$/.test(offsetText) || limit < 1 || limit > 100 || offset > 100000 || (status !== undefined && !['terminated', 'not-marked-terminated'].includes(String(status)))) {
      res.status(400).json({ error: 'Invalid query', message: 'q maximum 100 characters; limit 1–100; offset 0–100000; status terminated or not-marked-terminated.' }); return;
    }
    if (!snapshot) { res.status(503).json({ error: 'Unavailable', message: 'No recall snapshot is available.' }); return; }
    const records = snapshot.records.filter(record => (!status || record.status === status) && `${record.brand} ${record.product} ${record.reason} ${record.company}`.toLowerCase().includes(q));
    const { records: _records, ...source } = snapshot;
    conditionalJson(req, res, { source, total: records.length, limit, offset, records: records.slice(offset, offset + limit) }, snapshot.contentHash);
  });
  return router;
}
