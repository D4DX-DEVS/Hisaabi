/**
 * Migration 04: Seed 99 Names of Allah
 * - Reads arabic_name → name and english_meaning → english_meaning from 99names.json
 * - All other fields (english_name) are ignored
 * - Does NOT create duplicates (matched by name)
 * - Safe to run multiple times
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const NameOfAllah = require('../models/NameOfAllah');
const namesData = require('../uploads/99names.json');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  let inserted = 0;
  let skipped = 0;

  for (const entry of namesData) {
    const name = entry.arabic_name && entry.arabic_name.trim();
    const english_meaning = entry.english_meaning && entry.english_meaning.trim();

    if (!name) {
      console.log('  [SKIP] Entry missing arabic_name, skipping.');
      skipped++;
      continue;
    }

    const existing = await NameOfAllah.findOne({ name });
    if (existing) {
      console.log(`  [SKIP] "${name}" already exists.`);
      skipped++;
      continue;
    }

    await NameOfAllah.create({ name, english_meaning: english_meaning || null });
    console.log(`  [INSERT] "${name}"`);
    inserted++;
  }

  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
