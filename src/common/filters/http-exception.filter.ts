import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * Error response format
 */
interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  timestamp: string;
  path: string;
}

/**
 * HttpExceptionFilter - global filter for handling all errors
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    // Determine status code and error message
    let status: number;
    let message: string;
    let error: string;

    if (exception instanceof HttpException) {
      // This is HttpException (BadRequest, NotFound, Unauthorized, etc.)
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      // getResponse() can return a string or object
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        error = exception.name;
      } else {
        // Object type { message: '...', error: '...' }
        const responseObj = exceptionResponse as { message?: string; error?: string };
        message = responseObj.message || exception.message;
        error = responseObj.error || exception.name;
      }
    } else if (exception instanceof Error) {
      // Regular JavaScript error (not HttpException)
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      // Log full error (stack trace) for debugging
      this.logger.error(`Unexpected error: ${exception.message}`, exception.stack);
    } else {
      // Unknown error type
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      error = 'Internal Server Error';

      this.logger.error('Unknown error type:', exception);
    }

    // Build response
    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Log error
    if (status !== HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.warn(`${status} ${error}: ${message} - ${request.url}`);
    }

    // Send response to client
    response.status(status).json(errorResponse);
  }
}
