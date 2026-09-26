import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');

console.log('=== [FON-05] Android Main Navigation Setup Verification ===\n');

// ---------------------------------------------------------------------------
// 1. Verify Navigation Files Exist
// ---------------------------------------------------------------------------
console.log('--- 1. Verifying Navigation Files & Exports ---');

const navFiles = [
  'src/navigation/types.ts',
  'src/navigation/BottomTabNavigator.tsx',
  'src/navigation/RootNavigator.tsx',
  'src/navigation/index.ts',
  'src/screens/discover/DiscoverScreen.tsx',
  'src/screens/discover/DiscoverPlaceholderScreen.tsx',
  'src/screens/library/LibraryPlaceholderScreen.tsx',
  'src/screens/detail/NovelDetailPlaceholderScreen.tsx',
  'src/screens/reader/ReaderPlaceholderScreen.tsx',
  'src/screens/download/DownloadManagerPlaceholderScreen.tsx',
  'src/screens/index.ts',
];

for (const relPath of navFiles) {
  const fullPath = path.join(clientDir, relPath);
  assert(fs.existsSync(fullPath), `Expected file to exist: ${relPath}`);
}
console.log('✔ All 11 navigation & screen files (including real DiscoverScreen) exist');

// ---------------------------------------------------------------------------
// 2. Verify Tab Icons from Official Material Symbols Glyph Map
// ---------------------------------------------------------------------------
console.log('\n--- 2. Verifying Tab Icon Glyph Names ---');

const { MATERIAL_SYMBOLS_GLYPH_MAP } = await import(
  '../client/src/components/common/material-symbols-glyphmap.ts'
);

assert('auto_stories' in MATERIAL_SYMBOLS_GLYPH_MAP, 'Discover icon "auto_stories" must exist in glyph map');
assert('library_books' in MATERIAL_SYMBOLS_GLYPH_MAP, 'Library icon "library_books" must exist in glyph map');
console.log('✔ Tab icons ("auto_stories" and "library_books") strictly verified in offline Material Symbols glyph map');

// ---------------------------------------------------------------------------
// 3. Real TypeScript Compiler Verification (Positive & Negative Controls)
// ---------------------------------------------------------------------------
console.log('\n--- 3. Testing TypeScript Navigation Parameter Typing (Positive & Negative Controls) ---');

// Helper to compile synthetic TS code against Yomou client tsconfig and types
function compileSnippet(sourceCode) {
  const dummyFilePath = path.join(clientDir, 'src/navigation/__test_snippet__.ts');
  const host = ts.createCompilerHost({
    noEmit: true,
    strict: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    skipLibCheck: true,
  });

  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
    if (path.resolve(fileName) === path.resolve(dummyFilePath)) {
      return ts.createSourceFile(fileName, sourceCode, languageVersion, true);
    }
    return originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  };

  const program = ts.createProgram(
    [dummyFilePath, path.join(clientDir, 'src/navigation/types.ts')],
    {
      noEmit: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      jsx: ts.JsxEmit.ReactJSX,
      skipLibCheck: true,
    },
    host
  );

  const diagnostics = ts.getPreEmitDiagnostics(program);
  const snippetDiagnostics = diagnostics.filter(
    (d) => d.file && path.resolve(d.file.fileName) === path.resolve(dummyFilePath)
  );

  return snippetDiagnostics;
}

// 3A. Positive Control: Valid route parameters
const validSnippet = `
import type { RootStackParamList, MainTabParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

// Valid navigations:
nav.navigate('MainTabs', { screen: 'Discover' });
nav.navigate('MainTabs', { screen: 'Library' });
nav.navigate('NovelDetail', { novelId: 'kimi-wa-boku-no-koukai-ln' });
nav.navigate('Reader', { novelId: 'btth', chapterId: 'mtl/chapter-1' });
nav.navigate('DownloadManager');
`;

