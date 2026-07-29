/**
 * Migration 07: Add `order` field to category models
 *
 * Adds order: null to all existing documents in:
 *   - dua_categories
 *   - dhikr_categories
 *   - hadees_categories
 *   - fasting_types
 *   - dhikr_types
 *   - thasbeeh (tasbeeh)
 *
 * Safe to run multiple times — only updates documents that don't have the field.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB');

  const collections = [
    { name: 'duacategories',   label: 'DuaCategory' },
    { name: 'dhikrcategories', label: 'DhikrCategory' },
    { name: 'hadeescategories', label: 'HadeesCategory' },
    { name: 'fastingtypes',    label: 'FastingType' },
    { name: 'dhikrtypes',      label: 'DhikrType' },
    { name: 'thasbeeh',        label: 'Tasbeeh' },
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
  console.log('Migration 07 complete.');
}

run().catch(err => {
  console.error('Migration 07 failed:', err);
  process.exit(1);
});
