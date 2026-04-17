import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

const CONTENT_ROOT = path.join(process.cwd(), 'src', 'content', 'dev-docs');

interface Issue {
  file: string;
  message: string;
}

function walk(dir: string): string[] {
  const results: string[] = [];
  const items = readdirSync(dir);
  for (const item of items) {
    const abs = path.join(dir, item);
    const stat = statSync(abs);
    if (stat.isDirectory()) {
      results.push(...walk(abs));
    } else if (item.endsWith('.mdx')) {
      results.push(abs);
    }
  }
  return results;
}

function checkFile(file: string): Issue[] {
  const issues: Issue[] = [];
  const rel = path.relative(CONTENT_ROOT, file);
  let raw: string;
  try {
    raw = readFileSync(file, 'utf8');
  } catch (err) {
    return [{ file: rel, message: `cannot read: ${(err as Error).message}` }];
  }
  try {
    const parsed = matter(raw);
    if (!parsed.data || typeof parsed.data !== 'object') {
      issues.push({ file: rel, message: 'missing frontmatter' });
    } else {
      const { title, lastTask, lastUpdated } = parsed.data as Record<string, unknown>;
      if (typeof title !== 'string' || !title) {
        issues.push({ file: rel, message: 'frontmatter missing `title`' });
      }
      if (lastTask !== undefined && typeof lastTask !== 'string') {
        issues.push({ file: rel, message: '`lastTask` must be a string (e.g. TASK-029)' });
      }
      if (
        lastUpdated !== undefined &&
        typeof lastUpdated !== 'string' &&
        !(lastUpdated instanceof Date)
      ) {
        issues.push({
          file: rel,
          message: '`lastUpdated` must be a string or date (YYYY-MM-DD)',
        });
      }
    }
    if (parsed.content.trim().length === 0) {
      issues.push({ file: rel, message: 'empty body' });
    }
  } catch (err) {
    issues.push({ file: rel, message: `parse error: ${(err as Error).message}` });
  }
  return issues;
}

function main(): void {
  const files = walk(CONTENT_ROOT);
  if (files.length === 0) {
    console.error(`No .mdx files found in ${CONTENT_ROOT}`);
    process.exit(1);
  }
  const issues: Issue[] = [];
  for (const file of files) issues.push(...checkFile(file));
  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`  ${issue.file}: ${issue.message}`);
    }
    console.error(`\n${issues.length} issue(s) in ${files.length} docs file(s).`);
    process.exit(1);
  }
  console.log(`docs:check — ${files.length} files OK.`);
}

main();