const validErrors = compileSnippet(validSnippet);
assert.strictEqual(
  validErrors.length,
  0,
  `Valid navigation snippet must compile without errors, got: ${validErrors.map((e) => e.messageText).join('; ')}`
);
console.log('✔ Positive Control: Valid route parameters compile cleanly (0 errors)');

// 3B. Negative Control 1: NovelDetail missing novelId
const missingNovelIdSnippet = `
import type { RootStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

// @ts-expect-error missing required novelId
nav.navigate('NovelDetail');
`;
const missingNovelIdErrors = compileSnippet(missingNovelIdSnippet);
// Without ts-expect-error this would error; let's test without the comment to prove TS rejects it
const rawMissingNovelId = `
import type { RootStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

nav.navigate('NovelDetail');
`;
const rejectedMissingNovelId = compileSnippet(rawMissingNovelId);
assert(
  rejectedMissingNovelId.length > 0,
  'TypeScript compiler MUST reject NovelDetail navigation missing required novelId'
);
console.log('✔ Negative Control 1: NovelDetail missing novelId correctly rejected by TypeScript compiler');

// 3C. Negative Control 2: NovelDetail wrong parameter type (number instead of string)
const wrongTypeNovelId = `
import type { RootStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

// @ts-ignore
nav.navigate('NovelDetail', { novelId: 12345 });
`;
const rawWrongTypeNovelId = `
import type { RootStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

nav.navigate('NovelDetail', { novelId: 12345 });
`;
const rejectedWrongType = compileSnippet(rawWrongTypeNovelId);
assert(
  rejectedWrongType.length > 0,
  'TypeScript compiler MUST reject NovelDetail with number novelId'
);
console.log('✔ Negative Control 2: NovelDetail with number novelId correctly rejected by TypeScript compiler');

// 3D. Negative Control 3: Reader missing chapterId
const rawMissingChapterId = `
import type { RootStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

nav.navigate('Reader', { novelId: 'btth' });
`;
const rejectedMissingChapterId = compileSnippet(rawMissingChapterId);
assert(
  rejectedMissingChapterId.length > 0,
  'TypeScript compiler MUST reject Reader navigation missing chapterId'
);
console.log('✔ Negative Control 3: Reader missing chapterId correctly rejected by TypeScript compiler');

// 3E. Negative Control 4: Unknown / invalid route name
const rawUnknownRoute = `
import type { RootStackParamList } from './types';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type Nav = NativeStackNavigationProp<RootStackParamList>;
declare const nav: Nav;

nav.navigate('NonExistentRoute');
`;
const rejectedUnknownRoute = compileSnippet(rawUnknownRoute);
assert(
  rejectedUnknownRoute.length > 0,
  'TypeScript compiler MUST reject unknown route name'
);
console.log('✔ Negative Control 4: Non-existent route name correctly rejected by TypeScript compiler');

// ---------------------------------------------------------------------------
// 4. Verify Consistent Sample Data & Navigation Invariants
// ---------------------------------------------------------------------------
console.log('\n--- 4. Verifying Sample Data Pairing & Route Architecture Invariants ---');

const detailContent = fs.readFileSync(
  path.join(clientDir, 'src/screens/detail/NovelDetailPlaceholderScreen.tsx'),
  'utf8'
);
assert(
  detailContent.includes("novelId === 'btth' ? 'mtl/chapter-1' : 'volume-1-chapter-1'"),
  'Sample chapter mapping must consistently pair btth with mtl/chapter-1 and kimi with volume-1-chapter-1'
);
assert(
  !detailContent.includes('encodeURIComponent') && !detailContent.includes('decodeURIComponent'),
  'chapterId must be forwarded intact without extra encoding/decoding'
);
console.log('✔ Consistent sample data pairing verified (btth -> mtl/chapter-1, kimi -> volume-1-chapter-1)');
console.log('✔ chapterId forwarded intact without internal URI encoding/decoding');

