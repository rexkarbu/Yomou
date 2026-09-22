import { DatabaseSync } from 'node:sqlite';
import { ALL_MIGRATIONS } from '../client/src/services/storage/schema.ts';

console.log('=== Verifying SQLite Schema, Idempotency & Relational Integrity (FON-03) ===');

const db = new DatabaseSync(':memory:');
db.exec('PRAGMA foreign_keys = ON;');

// Step 1: Initial DDL execution
console.log(`[Step 1] Executing ${ALL_MIGRATIONS.length} DDL statements...`);
for (const sql of ALL_MIGRATIONS) {
  db.exec(sql);
}
console.log('✔ All DDL statements executed successfully.');

// Step 2: Validate composite primary keys
console.log('[Step 2] Validating composite primary keys...');
function assertCompositePk(tableName, expectedCols) {
  const info = db.prepare(`PRAGMA table_info(${tableName})`).all();
  const pkCols = info.filter(c => c.pk > 0).sort((a, b) => a.pk - b.pk).map(c => c.name);
  console.log(`  - ${tableName} PK columns: [${pkCols.join(', ')}]`);
  if (pkCols.length !== expectedCols.length || !pkCols.every((col, i) => col === expectedCols[i])) {
    console.error(`FAIL: ${tableName} does not have expected composite PK [${expectedCols.join(', ')}]`);
    process.exit(1);
  }
}

assertCompositePk('chapters', ['novel_id', 'id']);
assertCompositePk('chapter_images', ['novel_id', 'chapter_id', 'image_id']);
assertCompositePk('chapter_reading_progress', ['novel_id', 'chapter_id']);
console.log('✔ All composite primary keys verified.');

// Step 3: Insert rich relational dataset across all tables
console.log('[Step 3] Inserting relational dataset across all tables...');

// Insert novels
db.prepare(`
  INSERT INTO novels (id, title, author, cover_url, local_cover_path, created_at, updated_at)
  VALUES 
    ('novel-1', 'Novel One', 'Author A', 'https://example.com/c1.jpg', 'covers/novel-1.jpg', 1000, 1000),
    ('novel-2', 'Novel Two', 'Author B', 'https://example.com/c2.jpg', 'covers/novel-2.jpg', 2000, 2000)
`).run();

// Insert chapters with composite keys (novel_id, id)
db.prepare(`
  INSERT INTO chapters (novel_id, id, title, chapter_number, download_status)
  VALUES 
    ('novel-1', 'ch-1', 'Novel 1 Chapter 1', 1.0, 'DOWNLOADED'),
    ('novel-1', 'ch-2', 'Novel 1 Chapter 2', 2.0, 'NOT_DOWNLOADED'),
    ('novel-2', 'ch-1', 'Novel 2 Chapter 1', 1.0, 'DOWNLOADED')
`).run();

// Insert chapter images with composite keys (novel_id, chapter_id, image_id)
db.prepare(`
  INSERT INTO chapter_images (novel_id, chapter_id, image_id, remote_url, local_file_path, download_status)
  VALUES 
    ('novel-1', 'ch-1', 'img-1', 'https://example.com/n1c1i1.jpg', 'chapters/n1c1i1.jpg', 'DOWNLOADED'),
    ('novel-1', 'ch-1', 'img-2', 'https://example.com/n1c1i2.jpg', 'chapters/n1c1i2.jpg', 'DOWNLOADED'),
    ('novel-2', 'ch-1', 'img-1', 'https://example.com/n2c1i1.jpg', 'chapters/n2c1i1.jpg', 'DOWNLOADED')
`).run();

// Insert reading progress with composite keys (novel_id, chapter_id)
db.prepare(`
  INSERT INTO chapter_reading_progress (novel_id, chapter_id, anchor_block_index, is_completed, updated_at)
  VALUES 
    ('novel-1', 'ch-1', 12, 1, 1500),
    ('novel-1', 'ch-2', 0, 0, 1600),
    ('novel-2', 'ch-1', 5, 0, 2500)
`).run();

// Insert download queue
db.prepare(`
  INSERT INTO download_queue (id, novel_id, chapter_id, status, retry_count, created_at, updated_at)
  VALUES 
    ('queue-1', 'novel-1', 'ch-2', 'QUEUED', 0, 1700, 1700)
`).run();

// Insert reader settings
db.prepare(`
  INSERT INTO reader_settings (key, value, updated_at)
  VALUES 
    ('theme', '"sepia"', 1000),
    ('fontSize', '18', 1000)
`).run();

console.log('✔ Relational dataset inserted successfully.');

// Step 4: Re-run all DDL statements on POPULATED database (Idempotency test)
console.log('[Step 4] Re-running all DDL statements on populated database to test idempotency...');
for (const sql of ALL_MIGRATIONS) {
  db.exec(sql);
}
console.log('✔ Re-execution of DDL migrations succeeded without errors.');

