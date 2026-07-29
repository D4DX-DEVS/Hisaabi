/**
 * Migration 02: Seed sub-DuaCategories under their parent main categories
 * - Looks up each parent by name (case-insensitive)
 * - Skips sub-categories that already exist under the same parent
 * - Does NOT remove existing sub-categories
 * - Safe to run multiple times
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DuaCategory = require('../models/DuaCategory');
const subCategories = require('../uploads/sub categories.json');

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of subCategories) {
    const subName = item.name.trim();
    const parentName = item.catogery.trim();

    // Find parent category
    const parent = await DuaCategory.findOne({
      name: { $regex: `^${parentName}$`, $options: 'i' },
      parent: null,
    });

    if (!parent) {
      console.error(`  [ERROR] Parent category not found: "${parentName}" for sub-category "${subName}"`);
      errors++;
      continue;
    }

    // Check if sub-category already exists (by name alone, due to global unique index on name)
    const existing = await DuaCategory.findOne({
      name: { $regex: `^${subName}$`, $options: 'i' },
    });

    if (existing) {
      console.log(`  [SKIP] "${subName}" already exists (under "${existing.parent ? existing.parent : 'root'}")`);
      skipped++;
      continue;
    }

    try {
      await DuaCategory.create({ name: subName, description: null, parent: parent._id });
      console.log(`  [CREATE] "${subName}" → "${parentName}"`);
      created++;
    } catch (err) {
      if (err.code === 11000) {
        console.log(`  [SKIP] "${subName}" duplicate key — already exists in DB`);
        skipped++;
      } else {
        console.error(`  [ERROR] "${subName}": ${err.message}`);
        errors++;
      }
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
