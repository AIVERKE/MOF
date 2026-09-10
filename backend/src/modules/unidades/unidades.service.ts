import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadFuncion } from './entities/unidad-funcion.entity';
import { UnidadDependenciaFuncional } from './entities/unidad-dependencia-funcional.entity';
import { UnidadJerarquiaHist } from './entities/unidad-jerarquia-hist.entity';
import { UnidadRelacionInterna } from './entities/unidad-relacion-interna.entity';
import { UnidadRelacionExterna } from './entities/unidad-relacion-externa.entity';
import { CatalogoTipo } from '../catalogos/entities/catalogo-tipo.entity';
import { CatalogoNivel } from '../catalogos/entities/catalogo-nivel.entity';
import { CatalogoRelacion } from '../catalogos/entities/catalogo-relacion.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import {
  DependenciaFuncionalDto,
  SetParentDto,
  UnidadDto,
  UnidadFuncionDto,
  UnidadRelacionExternaDto,
  UnidadRelacionInternaDto,
} from './dto/unidad.dto';
import {
  BusinessException,
  notFound,
} from '../../common/exceptions/business.exception';
import { RestMessages } from '../../common/constants/rest-messages';
import { ConflictException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UnidadesService {
  constructor(
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
    @InjectRepository(UnidadFuncion)
    private readonly funcionRepo: Repository<UnidadFuncion>,
    @InjectRepository(UnidadDependenciaFuncional)
    private readonly depRepo: Repository<UnidadDependenciaFuncional>,
    @InjectRepository(UnidadJerarquiaHist)
    private readonly histRepo: Repository<UnidadJerarquiaHist>,
    @InjectRepository(UnidadRelacionInterna)
    private readonly relIntRepo: Repository<UnidadRelacionInterna>,
    @InjectRepository(UnidadRelacionExterna)
    private readonly relExtRepo: Repository<UnidadRelacionExterna>,
    @InjectRepository(CatalogoTipo)
    private readonly tipoRepo: Repository<CatalogoTipo>,
    @InjectRepository(CatalogoNivel)
    private readonly nivelRepo: Repository<CatalogoNivel>,
    @InjectRepository(CatalogoRelacion)
    private readonly relacionRepo: Repository<CatalogoRelacion>,
    @InjectRepository(TipoUnidad)
    private readonly claseRepo: Repository<TipoUnidad>,
  ) {}

  private async resolveCatalogId(
    repo: Repository<CatalogoTipo | CatalogoNivel | CatalogoRelacion>,
    value: string | number,
  ): Promise<number> {
    if (typeof value === 'number' || /^\d+$/.test(String(value))) {
      const id = Number(value);
      const byId = await repo.findOne({ where: { id } });
      if (byId) return byId.id;
    }
    const code = String(value);
    const byCodigo = await repo.findOne({ where: { codigo: code } });
    if (byCodigo) return byCodigo.id;
    const byDesc = await repo.findOne({
      where: { descripcion: code },
    });
    if (byDesc) return byDesc.id;
    throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
  }

  private mapListItem(
    u: Unidad,
    parentNombre?: string | null,
  ): Record<string, unknown> {
    return {
      id: Number(u.id),
      codigo: u.codigo,
      nombre: u.nombre,
      sigla: u.sigla,
      parent: u.parentId ? Number(u.parentId) : null,
      tipo: u.tipo?.descripcion ?? null,
      nivel: u.nivel?.descripcion ?? null,
      relacion: u.relacion?.codigo ?? null,
      str_relacion: u.relacion?.descripcion ?? null,
      dependencia: parentNombre ?? null,
      oficial: u.oficial,
      es_troncal: u.esTroncal ?? false,
      lado: u.lado ?? 'AUTOMATICO',
      color: u.tipoUnidad?.color ?? null,
      tipo_unidad: u.tipoUnidad?.descripcion ?? null,
      tipoUnidad: u.tipoUnidadId,
      base_legal: u.baseLegal,
      res_creacion: u.resCreacion,
      fec_creacion: u.fecCreacion,
      objetivo: u.objetivo,
      peso: u.tipoUnidad?.peso ?? null,
    };
  }

  private async mapDetail(u: Unidad) {
    const funciones = await this.funciones(Number(u.id));
    const deps = await this.depRepo.find({
      where: { unidadId: u.id },
      relations: ['dependencia'],
    });
    const parent =
      u.parentId != null
        ? await this.unidadRepo.findOne({
            where: { id: u.parentId },
            relations: ['tipo', 'nivel', 'relacion', 'tipoUnidad', 'parent'],
          })
        : null;

    const hijasLinealesRaw = await this.unidadRepo.find({
      where: { parentId: u.id },
      relations: ['tipoUnidad'],
      order: { codigo: 'ASC' },
    });
    const hijasLineales = hijasLinealesRaw.map((h) => ({
      id: Number(h.id),
      codigo: h.codigo,
      nombre: h.nombre,
      sigla: h.sigla,
      clase: h.tipoUnidad?.descripcion ?? null,
    }));

    const hijasFuncionalesRaw = await this.depRepo.find({
      where: { dependenciaId: u.id },
      relations: ['unidad', 'unidad.tipoUnidad'],
    });
    const hijasFuncionales = hijasFuncionalesRaw
      .filter((dh) => dh.unidad && !dh.unidad.deletedAt)
      .map((dh) => ({
        id: Number(dh.unidadId),
        codigo: dh.unidad?.codigo,
        nombre: dh.unidad?.nombre,
        sigla: dh.unidad?.sigla,
        clase: dh.unidad?.tipoUnidad?.descripcion ?? null,
      }));

    const relsIntRaw = await this.relIntRepo.find({
      where: { unidadId: u.id },
      relations: ['relacionada'],
      order: { id: 'ASC' },
    });
    const relacionesInternas = relsIntRaw.map((r) => ({
      id: Number(r.id),
      relacionadaId: Number(r.relacionadaId),
      codigo: r.relacionada?.codigo ?? null,
      nombre: r.relacionada?.nombre ?? null,
      sigla: r.relacionada?.sigla ?? null,
      tipo: r.tipo ?? null,
    }));

    const relsExtRaw = await this.relExtRepo.find({
      where: { unidadId: u.id },
      order: { id: 'ASC' },
    });
    const relacionesExternas = relsExtRaw.map((r) => ({
      id: Number(r.id),
      descripcion: r.descripcion,
    }));

    return {
      id: Number(u.id),
      codigo: u.codigo,
      sigla: u.sigla,
      nombre: u.nombre,
      tipo: u.tipo?.descripcion ?? null,
      nivel: u.nivel?.descripcion ?? null,
      relacion: u.relacion?.codigo ?? null,
      resCreacion: u.resCreacion,
      res_creacion: u.resCreacion,
      baseLegal: u.baseLegal,
      base_legal: u.baseLegal,
      fecCreacion: u.fecCreacion,
      fec_creacion: u.fecCreacion,
      objetivo: u.objetivo,
      parent: parent
        ? {
            id: Number(parent.id),
            codigo: parent.codigo,
            nombre: parent.nombre,
            sigla: parent.sigla,
          }
        : null,
      oficial: u.oficial,
      es_troncal: u.esTroncal ?? false,
      lado: u.lado ?? 'AUTOMATICO',
      tipoUnidad: u.tipoUnidadId,
      clase: u.tipoUnidad?.descripcion ?? null,
      peso: u.tipoUnidad?.peso ?? null,
      color: u.tipoUnidad?.color ?? null,
      funciones,
      dependenciasFuncionales: deps.map((d) => ({
        id: Number(d.dependenciaId),
        codigo: d.dependencia?.codigo,
        nombre: d.dependencia?.nombre,
        sigla: d.dependencia?.sigla,
      })),
      hijasLineales,
      unidadesDependientesLineales: hijasLineales,
      hijasFuncionales,
      unidadesDependientesFuncionales: hijasFuncionales,
      relacionesInternas,
      relacionesExternas,
      // 7 campos S-MAU
      tramitesAtendidos: u.tramitesAtendidos ?? null,
      tramites_atendidos: u.tramitesAtendidos ?? null,
      ejecucionPoa: u.ejecucionPoa ?? null,
      ejecucion_poa: u.ejecucionPoa ?? null,
      ejecucionPresupuestaria: u.ejecucionPresupuestaria ?? null,
      ejecucion_presupuestaria: u.ejecucionPresupuestaria ?? null,
      cargaHorariaProgramada: u.cargaHorariaProgramada ?? null,
      carga_horaria_programada: u.cargaHorariaProgramada ?? null,
      cargaHorariaEjecutada: u.cargaHorariaEjecutada ?? null,
      carga_horaria_ejecutada: u.cargaHorariaEjecutada ?? null,
      infraestructura: u.infraestructura ?? null,
      infraestructura_fisica: u.infraestructura ?? null,
      ubicacion: u.ubicacion ?? null,
    };
  }

  async lista() {
    const rows = await this.unidadRepo.find({
      relations: ['tipo', 'nivel', 'relacion', 'tipoUnidad', 'parent'],
      order: { codigo: 'ASC' },
    });
    return rows.map((u) => this.mapListItem(u, u.parent?.nombre ?? null));
  }

  async findById(id: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(id) },
      relations: ['tipo', 'nivel', 'relacion', 'tipoUnidad', 'parent'],
    });
    if (!u) notFound(id);
    return this.mapDetail(u);
  }

  async create(dto: UnidadDto) {
    const exists = await this.unidadRepo.findOne({
      where: { codigo: dto.codigo },
    });
    if (exists) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }
    const tipoId = await this.resolveCatalogId(this.tipoRepo, dto.tipo);
    const nivelId = await this.resolveCatalogId(this.nivelRepo, dto.nivel);
    const relacionId = await this.resolveCatalogId(
      this.relacionRepo,
      dto.relacion,
    );
    const tipoUnidadId = dto.tipoUnidad;
    const clase = await this.claseRepo.findOne({
      where: { id: tipoUnidadId },
    });
    if (!clase) notFound(tipoUnidadId);

    const sigla = (dto.sigla ?? dto.codigo).slice(0, 32);
    const esTroncal = dto.esTroncal ?? false;
    const lado = esTroncal ? 'CENTRO' : (dto.lado ?? 'AUTOMATICO');
    const entity = this.unidadRepo.create({
      codigo: dto.codigo,
      sigla,
      nombre: dto.nombre,
      parentId: dto.parentId != null ? String(dto.parentId) : null,
      tipoId,
      nivelId,
      relacionId,
      tipoUnidadId,
      oficial: dto.oficial,
      esTroncal,
      lado,
      objetivo: dto.objetivo ?? null,
      baseLegal: dto.baseLegal ?? null,
      resCreacion: dto.resCreacion ?? null,
      fecCreacion: dto.fecCreacion ? new Date(dto.fecCreacion) : null,
      tramitesAtendidos: dto.tramitesAtendidos ?? null,
      ejecucionPoa: dto.ejecucionPoa ?? null,
      ejecucionPresupuestaria: dto.ejecucionPresupuestaria ?? null,
      cargaHorariaProgramada: dto.cargaHorariaProgramada ?? null,
      cargaHorariaEjecutada: dto.cargaHorariaEjecutada ?? null,
      infraestructura: dto.infraestructura ?? null,
      ubicacion: dto.ubicacion ?? null,
    });
    const saved = await this.unidadRepo.save(entity);

    if (dto.dependenciasFuncionales?.length) {
      for (const depId of dto.dependenciasFuncionales) {
        if (Number(depId) === Number(saved.id)) continue;
        await this.depRepo.save(
          this.depRepo.create({
            unidadId: saved.id,
            dependenciaId: String(depId),
          }),
        );
      }
    }

    if (dto.relacionesInternas?.length) {
      for (const item of dto.relacionesInternas) {
        const relId = typeof item === 'object' ? item.relacionadaId : item;
        const tipo = typeof item === 'object' ? item.tipo : null;
        if (Number(relId) === Number(saved.id)) continue;
        await this.relIntRepo.save(
          this.relIntRepo.create({
            unidadId: saved.id,
            relacionadaId: String(relId),
            tipo: tipo ?? null,
          }),
        );
      }
    }

    if (dto.relacionesExternas?.length) {
      for (const item of dto.relacionesExternas) {
        const desc = typeof item === 'object' ? item.descripcion : item;
        if (!desc || !String(desc).trim()) continue;
        await this.relExtRepo.save(
          this.relExtRepo.create({
            unidadId: saved.id,
            descripcion: String(desc).trim(),
          }),
        );
      }
    }

    return {
      id: Number(saved.id),
      codigo: saved.codigo,
      nombre: saved.nombre,
      sigla: saved.sigla,
    };
  }

  async update(id: number, dto: UnidadDto) {
    const u = await this.unidadRepo.findOne({ where: { id: String(id) } });
    if (!u) notFound(id);

    if (dto.codigo && dto.codigo !== u.codigo) {
      const clash = await this.unidadRepo.findOne({
        where: { codigo: dto.codigo },
      });
      if (clash) {
        throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
      }
      u.codigo = dto.codigo;
    }
    if (dto.sigla) u.sigla = dto.sigla;
    if (dto.nombre) u.nombre = dto.nombre;
    if (dto.oficial !== undefined) u.oficial = dto.oficial;
    if (dto.esTroncal !== undefined) {
      u.esTroncal = dto.esTroncal;
      if (dto.esTroncal) {
        u.lado = 'CENTRO';
      } else if (dto.lado !== undefined) {
        u.lado = dto.lado;
      }
    } else if (dto.lado !== undefined) {
      u.lado = u.esTroncal ? 'CENTRO' : dto.lado;
    }
    if (dto.objetivo !== undefined) u.objetivo = dto.objetivo;
    if (dto.baseLegal !== undefined) u.baseLegal = dto.baseLegal;
    if (dto.resCreacion !== undefined) u.resCreacion = dto.resCreacion;
    if (dto.fecCreacion !== undefined) {
      u.fecCreacion = dto.fecCreacion ? new Date(dto.fecCreacion) : null;
    }
    if (dto.tramitesAtendidos !== undefined) u.tramitesAtendidos = dto.tramitesAtendidos;
    if (dto.ejecucionPoa !== undefined) u.ejecucionPoa = dto.ejecucionPoa;
    if (dto.ejecucionPresupuestaria !== undefined) {
      u.ejecucionPresupuestaria = dto.ejecucionPresupuestaria;
    }
    if (dto.cargaHorariaProgramada !== undefined) {
      u.cargaHorariaProgramada = dto.cargaHorariaProgramada;
    }
    if (dto.cargaHorariaEjecutada !== undefined) {
      u.cargaHorariaEjecutada = dto.cargaHorariaEjecutada;
    }
    if (dto.infraestructura !== undefined) u.infraestructura = dto.infraestructura;
    if (dto.ubicacion !== undefined) u.ubicacion = dto.ubicacion;
    if (dto.tipo !== undefined) {
      u.tipoId = await this.resolveCatalogId(this.tipoRepo, dto.tipo);
    }
    if (dto.nivel !== undefined) {
      u.nivelId = await this.resolveCatalogId(this.nivelRepo, dto.nivel);
    }
    if (dto.relacion !== undefined) {
      u.relacionId = await this.resolveCatalogId(
        this.relacionRepo,
        dto.relacion,
      );
    }
    if (dto.tipoUnidad !== undefined) {
      const clase = await this.claseRepo.findOne({
        where: { id: dto.tipoUnidad },
      });
      if (!clase) notFound(dto.tipoUnidad);
      u.tipoUnidadId = dto.tipoUnidad;
    }
    if (dto.parentId !== undefined) {
      await this.assertNoCycle(id, dto.parentId);
      u.parentId = dto.parentId != null ? String(dto.parentId) : null;
    }

    await this.unidadRepo.save(u);

    if (dto.dependenciasFuncionales) {
      const existing = await this.depRepo.find({
        where: { unidadId: String(id) },
      });
      await this.depRepo.remove(existing);
      for (const depId of dto.dependenciasFuncionales) {
        if (Number(depId) === id) continue;
        await this.depRepo.save(
          this.depRepo.create({
            unidadId: String(id),
            dependenciaId: String(depId),
          }),
        );
      }
    }

    if (dto.relacionesInternas !== undefined) {
      const existingInt = await this.relIntRepo.find({
        where: { unidadId: String(id) },
      });
      await this.relIntRepo.remove(existingInt);
      for (const item of dto.relacionesInternas) {
        const relId = typeof item === 'object' ? item.relacionadaId : item;
        const tipo = typeof item === 'object' ? item.tipo : null;
        if (Number(relId) === id) continue;
        await this.relIntRepo.save(
          this.relIntRepo.create({
            unidadId: String(id),
            relacionadaId: String(relId),
            tipo: tipo ?? null,
          }),
        );
      }
    }

    if (dto.relacionesExternas !== undefined) {
      const existingExt = await this.relExtRepo.find({
        where: { unidadId: String(id) },
      });
      await this.relExtRepo.remove(existingExt);
      for (const item of dto.relacionesExternas) {
        const desc = typeof item === 'object' ? item.descripcion : item;
        if (!desc || !String(desc).trim()) continue;
        await this.relExtRepo.save(
          this.relExtRepo.create({
            unidadId: String(id),
            descripcion: String(desc).trim(),
          }),
        );
      }
    }

    return id;
  }

  async remove(id: number) {
    const u = await this.unidadRepo.findOne({ where: { id: String(id) } });
    if (!u) notFound(id);
    await this.unidadRepo.softRemove(u);
    return id;
  }

  private async assertNoCycle(
    unidadId: number,
    parentId: number | null | undefined,
  ) {
    if (parentId == null) return;
    if (Number(parentId) === Number(unidadId)) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }
    let current: string | null = String(parentId);
    const seen = new Set<string>([String(unidadId)]);
    while (current) {
      if (seen.has(current)) {
        throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
      }
      seen.add(current);
      const node = await this.unidadRepo.findOne({ where: { id: current } });
      current = node?.parentId ?? null;
    }
  }

  async setParent(id: number, dto: SetParentDto) {
    const u = await this.unidadRepo.findOne({ where: { id: String(id) } });
    if (!u) notFound(id);
    await this.assertNoCycle(id, dto.parentId);
    const anterior = u.parentId;
    u.parentId = String(dto.parentId);
    await this.unidadRepo.save(u);
    await this.histRepo.save(
      this.histRepo.create({
        unidadId: String(id),
        parentIdAnterior: anterior,
        parentIdNuevo: String(dto.parentId),
        razon: dto.razon ?? null,
      }),
    );
    return id;
  }

  async funciones(unidadId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
    const rows = await this.funcionRepo.find({
      where: { unidadId: String(unidadId) },
      order: { orden: 'ASC', id: 'ASC' },
    });
    return rows.map((f) => ({
      id: Number(f.id),
      funcion: f.funcion,
      baseLegal: f.baseLegal,
      orden: f.orden,
    }));
  }

  async getFuncion(unidadId: number, funcionId: number) {
    const f = await this.funcionRepo.findOne({
      where: { id: String(funcionId), unidadId: String(unidadId) },
    });
    if (!f) notFound(funcionId);
    return {
      id: Number(f.id),
      funcion: f.funcion,
      baseLegal: f.baseLegal,
      orden: f.orden,
    };
  }

  async addFuncion(unidadId: number, dto: UnidadFuncionDto) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
    const max = await this.funcionRepo
      .createQueryBuilder('f')
      .select('MAX(f.orden)', 'max')
      .where('f.unidad_id = :unidadId', { unidadId: String(unidadId) })
      .getRawOne<{ max: string | null }>();
    const orden = (max?.max ? Number(max.max) : 0) + 1;
    const saved = await this.funcionRepo.save(
      this.funcionRepo.create({
        unidadId: String(unidadId),
        funcion: dto.funcion,
        baseLegal: dto.baseLegal ?? null,
        orden,
      }),
    );
    return {
      id: Number(saved.id),
      funcion: saved.funcion,
      baseLegal: saved.baseLegal,
      orden: saved.orden,
    };
  }

  async updateFuncion(
    unidadId: number,
    funcionId: number,
    dto: UnidadFuncionDto,
  ) {
    const f = await this.funcionRepo.findOne({
      where: { id: String(funcionId), unidadId: String(unidadId) },
    });
    if (!f) notFound(funcionId);
    f.funcion = dto.funcion;
    if (dto.baseLegal !== undefined) f.baseLegal = dto.baseLegal;
    const saved = await this.funcionRepo.save(f);
    return {
      id: Number(saved.id),
      funcion: saved.funcion,
      baseLegal: saved.baseLegal,
      orden: saved.orden,
    };
  }

  // REGLA DE ORO (MOF-013):
  // 1. Al editar una función, su campo "orden" NUNCA debe modificarse ni reinicializarse.
  // 2. El reordenamiento solo ocurre explícitamente mediante subirFuncion/bajarFuncion (swap transaccional).
  // 3. Al eliminar una función, las funciones restantes deben renumerarse 1..N sin huecos ni duplicados.
  async deleteFuncion(unidadId: number, funcionId: number) {
    const f = await this.funcionRepo.findOne({
      where: { id: String(funcionId), unidadId: String(unidadId) },
    });
    if (!f) notFound(funcionId);
    await this.funcionRepo.softRemove(f);

    // Renumerar 1..N las funciones restantes para garantizar permanencia sin huecos
    const remaining = await this.funcionRepo.find({
      where: { unidadId: String(unidadId) },
      order: { orden: 'ASC', id: 'ASC' },
    });
    let needsSave = false;
    remaining.forEach((row, index) => {
      const nuevoOrden = index + 1;
      if (row.orden !== nuevoOrden) {
        row.orden = nuevoOrden;
        needsSave = true;
      }
    });
    if (needsSave && remaining.length > 0) {
      await this.funcionRepo.save(remaining);
    }
    return null;
  }

  async subirFuncion(unidadId: number, funcionId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);

    const rows = await this.funcionRepo.find({
      where: { unidadId: String(unidadId) },
      order: { orden: 'ASC', id: 'ASC' },
    });

    const idx = rows.findIndex((r) => Number(r.id) === Number(funcionId));
    if (idx < 0) notFound(funcionId);
    if (idx === 0) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }

    // Normalizar si hay huecos o duplicados antes del swap
    let hasGaps = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].orden !== i + 1) {
        hasGaps = true;
        break;
      }
    }
    if (hasGaps) {
      rows.forEach((r, i) => {
        r.orden = i + 1;
      });
    }

    const current = rows[idx];
    const prev = rows[idx - 1];
    const tmp = current.orden;
    current.orden = prev.orden;
    prev.orden = tmp;

    await this.funcionRepo.save([current, prev]);
    return {
      id: Number(current.id),
      orden: current.orden,
    };
  }

  async bajarFuncion(unidadId: number, funcionId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);

    const rows = await this.funcionRepo.find({
      where: { unidadId: String(unidadId) },
      order: { orden: 'ASC', id: 'ASC' },
    });

    const idx = rows.findIndex((r) => Number(r.id) === Number(funcionId));
    if (idx < 0) notFound(funcionId);
    if (idx === rows.length - 1) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }

    // Normalizar si hay huecos o duplicados antes del swap
    let hasGaps = false;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i].orden !== i + 1) {
        hasGaps = true;
        break;
      }
    }
    if (hasGaps) {
      rows.forEach((r, i) => {
        r.orden = i + 1;
      });
    }

    const current = rows[idx];
    const next = rows[idx + 1];
    const tmp = current.orden;
    current.orden = next.orden;
    next.orden = tmp;

    await this.funcionRepo.save([current, next]);
    return {
      id: Number(current.id),
      orden: current.orden,
    };
  }

  async addDependencia(unidadId: number, dto: DependenciaFuncionalDto) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
    if (Number(dto.dependenciaId) === Number(unidadId)) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }
    const dep = await this.unidadRepo.findOne({
      where: { id: String(dto.dependenciaId) },
    });
    if (!dep) notFound(dto.dependenciaId);
    const existing = await this.depRepo.findOne({
      where: {
        unidadId: String(unidadId),
        dependenciaId: String(dto.dependenciaId),
      },
    });
    if (existing) {
      throw new ConflictException(RestMessages.ERROR);
    }
    await this.depRepo.save(
      this.depRepo.create({
        unidadId: String(unidadId),
        dependenciaId: String(dto.dependenciaId),
      }),
    );
    return true;
  }

  async removeDependencia(unidadId: number, dependenciaId: number) {
    const row = await this.depRepo.findOne({
      where: {
        unidadId: String(unidadId),
        dependenciaId: String(dependenciaId),
      },
    });
    if (!row) notFound(dependenciaId);
    await this.depRepo.softRemove(row);
    return true;
  }

  // --- RELACIONES INTERNAS ---
  async listRelacionesInternas(unidadId: number) {
    const u = await this.unidadRepo.findOne({ where: { id: String(unidadId) } });
    if (!u) notFound(unidadId);
    const rows = await this.relIntRepo.find({
      where: { unidadId: String(unidadId) },
      relations: ['relacionada'],
      order: { id: 'ASC' },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      relacionadaId: Number(r.relacionadaId),
      codigo: r.relacionada?.codigo ?? null,
      nombre: r.relacionada?.nombre ?? null,
      sigla: r.relacionada?.sigla ?? null,
      tipo: r.tipo ?? null,
    }));
  }

  async addRelacionInterna(unidadId: number, dto: UnidadRelacionInternaDto) {
    const u = await this.unidadRepo.findOne({ where: { id: String(unidadId) } });
    if (!u) notFound(unidadId);
    if (Number(dto.relacionadaId) === unidadId) {
      throw new BusinessException(
        'Una unidad no puede relacionarse consigo misma',
        HttpStatus.BAD_REQUEST,
      );
    }
    const relUnit = await this.unidadRepo.findOne({
      where: { id: String(dto.relacionadaId) },
    });
    if (!relUnit) notFound(dto.relacionadaId);

    const exists = await this.relIntRepo.findOne({
      where: {
        unidadId: String(unidadId),
        relacionadaId: String(dto.relacionadaId),
      },
    });
    if (exists) {
      if (dto.tipo !== undefined) {
        exists.tipo = dto.tipo ?? null;
        return await this.relIntRepo.save(exists);
      }
      return exists;
    }
    const entity = this.relIntRepo.create({
      unidadId: String(unidadId),
      relacionadaId: String(dto.relacionadaId),
      tipo: dto.tipo ?? null,
    });
    return await this.relIntRepo.save(entity);
  }

  async removeRelacionInterna(unidadId: number, relacionId: number) {
    const rel = await this.relIntRepo.findOne({
      where: [
        { id: String(relacionId), unidadId: String(unidadId) },
        { relacionadaId: String(relacionId), unidadId: String(unidadId) },
      ],
    });
    if (!rel) notFound(relacionId);
    await this.relIntRepo.remove(rel);
    return true;
  }

  // --- RELACIONES EXTERNAS ---
  async listRelacionesExternas(unidadId: number) {
    const u = await this.unidadRepo.findOne({ where: { id: String(unidadId) } });
    if (!u) notFound(unidadId);
    const rows = await this.relExtRepo.find({
      where: { unidadId: String(unidadId) },
      order: { id: 'ASC' },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      descripcion: r.descripcion,
    }));
  }

  async addRelacionExterna(unidadId: number, dto: UnidadRelacionExternaDto) {
    const u = await this.unidadRepo.findOne({ where: { id: String(unidadId) } });
    if (!u) notFound(unidadId);
    const entity = this.relExtRepo.create({
      unidadId: String(unidadId),
      descripcion: dto.descripcion.trim(),
    });
    return await this.relExtRepo.save(entity);
  }

  async updateRelacionExterna(
    unidadId: number,
    relacionId: number,
    dto: UnidadRelacionExternaDto,
  ) {
    const rel = await this.relExtRepo.findOne({
      where: { id: String(relacionId), unidadId: String(unidadId) },
    });
    if (!rel) notFound(relacionId);
    rel.descripcion = dto.descripcion.trim();
    return await this.relExtRepo.save(rel);
  }

  async removeRelacionExterna(unidadId: number, relacionId: number) {
    const rel = await this.relExtRepo.findOne({
      where: { id: String(relacionId), unidadId: String(unidadId) },
    });
    if (!rel) notFound(relacionId);
    await this.relExtRepo.remove(rel);
    return true;
  }

  async findEntityForPdf(id: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(id) },
      relations: ['tipo', 'nivel', 'relacion', 'tipoUnidad', 'parent'],
    });
    if (!u) notFound(id);
    const funciones = await this.funciones(id);
    return { unidad: u, funciones };
  }
}
