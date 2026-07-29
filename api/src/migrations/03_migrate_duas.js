/**
 * Migration 03: Seed Duas into their sub-categories
 * - Reads arabic_text and english meaning from duas.json
 * - Sets count = 1 for all duas
 * - Skips duas with no sub_category
 * - Maps "Daily Arabic Text's" category alias → "Daily Duas" (actual main category name)
 * - Auto-creates sub-categories that don't exist yet under the correct parent
 * - Looks up sub-categories by name + parent to resolve the category ObjectId
 * - Does NOT create duplicate duas (matched by arabic_text + category)
 * - Safe to run multiple times
 */

require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });

const mongoose = require('mongoose');
const DuaCategory = require('../models/DuaCategory');
const Dua = require('../models/Dua');
const duasData = require('../uploads/duas.json');

/**
 * Some entries in duas.json use an old/alias name for the main category.
 * Map those aliases to the actual names stored in the DB.
 */
const MAIN_CATEGORY_ALIAS_MAP = {
  "Daily Arabic Text's": 'Daily Duas',
  "Daily Arabic Texts": 'Daily Duas',
};

function resolveMainCategoryName(rawName) {
  const trimmed = rawName.trim();
  return MAIN_CATEGORY_ALIAS_MAP[trimmed] || trimmed;
}

async function getOrCreateSubCategory(subName, parentDoc) {
  const existing = await DuaCategory.findOne({
    name: { $regex: `^${subName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    parent: parentDoc._id,
  });
  if (existing) return existing;

  console.log(`  [AUTO-CREATE SUB] "${subName}" under "${parentDoc.name}"`);
  return DuaCategory.create({ name: subName, description: null, parent: parentDoc._id });
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  // Cache main categories to avoid repeated DB hits
  const mainCatCache = {};
  async function getMainCategory(resolvedName) {
    if (mainCatCache[resolvedName]) return mainCatCache[resolvedName];
    const doc = await DuaCategory.findOne({
      name: { $regex: `^${resolvedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
      parent: null,
    });
    if (doc) mainCatCache[resolvedName] = doc;
    return doc;
  }

  let created = 0;
  let skipped = 0;
  let errors = 0;

  for (const item of duasData) {
    const arabicText = (item['Arabic Text'] || '').trim();
    const english = (item['English'] || '').trim();

    // Skip duas with no sub_category
    if (!item.sub_category) {
      console.log(`  [SKIP - no category] "${arabicText.substring(0, 40)}..."`);
      skipped++;
      continue;
    }

    const rawSubName = item.sub_category.name.trim();
    const rawMainName = item.sub_category.catogery
      ? item.sub_category.catogery.name.trim()
      : null;

    if (!rawMainName) {
      console.log(`  [SKIP - no main category] Sub: "${rawSubName}"`);
      skipped++;
      continue;
    }

    const resolvedMainName = resolveMainCategoryName(rawMainName);

    // Resolve parent category
    const parentDoc = await getMainCategory(resolvedMainName);
    if (!parentDoc) {
      console.error(`  [ERROR] Main category not found: "${resolvedMainName}" (original: "${rawMainName}")`);
      errors++;
      continue;
    }

    // Get or create sub-category
    let subDoc;
    try {
      subDoc = await getOrCreateSubCategory(rawSubName, parentDoc);
    } catch (err) {
      console.error(`  [ERROR] Could not get/create sub-category "${rawSubName}": ${err.message}`);
      errors++;
      continue;
    }

    // Use sub-category name as title
    const title = rawSubName;

    // Check for duplicate: same arabic_text in same category
    const existingDua = await Dua.findOne({
      arabic_text: arabicText,
      category: subDoc._id,
    });

    if (existingDua) {
      console.log(`  [SKIP - duplicate] "${arabicText.substring(0, 40)}..." in "${rawSubName}"`);
      skipped++;
      continue;
    }

    try {
      await Dua.create({
        title,
        arabic_text: arabicText,
        english,
        category: subDoc._id,
        count: 1,
      });
      console.log(`  [CREATE] Dua in "${rawSubName}" (${parentDoc.name})`);
      created++;
    } catch (err) {
      console.error(`  [ERROR] Failed to create dua: ${err.message}`);
      errors++;
    }
  }

  console.log(`\nDone. Created: ${created}, Skipped: ${skipped}, Errors: ${errors}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
