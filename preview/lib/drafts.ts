import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

export const DRAFTS_DIR = path.resolve(process.cwd(), '..', 'docs', 'drafts', 'articles');

export type DraftFrontmatter = {
  slug?: string;
  title?: string;
  description?: string;
  parent_pillar?: string;
  parent_category?: string;
  target_persona?: string[];
  target_level?: string[];
  reading_time?: number;
  target_skus?: string[];
  updated_at?: string;
  phase?: string;
  cta_mode?: string;
  article_type?: string;
  cta_intensity?: string;
  author?: string;
  references?: string[];
  related?: string[];
  [key: string]: unknown;
};

export type Draft = {
  slug: string;
  filename: string;
  frontmatter: DraftFrontmatter;
  content: string;
};

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = normalize(v);
    }
    return out;
  }
  return value;
}

export function getAllDrafts(): Draft[] {
  if (!fs.existsSync(DRAFTS_DIR)) return [];
  const files = fs.readdirSync(DRAFTS_DIR).filter((f) => f.endsWith('.mdx'));
  return files
    .map<Draft>((filename) => {
      const filepath = path.join(DRAFTS_DIR, filename);
      const raw = fs.readFileSync(filepath, 'utf8');
      const { data, content } = matter(raw);
      const normalized = normalize(data) as DraftFrontmatter;
      const slug = (normalized.slug as string) || filename.replace(/\.mdx$/, '');
      return { slug, filename, frontmatter: normalized, content };
    })
    .sort((a, b) => a.filename.localeCompare(b.filename));
}

export function getDraftBySlug(slug: string): Draft | null {
  const all = getAllDrafts();
  return all.find((d) => d.slug === slug) ?? null;
}
