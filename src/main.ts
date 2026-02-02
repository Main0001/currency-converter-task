import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  //CORS (Cross-Origin Resource Sharing)
  app.enableCors({
    origin: true,
    credentials: true, // Разрешить отправку cookies
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  //cookie
  app.use(cookieParser());

  //class-validator
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Удаляет поля, которых нет в DTO
      forbidNonWhitelisted: true, // Выбрасывает ошибку при лишних полях
      transform: true, // Автоматически преобразует типы (string -> number)
    }),
  );


  //Фильтр исключений
  app.useGlobalFilters(new HttpExceptionFilter());

  //Swagger
  const config = new DocumentBuilder()
    .setTitle('Currency Converter API')
    .setDescription(
      'API для конвертации валют с кешированием и персональными настройками пользователя',
    )
    .setVersion('1.0')
    .addTag('currencies', 'Получение списка валют и курсов')
    .addTag('user', 'Управление настройками пользователя')
    .addCookieAuth('user_id', {
      type: 'apiKey',
      in: 'cookie',
      name: 'user_id',
      description: 'ID пользователя (устанавливается автоматически при первом запросе)',
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
