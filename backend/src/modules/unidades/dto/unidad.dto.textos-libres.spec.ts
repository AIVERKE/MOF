import { plainToInstance, type ClassConstructor } from 'class-transformer';
import { validate } from 'class-validator';
import {
  ProyectoDto,
  UnidadDto,
  UnidadFuncionDto,
  UnidadInventarioDto,
} from './unidad.dto';
import { CargoDto } from '../../cargos/dto/cargo.dto';

/** Mismas opciones que el `ValidationPipe` global de `main.ts`; devuelve las propiedades con error. */
async function propiedadesConError<T extends object>(
  cls: ClassConstructor<T>,
  body: object,
) {
  const errors = await validate(
    plainToInstance(cls, body, { enableImplicitConversion: true }),
    { whitelist: true, forbidNonWhitelisted: true },
  );
  return errors.map((e) => e.property).sort();
}

const SIMBOLOS = 'Ñandú @ #1 $ ^ * ~ {x} [y] | \\ < > ` / % & " ’ ° º';
const LARGO = 'Texto extenso con signos: ¿qué?, ¡sí!; (a) [b] {c} — '.repeat(
  200,
);

/** Lo mínimo para que el resto del cuerpo de `UnidadDto` sea válido. */
const unidadBase = {
  codigo: '1.2.3',
  nombre: 'Unidad',
  tipo: 1,
  nivel: 1,
  relacion: 1,
  tipoUnidad: 24,
  oficial: true,
};

describe('Textos libres en la ficha técnica (UnidadDto)', () => {
  it('acepta código, sigla y nombre con espacios, símbolos y sin tope de longitud', async () => {
    expect(
      await propiedadesConError(UnidadDto, {
        ...unidadBase,
        codigo: `COD ${'9.'.repeat(60)} FIN`,
        sigla: `SEC GRAL ${'X'.repeat(80)}`,
        nombre: `${SIMBOLOS} ${LARGO}`,
        resCreacion: `HCU N° 058/1984 ${LARGO}`,
      }),
    ).toEqual([]);
  });

  it.each([
    'objetivo',
    'baseLegal',
    'tramitesAtendidos',
    'ejecucionPoa',
    'ejecucionPresupuestaria',
    'cargaHorariaProgramada',
    'cargaHorariaEjecutada',
    'infraestructura',
    'ubicacion',
  ])('acepta caracteres especiales y textos extensos en %s', async (campo) => {
    expect(
      await propiedadesConError(UnidadDto, {
        ...unidadBase,
        [campo]: `${SIMBOLOS} ${LARGO}`,
      }),
    ).toEqual([]);
  });

  it('acepta símbolos en la Planificación Estratégica y sigue validando el rango 0–100', async () => {
    const plan = (planificacionEstrategicaValor: number) =>
      propiedadesConError(UnidadDto, {
        ...unidadBase,
        planificacionEstrategicaAplica: true,
        planificacionEstrategicaValor,
        planificacionEstrategica: `${SIMBOLOS} ${LARGO}`,
      });
    expect(await plan(0)).toEqual([]);
    expect(await plan(100)).toEqual([]);
    expect(await plan(75.5)).toEqual([]);
    expect(await plan(-1)).toEqual(['planificacionEstrategicaValor']);
    expect(await plan(100.01)).toEqual(['planificacionEstrategicaValor']);
  });

  it('el nombre y el código siguen siendo obligatorios', async () => {
    expect(
      await propiedadesConError(UnidadDto, {
        ...unidadBase,
        nombre: '',
        codigo: '',
      }),
    ).toEqual(['codigo', 'nombre']);
  });
});

describe('Textos libres en inventarios, proyectos, funciones y cargos', () => {
  it('inventario: descripción sin tope y la cantidad sigue siendo entero ≥ 1', async () => {
    const inv = (cantidad: unknown) =>
      propiedadesConError(UnidadInventarioDto, {
        descripcion: `${SIMBOLOS} ${LARGO}`,
        cantidad,
      });
    expect(await inv(1)).toEqual([]);
    expect(await inv(0)).toEqual(['cantidad']);
    expect(await inv(2.5)).toEqual(['cantidad']);
    expect(
      await propiedadesConError(UnidadInventarioDto, {
        descripcion: '   ',
        cantidad: 1,
      }),
    ).toEqual(['descripcion']);
  });

  it('proyecto: tipo y detalle sin tope, siguen siendo obligatorios', async () => {
    expect(
      await propiedadesConError(ProyectoDto, {
        tipo: `Interacción social / ${'extensión '.repeat(50)}`,
        detalle: `${SIMBOLOS} ${LARGO}`,
      }),
    ).toEqual([]);
    expect(
      await propiedadesConError(ProyectoDto, { tipo: '', detalle: '' }),
    ).toEqual(['detalle', 'tipo']);
  });

  it('función: texto y base legal extensos', async () => {
    expect(
      await propiedadesConError(UnidadFuncionDto, {
        funcion: `${SIMBOLOS} ${LARGO}`,
        baseLegal: LARGO,
      }),
    ).toEqual([]);
  });

  it('cargo: nombre y descripción sin tope', async () => {
    expect(
      await propiedadesConError(CargoDto, {
        nombre: `JEFE DE DEPARTAMENTO ${'A'.repeat(300)}`,
        descripcion: LARGO,
      }),
    ).toEqual([]);
  });
});
