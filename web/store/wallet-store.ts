import { create } from 'zustand';

interface WalletStore {
  address: `0x${string}` | null;
  chainId: number | null;
  setWallet: (address: `0x${string}` | null, chainId: number | null) => void;
}

export const useWalletStore = create<WalletStore>((set) => ({
  address: null,
  chainId: null,
  setWallet: (address, chainId) => set({ address, chainId }),
}));
