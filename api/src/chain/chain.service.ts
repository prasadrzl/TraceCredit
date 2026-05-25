import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createPublicClient, createWalletClient, http, PublicClient, WalletClient } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimismSepolia } from 'viem/chains';
import { AppLogger } from '../logger/logger.service';

@Injectable()
export class ChainService implements OnModuleInit {
  private _publicClient: PublicClient;
  private _walletClient: WalletClient | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: AppLogger,
  ) {}

  onModuleInit(): void {
    const rpcUrl = this.config.get<string>('chain.rpcUrl')!;

    this._publicClient = createPublicClient({
      chain: optimismSepolia,
      transport: http(rpcUrl, {
        retryCount: 3,
        retryDelay: 500,
        timeout: 30_000,
      }),
    }) as PublicClient;

    const privateKey = this.config.get<string>('liquidationBot.privateKey');
    if (privateKey && privateKey !== '0x' + '0'.repeat(64)) {
      const account = privateKeyToAccount(privateKey as `0x${string}`);
      this._walletClient = createWalletClient({
        account,
        chain: optimismSepolia,
        transport: http(rpcUrl),
      });
      this.logger.log(`Wallet client initialised: ${account.address}`, 'ChainService');
    }

    this.logger.log(`Chain client ready → RPC: ${rpcUrl}`, 'ChainService');
  }

  get publicClient(): PublicClient {
    return this._publicClient;
  }

  get walletClient(): WalletClient | null {
    return this._walletClient;
  }

  async getBlockNumber(): Promise<bigint> {
    return this._publicClient.getBlockNumber();
  }

  async getChainId(): Promise<number> {
    return this._publicClient.getChainId();
  }
}
