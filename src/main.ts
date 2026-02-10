import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS (Cross-Origin Resource Sharing)
  app.enableCors({
    origin: true,
    credentials: true, // Allow sending cookies
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Cookie parser
  app.use(cookieParser());

  // class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove fields not present in DTO
      forbidNonWhitelisted: true, // Throw error on extra fields
      transform: true, // Automatically transform types (string -> number)
    }),
  );


  // Exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
  const config = new DocumentBuilder()
    .setTitle('Currency Converter API')
    .setDescription(
      'API for currency conversion with caching and personalized user settings',
    )
    .setVersion('1.0')
    .addTag('currencies', 'Get currency list and exchange rates')
    .addTag('user', 'User settings management')
    .addCookieAuth('user_id', {
      type: 'apiKey',
      in: 'cookie',
      name: 'user_id',
      description: 'User ID (set automatically on first request)',
    })
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/api/docs`);
}

bootstrap();
