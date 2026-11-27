import { articleSchema } from './health-article';

type MediaRecord = { id: string; source: string; content_access: string; featured_image: string | null; article_content: unknown };

// Only catalogue-backed, complete articles may expose their own cached figures.
export function canSignArticleMedia(path: string, record: MediaRecord | null): boolean {
  if (!record || record.content_access !== 'complete' || !['CDC MMWR', 'Europe PMC'].includes(record.source)) return false;
  const prefix = `articles/${record.id}/`;
  if (!path.startsWith(prefix) || !/^\d+\.(jpeg|png|webp|gif)$/.test(path.slice(prefix.length))) return false;
  const article = articleSchema.safeParse(record.article_content);
  return article.success && article.data.complete && article.data.blocks.some(block => block.type === 'figure' && block.image === path);
}