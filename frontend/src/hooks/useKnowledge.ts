import { useQuery } from '@tanstack/react-query'
import { fetchKnowledgeContent } from '@/lib/knowledge'

export function useKnowledgeContent(slug: string) {
  return useQuery({
    queryKey: ['knowledge', slug],
    queryFn: () => fetchKnowledgeContent(slug),
    enabled: !!slug,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 30 * 60 * 1000, // 30 minutes
  })
}
