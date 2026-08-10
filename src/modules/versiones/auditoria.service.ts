import { Injectable } from '@nestjs/common';

@Injectable()
export class AuditoriaService {
  findAll(filters: {
    page?: number;
    limit?: number;
    tablaAfectada?: string;
    accion?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    idUsuario?: number;
    idRegistroOriginal?: number;
  }): Promise<{ data: unknown[]; total: number; page: number; limit: number }> {
    void filters;
    return Promise.resolve({ data: [], total: 0, page: 1, limit: 20 });
  }

  findOne(id: number): Promise<unknown> {
    void id;
    return Promise.resolve(null);
  }

  registrarCambio(
    tablaAfectada: string,
    idRegistroOriginal: number,
    accion: string,
    datosAnteriores: unknown,
    datosNuevos: unknown,
    idUsuario?: number,
    motivoCambio?: string,
  ): Promise<unknown> {
    void tablaAfectada;
    void idRegistroOriginal;
    void accion;
    void datosAnteriores;
    void datosNuevos;
    void idUsuario;
    void motivoCambio;
    return Promise.resolve(null);
  }
}
