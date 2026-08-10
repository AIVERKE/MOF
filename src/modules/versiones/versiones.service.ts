import { Injectable } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';

export interface VersionamientoResult {
  versionNueva: string | null;
  debeRegistrar: boolean;
}

@Injectable()
export class VersionesService {
  constructor(private readonly auditoriaService: AuditoriaService) {
    void this.auditoriaService;
  }

  debeIncrementarVersion(
    estadoAnterior: string,
    estadoNuevo?: string,
  ): boolean {
    void estadoAnterior;
    void estadoNuevo;
    return false;
  }

  calcularNuevaVersion(versionActual: string | null | undefined): string {
    void versionActual;
    return '1.0';
  }
}
