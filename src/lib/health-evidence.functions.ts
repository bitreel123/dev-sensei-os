import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { explorerInput } from './health-evidence';

export const getExplorer = createServerFn({ method: 'GET' })
  .inputValidator(explorerInput)
  .handler(async ({ data }) => {
    const { loadExplorer } = await import('./health-evidence.server');
    return loadExplorer(data.query, data.cursor);
  });
export const getEvidence = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().regex(/^(news-[a-f0-9]{24}|research-[A-Z]{3}-[a-zA-Z0-9._-]{1,80})$/) }))
  .handler(async ({ data }) => {
    const { loadEvidence } = await import('./health-evidence.server');
    try { return { entry: await loadEvidence(data.id), unavailable: false }; }
    catch (error) { console.error('Evidence source unavailable', error); return { entry: null, unavailable: true }; }
  });
export const getFullText = createServerFn({ method: 'GET' })
  .inputValidator(z.object({ id: z.string().regex(/^research-[A-Z]{3}-[a-zA-Z0-9._-]{1,80}$/) }))
  .handler(async ({ data }) => {
    const { loadFullText } = await import('./health-evidence.server');
    try { return await loadFullText(data.id); } catch (error) { console.error('Full text unavailable', error); return null; }
  });
