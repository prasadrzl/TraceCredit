'use client';

import { useCallback } from 'react';
import { useWalletClient, usePublicClient } from 'wagmi';
import { type Abi, type ContractFunctionName, type ContractFunctionArgs } from 'viem';
import { useTxModal } from '@/store/tx-modal-store';
import { CONTRACT_ADDRESSES } from '@/lib/wagmi/contracts';
import { ERC20_WRITE_ABI } from '@/lib/wagmi/abis';

// ─── Types ────────────────────────────────────────────────────────────────────

interface WriteParams<TAbi extends Abi, TFn extends ContractFunctionName<TAbi, 'nonpayable'>> {
  address: `0x${string}`;
  abi: TAbi;
  functionName: TFn;
  args: ContractFunctionArgs<TAbi, 'nonpayable', TFn>;
  description: string;
  successDescription: string;
  ctaLabel?: string;
  ctaHref?: string;
  /** If set, sends approve(spender, amount) on this token before the main call */
  approveToken?: { address: `0x${string}`; spender: `0x${string}`; amount: bigint };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useProtocolWrite() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { transitionTo } = useTxModal();

  const write = useCallback(
    async <TAbi extends Abi, TFn extends ContractFunctionName<TAbi, 'nonpayable'>>(
      params: WriteParams<TAbi, TFn>,
    ) => {
      if (!walletClient || !publicClient) throw new Error('Wallet not connected');

      const account = walletClient.account;

      // ── Step 1: Approve if required ───────────────────────────────────────
      if (params.approveToken) {
        const { address: tokenAddr, spender, amount } = params.approveToken;

        // Check existing allowance — skip approve tx if already sufficient
        const allowance = await publicClient.readContract({
          address: tokenAddr,
          abi: ERC20_WRITE_ABI,
          functionName: 'allowance',
          args: [account.address, spender],
        });

        if ((allowance as bigint) < amount) {
          transitionTo({
            type: 'tx-pending',
            description: 'Approving USDC spend…',
            step: 'signing',
          });

          const { request: approveReq } = await publicClient.simulateContract({
            address: tokenAddr,
            abi: ERC20_WRITE_ABI,
            functionName: 'approve',
            args: [spender, amount],
            account,
          });

          const approveTx = await walletClient.writeContract(approveReq);

          transitionTo({
            type: 'tx-pending',
            description: 'Approving USDC spend…',
            step: 'confirming',
            txHash: approveTx,
          });

          await publicClient.waitForTransactionReceipt({ hash: approveTx });
        }
      }

      // ── Step 2: Simulate + sign main tx ───────────────────────────────────
      transitionTo({
        type: 'tx-pending',
        description: params.description,
        step: 'signing',
      });

      const { request } = await publicClient.simulateContract({
        address: params.address,
        abi: params.abi,
        functionName: params.functionName,
        args: params.args,
        account,
      } as any);

      const txHash = await walletClient.writeContract(request);

      transitionTo({
        type: 'tx-pending',
        description: params.description,
        step: 'submitted',
        txHash,
      });

      // ── Step 3: Wait for confirmation ─────────────────────────────────────
      await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });

      transitionTo({
        type: 'tx-success',
        description: params.successDescription,
        txHash,
        ctaLabel: params.ctaLabel,
        ctaHref: params.ctaHref,
      });

      return txHash;
    },
    [walletClient, publicClient, transitionTo],
  );

  return { write };
}

// ─── Derived helpers (one per write operation) ────────────────────────────────

export function useBorrowWrite() {
  const { write } = useProtocolWrite();
  return useCallback(
    (amount: bigint, description: string) =>
      write({
        address: CONTRACT_ADDRESSES.lendingPool,
        abi: [
          {
            name: 'borrow',
            type: 'function' as const,
            stateMutability: 'nonpayable' as const,
            inputs: [{ name: 'amount', type: 'uint256' }],
            outputs: [{ name: 'loanId', type: 'uint256' }],
          },
        ],
        functionName: 'borrow',
        args: [amount],
        description,
        successDescription: `${description} · Loan opened`,
        ctaLabel: 'View in Portfolio',
        ctaHref: '/portfolio',
      }),
    [write],
  );
}

export function useRepayWrite() {
  const { write } = useProtocolWrite();
  return useCallback(
    (loanId: bigint, amount: bigint, description: string) =>
      write({
        address: CONTRACT_ADDRESSES.lendingPool,
        abi: [
          {
            name: 'repay',
            type: 'function' as const,
            stateMutability: 'nonpayable' as const,
            inputs: [
              { name: 'loanId', type: 'uint256' },
              { name: 'amount', type: 'uint256' },
            ],
            outputs: [],
          },
        ],
        functionName: 'repay',
        args: [loanId, amount],
        approveToken: {
          address: CONTRACT_ADDRESSES.usdc,
          spender: CONTRACT_ADDRESSES.lendingPool,
          amount,
        },
        description,
        successDescription: `${description} · Loan closed`,
        ctaLabel: 'View history',
        ctaHref: '/history',
      }),
    [write],
  );
}

export function useDepositWrite() {
  const { write } = useProtocolWrite();
  return useCallback(
    (assets: bigint, receiver: `0x${string}`, description: string, successDesc: string) =>
      write({
        address: CONTRACT_ADDRESSES.lendingPool,
        abi: [
          {
            name: 'deposit',
            type: 'function' as const,
            stateMutability: 'nonpayable' as const,
            inputs: [
              { name: 'assets',   type: 'uint256' },
              { name: 'receiver', type: 'address' },
            ],
            outputs: [{ name: 'shares', type: 'uint256' }],
          },
        ],
        functionName: 'deposit',
        args: [assets, receiver],
        approveToken: {
          address: CONTRACT_ADDRESSES.usdc,
          spender: CONTRACT_ADDRESSES.lendingPool,
          amount: assets,
        },
        description,
        successDescription: successDesc,
        ctaLabel: 'View LP Position',
        ctaHref: '/lend',
      }),
    [write],
  );
}

export function useRedeemWrite() {
  const { write } = useProtocolWrite();
  return useCallback(
    (shares: bigint, receiver: `0x${string}`, owner: `0x${string}`, description: string) =>
      write({
        address: CONTRACT_ADDRESSES.lendingPool,
        abi: [
          {
            name: 'redeem',
            type: 'function' as const,
            stateMutability: 'nonpayable' as const,
            inputs: [
              { name: 'shares',   type: 'uint256' },
              { name: 'receiver', type: 'address' },
              { name: 'owner',    type: 'address' },
            ],
            outputs: [{ name: 'assets', type: 'uint256' }],
          },
        ],
        functionName: 'redeem',
        args: [shares, receiver, owner],
        // No approve — redeeming own LP shares
        description,
        successDescription: 'Withdrawal complete · USDC returned to wallet',
        ctaLabel: 'View Portfolio',
        ctaHref: '/portfolio',
      }),
    [write],
  );
}
