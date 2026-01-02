import { useQuery } from '@tanstack/react-query'
import { getArticles, getArticle } from '@/lib/api'

export function useArticles(params: {
  page?: number
  per_page?: number
  search?: string
  tag?: string
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
