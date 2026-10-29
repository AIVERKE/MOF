import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { Repository } from 'typeorm';
import { Unidad } from '../entities/unidad.entity';
import { UnidadesService } from '../unidades.service';
import { UnidadDto } from './unidad.dto';

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
    'SEC GRAL',
    'SEC@GRAL #1',
    'A<B> {x} [y] | \\ ~ ^ * $ % & / "',
    'D’ALES',
    'ÑANDÚ',
    'S'.repeat(200),
    '',
  ])('acepta %p (texto libre, sin tope de longitud)', async (sigla) => {
    expect(await erroresDeSigla(sigla)).toEqual([]);
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
      unused,
      unused,
    );

    await service.update(10, { sigla: 'SEC.GRAL' } as UnidadDto);

    expect(save).toHaveBeenCalledWith(
      expect.objectContaining({ sigla: 'SEC.GRAL' }),
    );

    const larga =
      'SECRETARÍA GENERAL DE PLANIFICACIÓN Y DESARROLLO INSTITUCIONAL';
    await service.update(10, { sigla: `  ${larga}  ` } as UnidadDto);
    expect(save).toHaveBeenLastCalledWith(
      expect.objectContaining({ sigla: larga }),
    );
  });
});
