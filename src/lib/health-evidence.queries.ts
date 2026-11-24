import { queryOptions } from '@tanstack/react-query';
import { getExplorer, getEvidence } from './health-evidence.functions';

export const explorerQuery = (query = '', cursor = '*') => queryOptions({
  queryKey: ['health-explorer', query, cursor],
  queryFn: () => getExplorer({ data: { query, cursor } }),
  staleTime: 5 * 60 * 1000,
  refetchInterval: 5 * 60 * 1000,
  retry: 1,
});
export const evidenceQuery = (id: string) => queryOptions({ queryKey: ['health-evidence', id], queryFn: () => getEvidence({ data: { id } }), staleTime: 10 * 60 * 1000 });