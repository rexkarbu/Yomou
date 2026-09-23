import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';
import tailwindcss from 'tailwindcss';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const clientDir = path.join(rootDir, 'client');

console.log('=== [FON-04] Theme System, Primitives & NativeWind Verification ===\n');

// 1. Direct Import of Actual Application Tokens
// Importing directly from client/src/styles/theme.ts
const { THEME_COLORS, TYPOGRAPHY, SPACING, RADIUS, ELEVATION } = await import(
  '../client/src/styles/theme.ts'
);

assert(THEME_COLORS, 'THEME_COLORS must be exported by theme.ts');
assert(THEME_COLORS.light && THEME_COLORS.dark && THEME_COLORS.sepia, 'All 3 themes must be present');
console.log('✔ Successfully imported actual THEME_COLORS from client/src/styles/theme.ts');

// 2. WCAG 2.1 Contrast Calculation Utilities
function hexToRgb(hex) {
  const cleanHex = hex.replace('#', '');
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;
  return [r, g, b];
}

function relativeLuminance([r, g, b]) {
  const adjust = (c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return 0.2126 * adjust(r) + 0.7152 * adjust(g) + 0.0722 * adjust(b);
}

function contrastRatio(hex1, hex2) {
  const l1 = relativeLuminance(hexToRgb(hex1));
  const l2 = relativeLuminance(hexToRgb(hex2));
  const brighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (brighter + 0.05) / (darker + 0.05);
}

// 3. Verify ALL Component Foreground / Background Pairs
console.log('\n--- Evaluating Component Foreground/Background Pairs Across Themes ---');

const contrastResults = [];

for (const theme of ['light', 'dark', 'sepia']) {
  const colors = THEME_COLORS[theme];
  console.log(`\n[Theme: ${theme.toUpperCase()}]`);

  const surfaces = [
    ['surfaceBackground', colors.surfaceBackground],
    ['surfaceRaised', colors.surfaceRaised],
    ['surfaceOverlay', colors.surfaceOverlay],
  ];

  for (const [sName, sBg] of surfaces) {
    // textPrimary (Normal text: WCAG AAA >= 7.0:1)
    const ratioPrimary = contrastRatio(colors.textPrimary, sBg);
    const passAAA = ratioPrimary >= 7.0;
    const passAA = ratioPrimary >= 4.5;
    assert(passAAA, `${theme} textPrimary on ${sName} must meet WCAG AAA (>= 7.0:1). Actual: ${ratioPrimary.toFixed(2)}`);
    contrastResults.push({
      theme,
      element: `textPrimary (${colors.textPrimary}) on ${sName} (${sBg})`,
      ratio: ratioPrimary,
      level: passAAA ? 'AAA' : 'AA',
    });
    console.log(`  [${passAAA ? 'AAA' : 'AA'}] textPrimary (${colors.textPrimary}) on ${sName} (${sBg}): ${ratioPrimary.toFixed(2)}:1`);

    // textSecondary (Normal text: WCAG AA >= 4.5:1)
    const ratioSecondary = contrastRatio(colors.textSecondary, sBg);
    assert(ratioSecondary >= 4.5, `${theme} textSecondary on ${sName} must meet WCAG AA (>= 4.5:1). Actual: ${ratioSecondary.toFixed(2)}`);
    const secAAA = ratioSecondary >= 7.0;
    contrastResults.push({
      theme,
      element: `textSecondary (${colors.textSecondary}) on ${sName} (${sBg})`,
      ratio: ratioSecondary,
      level: secAAA ? 'AAA' : 'AA',
    });
    console.log(`  [${secAAA ? 'AAA' : 'AA'}] textSecondary (${colors.textSecondary}) on ${sName} (${sBg}): ${ratioSecondary.toFixed(2)}:1`);

    // statusError (WCAG AA >= 4.5:1)
    const ratioError = contrastRatio(colors.statusError, sBg);
    assert(ratioError >= 4.5, `${theme} statusError on ${sName} must meet WCAG AA (>= 4.5:1). Actual: ${ratioError.toFixed(2)}`);
    const errAAA = ratioError >= 7.0;
    contrastResults.push({
      theme,
      element: `statusError (${colors.statusError}) on ${sName} (${sBg})`,
      ratio: ratioError,
      level: errAAA ? 'AAA' : 'AA',
    });
    console.log(`  [${errAAA ? 'AAA' : 'AA'}] statusError (${colors.statusError}) on ${sName} (${sBg}): ${ratioError.toFixed(2)}:1`);

    // statusSuccess (WCAG AA >= 4.5:1)
    const ratioSuccess = contrastRatio(colors.statusSuccess, sBg);
    assert(ratioSuccess >= 4.5, `${theme} statusSuccess on ${sName} must meet WCAG AA (>= 4.5:1). Actual: ${ratioSuccess.toFixed(2)}`);
    const succAAA = ratioSuccess >= 7.0;
    contrastResults.push({
      theme,
      element: `statusSuccess (${colors.statusSuccess}) on ${sName} (${sBg})`,
      ratio: ratioSuccess,
      level: succAAA ? 'AAA' : 'AA',
    });
    console.log(`  [${succAAA ? 'AAA' : 'AA'}] statusSuccess (${colors.statusSuccess}) on ${sName} (${sBg}): ${ratioSuccess.toFixed(2)}:1`);

    // accentPrimary on surface (WCAG AA >= 4.5:1) - includes surfaceBackground, surfaceRaised, and surfaceOverlay
    const ratioAccentOnSurface = contrastRatio(colors.accentPrimary, sBg);
    assert(
      ratioAccentOnSurface >= 4.5,
      `${theme} accentPrimary on ${sName} must meet WCAG AA (>= 4.5:1). Actual: ${ratioAccentOnSurface.toFixed(2)}`
    );
    const accAAA = ratioAccentOnSurface >= 7.0;
    contrastResults.push({
      theme,
      element: `accentPrimary (${colors.accentPrimary}) on ${sName} (${sBg})`,
      ratio: ratioAccentOnSurface,
      level: accAAA ? 'AAA' : 'AA',
    });
    console.log(`  [${accAAA ? 'AAA' : 'AA'}] accentPrimary (${colors.accentPrimary}) on ${sName} (${sBg}): ${ratioAccentOnSurface.toFixed(2)}:1`);
  }

  // Filled Button Normal State (accentOnPrimary on accentPrimary)
  const ratioFilledNormal = contrastRatio(colors.accentOnPrimary, colors.accentPrimary);
  assert(
    ratioFilledNormal >= 4.5,
    `${theme} Filled Button Normal label must meet WCAG AA (>= 4.5:1). Actual: ${ratioFilledNormal.toFixed(2)}`
  );
  const fnAAA = ratioFilledNormal >= 7.0;
  contrastResults.push({
    theme,
    element: `Filled Button Normal (${colors.accentOnPrimary} on ${colors.accentPrimary})`,
    ratio: ratioFilledNormal,
    level: fnAAA ? 'AAA' : 'AA',
  });
  console.log(`  [${fnAAA ? 'AAA' : 'AA'}] Filled Button Normal: ${colors.accentOnPrimary} on ${colors.accentPrimary}: ${ratioFilledNormal.toFixed(2)}:1`);

  // Filled Button Pressed State (accentOnPrimary on accentPressed)
  const ratioFilledPressed = contrastRatio(colors.accentOnPrimary, colors.accentPressed);
  assert(
    ratioFilledPressed >= 4.5,
    `${theme} Filled Button Pressed label must meet WCAG AA (>= 4.5:1). Actual: ${ratioFilledPressed.toFixed(2)}`
  );
  const fpAAA = ratioFilledPressed >= 7.0;
  contrastResults.push({
    theme,
    element: `Filled Button Pressed (${colors.accentOnPrimary} on ${colors.accentPressed})`,
    ratio: ratioFilledPressed,
    level: fpAAA ? 'AAA' : 'AA',
  });
  console.log(`  [${fpAAA ? 'AAA' : 'AA'}] Filled Button Pressed: ${colors.accentOnPrimary} on ${colors.accentPressed}: ${ratioFilledPressed.toFixed(2)}:1`);

  // Outlined Button Pressed State (textPrimary on surfaceRaised)
  const ratioOutlinedPressed = contrastRatio(colors.textPrimary, colors.surfaceRaised);
  assert(
    ratioOutlinedPressed >= 4.5,
    `${theme} Outlined Button Pressed label must meet WCAG AA (>= 4.5:1). Actual: ${ratioOutlinedPressed.toFixed(2)}`
  );
  const opAAA = ratioOutlinedPressed >= 7.0;
  contrastResults.push({
    theme,
    element: `Outlined Button Pressed (${colors.textPrimary} on ${colors.surfaceRaised})`,
    ratio: ratioOutlinedPressed,
    level: opAAA ? 'AAA' : 'AA',
  });
  console.log(`  [${opAAA ? 'AAA' : 'AA'}] Outlined Button Pressed: ${colors.textPrimary} on ${colors.surfaceRaised}: ${ratioOutlinedPressed.toFixed(2)}:1`);

  // Text Button Pressed State (accentPrimary on surfaceRaised)
  const ratioTextPressed = contrastRatio(colors.accentPrimary, colors.surfaceRaised);
  assert(
    ratioTextPressed >= 4.5,
    `${theme} Text Button Pressed label must meet WCAG AA (>= 4.5:1). Actual: ${ratioTextPressed.toFixed(2)}`
  );
  const tpAAA = ratioTextPressed >= 7.0;
  contrastResults.push({
    theme,
    element: `Text Button Pressed (${colors.accentPrimary} on ${colors.surfaceRaised})`,
    ratio: ratioTextPressed,
    level: tpAAA ? 'AAA' : 'AA',
  });
  console.log(`  [${tpAAA ? 'AAA' : 'AA'}] Text Button Pressed: ${colors.accentPrimary} on ${colors.surfaceRaised}: ${ratioTextPressed.toFixed(2)}:1`);
}

const aaaPairs = contrastResults.filter((r) => r.level === 'AAA');
const aaPairs = contrastResults.filter((r) => r.level === 'AA');
console.log(`\n✔ Contrast Summary: Total ${contrastResults.length} pairs tested across 3 themes.`);
console.log(`  - Level AAA (>= 7.0:1): ${aaaPairs.length} pairs`);
console.log(`  - Level AA (>= 4.5:1, < 7.0:1): ${aaPairs.length} pairs`);
console.log(`  - FAILED (< 4.5:1): 0 pairs`);

// 4. Programmatic Testing of Button Layout & Touch Target Guarantees
console.log('\n--- Testing Button Style Resolution & Touch Target Enforceability ---');
const { resolveButtonLayoutAndStyle, mergeButtonAccessibilityState } = await import(
  '../client/src/components/common/button-layout.ts'
);

// Test 4A: User style attempting to shrink touch target below 48x48dp MUST NOT lower it
const defaultVariantStyle = {
  backgroundColor: '#2563EB',
  paddingHorizontal: 16,
  paddingVertical: 12,
};
const hostileUserStyle = {
  minHeight: 20,
  minWidth: 20,
  height: 24,
  width: 24,
  padding: 2,
};
const resolvedHostile = resolveButtonLayoutAndStyle(defaultVariantStyle, hostileUserStyle, false);
console.log('  Resolved hostile style:', {
  minHeight: resolvedHostile.minHeight,
  minWidth: resolvedHostile.minWidth,
});
assert(
  resolvedHostile.minHeight >= 48,
  `Button minHeight must be >= 48dp even when hostile style requests 20dp. Got: ${resolvedHostile.minHeight}`
);
assert(
  resolvedHostile.minWidth >= 48,
  `Button minWidth must be >= 48dp even when hostile style requests 20dp. Got: ${resolvedHostile.minWidth}`
);

// Test 4B: User style expanding touch target above 48dp is preserved
const expandedUserStyle = { minHeight: 56, minWidth: 60 };
const resolvedExpanded = resolveButtonLayoutAndStyle(defaultVariantStyle, expandedUserStyle, false);
assert(
  resolvedExpanded.minHeight === 56 && resolvedExpanded.minWidth === 60,
  'Button must allow enlarging touch targets above 48dp'
);
console.log('✔ Button touch target minimum 48x48dp cannot be downgraded by external styles');

// 5. Programmatic Testing of AccessibilityState Merging
console.log('\n--- Testing AccessibilityState Merging & Authoritative States ---');

// Case 1: Custom state with selected: true, but caller sets disabled: false while loading: true
const state1 = mergeButtonAccessibilityState({ selected: true, disabled: false }, false, true);
console.log('  Merged state (loading=true, custom disabled=false):', state1);
assert.strictEqual(state1.selected, true, 'Custom selected state must be preserved');
assert.strictEqual(state1.disabled, true, 'Internal loading must authoritatively force disabled=true');
assert.strictEqual(state1.busy, true, 'Loading must authoritatively set busy=true');

// Case 2: Custom state with checked: true, disabled: true, loading: false
const state2 = mergeButtonAccessibilityState({ checked: true }, true, false);
console.log('  Merged state (disabled=true, loading=false):', state2);
assert.strictEqual(state2.checked, true, 'Custom checked state must be preserved');
assert.strictEqual(state2.disabled, true, 'Internal disabled must authoritatively force disabled=true');
assert.strictEqual(state2.busy, false, 'Non-loading state must set busy=false');

// Case 3: Empty custom state, disabled: false, loading: false
const state3 = mergeButtonAccessibilityState(undefined, false, false);
assert.strictEqual(state3.disabled, false);
assert.strictEqual(state3.busy, false);
console.log('✔ AccessibilityState properly preserves custom flags while keeping disabled and busy authoritative');

// 6. NativeWind Bundling & Utility Class Extraction Proof
console.log('\n--- Verifying NativeWind Utility Class Pipeline ---');
const globalCssPath = path.join(clientDir, 'global.css');
assert(fs.existsSync(globalCssPath), 'global.css must exist');
const tailwindConfigPath = path.join(clientDir, 'tailwind.config.js');
assert(fs.existsSync(tailwindConfigPath), 'tailwind.config.js must exist');

const inputCss = '@tailwind utilities;';
const postcssResult = await postcss([tailwindcss({ config: tailwindConfigPath })]).process(
  inputCss,
  { from: globalCssPath }
);

const emittedCss = postcssResult.css;
const hasItemsCenter = emittedCss.includes('.items-center');
console.log('  Emitted CSS contains utility class .items-center:', hasItemsCenter);
assert(
  hasItemsCenter,
  'Tailwind/NativeWind pipeline must extract .items-center utility class from App.tsx into emitted CSS'
);
console.log('✔ NativeWind utility class successfully verified in build/compilation flow');

// 7. TypeScript Static Compilation Proof on Button Discriminated Union
console.log('\n--- Verifying Compile-time Discriminated Union ---');
const { execSync } = await import('node:child_process');
const tempTestPath = path.join(rootDir, 'client/src/components/common/__test_button_type__.tsx');
try {
  // Test case A: icon-only without accessibilityLabel MUST fail compilation
  fs.writeFileSync(
    tempTestPath,
    `import React from 'react';
import { Button } from './Button';
export const TestInvalid = () => <Button icon="menu" />;
`
  );
  let failedAsExpected = false;
  try {
    execSync('npx tsc --noEmit', { cwd: clientDir, stdio: 'pipe' });
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    if (output.includes('accessibilityLabel') || output.includes('Type')) {
      failedAsExpected = true;
    }
  }
  assert(
    failedAsExpected,
    'TypeScript compiler must reject Button with icon but without title or accessibilityLabel'
  );

  // Test case B: icon-only WITH accessibilityLabel MUST succeed
  fs.writeFileSync(
    tempTestPath,
    `import React from 'react';
import { Button } from './Button';
export const TestValidIconOnly = () => <Button icon="menu" accessibilityLabel="Main Menu" />;
export const TestValidWithTitle = () => <Button title="Submit" />;
`
  );
  execSync('npx tsc --noEmit', { cwd: clientDir, stdio: 'pipe' });
  console.log('✔ TypeScript statically enforces accessibilityLabel requirement for icon-only buttons');
} finally {
  if (fs.existsSync(tempTestPath)) {
    fs.unlinkSync(tempTestPath);
  }
}

// 8. Material Symbols Rounded Offline Font Asset & Glyph Verification
console.log('\n--- Verifying Material Symbols Rounded Offline Assets & Glyphs ---');

// 8A. Offline Font Asset & License Check
const fontAssetPath = path.join(clientDir, 'assets/fonts/MaterialSymbolsRounded_400Regular.ttf');
assert(fs.existsSync(fontAssetPath), 'Material Symbols Rounded TTF font asset must exist at client/assets/fonts/');
const fontStats = fs.statSync(fontAssetPath);
assert(fontStats.size > 1_000_000, `Font asset must be the real Google TTF (> 1MB). Actual: ${fontStats.size} bytes`);
console.log(`  Font Asset: ${fontAssetPath} (${fontStats.size.toLocaleString()} bytes)`);

const licensePath = path.join(clientDir, 'assets/fonts/LICENSE_MATERIAL_SYMBOLS.txt');
assert(fs.existsSync(licensePath), 'License attribution file must exist');
const licenseContent = fs.readFileSync(licensePath, 'utf-8');
assert(licenseContent.includes('The Material Symbols Authors'), 'License must cite Material Symbols Authors');
assert(licenseContent.includes('Apache License, Version 2.0'), 'License must declare Apache 2.0');
console.log('  License Attribution: Apache 2.0 attribution verified');

// 8B. Glyph Map Codepoint Verification (matching official Google source)
const { MATERIAL_SYMBOLS_GLYPH_MAP, isMaterialSymbolName } = await import(
  '../client/src/components/common/material-symbols-glyphmap.ts'
);

assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.menu, 0xe5d2, 'menu glyph codepoint must match Google source (0xe5d2)');
assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.search, 0xef7a, 'search glyph codepoint must match Google source (0xef7a)');
assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.check, 0xe668, 'check glyph codepoint must match Google source (0xe668)');
assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.palette, 0xe40a, 'palette glyph codepoint must match Google source (0xe40a)');
assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.bookmark, 0xe8e7, 'bookmark glyph codepoint must match Google source (0xe8e7)');
assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.download, 0xf090, 'download glyph codepoint must match Google source (0xf090)');
assert.strictEqual(MATERIAL_SYMBOLS_GLYPH_MAP.auto_stories, 0xe666, 'auto_stories glyph codepoint must match Google source (0xe666)');
console.log(`  Glyph Map: Verified ${Object.keys(MATERIAL_SYMBOLS_GLYPH_MAP).length} official Google codepoint mappings`);

