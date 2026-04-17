import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content', 'dev-docs');

export interface DocFrontmatter {
  title: string;
  description?: string;
  lastTask?: string;
  lastUpdated?: string | Date;
}

function normalizeDate(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value instanceof Date) {
    const iso = value.toISOString();
    return iso.split('T')[0] ?? null;
  }
  return null;
}

export interface DocIndexEntry {
  slug: string[];
  slugString: string;
  title: string;
  description: string;
  lastTask: string | null;
  lastUpdated: string | null;
}

export interface DocContent extends DocIndexEntry {
  source: string;
}

function mdxFileForSlug(slug: string[]): string | null {
  const candidates = [
    path.join(CONTENT_ROOT, ...slug, 'index.mdx'),
    path.join(CONTENT_ROOT, `${slug.join(path.sep)}.mdx`),
  ];
  for (const candidate of candidates) {
    try {
      if (statSync(candidate).isFile()) return candidate;
    } catch {
      // fallthrough to next candidate
    }
  }
  return null;
}

function parseFrontmatter(filePath: string): { data: DocFrontmatter; content: string } {
  const raw = readFileSync(filePath, 'utf8');
  const parsed = matter(raw);
  return {
    data: parsed.data as DocFrontmatter,
    content: parsed.content,
  };
}

export function readDoc(slug: string[]): DocContent | null {
  const filePath = mdxFileForSlug(slug);
  if (!filePath) return null;
  const { data, content } = parseFrontmatter(filePath);
  return {
    slug,
    slugString: slug.join('/'),
    title: data.title ?? slug.join(' / ') ?? 'Untitled',
    description: data.description ?? '',
    lastTask: data.lastTask ?? null,
    lastUpdated: normalizeDate(data.lastUpdated),
    source: content,
  };
}

function walk(dir: string, prefix: string[] = []): DocIndexEntry[] {
  let entries: DocIndexEntry[] = [];
  let items: string[];
  try {
    items = readdirSync(dir);
  } catch {
    return entries;
  }
  for (const item of items) {
    const abs = path.join(dir, item);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      entries = entries.concat(walk(abs, [...prefix, item]));
      continue;
    }
    if (!item.endsWith('.mdx')) continue;
    const rel = item === 'index.mdx' ? prefix : [...prefix, item.replace(/\.mdx$/, '')];
    const { data } = parseFrontmatter(abs);
    entries.push({
      slug: rel,
      slugString: rel.join('/'),
      title: data.title ?? rel.join(' / '),
      description: data.description ?? '',
      lastTask: data.lastTask ?? null,
      lastUpdated: normalizeDate(data.lastUpdated),
    });
  }
  return entries;
}

export function listAllDocs(): DocIndexEntry[] {
  return walk(CONTENT_ROOT);
}
