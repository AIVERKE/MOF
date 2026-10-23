import { Logger, StreamableFile } from '@nestjs/common';
import type { Response } from 'express';
import { MofUnidadesController } from './mof-unidades.controller';
import { UnidadesService } from './unidades.service';
import { UnidadPdfService } from './unidad-pdf.service';

function build() {
  const unidadesService = {
    findEntityForPdf: jest.fn(() => Promise.resolve({ codigo: '1.4' })),
    registrarDescarga: jest.fn(() =>
      Promise.resolve({ vistasCount: 0, descargasCount: 1 }),
    ),
    registrarVista: jest.fn(() =>
      Promise.resolve({ vistasCount: 4, descargasCount: 1 }),
    ),
  };
  const pdfService = {
    buildUnidadPdf: jest.fn(() => Promise.resolve(Buffer.from('%PDF'))),
  };
  const controller = new MofUnidadesController(
    unidadesService as unknown as UnidadesService,
    pdfService as unknown as UnidadPdfService,
  );
  const res = { set: jest.fn() } as unknown as Response;
  return { controller, unidadesService, pdfService, res };
}

describe('MofUnidadesController contadores de uso', () => {
  let logError: jest.SpyInstance;
  beforeEach(() => {
    logError = jest
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
  });
  afterEach(() => jest.restoreAllMocks());

  it('el PDF cuenta una descarga y ninguna vista', async () => {
    const { controller, unidadesService, res } = build();
    const file = await controller.pdf(10, res);

    expect(file).toBeInstanceOf(StreamableFile);
    expect(unidadesService.registrarDescarga).toHaveBeenCalledTimes(1);
    expect(unidadesService.registrarDescarga).toHaveBeenCalledWith(10);
    expect(unidadesService.registrarVista).not.toHaveBeenCalled();
  });

  it('si la generación del PDF falla no cuenta la descarga', async () => {
    const { controller, unidadesService, pdfService, res } = build();
    pdfService.buildUnidadPdf.mockRejectedValueOnce(new Error('pdfkit'));

    await expect(controller.pdf(10, res)).rejects.toThrow('pdfkit');
    expect(unidadesService.registrarDescarga).not.toHaveBeenCalled();
  });

  it('si falla el conteo el PDF se entrega igual', async () => {
    const { controller, unidadesService, res } = build();
    unidadesService.registrarDescarga.mockRejectedValueOnce(new Error('db'));

    await expect(controller.pdf(10, res)).resolves.toBeInstanceOf(
      StreamableFile,
    );
    expect(logError).toHaveBeenCalled();
  });

  it('registrar una vista devuelve los totales actualizados', async () => {
    const { controller, unidadesService } = build();
    const out = await controller.registrarVista(10);

    expect(unidadesService.registrarVista).toHaveBeenCalledWith(10);
    expect(out).toMatchObject({
      status: true,
      data: { vistasCount: 4, descargasCount: 1 },
    });
  });
});