// Step 5: Verify that data and relationships remain 100% intact after re-running DDL
console.log('[Step 5] Verifying data and relational integrity after DDL re-run...');

const counts = {
  novels: db.prepare('SELECT count(*) as c FROM novels').get().c,
  chapters: db.prepare('SELECT count(*) as c FROM chapters').get().c,
  images: db.prepare('SELECT count(*) as c FROM chapter_images').get().c,
  progress: db.prepare('SELECT count(*) as c FROM chapter_reading_progress').get().c,
  queue: db.prepare('SELECT count(*) as c FROM download_queue').get().c,
  settings: db.prepare('SELECT count(*) as c FROM reader_settings').get().c,
};

if (
  counts.novels !== 2 ||
  counts.chapters !== 3 ||
  counts.images !== 3 ||
  counts.progress !== 3 ||
  counts.queue !== 1 ||
  counts.settings !== 2
) {
  console.error('FAIL: Row counts changed after re-running DDL migrations:', counts);
  process.exit(1);
}

// Verify specific values intact
const n1c1 = db.prepare('SELECT * FROM chapters WHERE novel_id = ? AND id = ?').get('novel-1', 'ch-1');
if (!n1c1 || n1c1.download_status !== 'DOWNLOADED' || n1c1.chapter_number !== 1.0) {
  console.error('FAIL: Chapter record values corrupted after DDL re-run:', n1c1);
  process.exit(1);
}

const n1c1Progress = db.prepare('SELECT * FROM chapter_reading_progress WHERE novel_id = ? AND chapter_id = ?').get('novel-1', 'ch-1');
if (!n1c1Progress || n1c1Progress.anchor_block_index !== 12 || n1c1Progress.is_completed !== 1) {
  console.error('FAIL: Reading progress values corrupted after DDL re-run:', n1c1Progress);
  process.exit(1);
}

const fkViolations = db.prepare('PRAGMA foreign_key_check').all();
if (fkViolations.length > 0) {
  console.error('FAIL: Foreign key violations detected after DDL re-run:', fkViolations);
  process.exit(1);
}
console.log('✔ All existing data, values, and foreign key relations remained 100% intact.');

// Step 6: SEPARATE Test - Foreign Key ON DELETE CASCADE
console.log('[Step 6] Testing Foreign Key ON DELETE CASCADE in isolation...');

// Delete parent novel 'novel-1'
db.prepare("DELETE FROM novels WHERE id = 'novel-1'").run();

const remChaptersN1 = db.prepare("SELECT count(*) as c FROM chapters WHERE novel_id = 'novel-1'").get().c;
const remImagesN1 = db.prepare("SELECT count(*) as c FROM chapter_images WHERE novel_id = 'novel-1'").get().c;
const remProgressN1 = db.prepare("SELECT count(*) as c FROM chapter_reading_progress WHERE novel_id = 'novel-1'").get().c;
const remQueueN1 = db.prepare("SELECT count(*) as c FROM download_queue WHERE novel_id = 'novel-1'").get().c;

if (remChaptersN1 !== 0 || remImagesN1 !== 0 || remProgressN1 !== 0 || remQueueN1 !== 0) {
  console.error('FAIL: ON DELETE CASCADE did not delete child rows for novel-1');
  process.exit(1);
}
console.log('  - Child rows for novel-1 successfully cascaded and removed.');

// Verify novel-2 data is completely unaffected
const remNovel2 = db.prepare("SELECT count(*) as c FROM novels WHERE id = 'novel-2'").get().c;
const remChaptersN2 = db.prepare("SELECT count(*) as c FROM chapters WHERE novel_id = 'novel-2'").get().c;
const remImagesN2 = db.prepare("SELECT count(*) as c FROM chapter_images WHERE novel_id = 'novel-2'").get().c;
const remProgressN2 = db.prepare("SELECT count(*) as c FROM chapter_reading_progress WHERE novel_id = 'novel-2'").get().c;
const remSettings = db.prepare("SELECT count(*) as c FROM reader_settings").get().c;

if (remNovel2 !== 1 || remChaptersN2 !== 1 || remImagesN2 !== 1 || remProgressN2 !== 1 || remSettings !== 2) {
  console.error('FAIL: CASCADE delete erroneously affected unrelated records in novel-2 or settings');
  process.exit(1);
}

const fkViolationsAfterCascade = db.prepare('PRAGMA foreign_key_check').all();
if (fkViolationsAfterCascade.length > 0) {
  console.error('FAIL: Foreign key violations detected after cascade delete:', fkViolationsAfterCascade);
  process.exit(1);
}
console.log('  - Unrelated records for novel-2 and settings remained completely intact.');
console.log('✔ Foreign Key ON DELETE CASCADE verified in isolation.');

console.log('\n=== ALL SQLITE SCHEMA & INTEGRITY VERIFICATIONS PASSED ===\n');
