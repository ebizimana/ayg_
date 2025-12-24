
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strips unknown fields
      forbidNonWhitelisted: true,
      transform: true,          // converts payloads to DTO types
    }),
  );

  await app.listen(3000);
}
bootstrap();
