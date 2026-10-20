import { IsOptional, validate } from 'class-validator';
import {
  IsFecCreacionInRange,
  isFecCreacionInRange,
} from './fec-creacion-range.validator';

const today = new Date(2026, 5, 15);

describe('isFecCreacionInRange', () => {
  it.each(['1825-01-01', '1990-05-10', '2026-12-31', '2026-12-31T00:00:00Z'])(
    'accepts %p',
    (value) => {
      expect(isFecCreacionInRange(value, today)).toBe(true);
    },
  );

  it.each(['1824-12-31', '1800-05-01', '2027-01-01', '4000-01-01'])(
    'rejects %p',
    (value) => {
      expect(isFecCreacionInRange(value, today)).toBe(false);
    },
  );

  it('rejects non-string values', () => {
    expect(isFecCreacionInRange(20260101, today)).toBe(false);
  });
});

describe('IsFecCreacionInRange', () => {
  class Dto {
    @IsOptional()
    @IsFecCreacionInRange()
    fecCreacion?: string | null;
  }

  const build = (fecCreacion?: string | null) =>
    Object.assign(new Dto(), { fecCreacion });

  it('skips absent or null values when combined with IsOptional', async () => {
    expect(await validate(build(undefined))).toHaveLength(0);
    expect(await validate(build(null))).toHaveLength(0);
  });

  it('reports a Spanish message for out-of-range dates', async () => {
    const errors = await validate(build('4000-01-01'));
    expect(errors).toHaveLength(1);
    expect(errors[0].constraints?.isFecCreacionInRange).toMatch(
      /^La fecha de creación debe estar entre 01\/01\/1825 y 31\/12\/\d{4}$/,
    );
  });
});
