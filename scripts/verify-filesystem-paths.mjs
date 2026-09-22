import {
  encodePathSegment,
  validatePathSegment,
  validateFileExtension,
  formatCoverFilename,
  formatChapterImageFilename,
  resolveCoverPath,
  resolveChapterImagePath,
} from '../client/src/services/storage/paths.ts';

console.log('=== Verifying Filesystem Path Mapping, URI Transport & Decoded Parity ===\n');

const DUMMY_COVERS_DIR = 'file:///data/user/0/com.yomou.novel/files/covers/';
const DUMMY_CHAPTERS_DIR = 'file:///data/user/0/com.yomou.novel/files/chapters/';

/**
 * Simulates Android native Uri.parse(uri).getPath() behavior:
 * Extracts URL pathname and performs standard URI decoding.
 */
function simulateAndroidUriDecoding(resolvedUri) {
  return decodeURIComponent(new URL(resolvedUri).pathname);
}

const DECODED_COVERS_DIR = simulateAndroidUriDecoding(DUMMY_COVERS_DIR);
const DECODED_CHAPTERS_DIR = simulateAndroidUriDecoding(DUMMY_CHAPTERS_DIR);

// ----------------------------------------------------------------------------
// Regression Control: Faulty transport URI vs Correct Resolver URI
// ----------------------------------------------------------------------------
console.log('[Regression Control] Testing faulty transport URI vs correct resolver URI...');

// 1. Faulty transport URI: filename concatenated without single-component URI encoding
const faultyTransportUri = `${DUMMY_COVERS_DIR}novel%2F1.jpg`;
const decodedFaulty = simulateAndroidUriDecoding(faultyTransportUri);
const faultyTail = decodedFaulty.slice(DECODED_COVERS_DIR.length);

if (!faultyTail.includes('/')) {
  console.error('FAIL: Regression control failed! Faulty URI novel%2F1.jpg was expected to leak "/" separator, but did not.');
  process.exit(1);
}
console.log(`✔ Faulty transport URI correctly detected leaking directory separator: "${faultyTail}"`);

// 2. Correct resolver URI: filename encoded as URI component
const correctResolvedUri = resolveCoverPath(DUMMY_COVERS_DIR, 'novel/1', 'jpg');
const decodedCorrect = simulateAndroidUriDecoding(correctResolvedUri);
const correctTail = decodedCorrect.slice(DECODED_COVERS_DIR.length);

if (correctTail.includes('/') || correctTail.includes('\\')) {
  console.error(`FAIL: Correct resolver leaked directory separator: "${correctTail}"`);
  process.exit(1);
}
if (correctTail !== 'novel%2F1.jpg') {
  console.error(`FAIL: Correct resolver expected "novel%2F1.jpg", got: "${correctTail}"`);
  process.exit(1);
}
console.log(`✔ Correct resolver safely preserved single filename: "${correctTail}"`);

// ----------------------------------------------------------------------------
// Test 1: Compound segment boundary collisions on decoded resolver output
// ----------------------------------------------------------------------------
console.log('\n[Test 1] Testing compound segment boundary collisions on decoded resolver output...');

const boundaryTuples = [
  ['a_b', 'c', 'd'],
  ['a', 'b_c', 'd'],
  ['a', 'b', 'c_d'],
  ['a_b_c', 'd', 'e'],
  ['a', 'b_c_d', 'e'],
  ['a', 'b', 'c_d_e'],
  ['vol_1', 'ch_2', 'img_3'],
  ['vol', '1_ch_2', 'img_3'],
  ['vol_1_ch', '2', 'img_3'],
  ['novel', 'chap', '01'],
  ['novel-1', 'chap-1', 'img-1'],
];

const decodedResolvedPaths = new Map();
for (const [novelId, chapterId, imageId] of boundaryTuples) {
  const resolvedUri = resolveChapterImagePath(DUMMY_CHAPTERS_DIR, novelId, chapterId, imageId, 'jpg');
  const decodedPath = simulateAndroidUriDecoding(resolvedUri);

  if (decodedResolvedPaths.has(decodedPath)) {
    const prevTuple = decodedResolvedPaths.get(decodedPath);
    console.error(`COLLISION DETECTED on decoded resolver path!`);
    console.error(`  Tuple 1: (${prevTuple.join(', ')}) -> ${decodedPath}`);
    console.error(`  Tuple 2: (${novelId}, ${chapterId}, ${imageId}) -> ${decodedPath}`);
    process.exit(1);
  }
  decodedResolvedPaths.set(decodedPath, [novelId, chapterId, imageId]);
}
console.log(`✔ All ${boundaryTuples.length} compound tuples remain unique and collision-free after decoded pathname resolution.`);

// ----------------------------------------------------------------------------
// Test 2: Slashes in IDs must NOT become directory separators after decoding
// ----------------------------------------------------------------------------
console.log('\n[Test 2] Testing slashes in IDs do not become directory separators...');

