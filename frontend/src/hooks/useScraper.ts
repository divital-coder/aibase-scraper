import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { startScrape, startRangeScrape, stopScrape, getScraperStatus, getScrapeRuns } from '@/lib/api'

export function useScraperStatus() {
  return useQuery({
    queryKey: ['scraperStatus'],
    queryFn: getScraperStatus,
    refetchInterval: 2000,
  })
}

export function useScrapeRuns(limit?: number) {
  return useQuery({
    queryKey: ['scrapeRuns', limit],
    queryFn: () => getScrapeRuns(limit),
  })
}

export function useStartScrape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraperStatus'] })
      queryClient.invalidateQueries({ queryKey: ['scrapeRuns'] })
    },
  })
}

export function useStopScrape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: stopScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraperStatus'] })
      queryClient.invalidateQueries({ queryKey: ['scrapeRuns'] })
    },
  })
}

export function useStartRangeScrape() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: startRangeScrape,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scraperStatus'] })
      queryClient.invalidateQueries({ queryKey: ['scrapeRuns'] })
    },
  })
}
