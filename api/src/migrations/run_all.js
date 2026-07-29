/**
 * Run all migrations in order:
 *   01 - Main categories
 *   02 - Sub categories
 *   03 - Duas
 *   04 - Names of Allah
 */

const { execSync } = require('child_process');
const path = require('path');

const migrations = [
  '01_migrate_main_categories.js',
  '02_migrate_sub_categories.js',
  '03_migrate_duas.js',
  '04_migrate_names_of_allah.js',
  '05_migrate_duas_to_adhkar.js',
];

for (const file of migrations) {
  const filePath = path.join(__dirname, file);
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Running: ${file}`);
  console.log('='.repeat(60));
  execSync(`node "${filePath}"`, { stdio: 'inherit' });
}

console.log('\nAll migrations completed.');
