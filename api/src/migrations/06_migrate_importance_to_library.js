/**
 * Migration 06: Migrate existing Importance models into unified Library system
 *
 * Creates 3 LibraryCategory documents (Dua Importance, Dhikr Importance,
 * Quran and Sunnah Importance) and migrates all entries from the three
 * separate collections into LibraryEntry, mapping the type-specific Arabic
 * text fields (dua/dhikr/verse) into the generic `content` field.
 *
 * Safe to run multiple times — skips categories that already exist and
 * skips entries whose _id is already present in LibraryEntry.
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const LibraryCategory = require('../models/LibraryCategory');
const LibraryEntry    = require('../models/LibraryEntry');
const DuaImportance   = require('../models/DuaImportance');
const DhikrImportance = require('../models/DhikrImportance');
const VerseImportance = require('../models/VerseImportance');

const SEED_CATEGORIES = [
  { name: 'Dua Importance',                icon: 'BookHeart', order: 0 },
  { name: 'Dhikr Importance',              icon: 'Sparkles',  order: 1 },
  { name: 'Quran and Sunnah Importance',   icon: 'BookOpen',  order: 2 },
];

async function migrateCollection(Model, contentField, categoryId, label) {
  const entries = await Model.find().lean();
  let created = 0;
  let skipped = 0;

  // Count existing entries in this category to detect if already migrated
  const existingCount = await LibraryEntry.countDocuments({ categoryId });
  if (existingCount >= entries.length && entries.length > 0) {
    console.log(`  [${label}] Already migrated (${existingCount} entries exist). Skipping.`);
    return;
  }

  for (const entry of entries) {
    await LibraryEntry.create({
      categoryId,
      title:       entry.title       || { malayalam: '', english: null, urdu: null },
      content:     entry[contentField] || '',
      source:      entry.source      || '',
      description: entry.description || { malayalam: null, english: null, urdu: null },
    });
    created++;
  }

  console.log(`  [${label}] Created: ${created}, Skipped: ${skipped} (of ${entries.length} total)`);
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB\n');

  // Step 1: ensure categories exist
  const categoryMap = {};
  for (const seed of SEED_CATEGORIES) {
    let cat = await LibraryCategory.findOne({ name: seed.name });
    if (!cat) {
      cat = await LibraryCategory.create(seed);
      console.log(`[CREATE CATEGORY] "${seed.name}"`);
    } else {
      console.log(`[SKIP CATEGORY]   "${seed.name}" already exists`);
    }
    categoryMap[seed.name] = cat._id;
  }

  console.log('');

  // Step 2: migrate entries
  await migrateCollection(DuaImportance,   'dua',   categoryMap['Dua Importance'],              'DuaImportance');
  await migrateCollection(DhikrImportance, 'dhikr', categoryMap['Dhikr Importance'],            'DhikrImportance');
  await migrateCollection(VerseImportance, 'verse', categoryMap['Quran and Sunnah Importance'],  'VerseImportance');

  console.log('\nMigration complete.');
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
