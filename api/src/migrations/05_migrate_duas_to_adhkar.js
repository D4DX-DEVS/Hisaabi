/**
 * Migration 05: Migrate Morning/Evening Duas → Morning/Evening Adhkar (DhikrType)
 *
 * Source  : Dua collection
 *   - "Morning Duas"  sub-category under "Daily Duas"  DuaCategory
 *   - "Evening Duas"  sub-category under "Daily Duas"  DuaCategory
 *
 * Target  : DhikrType collection
 *   - "Morning Adhkar" sub-category under DhikrCategory
 *   - "Evening Adhkar" sub-category under DhikrCategory
 *
 * Field mapping (Dua → DhikrType):
 *   title        → name          (globally unique in DhikrType)
 *   arabic_text  → arabic_text
 *   isQuranicFont→ isQuranicFont
 *   count        → count
 *   isCountless  → isCountless
 *   malayalam    → malayalam
 *   english      → english
 *   urdu         → urdu
 *
 * Skipped Dua fields (not present in DhikrType):
 *   additional_categories, description.*
 *
 * Deduplication:
 *   - Skips if a DhikrType with the same arabic_text already exists in the target category
 *   - Skips if a DhikrType with the same name already exists globally (unique constraint)
 *
 * Safe to run multiple times (idempotent).
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DuaCategory  = require('../models/DuaCategory');
const Dua          = require('../models/Dua');
const DhikrCategory = require('../models/DhikrCategory');
const DhikrType    = require('../models/DhikrType');

// ─── Configuration ────────────────────────────────────────────────────────────

const MIGRATION_MAP = [
  {
    duaParentName:    'Daily Duas',
    duaSubName:       'Morning Dua',
    dhikrSubName:     'Morning Adhkar',
  },
  {
    duaParentName:    'Daily Duas',
    duaSubName:       'Evening Dua',
    dhikrSubName:     'Evening Adhkar',
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function findDuaCategory(name, parentId = null) {
  const query = {
    name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' },
    parent: parentId,
  };
  return DuaCategory.findOne(query);
}

async function findDhikrCategory(name) {
  return DhikrCategory.findOne({
    $or: [
      { name:         { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
      { display_name: { $regex: `^${escapeRegex(name)}$`, $options: 'i' } },
    ],
  });
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function migrateGroup({ duaParentName, duaSubName, dhikrSubName }) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Migrating: "${duaSubName}" (Duas) → "${dhikrSubName}" (Adhkar)`);
  console.log('─'.repeat(60));

  // 1. Resolve source DuaCategory
  const duaParent = await findDuaCategory(duaParentName);
  if (!duaParent) {
    console.error(`  [ERROR] DuaCategory not found: "${duaParentName}"`);
    return { created: 0, skipped: 0, errors: 1 };
  }

  const duaSubCat = await findDuaCategory(duaSubName, duaParent._id);
  if (!duaSubCat) {
    console.error(`  [ERROR] DuaCategory sub-category not found: "${duaSubName}" under "${duaParentName}"`);
    return { created: 0, skipped: 0, errors: 1 };
  }

  // 2. Resolve target DhikrCategory
  const dhikrSubCat = await findDhikrCategory(dhikrSubName);
  if (!dhikrSubCat) {
    console.error(`  [ERROR] DhikrCategory not found: "${dhikrSubName}"`);
    return { created: 0, skipped: 0, errors: 1 };
  }

  // 3. Fetch all duas where the sub-category appears as primary OR additional category
  const duas = await Dua.find({
    $or: [
      { category:              duaSubCat._id },
      { additional_categories: duaSubCat._id },
    ],
  }).lean();
  console.log(`  Found ${duas.length} dua(s) in "${duaSubName}"`);

  let created = 0;
  let skipped = 0;
  let errors  = 0;

  for (const dua of duas) {
    const arabicText = (dua.arabic_text || '').trim();
    const name       = (dua.title || '').trim();

    if (!arabicText) {
      console.log(`  [SKIP - no arabic_text] _id: ${dua._id}`);
      skipped++;
      continue;
    }

    // Dedup: same arabic_text already exists in the exact target category — true duplicate, skip
    const existsByArabic = await DhikrType.findOne({
      arabic_text: arabicText,
      category:    dhikrSubCat._id,
    });
    if (existsByArabic) {
      console.log(`  [SKIP - duplicate] "${arabicText.substring(0, 50)}..."`);
      skipped++;
      continue;
    }

    // name = arabic_text (duplicates are now allowed across different categories)
    try {
      await DhikrType.create({
        name:          arabicText,
        category:      dhikrSubCat._id,
        count:         dua.count        ?? null,
        isCountless:   dua.isCountless  ?? false,
        arabic_text:   arabicText,
        isQuranicFont: dua.isQuranicFont ?? false,
        malayalam:     dua.malayalam    ?? null,
        english:       dua.english      ?? null,
        urdu:          dua.urdu         ?? null,
      });
      console.log(`  [CREATE] "${arabicText.substring(0, 60)}" → "${dhikrSubName}"`);
      created++;
    } catch (err) {
      console.error(`  [ERROR] Failed to create DhikrType for "${arabicText.substring(0, 50)}": ${err.message}`);
      errors++;
    }
  }

  return { created, skipped, errors };
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  let totalCreated = 0;
  let totalSkipped = 0;
  let totalErrors  = 0;

  for (const group of MIGRATION_MAP) {
    const { created, skipped, errors } = await migrateGroup(group);
    totalCreated += created;
    totalSkipped += skipped;
    totalErrors  += errors;
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log(`Migration complete.`);
  console.log(`  Created : ${totalCreated}`);
  console.log(`  Skipped : ${totalSkipped}`);
  console.log(`  Errors  : ${totalErrors}`);
  console.log('═'.repeat(60));

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
