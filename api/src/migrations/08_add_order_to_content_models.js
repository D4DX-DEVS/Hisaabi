/**
 * Migration 08: Add `order` field to content models
 *
 * Adds order: null to all existing documents in:
 *   - duas
 *   - hadees
 *   - libraryentries
 *   - livelinks
 *
 * Safe to run multiple times — only updates documents that don't have the field.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collections = [
    { name: 'duas',           label: 'Dua' },
    { name: 'hadees',         label: 'Hadees' },
    { name: 'libraryentries', label: 'LibraryEntry' },
    { name: 'livelinks',      label: 'LiveLink' },
  ];

  for (const { name, label } of collections) {
    const col = mongoose.connection.collection(name);
    const result = await col.updateMany(
      { order: { $exists: false } },
      { $set: { order: null } }
    );
    console.log(`  [${label}] Updated ${result.modifiedCount} documents (${result.matchedCount} matched)`);
  }

  await mongoose.disconnect();
  console.log('Migration 08 complete.');
}

run().catch(err => {
  console.error('Migration 08 failed:', err);
  process.exit(1);
});