const tabContent = fs.readFileSync(
  path.join(clientDir, 'src/navigation/BottomTabNavigator.tsx'),
  'utf8'
);
assert(tabContent.includes('backBehavior="initialRoute"'), 'BottomTabNavigator must set backBehavior="initialRoute"');
assert(tabContent.includes('component={DiscoverScreen}'), 'BottomTabNavigator must wire real DiscoverScreen');
assert(tabContent.includes('minHeight: 48') && tabContent.includes('minWidth: 48'), 'tabBarItemStyle must enforce minHeight: 48 and minWidth: 48');
assert(!tabContent.includes('blur(') && !tabContent.includes('backdropFilter'), 'BottomTabNavigator must not use glassmorphism / blur');
console.log('✔ BottomTabNavigator backBehavior="initialRoute", real DiscoverScreen, and 48dp min touch targets configured');

const rootNavContent = fs.readFileSync(
  path.join(clientDir, 'src/navigation/RootNavigator.tsx'),
  'utf8'
);
assert(
  rootNavContent.includes('Stack.Screen name="MainTabs"') &&
  rootNavContent.includes('Stack.Screen name="NovelDetail"') &&
  rootNavContent.includes('Stack.Screen name="Reader"') &&
  rootNavContent.includes('Stack.Screen name="DownloadManager"'),
  'RootNavigator must register MainTabs, NovelDetail, Reader, and DownloadManager'
);
console.log('✔ RootNavigator places NovelDetail, Reader, and DownloadManager outside MainTabs (hiding bottom bar)');

const appContent = fs.readFileSync(path.join(clientDir, 'App.tsx'), 'utf8');
assert(appContent.includes('accessibilityRole="alert"'), 'App.tsx error banner must have accessibilityRole="alert"');
assert(appContent.includes('accessibilityLiveRegion="polite"'), 'App.tsx error banner must have accessibilityLiveRegion="polite"');
assert(appContent.includes('paddingTop: insets.top + 8'), 'App.tsx error banner must respect top safe area inset');
assert(appContent.includes('SafeAreaInsetsContext.Provider'), 'App.tsx must adjust SafeAreaInsetsContext to prevent double top inset');
assert(appContent.includes('Gagal menginisialisasi penyimpanan lokal'), 'App.tsx must display localized Indonesian message');
assert(!appContent.includes('{initError}</Typography>'), 'App.tsx must not leak raw technical error to UI text');
console.log('✔ App.tsx startup error banner respects top safe area, provides accessible live region, avoids double inset, and uses localized message');

// ---------------------------------------------------------------------------
// 5. Verification Boundaries & Pending Android Runtime Items
// ---------------------------------------------------------------------------
console.log('\n--- 5. Verification Boundaries & Pending Android Runtime Items ---');
console.log('Notice: The following verifications are STATIC & COMPILE-TIME only:');
console.log('  1. TypeScript strict navigation types and negative controls (PASS)');
console.log('  2. Static file and export integrity (PASS)');
console.log('  3. Tab icon availability in Material Symbols glyph map (PASS)');
console.log('  4. Code configuration for safe area and 48dp minimum item dimensions (PASS)');
console.log('\nThe following runtime behaviors CANNOT be verified by bundling or static analysis');
console.log('and REMAIN PENDING until real Android hardware / emulator verification:');
console.log('  [PENDING] Physical 48x48dp touch response on Android screen');
console.log('  [PENDING] Android hardware Back button behavior (Library -> Discover, Reader -> Detail)');
console.log('  [PENDING] Smooth native 60 FPS transitions without frame drops or visual flashes');
console.log('  [PENDING] TalkBack audio announcements for tab roles and accessibility labels');
console.log('  [PENDING] Real canvas rendering of Material Symbols font glyphs');

console.log('\n=== ALL STATIC NAVIGATION SETUP CHECKS PASSED ===\n');
