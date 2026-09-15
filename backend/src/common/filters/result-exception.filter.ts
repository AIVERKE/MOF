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
import { ErrorCodes, getErrorDefinition } from '../errors';

@Catch()
export class ResultExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ResultExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string = getErrorDefinition(ErrorCodes.INTERNAL_ERROR).message;
    let data: unknown = null;
    let errorCode: string | null = ErrorCodes.INTERNAL_ERROR;
    let messageWasArray = false;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        message = body;
        errorCode = this.inferErrorCode(status, false);
      } else if (body && typeof body === 'object') {
        const obj = body as Record<string, unknown>;
        if (Array.isArray(obj.message)) {
          messageWasArray = true;
          message = obj.message.join(', ');
        } else if (typeof obj.message === 'string') {
          message = obj.message;
        } else {
          message = getErrorDefinition(ErrorCodes.REQUEST_ERROR).message;
        }
        data = obj.data ?? null;
        errorCode =
          typeof obj.errorCode === 'string' && obj.errorCode
            ? obj.errorCode
            : this.inferErrorCode(status, messageWasArray);
      } else {
        message = getErrorDefinition(ErrorCodes.REQUEST_ERROR).message;
        errorCode = this.inferErrorCode(status, false);
      }
    } else if (exception instanceof Error) {
      this.logger.error(exception.message, exception.stack);
      message = getErrorDefinition(ErrorCodes.INTERNAL_ERROR).message;
      errorCode = ErrorCodes.INTERNAL_ERROR;
    }

    response
      .status(status)
      .json(ResultResponse.fail(message, data, errorCode));
  }

  private inferErrorCode(status: number, messageWasArray: boolean): string {
    if (messageWasArray || status === HttpStatus.BAD_REQUEST) {
      if (messageWasArray) return ErrorCodes.VALIDATION_FAILED;
    }
    if (status === HttpStatus.UNAUTHORIZED) return ErrorCodes.UNAUTHORIZED;
    if (status === HttpStatus.FORBIDDEN) return ErrorCodes.FORBIDDEN;
    if (status === HttpStatus.NOT_FOUND) return ErrorCodes.NOT_FOUND;
    if (status === HttpStatus.CONFLICT) return ErrorCodes.REQUEST_ERROR;
    if (status >= 500) return ErrorCodes.INTERNAL_ERROR;
    if (status === HttpStatus.BAD_REQUEST) return ErrorCodes.REQUEST_ERROR;
    return ErrorCodes.REQUEST_ERROR;
  }
}
