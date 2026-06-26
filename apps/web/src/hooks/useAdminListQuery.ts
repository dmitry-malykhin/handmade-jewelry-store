import { useQuery, type QueryKey } from '@tanstack/react-query'
import { useAuthStore } from '@/store/auth.store'

interface UseAdminListQueryOptions<TData, TParams> {
  queryKey: QueryKey
  queryParams: TParams
  fetcher: (params: TParams, accessToken: string) => Promise<TData>
}

export function useAdminListQuery<TData, TParams>({
  queryKey,
  queryParams,
  fetcher,
}: UseAdminListQueryOptions<TData, TParams>) {
  const accessToken = useAuthStore((state) => state.accessToken)

  return useQuery({
    queryKey: [...queryKey, queryParams],
    queryFn: () => fetcher(queryParams, accessToken ?? ''),
    enabled: accessToken !== null,
  })
}
