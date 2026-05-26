import { ApiParam } from '@nestjs/swagger';

/** Convenience decorator that documents a `:wallet` path param. */
export const ApiWalletParam = () =>
  ApiParam({
    name: 'wallet',
    description: 'EVM wallet address (0x-prefixed, 42 chars)',
    example: '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045',
    schema: { type: 'string', pattern: '^0x[0-9a-fA-F]{40}$' },
  });
