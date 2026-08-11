import { HttpException, HttpStatus } from '@nestjs/common';
import { RestMessages } from '../constants/rest-messages';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    data: unknown = null,
  ) {
    super({ message, data }, status);
  }
}

export function notFound(id: string | number): never {
  throw new BusinessException(
    `${RestMessages.NOT_FOUND_RECORD}${id}`,
    HttpStatus.NOT_FOUND,
    id,
  );
}
