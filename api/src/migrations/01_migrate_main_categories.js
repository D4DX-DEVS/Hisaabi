/**
 * Migration 01: Seed main DuaCategories (top-level, no parent)
 * - Skips categories that already exist (matched by name, case-insensitive)
 * - Safe to run multiple times
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DuaCategory = require('../models/DuaCategory');
const mainCategories = require('../uploads/main category.json');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  let created = 0;
  let skipped = 0;

  for (const item of mainCategories) {
    const name = item.name.trim();

    const existing = await DuaCategory.findOne({
      name: { $regex: `^${name}$`, $options: 'i' },
      parent: null,
    });

    if (existing) {
      console.log(`  [SKIP] "${name}" already exists`);
      skipped++;
    } else {
      await DuaCategory.create({ name, description: null, parent: null });
      console.log(`  [CREATE] "${name}"`);
      created++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
