import { useQuery } from '@tanstack/react-query';
import { priceApi } from '@/lib/api/price';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useUsdcPrice() {
  return useQuery({
    queryKey: QUERY_KEYS.usdcPrice(),
    queryFn: priceApi.getUsdcPrice,
    staleTime: REFETCH_INTERVALS.price,
    refetchInterval: REFETCH_INTERVALS.price,
  });
}
