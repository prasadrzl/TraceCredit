import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { redisStore } from 'cache-manager-redis-yet';

@Global()
@Module({
  imports: [
    CacheModule.registerAsync({
      isGlobal: true,
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const store = await redisStore({
          socket: {
            host: new URL(config.get<string>('redis.url') ?? 'redis://localhost:6379').hostname,
            port: parseInt(
              new URL(config.get<string>('redis.url') ?? 'redis://localhost:6379').port || '6379',
              10,
            ),
          },
          ttl: 60_000, // default 60s in ms
        });
        return { store };
      },
    }),
  ],
})
export class RedisCacheModule {}
