/**
 * Migration 09: Migrate Duas from 4 DuaCategories → SpecialEntry (Special Models)
 *
 * Mapping:
 *   DuaCategory "Quranic Duas"        → SpecialCategory "Quranic Duas"
 *   DuaCategory "Dua of the Prophets" → SpecialCategory "Dua of the Prophets"
 *   DuaCategory "Janaza"              → SpecialCategory "Janaza"
 *   DuaCategory "Hajj & Umrah"        → SpecialCategory "Hajj & Umrah"
 *
 * Field mapping (Dua → SpecialEntry.data):
 *   dua.title       → data.title_english
 *   dua.arabic_text → data.arabic_text
 *   dua.malayalam   → data.description_malayalam
 *   dua.english     → data.description_english
 *   dua.urdu        → data.description_urdu
 *
 * Includes duas in sub-categories of each top-level DuaCategory.
 * Safe to run multiple times — skips SpecialEntries that already reference the
 * same source Dua _id (stored as data.source_dua_id for idempotency).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DuaCategory   = require('../models/DuaCategory');
const Dua           = require('../models/Dua');
const SpecialCategory = require('../models/SpecialCategory');
const SpecialEntry    = require('../models/SpecialEntry');

// The 4 pairs to migrate: DuaCategory name → SpecialCategory name
const MIGRATION_MAP = [
  { duaCatName: 'Quranic Duas',        specialCatName: 'Quranic Duas'        },
  { duaCatName: 'Dua of the Prophets', specialCatName: 'Dua of the Prophets' },
  { duaCatName: 'Janaza',              specialCatName: 'Janaza'              },
  { duaCatName: 'Hajj & Umrah',        specialCatName: 'Hajj & Umrah'        },
];

/**
 * Return all DuaCategory IDs that belong to a top-level category
 * (the top-level itself + all its direct sub-categories).
 */
async function getAllCategoryIds(topLevelCat) {
  const subCats = await DuaCategory.find({ parent: topLevelCat._id }).lean();
  const ids = [topLevelCat._id, ...subCats.map((s) => s._id)];
  return ids;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB\n');

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  for (const { duaCatName, specialCatName } of MIGRATION_MAP) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`Migrating: "${duaCatName}" → "${specialCatName}"`);

    // 1. Resolve source DuaCategory (top-level, no parent)
    const duaCat = await DuaCategory.findOne({ name: duaCatName, parent: null }).lean();
    if (!duaCat) {
      console.error(`  [ERROR] DuaCategory "${duaCatName}" not found. Skipping.`);
      totalErrors++;
      continue;
    }

    // 2. Resolve target SpecialCategory
    const specialCat = await SpecialCategory.findOne({ name: specialCatName }).lean();
    if (!specialCat) {
      console.error(`  [ERROR] SpecialCategory "${specialCatName}" not found. Skipping.`);
      totalErrors++;
      continue;
    }

    // 3. Collect all relevant DuaCategory IDs (top-level + sub-cats)
    const categoryIds = await getAllCategoryIds(duaCat);
    console.log(`  DuaCategory IDs (top + sub-cats): ${categoryIds.length}`);

    // 4. Fetch all duas in those categories, ordered by category + order
    const duas = await Dua.find({ category: { $in: categoryIds } })
      .sort({ category: 1, order: 1, created_at: 1 })
      .lean();
    console.log(`  Duas found: ${duas.length}`);

    // 5. For idempotency: fetch existing SpecialEntries in this category
    //    that have a source_dua_id recorded
    const existingEntries = await SpecialEntry.find({
      categoryId: specialCat._id,
      'data.source_dua_id': { $exists: true },
    }).lean();
    const migratedDuaIds = new Set(
      existingEntries.map((e) => e.data.source_dua_id?.toString())
    );

    let created = 0;
    let skipped = 0;

    for (let i = 0; i < duas.length; i++) {
      const dua = duas[i];

      // Skip if already migrated
      if (migratedDuaIds.has(dua._id.toString())) {
        skipped++;
        continue;
      }

      // Build data payload — only populate defined fields
      const data = {
        source_dua_id: dua._id,  // for idempotency tracking
      };

      if (dua.title)     data.title_english         = dua.title.trim();
      if (dua.arabic_text) data.arabic_text         = dua.arabic_text.trim();
      if (dua.malayalam) data.description_malayalam = dua.malayalam.trim();
      if (dua.english)   data.description_english   = dua.english.trim();
      if (dua.urdu)      data.description_urdu      = dua.urdu.trim();

      await SpecialEntry.create({
        categoryId: specialCat._id,
        order: i + 1,
        data,
      });
      created++;
    }

    console.log(`  Created: ${created} | Skipped (already migrated): ${skipped}`);
    totalCreated += created;
    totalSkipped += skipped;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Migration complete.`);
  console.log(`  Total created : ${totalCreated}`);
  console.log(`  Total skipped : ${totalSkipped}`);
  console.log(`  Total errors  : ${totalErrors}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
