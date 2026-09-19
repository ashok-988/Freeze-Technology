import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const logger = new Logger('FreezeTechERP');
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  // Global prefix
  app.setGlobalPrefix('api');

  // CORS
  app.enableCors({
    origin: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT || 5000;
  await app.listen(port);

  logger.log('=======================================================');
  logger.log(`FREEZE TECHNOLOGY ERP NESTJS BACKEND RUNNING ON PORT ${port}`);
  logger.log(`Health Check: http://localhost:${port}/api/health`);
  logger.log(`Auth Login:   http://localhost:${port}/api/auth/login`);
  logger.log('=======================================================');
}

bootstrap();
