import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { ResultExceptionFilter } from './result-exception.filter';
import { BusinessException } from '../exceptions/business.exception';
import { ErrorCodes } from '../errors';

describe('ResultExceptionFilter', () => {
  let filter: ResultExceptionFilter;
  let json: jest.Mock;
  let status: jest.Mock;

  const createHost = (): ArgumentsHost => {
    json = jest.fn();
    status = jest.fn().mockReturnValue({ json });
    return {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
      }),
    } as unknown as ArgumentsHost;
  };

  beforeEach(() => {
    filter = new ResultExceptionFilter();
  });

  it('includes errorCode from BusinessException in the envelope', () => {
    const host = createHost();
    filter.catch(
      new BusinessException(
        'Ya existe una unidad con ese código',
        HttpStatus.BAD_REQUEST,
        null,
        ErrorCodes.UNIDAD_CODIGO_DUPLICADO,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        message: 'Ya existe una unidad con ese código',
        errorCode: ErrorCodes.UNIDAD_CODIGO_DUPLICADO,
      }),
    );
  });

  it('infers VALIDATION_FAILED when message is an array', () => {
    const host = createHost();
    filter.catch(
      new BadRequestException({
        message: ['email must be an email'],
        error: 'Bad Request',
      }),
      host,
    );

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        message: 'email must be an email',
        errorCode: ErrorCodes.VALIDATION_FAILED,
      }),
    );
  });

  it('infers UNAUTHORIZED for 401 without errorCode', () => {
    const host = createHost();
    filter.catch(new UnauthorizedException(), host);

    expect(status).toHaveBeenCalledWith(401);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        errorCode: ErrorCodes.UNAUTHORIZED,
      }),
    );
  });

  it('infers TOO_MANY_REQUESTS for 429 without stack or JWT data', () => {
    const host = createHost();
    filter.catch(
      new HttpException(
        'Demasiadas solicitudes. Intente más tarde',
        HttpStatus.TOO_MANY_REQUESTS,
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(429);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        message: 'Demasiadas solicitudes. Intente más tarde',
        errorCode: ErrorCodes.TOO_MANY_REQUESTS,
        data: null,
      }),
    );
    const body = json.mock.calls[0][0] as Record<string, unknown>;
    expect(JSON.stringify(body)).not.toMatch(/access_token|stack/i);
  });

  it('maps INTERNAL_ERROR for unexpected Error', () => {
    const host = createHost();
    filter.catch(new Error('boom'), host);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: false,
        errorCode: ErrorCodes.INTERNAL_ERROR,
      }),
    );
  });
});
