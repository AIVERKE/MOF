import { resolveCorsOrigins } from './cors.util';

describe('resolveCorsOrigins', () => {
  it('defaults to localhost:5173 when unset outside production', () => {
    expect(resolveCorsOrigins(undefined, 'development')).toEqual([
      'http://localhost:5173',
    ]);
  });

  it('parses a comma-separated list', () => {
    expect(
      resolveCorsOrigins(
        'http://localhost:5173, https://mof.example.com',
        'development',
      ),
    ).toEqual(['http://localhost:5173', 'https://mof.example.com']);
  });

  it('throws in production when empty', () => {
    expect(() => resolveCorsOrigins('', 'production')).toThrow(/CORS_ORIGIN/);
  });

  it('throws in production when list includes *', () => {
    expect(() =>
      resolveCorsOrigins('http://localhost:5173,*', 'production'),
    ).toThrow(/CORS_ORIGIN/);
  });

  it('allows explicit origins in production', () => {
    expect(
      resolveCorsOrigins('https://mof.example.com', 'production'),
    ).toEqual(['https://mof.example.com']);
  });
});
