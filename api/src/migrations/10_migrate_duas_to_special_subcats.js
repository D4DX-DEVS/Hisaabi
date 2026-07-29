/**
 * Migration 10: Migrate Duas into SpecialEntry with full sub-category support
 *
 * Structure handled:
 *   DuaCategory "Quranic Duas"         (no sub-cats) → SpecialCategory "Quranic Duas"
 *   DuaCategory "Dua of the Prophets"  (has 2 sub-cats):
 *     "Prophets"                       → SpecialCategory "Prophets"
 *     "Prophet Muhammed ( SW )"        → SpecialCategory "Prophet Muhammed (SW)"
 *   DuaCategory "Janaza"               (has 4 sub-cats):
 *     "Dua ( General )"                → SpecialCategory "Dua (General)"
 *     "Dua for Young Child (...)"      → SpecialCategory "Dua for Young Child (male or female)"
 *     "Dua for Female"                 → SpecialCategory "Dua for Female"
 *     "Dua For Male"                   → SpecialCategory "Dua for Male"
 *   DuaCategory "Hajj & Umrah"         (has 16 sub-cats, matched by normalised name)
 *
 * Field mapping  (Dua → SpecialEntry.data):
 *   dua.title              → data.title_english
 *   dua.arabic_text        → data.arabic_text
 *   dua.malayalam          → data.translation_malayalam
 *   dua.english            → data.translation_english
 *   dua.urdu               → data.translation_urdu
 *   dua.description.malayalam → data.description_malayalam
 *   dua.description.english   → data.description_english
 *   dua.description.urdu      → data.description_urdu
 *   dua.count (non-null)   → data.count
 *
 * Idempotent — uses data.source_dua_id to skip already-migrated duas.
 * Safe to run multiple times.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DuaCategory     = require('../models/DuaCategory');
const Dua             = require('../models/Dua');
const SpecialCategory = require('../models/SpecialCategory');
const SpecialEntry    = require('../models/SpecialEntry');

// ─── Name normalisation ───────────────────────────────────────────────────────
// Lower-case, trim, collapse multi-spaces, strip spaces inside parentheses.
function normName(str) {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\(\s+/g, '(')
    .replace(/\s+\)/g, ')');
}

// ─── Build SpecialEntry.data from a Dua document ─────────────────────────────
function buildEntryData(dua) {
  const data = { source_dua_id: dua._id };

  if (dua.title?.trim())                      data.title_english           = dua.title.trim();
  if (dua.arabic_text?.trim())                data.arabic_text             = dua.arabic_text.trim();

  // Direct translations
  if (dua.malayalam?.trim())                  data.translation_malayalam   = dua.malayalam.trim();
  if (dua.english?.trim())                    data.translation_english     = dua.english.trim();
  if (dua.urdu?.trim())                       data.translation_urdu        = dua.urdu.trim();

  // Description sub-document
  if (dua.description?.malayalam?.trim())     data.description_malayalam   = dua.description.malayalam.trim();
  if (dua.description?.english?.trim())       data.description_english     = dua.description.english.trim();
  if (dua.description?.urdu?.trim())          data.description_urdu        = dua.description.urdu.trim();

  // Count
  if (dua.count != null && !dua.isCountless)  data.count                   = dua.count;

  return data;
}

// ─── Migrate one batch of duas into a SpecialCategory ────────────────────────
async function migrateDuas(duas, specialCat, migratedIdsSet) {
  let created = 0;
  let skipped = 0;

  for (let i = 0; i < duas.length; i++) {
    const dua = duas[i];

    if (migratedIdsSet.has(dua._id.toString())) {
      skipped++;
      continue;
    }

    await SpecialEntry.create({
      categoryId: specialCat._id,
      order: i + 1,
      data: buildEntryData(dua),
    });
    created++;
  }

  return { created, skipped };
}

// ─── Load already-migrated source IDs for a SpecialCategory ──────────────────
async function loadMigratedIds(specialCatId) {
  const existing = await SpecialEntry.find({
    categoryId: specialCatId,
    'data.source_dua_id': { $exists: true },
  }).lean();
  return new Set(existing.map((e) => e.data.source_dua_id?.toString()));
}

// ─── Build a normalised-name → SpecialCategory lookup map ────────────────────
async function buildSpecialCatMap() {
  const all = await SpecialCategory.find().lean();
  const map = new Map();
  for (const sc of all) {
    map.set(normName(sc.name), sc);
  }
  return map;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB\n');

  const specialCatMap = await buildSpecialCatMap();

  // Top-level DuaCategories to process
  const TOP_LEVEL_NAMES = [
    'Quranic Duas',
    'Dua of the Prophets',
    'Janaza',
    'Hajj & Umrah',
  ];

  let grandTotal = { created: 0, skipped: 0, errors: 0 };

  for (const topName of TOP_LEVEL_NAMES) {
    console.log(`${'═'.repeat(60)}`);
    console.log(`Processing: "${topName}"`);

    // 1. Find top-level DuaCategory
    const duaTopCat = await DuaCategory.findOne({ name: topName, parent: null }).lean();
    if (!duaTopCat) {
      console.error(`  [ERROR] DuaCategory "${topName}" not found`);
      grandTotal.errors++;
      continue;
    }

    // 2. Find sub-categories of this DuaCategory
    const duaSubCats = await DuaCategory.find({ parent: duaTopCat._id }).lean();
    console.log(`  DuaCategory sub-cats: ${duaSubCats.length}`);

    if (duaSubCats.length === 0) {
      // ── No sub-cats → migrate all duas directly to the parent SpecialCategory
      const specialCat = specialCatMap.get(normName(topName));
      if (!specialCat) {
        console.error(`  [ERROR] SpecialCategory "${topName}" not found`);
        grandTotal.errors++;
        continue;
      }

      const duas = await Dua.find({ category: duaTopCat._id })
        .sort({ order: 1, created_at: 1 })
        .lean();
      console.log(`  Duas to migrate: ${duas.length}`);

      const migratedIds = await loadMigratedIds(specialCat._id);
      const { created, skipped } = await migrateDuas(duas, specialCat, migratedIds);
      console.log(`  → SpecialCategory "${specialCat.name}" | created: ${created} | skipped: ${skipped}`);
      grandTotal.created += created;
      grandTotal.skipped += skipped;

    } else {
      // ── Has sub-cats → migrate each sub-cat's duas to the matching SpecialCategory
      for (const duaSubCat of duaSubCats) {
        const normSub = normName(duaSubCat.name);

        // Find matching SpecialCategory by normalised name
        let specialCat = specialCatMap.get(normSub);
        if (!specialCat) {
          console.error(`  [SKIP] No SpecialCategory found matching DuaSubCategory "${duaSubCat.name}" (normalised: "${normSub}")`);
          grandTotal.errors++;
          continue;
        }

        const duas = await Dua.find({ category: duaSubCat._id })
          .sort({ order: 1, created_at: 1 })
          .lean();

        if (duas.length === 0) {
          console.log(`  [EMPTY] "${duaSubCat.name}" → 0 duas, skipping`);
          continue;
        }

        const migratedIds = await loadMigratedIds(specialCat._id);
        const { created, skipped } = await migrateDuas(duas, specialCat, migratedIds);
        console.log(`  DuaSub "${duaSubCat.name}"\n    → SpecialCat "${specialCat.name}" | duas: ${duas.length} | created: ${created} | skipped: ${skipped}`);
        grandTotal.created += created;
        grandTotal.skipped += skipped;
      }
    }
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('Migration complete.');
  console.log(`  Total created : ${grandTotal.created}`);
  console.log(`  Total skipped : ${grandTotal.skipped}`);
  console.log(`  Total errors  : ${grandTotal.errors}`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
