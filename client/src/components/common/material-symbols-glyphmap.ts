/**
 * Official Material Symbols Rounded Glyph Map (Source: Google Fonts)
 * Codepoint mappings from official MaterialSymbolsRounded font.
 * License: Apache 2.0 (see client/assets/fonts/LICENSE_MATERIAL_SYMBOLS.txt)
 */
export const MATERIAL_SYMBOLS_GLYPH_MAP = {
  menu: 0xe5d2,
  search: 0xef7a,
  check: 0xe668,
  close: 0xe5cd,
  arrow_back: 0xe5c4,
  arrow_forward: 0xe5c8,
  refresh: 0xe5d5,
  settings: 0xe8b8,
  bookmark: 0xe8e7,
  bookmark_border: 0xe8e7,
  download: 0xf090,
  palette: 0xe40a,
  auto_stories: 0xe666,
  menu_book: 0xea19,
  library_books: 0xe02f,
  format_size: 0xe245,
  brightness_4: 0xe3a9,
  dark_mode: 0xe51c,
  light_mode: 0xe518,
  error: 0xf8b6,
  done: 0xe876,
  info: 0xe88e,
  warning: 0xe002,
  history: 0xe889,
  filter_list: 0xe152,
  sort: 0xe164,
  more_vert: 0xe5d4,
  more_horiz: 0xe5d3,
  chevron_left: 0xe5cb,
  chevron_right: 0xe5cc,
  share: 0xe80d,
  favorite: 0xe87d,
  favorite_border: 0xe87e,
} as const;

export type MaterialSymbolName = keyof typeof MATERIAL_SYMBOLS_GLYPH_MAP;

export function isMaterialSymbolName(name: string): name is MaterialSymbolName {
  return Object.prototype.hasOwnProperty.call(MATERIAL_SYMBOLS_GLYPH_MAP, name);
}
