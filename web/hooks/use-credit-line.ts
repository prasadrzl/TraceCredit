'use client';

import { useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { creditApi } from '@/lib/api/credit';
import { QUERY_KEYS, REFETCH_INTERVALS } from '@/lib/constants';
import { useProtocolWrite } from './use-protocol-write';
import { CREDIT_LINE_MANAGER_WRITE_ABI } from '@/lib/wagmi/abis';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi/contracts';

export function useCreditLine(wallet: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.creditLine(wallet ?? ''),
    queryFn: () => creditApi.getCreditLine(wallet!),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.score,
  });
}

export function useRateLimitStatus(wallet: string | undefined, tier = 0) {
  return useQuery({
    queryKey: QUERY_KEYS.rateLimit(wallet ?? '', tier),
    queryFn: () => creditApi.getRateLimitStatus(wallet!, tier),
    enabled: !!wallet,
    staleTime: REFETCH_INTERVALS.price,
    refetchInterval: REFETCH_INTERVALS.price,
  });
}

/** Trigger a credit limit increase request. Callable by the wallet owner once the
 *  tier lockup period has expired and their score qualifies for a higher limit.
 *  CreditLineManager.requestIncrease() reads msg.sender and re-queries ScoreEngine. */
export function useRequestCreditIncrease(wallet: string | undefined) {
  const { write } = useProtocolWrite();
  const qc = useQueryClient();

  const requestIncrease = useCallback(async () => {
    await write({
      address: CONTRACT_ADDRESSES.creditLineManager,
      abi: CREDIT_LINE_MANAGER_WRITE_ABI,
      functionName: 'requestIncrease',
      args: [],
      description: 'Requesting credit limit increase…',
      successDescription: 'Credit limit updated',
      ctaLabel: 'View credit line',
      ctaHref: '/borrow',
    });
    // Invalidate credit line cache so the updated limit appears immediately
    if (wallet) qc.invalidateQueries({ queryKey: QUERY_KEYS.creditLine(wallet) });
  }, [write, qc, wallet]);

  return { requestIncrease };
}
