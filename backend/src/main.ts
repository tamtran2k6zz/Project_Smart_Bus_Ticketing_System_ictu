import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor';
import dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  // Global exception filter for uniform error responses
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global interceptor for uniform success responses
  app.useGlobalInterceptors(new TransformResponseInterceptor());

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    })
  );

  const port = process.env.PORT || 5000;
  await app.listen(port);
  console.log(`Smart Bus Ticketing API is running on http://localhost:${port}`);
}

bootstrap();
