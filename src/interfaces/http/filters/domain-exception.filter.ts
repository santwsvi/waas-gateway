import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

@Catch(Error)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const message = exception.message;

    let status: number;

    if (exception.constructor.name === 'InvalidStateTransitionError') {
      status = HttpStatus.CONFLICT;
    } else if (message.includes('not found')) {
      status = HttpStatus.NOT_FOUND;
    } else if (message.includes('not active') || message.includes('not connected')) {
      status = HttpStatus.UNPROCESSABLE_ENTITY;
    } else {
      status = HttpStatus.BAD_REQUEST;
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: HttpStatus[status],
    });
  }
}
