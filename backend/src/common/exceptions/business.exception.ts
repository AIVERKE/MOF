import { HttpException, HttpStatus } from '@nestjs/common';
import {
  ErrorCode,
  ErrorCodes,
  getErrorDefinition,
} from '../errors';

export class BusinessException extends HttpException {
  readonly errorCode: string | null;

  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    data: unknown = null,
    errorCode: string | null = null,
  ) {
    super({ message, data, errorCode }, status);
    this.errorCode = errorCode;
  }
}

/** Throws a BusinessException using the central error catalog. */
export function throwBusiness(
  code: ErrorCode,
  data: unknown = null,
  messageOverride?: string,
): never {
  const def = getErrorDefinition(code);
  throw new BusinessException(
    messageOverride ?? def.message,
    def.httpStatus,
    data,
    code,
  );
}

export function notFound(id: string | number): never {
  throwBusiness(
    ErrorCodes.NOT_FOUND,
    id,
    `Registro no encontrado id: ${id}`,
  );
}