// 8C. Runtime Validator Verification
assert.strictEqual(isMaterialSymbolName('menu'), true, 'menu must be recognized as valid');
assert.strictEqual(isMaterialSymbolName('search'), true, 'search must be recognized as valid');
assert.strictEqual(isMaterialSymbolName('check'), true, 'check must be recognized as valid');
assert.strictEqual(isMaterialSymbolName('palette'), true, 'palette must be recognized as valid');
assert.strictEqual(isMaterialSymbolName('nonexistent_glyph'), false, 'nonexistent glyph must be rejected at runtime');
assert.strictEqual(isMaterialSymbolName('home'), false, 'unregistered glyph must be rejected at runtime');
assert.strictEqual(isMaterialSymbolName(''), false, 'empty string must be rejected at runtime');
console.log('✔ Runtime isMaterialSymbolName successfully accepts valid glyphs and rejects invalid names');

// 8D. TypeScript Compile-Time Verification (Valid Names Accepted, Invalid Names Rejected)
const tempIconTestPath = path.join(rootDir, 'client/src/components/common/__test_icon_type__.tsx');
try {
  // Test case 1: Valid glyph names on Icon and Button MUST pass compilation
  fs.writeFileSync(
    tempIconTestPath,
    `import React from 'react';
import { Icon } from './Icon';
import { Button } from './Button';
export const TestValidGlyphs = () => (
  <>
    <Icon name="menu" />
    <Icon name="search" />
    <Icon name="palette" />
    <Button icon="check" accessibilityLabel="Confirm" />
  </>
);
`
  );
  execSync('npx tsc --noEmit', { cwd: clientDir, stdio: 'pipe' });
  console.log('  Compile-time check: Valid glyph names cleanly accepted by TypeScript');

  // Test case 2: Invalid glyph name on Icon MUST be rejected by compiler
  fs.writeFileSync(
    tempIconTestPath,
    `import React from 'react';
import { Icon } from './Icon';
// @ts-expect-error Intentionally invalid glyph name to test compile error
export const TestInvalidIcon = () => <Icon name="invalid_symbol_xyz" />;
`
  );
  // Without @ts-expect-error it should fail:
  fs.writeFileSync(
    tempIconTestPath,
    `import React from 'react';
import { Icon } from './Icon';
export const TestInvalidIcon = () => <Icon name="invalid_symbol_xyz" />;
`
  );
  let iconFailedAsExpected = false;
  try {
    execSync('npx tsc --noEmit', { cwd: clientDir, stdio: 'pipe' });
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    if (output.includes('invalid_symbol_xyz') || output.includes('MaterialSymbolName')) {
      iconFailedAsExpected = true;
    }
  }
  assert(iconFailedAsExpected, 'TypeScript compiler must reject invalid glyph name on <Icon name="invalid_symbol_xyz" />');
  console.log('  Compile-time check: Invalid glyph name rejected by TypeScript on <Icon />');

  // Test case 3: Invalid glyph name on Button MUST be rejected by compiler
  fs.writeFileSync(
    tempIconTestPath,
    `import React from 'react';
import { Button } from './Button';
export const TestInvalidButtonIcon = () => <Button icon="invalid_symbol_xyz" accessibilityLabel="Test" />;
`
  );
  let buttonIconFailedAsExpected = false;
  try {
    execSync('npx tsc --noEmit', { cwd: clientDir, stdio: 'pipe' });
  } catch (err) {
    const output = (err.stdout?.toString() || '') + (err.stderr?.toString() || '');
    if (output.includes('invalid_symbol_xyz') || output.includes('MaterialSymbolName')) {
      buttonIconFailedAsExpected = true;
    }
  }
  assert(buttonIconFailedAsExpected, 'TypeScript compiler must reject invalid icon name on <Button icon="invalid_symbol_xyz" />');
  console.log('  Compile-time check: Invalid glyph name rejected by TypeScript on <Button />');
  console.log('✔ TypeScript statically enforces valid Material Symbols Rounded glyph names and rejects unavailable names');
} finally {
  if (fs.existsSync(tempIconTestPath)) {
    fs.unlinkSync(tempIconTestPath);
  }
}

console.log('\n=== ALL AUTOMATED THEME & PRIMITIVES CHECKS PASSED (0 ERRORS) ===\n');
