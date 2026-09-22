/**
 * ContentBlock Contract & Type Specifications
 * Reference: PRD.md Section 7
 */

// 1. Format Penekanan Inline di Dalam Blok Teks
export interface InlineSpan {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
}

// 2. Blok Paragraf
export interface ParagraphBlock {
  type: 'paragraph';
  id: string; // e.g. 'b_001', unik di dalam bab
  spans: InlineSpan[];
}

// 3. Blok Heading Cerita (Mendukung Level 1 sampai 6)
export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingBlock {
  type: 'heading';
  id: string; // e.g. 'h_001'
  level: HeadingLevel; // Sesuai tag heading <h1> s.d. <h6>
  text: string;
}

// 4. Blok Gambar Ilustrasi Cerita (Mendukung Banyak Gambar per Bab)
export interface ImageBlock {
  type: 'image';
  id: string; // Merujuk ke chapter_images.image_id (e.g. 'img_01')
  alt?: string;
  caption?: string;
}

// 5. Blok Pemisah Adegan (Separator / <hr>)
export interface SeparatorBlock {
  type: 'separator';
  id: string; // e.g. 's_001'
}

// Union Type Konten Bab
export type ContentBlock = ParagraphBlock | HeadingBlock | ImageBlock | SeparatorBlock;