const slashNovelIds = ['novel/1', 'novel/part/1', 'sub/dir/test'];
for (const id of slashNovelIds) {
  const resolvedUri = resolveCoverPath(DUMMY_COVERS_DIR, id, 'jpg');
  const decodedPath = simulateAndroidUriDecoding(resolvedUri);

  if (!decodedPath.startsWith(DECODED_COVERS_DIR)) {
    console.error(`FAIL: Decoded path escaped base directory: ${decodedPath}`);
    process.exit(1);
  }

  const filenamePart = decodedPath.slice(DECODED_COVERS_DIR.length);
  if (filenamePart.includes('/') || filenamePart.includes('\\')) {
    console.error(`FAIL: Slash in ID became a directory separator in decoded path: ${filenamePart}`);
    process.exit(1);
  }
}
console.log('✔ Slashes in IDs are safely preserved as %2F and never create subdirectories in decoded pathname.');

// ----------------------------------------------------------------------------
// Test 3: Percent, underscore, Unicode, and dot mapping after decoding
// ----------------------------------------------------------------------------
console.log('\n[Test 3] Testing percent, underscore, Unicode, and dots after decoding...');

const specialCharIds = [
  'novel_1',       // underscore
  'novel-1',       // hyphen
  'novel/1',       // slash
  'novel:1',       // colon
  'novel.1',       // dot
  'novel 1',       // space
  'novel%1',       // percent
  'novel%251',     // double percent test
  'novel\\1',      // backslash
  '君は僕の後悔',   // Japanese Unicode
  'novel.v1.0',    // multiple dots
];

const decodedSpecialMap = new Map();
for (const id of specialCharIds) {
  const resolvedUri = resolveCoverPath(DUMMY_COVERS_DIR, id, 'jpg');
  const decodedPath = simulateAndroidUriDecoding(resolvedUri);

  if (decodedSpecialMap.has(decodedPath)) {
    const prevId = decodedSpecialMap.get(decodedPath);
    console.error(`COLLISION DETECTED on decoded special char path!`);
    console.error(`  ID 1: "${prevId}" -> ${decodedPath}`);
    console.error(`  ID 2: "${id}" -> ${decodedPath}`);
    process.exit(1);
  }
  decodedSpecialMap.set(decodedPath, id);
}

console.log(`✔ All ${specialCharIds.length} special IDs mapped to mutually distinct paths after decoded pathname resolution:`);
for (const [decodedPath, id] of decodedSpecialMap.entries()) {
  const fn = decodedPath.slice(DECODED_COVERS_DIR.length);
  console.log(`  - "${id}" => ${fn}`);
}

// ----------------------------------------------------------------------------
// Test 4: Containment check: decoded paths must stay strictly within target directory
// ----------------------------------------------------------------------------
console.log('\n[Test 4] Testing target directory containment...');

const traversalAttempts = [
  ['../escaped', 'ch1', 'img1'],
  ['novel', '../../escaped', 'img1'],
  ['novel', 'ch1', '../escaped'],
  ['./current', 'ch1', 'img1'],
];

for (const [novelId, chapterId, imageId] of traversalAttempts) {
  const resolvedUri = resolveChapterImagePath(DUMMY_CHAPTERS_DIR, novelId, chapterId, imageId, 'jpg');
  const decodedPath = simulateAndroidUriDecoding(resolvedUri);

  if (!decodedPath.startsWith(DECODED_CHAPTERS_DIR)) {
    console.error(`FAIL: Path escaped target directory: ${decodedPath}`);
    process.exit(1);
  }

  const filenamePart = decodedPath.slice(DECODED_CHAPTERS_DIR.length);
  if (filenamePart.includes('/') || filenamePart.includes('\\') || filenamePart.includes('..')) {
    console.error(`FAIL: Path traversal or slash leaked into decoded filename: ${filenamePart}`);
    process.exit(1);
  }
}
console.log('✔ All decoded paths stay strictly contained within target directory without traversal leaks.');

// ----------------------------------------------------------------------------
// Test 5: Input validation tests
// ----------------------------------------------------------------------------
console.log('\n[Test 5] Testing segment and extension validation...');

function assertThrows(fn, expectedMsg) {
  try {
    fn();
    console.error(`FAIL: Expected function to throw "${expectedMsg}", but it succeeded.`);
    process.exit(1);
  } catch (err) {
    if (!err.message.includes(expectedMsg)) {
      console.error(`FAIL: Expected error containing "${expectedMsg}", got "${err.message}"`);
      process.exit(1);
    }
  }
}

assertThrows(() => validatePathSegment('novelId', ''), 'must be a non-empty string');
assertThrows(() => validatePathSegment('novelId', '   '), 'must be a non-empty string');
assertThrows(() => validatePathSegment('novelId', null), 'must be a non-empty string');
assertThrows(() => validatePathSegment('novelId', undefined), 'must be a non-empty string');
assertThrows(() => validatePathSegment('novelId', 'bad\0id'), 'contains null byte');

if (validateFileExtension('jpg') !== 'jpg') process.exit(1);
if (validateFileExtension('.PNG') !== 'png') process.exit(1);
if (validateFileExtension('webp') !== 'webp') process.exit(1);

assertThrows(() => validateFileExtension(''), 'must be 1-10 alphanumeric characters');
assertThrows(() => validateFileExtension('..'), 'must be 1-10 alphanumeric characters');
assertThrows(() => validateFileExtension('jpg/png'), 'must be 1-10 alphanumeric characters');
assertThrows(() => validateFileExtension(123), 'must be a string');

console.log('✔ Segment and file extension validation fully verified.');

console.log('\n=== ALL FILESYSTEM PATH & DECODED PARITY TESTS PASSED ===\n');
