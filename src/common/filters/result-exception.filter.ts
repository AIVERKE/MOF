import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ResultResponse } from '../dto/result-response';
import { RestMessages } from '../constants/rest-messages';

@Catch()
export class ResultExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResultExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = RestMessages.SERVER_ERROR;
    let data: unknown = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (Array.isArray(obj.message)) {
          message = obj.message.join(', ');
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        } else {
          message = RestMessages.ERROR;
        }
        data = obj.data ?? null;
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = RestMessages.SERVER_ERROR;
    }

    response.status(status).json(ResultResponse.fail(message, data));
  }
}
