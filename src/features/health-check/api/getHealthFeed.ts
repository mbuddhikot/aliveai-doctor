import { apiClient } from '../../../lib/apiClient'
import type { HealthFeedItem } from '../types'

export async function getHealthFeed(): Promise<HealthFeedItem[]> {
  const { data } = await apiClient.get<HealthFeedItem[]>('/posts', {
    params: { _limit: 5 },
  })

  return data
}
