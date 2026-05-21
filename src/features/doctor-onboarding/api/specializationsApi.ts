import { apiClient, extractApiErrorMessage } from '../../../lib/apiClient'
import type { SpecializationListResponse } from '../types'

export async function getSpecializations(): Promise<SpecializationListResponse> {
  try {
    const { data } = await apiClient.get<SpecializationListResponse>(
      '/v1/specializations',
    )
    return {
      data: data.data ?? [],
      total: data.total ?? 0,
    }
  } catch (err) {
    throw new Error(
      extractApiErrorMessage(err, 'Unable to load specializations'),
      { cause: err },
    )
  }
}
