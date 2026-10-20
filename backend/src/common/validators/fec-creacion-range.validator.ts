import { registerDecorator, ValidationOptions } from 'class-validator';

export const FEC_CREACION_MIN = '1825-01-01';

/** El tope se calcula en cada validación para que avance con el año. */
export function fecCreacionMax(today: Date = new Date()): string {
  return `${today.getFullYear()}-12-31`;
}

export function fecCreacionRangeMessage(today: Date = new Date()): string {
  return `La fecha de creación debe estar entre 01/01/1825 y 31/12/${today.getFullYear()}`;
}

/** Compara como texto `YYYY-MM-DD`, que equivale a comparar fechas. */
export function isFecCreacionInRange(
  value: unknown,
  today: Date = new Date(),
): boolean {
  if (typeof value !== 'string') return false;
  const day = value.slice(0, 10);
  return day >= FEC_CREACION_MIN && day <= fecCreacionMax(today);
}

export function IsFecCreacionInRange(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'isFecCreacionInRange',
      target: object.constructor,
      propertyName,
      options: {
        message: () => fecCreacionRangeMessage(),
        ...validationOptions,
      },
      validator: {
        validate: (value: unknown) => isFecCreacionInRange(value),
      },
    });
  };
}
