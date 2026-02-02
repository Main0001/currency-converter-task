import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

//Формат ответа при ошибке
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

//HttpExceptionFilter - глобальный фильтр для обработки всех ошибок
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Определяем статус код и сообщение ошибки
    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      // Это HttpException (BadRequest, NotFound, Unauthorized и т.д.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // getResponse() может вернуть строку или объект
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        // Объект типа { message: '...', error: '...' }
        const responseObj = exceptionResponse as { message?: string; error?: string };
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      // Обычная ошибка JavaScript (не HttpException)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // Логируем полную ошибку (стек вызовов) для отладки
      this.logger.error(`Unexpected error: ${exception.message}`, exception.stack);
    } else {
      // Неизвестный тип ошибки
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error('Unknown error type:', exception);
    }

    // Формируем ответ
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Логируем ошибку
    if (status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.warn(`${status} ${error}: ${message} - ${request.url}`);
    }

    // Отправляем ответ клиенту
    response.status(status).json(errorResponse);
  }
}
