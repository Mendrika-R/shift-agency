#!/usr/bin/env node
/**
 * Populates Qdrant via the deployed Worker /ingest endpoint.
 * Usage:
 *   WORKER_URL=https://shift-chatbot.workers.dev \
 *   INGEST_SECRET=your_secret \
 *   QDRANT_URL=https://cluster.qdrant.io \
 *   QDRANT_API_KEY=your_key \
 *   node scripts/ingest.js
 */

const WORKER_URL = process.env.WORKER_URL || 'https://shift-chatbot.workers.dev';
const INGEST_SECRET = process.env.INGEST_SECRET;

if (!INGEST_SECRET) {
  console.error('ERROR: INGEST_SECRET environment variable is required');
  process.exit(1);
}

const FR_CHUNKS = require('../worker/knowledge/fr.json');
const EN_CHUNKS = require('../worker/knowledge/en.json');
const ALL_CHUNKS = [...FR_CHUNKS, ...EN_CHUNKS];

async function createCollection() {
  const QDRANT_URL = process.env.QDRANT_URL;
  const QDRANT_API_KEY = process.env.QDRANT_API_KEY;
  if (!QDRANT_URL || !QDRANT_API_KEY) {
    console.log('Skipping direct collection creation — set QDRANT_URL and QDRANT_API_KEY to auto-create.');
    console.log('Make sure collection "shift_knowledge" exists (size: 768, distance: Cosine) before ingesting.\n');
    return;
  }
  console.log('Creating Qdrant collection shift_knowledge...');
  const res = await fetch(`${QDRANT_URL}/collections/shift_knowledge`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', 'api-key': QDRANT_API_KEY },
    body: JSON.stringify({ vectors: { size: 768, distance: 'Cosine' } }),
  });
  console.log('Collection response:', res.status, res.ok ? '(ok)' : await res.text());
}

async function ingest(chunks, batchSize = 5) {
  let totalInserted = 0;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    process.stdout.write(`Ingesting ${i + 1}–${Math.min(i + batchSize, chunks.length)} / ${chunks.length}... `);
    const res = await fetch(`${WORKER_URL}/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Ingest-Secret': INGEST_SECRET,
        'Origin': 'https://localhost',
      },
      body: JSON.stringify({ chunks: batch }),
    });
    if (!res.ok) {
      console.error('FAILED:', await res.text());
      continue;
    }
    const data = await res.json();
    totalInserted += data.inserted || 0;
    console.log(`inserted ${data.inserted}`);
  }
  return totalInserted;
}

(async () => {
  try {
    await createCollection();
    const total = await ingest(ALL_CHUNKS);
    console.log(`\nDone. Total inserted: ${total} / ${ALL_CHUNKS.length} chunks.`);
  } catch (err) {
    console.error('Ingestion failed:', err);
    process.exit(1);
  }
})();
