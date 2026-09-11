import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditoriaCambio } from './entities/auditoria-cambio.entity';

export interface FiltrosAuditoria {
  page?: number;
  limit?: number;
  tablaAfectada?: string;
  accion?: string;
  fechaDesde?: string;
  fechaHasta?: string;
  idUsuario?: number;
  idRegistroOriginal?: number;
}

export interface RegistroCambio {
  tablaAfectada: string;
  idRegistroOriginal: number | string | null;
  accion: string;
  datosAnteriores?: unknown;
  datosNuevos?: unknown;
  idUsuario?: number | string | null;
  unidadAfectadaId?: number | string | null;
}

const LIMITE_POR_DEFECTO = 20;
const LIMITE_MAXIMO = 200;

/**
 * Auditoría de cambios del organigrama.
 *
 * Además de dejar el rastro, cada fila es un evento pendiente de entregar a
 * los sistemas que siguen el organigrama (ver GacetaSyncService). Escribir en
 * esta tabla es, por tanto, lo que dispara la propagación: no hace falta
 * acordarse de avisar a nadie más.
 */
@Injectable()
export class AuditoriaService {
  constructor(
    @InjectRepository(AuditoriaCambio)
    private readonly repo: Repository<AuditoriaCambio>,
  ) {}

  async findAll(filtros: FiltrosAuditoria): Promise<{
    data: AuditoriaCambio[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = Math.max(1, Number(filtros.page) || 1);
    const limit = Math.min(
      LIMITE_MAXIMO,
      Math.max(1, Number(filtros.limit) || LIMITE_POR_DEFECTO),
    );

    const qb = this.repo
      .createQueryBuilder('a')
      .orderBy('a.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filtros.tablaAfectada) {
      qb.andWhere('a.tabla_afectada = :tabla', {
        tabla: filtros.tablaAfectada,
      });
    }
    if (filtros.accion) {
      qb.andWhere('a.accion = :accion', { accion: filtros.accion });
    }
    if (filtros.fechaDesde) {
      qb.andWhere('a.created_at >= :desde', { desde: filtros.fechaDesde });
    }
    if (filtros.fechaHasta) {
      qb.andWhere('a.created_at <= :hasta', { hasta: filtros.fechaHasta });
    }
    if (filtros.idUsuario !== undefined && filtros.idUsuario !== null) {
      qb.andWhere('a.id_usuario = :usuario', { usuario: filtros.idUsuario });
    }
    if (
      filtros.idRegistroOriginal !== undefined &&
      filtros.idRegistroOriginal !== null
    ) {
      qb.andWhere('a.id_registro_original = :registro', {
        registro: filtros.idRegistroOriginal,
      });
    }

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit };
  }

  findOne(id: number): Promise<AuditoriaCambio | null> {
    return this.repo.findOne({
      where: { id: String(id) },
    });
  }

  /**
   * Deja constancia de un cambio.
   *
   * `manager` es el de la transacción en curso cuando lo llama un subscriber:
   * así la fila de auditoría se confirma con el cambio de datos o no se
   * confirma ninguno de los dos. Sin él se escribe con la conexión normal.
   */
  registrarCambio(
    cambio: RegistroCambio,
    manager?: EntityManager,
  ): Promise<AuditoriaCambio> {
    const repo = manager ? manager.getRepository(AuditoriaCambio) : this.repo;
    const fila = repo.create({
      tablaAfectada: cambio.tablaAfectada,
      idRegistroOriginal:
        cambio.idRegistroOriginal === null ||
        cambio.idRegistroOriginal === undefined
          ? null
          : String(cambio.idRegistroOriginal),
      accion: cambio.accion,
      datosAnteriores: (cambio.datosAnteriores ?? null) as Record<
        string,
        unknown
      > | null,
      datosNuevos: (cambio.datosNuevos ?? null) as Record<
        string,
        unknown
      > | null,
      idUsuario:
        cambio.idUsuario === null || cambio.idUsuario === undefined
          ? null
          : String(cambio.idUsuario),
      unidadAfectadaId:
        cambio.unidadAfectadaId === null ||
        cambio.unidadAfectadaId === undefined
          ? null
          : String(cambio.unidadAfectadaId),
      enviadoAt: null,
      intentos: 0,
    });
    return repo.save(fila);
  }

  /** Eventos del organigrama todavía sin entregar, del más viejo al más nuevo. */
  pendientesDeEnviar(limite = 50): Promise<AuditoriaCambio[]> {
    return this.repo
      .createQueryBuilder('a')
      .where('a.enviado_at IS NULL')
      .andWhere('a.unidad_afectada_id IS NOT NULL')
      .orderBy('a.created_at', 'ASC')
      .take(limite)
      .getMany();
  }

  async marcarEnviado(id: string): Promise<void> {
    await this.repo.update(id, { enviadoAt: new Date(), ultimoError: null });
  }

  async marcarFallido(
    id: string,
    intentos: number,
    error: string,
  ): Promise<void> {
    await this.repo.update(id, {
      intentos: intentos + 1,
      ultimoIntentoAt: new Date(),
      ultimoError: error.slice(0, 512),
    });
  }
}
