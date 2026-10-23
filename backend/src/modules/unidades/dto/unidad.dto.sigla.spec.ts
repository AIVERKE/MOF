import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { Unidad } from '../entities/unidad.entity';
import { UnidadesService } from '../unidades.service';
import { SIGLA_FORMATO_MENSAJE, UnidadDto } from './unidad.dto';

/** Mismas opciones que el `ValidationPipe` global de `main.ts`. */
async function erroresDeSigla(sigla: unknown) {
  const instance = plainToInstance(
    UnidadDto,
    { sigla },
    { enableImplicitConversion: true },
  );
  const errors = await validate(instance, {
    whitelist: true,
    forbidNonWhitelisted: true,
  });
  return errors
    .filter((e) => e.property === 'sigla')
    .flatMap((e) => Object.values(e.constraints ?? {}));
}

describe('UnidadDto sigla (ValidationPipe)', () => {
  it.each([
    'SEC.GRAL',
    'S.G.',
    'FCPN',
    'CE-HCU',
    "D'ALES",
    'ADM,FIN',
    'ÑANDÚ',
    'dtic',
    'U2',
    '',
  ])('acepta %p', async (sigla) => {
    expect(await erroresDeSigla(sigla)).toEqual([]);
  });

  it.each([
    'SEC@GRAL',
    'SEC#1',
    'SEC$',
    'SEC^',
    'SEC*',
    'SEC~',
    'SEC{1}',
    'SEC[1]',
    'SEC|GRAL',
    'SEC\\GRAL',
    'A<B>',
    'SEC GRAL',
    'SEC/GRAL',
    'SEC%',
    'SEC&GRAL',
    'SEC"GRAL',
    'D’ALES',
  ])('rechaza %p con el mensaje de formato', async (sigla) => {
    expect(await erroresDeSigla(sigla)).toEqual([SIGLA_FORMATO_MENSAJE]);
  });
});

describe('UnidadesService sigla (PUT /unidades/:id)', () => {
  it('persiste una sigla con punto como SEC.GRAL', async () => {
    const stored = { id: '10', codigo: '1.4', sigla: 'SG', nombre: 'SG' };
    const save = jest.fn((x: object) => Promise.resolve(x));
    const unidadRepo = {
      findOne: jest.fn(() => Promise.resolve({ ...stored })),
      manager: {
        transaction: jest.fn((cb: (m: { save: typeof save }) => unknown) =>
          cb({ save }),
        ),
      },
    };
    const unused = {} as never;
    const service = new UnidadesService(
      unidadRepo as unknown as Repository<Unidad>,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
      unused,
    );

    await service.update(10, { sigla: 'SEC.GRAL' } as UnidadDto);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ sigla: 'SEC.GRAL' }),
    );
  });
});
