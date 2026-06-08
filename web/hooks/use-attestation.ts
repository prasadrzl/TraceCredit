import { useQuery } from '@tanstack/react-query';
import { attestationApi } from '@/lib/api/attestation';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';

export function useAttestationConfig() {
  return useQuery({
    queryKey: QUERY_KEYS.attestationConfig(),
    queryFn: attestationApi.getConfig,
    staleTime: REFETCH_INTERVALS.attestation,
  });
}

export function useAttestationHistory(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.attestationHistory(wallet ?? ''),
    queryFn: () => attestationApi.getHistory(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.score,
  });
}
