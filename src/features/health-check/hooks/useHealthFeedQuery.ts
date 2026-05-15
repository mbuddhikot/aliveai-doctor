import { useQuery } from '@tanstack/react-query'
import { getHealthFeed } from '../api/getHealthFeed'
import type { HealthFeedItem } from '../types'

export function useHealthFeedQuery() {
  return useQuery<HealthFeedItem[]>({
    queryKey: ['health-feed'],
    queryFn: getHealthFeed,
  })
}
