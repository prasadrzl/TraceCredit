import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppLogger } from './logger/logger.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get(AppLogger);
  app.useLogger(logger);

  const config = app.get(ConfigService);
  const port = config.get<number>('port') ?? 3001;

  /** Global validation */
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  /** CORS */
  const nodeEnv = config.get<string>('nodeEnv');
  const corsOrigins = config.get<string[]>('corsOrigins') ?? [];
  app.enableCors({
    origin: nodeEnv === 'production'
      ? (corsOrigins.length > 0 ? corsOrigins : false)
      : '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  /** Global prefix */
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  /** Swagger */
  const swaggerConfig = new DocumentBuilder()
    .setTitle('TraceCredit API')
    .setDescription(
      'Reputation-Weighted On-Chain Lending Protocol — REST + WebSocket API',
    )
    .setVersion('1.0')
    .addTag('Health')
    .addTag('Score')
    .addTag('Credit')
    .addTag('Positions')
    .addTag('Vault')
    .addTag('Yield')
    .addTag('Pool')
    .addTag('Anchor / KYC')
    .addTag('Attestation')
    .addTag('Liquidation')
    .addTag('Analytics')
    .addTag('Price')
    .addServer(`http://localhost:${port}`)
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tryItOutEnabled: true,
    },
  });

  await app.listen(port, '0.0.0.0');

  logger.log(`TraceCredit API running on http://0.0.0.0:${port}`, 'Bootstrap');
  logger.log(`Swagger docs → http://localhost:${port}/docs`, 'Bootstrap');
}

bootstrap().catch((err) => {
  console.error('Failed to start TraceCredit API', err);
  process.exit(1);
});
