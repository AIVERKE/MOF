import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ResultResponse<T = unknown> {
  @ApiProperty({ example: '2026-08-11T19:00:00.000Z' })
  timestamp: Date;

  @ApiProperty({ example: true })
  status: boolean;

  @ApiProperty({ example: 'Realizado correctamente' })
  message: string;

  @ApiPropertyOptional()
  data?: T;

  @ApiPropertyOptional({
    example: 'UNIDAD_CODIGO_DUPLICADO',
    description:
      'Código estable del error (solo en fallos). Catálogo en backend/src/common/errors.ts',
  })
  errorCode?: string | null;

  constructor(
    status: boolean,
    message: string,
    data?: T,
    errorCode?: string | null,
  ) {
    this.timestamp = new Date();
    this.status = status;
    this.message = message;
    this.data = data;
    if (errorCode != null) {
      this.errorCode = errorCode;
    }
  }

  static ok<T>(message: string, data?: T): ResultResponse<T> {
    return new ResultResponse(true, message, data);
  }

  static fail<T>(
    message: string,
    data?: T,
    errorCode?: string | null,
  ): ResultResponse<T> {
    return new ResultResponse(false, message, data, errorCode);
  }
}
