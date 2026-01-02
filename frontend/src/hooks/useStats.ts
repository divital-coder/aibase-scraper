import { useQuery } from '@tanstack/react-query'
import { getStats, getTagStats } from '@/lib/api'

export function useStats() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: getStats,
    refetchInterval: 30000,
  })
}

export function useTagStats() {
  return useQuery({
    queryKey: ['tagStats'],
    queryFn: getTagStats,
  })
}
