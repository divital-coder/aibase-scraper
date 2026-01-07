import { useQuery } from '@tanstack/react-query'
import { getArticles, getArticle, getSources } from '@/lib/api'

export function useArticles(params: {
  page?: number
  per_page?: number
  search?: string
  tag?: string
  source?: string
}) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: () => getArticles(params),
  })
}

export function useArticle(id: string) {
  return useQuery({
    queryKey: ['article', id],
    queryFn: () => getArticle(id),
    enabled: !!id,
  })
}

export function useSources() {
  return useQuery({
    queryKey: ['sources'],
    queryFn: () => getSources(),
    staleTime: 1000 * 60 * 60, // 1 hour - sources rarely change
  })
}
