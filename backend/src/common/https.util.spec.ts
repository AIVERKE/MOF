import { resolveHttpsOptions } from './https.util';

describe('resolveHttpsOptions', () => {
  const readFile = (path: string) => Buffer.from(`contents of ${path}`);

  it('returns undefined when both paths are unset', () => {
    expect(resolveHttpsOptions(undefined, undefined, readFile)).toBeUndefined();
    expect(resolveHttpsOptions('  ', '', readFile)).toBeUndefined();
  });

  it('reads key and cert when both paths are set', () => {
    expect(
      resolveHttpsOptions('/tls/privkey.pem', '/tls/fullchain.pem', readFile),
    ).toEqual({
      key: Buffer.from('contents of /tls/privkey.pem'),
      cert: Buffer.from('contents of /tls/fullchain.pem'),
    });
  });

  it('throws when only one path is set', () => {
    expect(() =>
      resolveHttpsOptions('/tls/privkey.pem', undefined, readFile),
    ).toThrow(/HTTPS_KEY_PATH and HTTPS_CERT_PATH/);
    expect(() =>
      resolveHttpsOptions(undefined, '/tls/fullchain.pem', readFile),
    ).toThrow(/HTTPS_KEY_PATH and HTTPS_CERT_PATH/);
  });

  it('wraps read errors with the configured paths', () => {
    const failingRead = () => {
      throw new Error('EACCES: permission denied');
    };
    expect(() =>
      resolveHttpsOptions(
        '/tls/privkey.pem',
        '/tls/fullchain.pem',
        failingRead,
      ),
    ).toThrow(/privkey\.pem.*EACCES/);
  });
});
