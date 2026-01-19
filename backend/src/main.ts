
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import * as express from 'express';
import { AppModule } from './app.module';
import { HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { RequestLoggerMiddleware } from './common/middleware/request-logger.middleware';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use('/webhooks/stripe', express.raw({ type: 'application/json' }));

  const port = Number(process.env.PORT) || 3000;
  const corsOrigin = process.env.CORS_ORIGIN;
  const origin =
    corsOrigin?.trim()
      ? corsOrigin.split(',').map((value) => value.trim())
      : true;

  app.enableCors({
    origin, // allow all in dev; set CORS_ORIGIN in prod
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Request logging with correlation/request ID
  app.use(new RequestLoggerMiddleware().use);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strips unknown fields
      forbidNonWhitelisted: true,
      transform: true,          // converts payloads to DTO types
    }),
  );

  // Global exception filter with traceId
  const httpAdapterHost = app.get(HttpAdapterHost);
  app.useGlobalFilters(new AllExceptionsFilter(httpAdapterHost));

  await app.listen(port);
}
bootstrap();
