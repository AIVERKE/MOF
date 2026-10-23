import { EntityManager, In, Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadFuncion } from './entities/unidad-funcion.entity';
import { UnidadDependenciaFuncional } from './entities/unidad-dependencia-funcional.entity';
import { UnidadJerarquiaHist } from './entities/unidad-jerarquia-hist.entity';
import { UnidadRelacionInterna } from './entities/unidad-relacion-interna.entity';
import { UnidadRelacionExterna } from './entities/unidad-relacion-externa.entity';
import { UnidadInventario } from './entities/unidad-inventario.entity';
import { UnidadSia } from './entities/unidad-sia.entity';
import { CatalogoTipo } from '../catalogos/entities/catalogo-tipo.entity';
import { CatalogoNivel } from '../catalogos/entities/catalogo-nivel.entity';
import { CatalogoRelacion } from '../catalogos/entities/catalogo-relacion.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import { esClaseCarrera } from '../catalogos/clase-carrera';
import {
  MofConfig,
  type MofConfigDefaults,
} from './entities/mof-config.entity';
import {
  DependenciaFuncionalDto,
  SIA_CAMPOS,
  SetParentDto,
  UnidadDto,
  UnidadFuncionDto,
  UnidadInventarioDto,
  UnidadInventarioItemDto,
  UnidadRelacionExternaDto,
  UnidadRelacionInternaDto,
  UnidadSiaDto,
  UnidadSiaItemDto,
} from './dto/unidad.dto';
import { UpdateMofConfigDto } from './dto/mof-config.dto';
import {
  BusinessException,
  notFound,
  throwBusiness,
} from '../../common/exceptions/business.exception';
import { ErrorCodes } from '../../common/errors';
import { resumirRelacionesInternas } from './relaciones-internas-resumen';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

/** Columnas `date` deben persistirse como `YYYY-MM-DD`: TypeORM formatea un `Date` en la zona horaria local del servidor. */
function toDateOnly(value?: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}

type RelItem =
  | number
  | string
  | { relacionadaId?: unknown; tipo?: unknown }
  | null
  | undefined;

/**
 * Ids de unidades relacionadas: enteros positivos, sin la propia unidad y sin
 * repetidos (se conserva el primer `tipo`). La tabla tiene UNIQUE por par.
 */
export function normalizeRelIds(
  items: readonly RelItem[] | undefined | null,
  selfId: number | string | null,
): Map<number, string | null> {
  const out = new Map<number, string | null>();
  const self = selfId != null ? Number(selfId) : null;
  for (const item of items ?? []) {
    const isObj = item !== null && typeof item === 'object';
    const relId = Number(isObj ? item.relacionadaId : item);
    if (!Number.isInteger(relId) || relId <= 0) continue;
    if (relId === self || out.has(relId)) continue;
    const tipo = isObj && typeof item.tipo === 'string' ? item.tipo : null;
    out.set(relId, tipo);
  }
  return out;
}

/** Valores históricos usados cuando aún no hay fila en mof_config. */
export const MOF_CONFIG_FALLBACK = {
  defaults: {
    tipo: 1,
    nivel: 1,
    relacion: 1,
    clase: 1,
    color: '#1976D2',
    lado: 'AUTOMATICO',
    oficial: true,
    es_troncal: false,
  } as MofConfigDefaults,
  reglas: {
    pesoNulo: 99,
    pesoDefault: 10,
    defaultClaseColor: '#757575',
    staffRelacionCodigos: ['S'],
    ladoTroncalForzado: 'CENTRO',
  },
  paleta: [
    ['#1976D2', '#2196F3', '#03A9F4', '#00BCD4', '#00ACC1'],
    ['#2E7D32', '#4CAF50', '#8BC34A', '#CDDC39', '#C0CA33'],
    ['#FF8F00', '#FFA000', '#FFC107', '#FFEB3B', '#FDD835'],
    ['#C62828', '#E53935', '#F44336', '#EF5350', '#E91E63'],
    ['#6A1B9A', '#8E24AA', '#9C27B0', '#AB47BC', '#BA68C8'],
    ['#E65100', '#EF6C00', '#F57C00', '#FB8C00', '#FF9800'],
    ['#00695C', '#00796B', '#00897B', '#009688', '#26A69A'],
    ['#1A237E', '#283593', '#303F9F', '#3949AB', '#3F51B5'],
    ['#37474F', '#455A64', '#607D8B', '#78909C', '#90A4AE'],
    ['#4E342E', '#5D4037', '#6D4C41', '#795548', '#8D6E63'],
    ['#212121', '#424242', '#616161', '#757575', '#9E9E9E'],
    ['#BF360C', '#D84315', '#E64A19', '#F4511E', '#FF5722'],
  ] as string[][],
  passwordPolicy: { minLength: 6 },
};

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
    @InjectRepository(MofConfig)
    private readonly mofConfigRepo: Repository<MofConfig>,
    @InjectRepository(UnidadInventario)
    private readonly inventarioRepo: Repository<UnidadInventario>,
    @InjectRepository(UnidadSia)
    private readonly siaRepo: Repository<UnidadSia>,
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
    throwBusiness(ErrorCodes.CATALOG_REF_NOT_FOUND);
  }

  private async generateUniqueSigla(
    nombre: string,
    excludeId?: string | number,
  ): Promise<string> {
    if (!nombre) return `U${Date.now().toString().slice(-6)}`;
    const clean = nombre.trim().toUpperCase();

    let base = '';
    if (clean === 'RECTORADO') base = 'REC';
    else if (clean === 'VICERRECTORADO') base = 'VR';
    else if (clean === 'CONGRESO INTERNO') base = 'CI';
    else if (clean === 'ASAMBLEA DOCENTE ESTUDIANTIL') base = 'ADE';
    else if (clean === 'HONORABLE CONSEJO UNIVERSITARIO') base = 'HCU';
    else if (clean.includes('COMITE EJECUTIVO DEL HONORABLE CONSEJO'))
      base = 'CE-HCU';
    else if (clean === 'SECRETARÍA GENERAL' || clean === 'SECRETARIA GENERAL')
      base = 'SG';
    else {
      const prefixMatch = clean.match(/^([A-Z0-9]{2,10})\s*[-–]\s*(.+)$/);
      if (prefixMatch) {
        const prefix = prefixMatch[1];
        const rest = prefixMatch[2];
        if (rest.includes('VICEDECANATO')) base = `${prefix}-VD`;
        else if (rest.includes('DECANATO')) base = `${prefix}-DEC`;
        else if (rest.includes('DIRECCION') || rest.includes('DIRECCIÓN'))
          base = `${prefix}-DIR`;
        else if (rest.includes('CARRERA') || rest.includes('CARR'))
          base = `${prefix}-CARR`;
        else if (rest.includes('INSTITUTO') || rest.includes('INST'))
          base = `${prefix}-INST`;
        else base = prefix;
      } else {
        const stopWords = new Set([
          'DE',
          'DEL',
          'LA',
          'LAS',
          'LOS',
          'Y',
          'E',
          'EN',
          'POR',
          'PARA',
          'A',
          'AL',
        ]);
        const words = clean
          .replace(/[^\w\s-]/g, ' ')
          .split(/[\s-]+/)
          .filter((w) => w.length > 0 && !stopWords.has(w));

        if (words.length === 1) {
          base = words[0].slice(0, 8);
        } else {
          const initials = words.map((w) => w[0]).join('');
          base =
            initials.length >= 2 && initials.length <= 10
              ? initials
              : clean.slice(0, 12).replace(/\s+/g, '');
        }
      }
    }

    base = base.slice(0, 24) || 'UNIDAD';
    let candidate = base;
    let counter = 1;
    while (true) {
      const existing = await this.unidadRepo.findOne({
        where: { sigla: candidate },
      });
      if (
        !existing ||
        (excludeId && String(existing.id) === String(excludeId))
      ) {
        return candidate;
      }
      counter++;
      candidate = `${base}-${counter}`.slice(0, 32);
    }
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
      relacion: u.relacion?.descripcion ?? null,
      str_relacion: u.relacion?.descripcion ?? null,
      codigo_relacion: u.relacion?.codigo ?? null,
      codigoRelacion: u.relacion?.codigo ?? null,
      relacion_id:
        u.relacionId != null
          ? Number(u.relacionId)
          : u.relacion?.id != null
            ? Number(u.relacion.id)
            : null,
      relacionId:
        u.relacionId != null
          ? Number(u.relacionId)
          : u.relacion?.id != null
            ? Number(u.relacion.id)
            : null,
      dependencia: parentNombre ?? null,
      oficial: u.oficial,
      es_troncal: u.esTroncal ?? false,
      esTroncal: u.esTroncal ?? false,
      es_sub_troncal: u.esSubTroncal ?? false,
      esSubTroncal: u.esSubTroncal ?? false,
      es_subtroncal: u.esSubTroncal ?? false,
      esSubtroncal: u.esSubTroncal ?? false,
      lado: u.lado ?? 'AUTOMATICO',
      color: u.tipoUnidad?.color ?? null,
      clase: u.tipoUnidad?.descripcion ?? null,
      tipo_unidad: u.tipoUnidad?.descripcion ?? null,
      tipoUnidad: u.tipoUnidadId,
      base_legal: u.baseLegal,
      res_creacion: u.resCreacion,
      fec_creacion: u.fecCreacion,
      objetivo: u.objetivo,
      peso: u.tipoUnidad?.peso ?? null,
      es_staff:
        u.relacion?.codigo === 'S' ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('staff') ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('asesor'),
      esStaff:
        u.relacion?.codigo === 'S' ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('staff') ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('asesor'),
      peso_real: u.tipoUnidad?.peso != null ? Number(u.tipoUnidad.peso) : 10,
      pesoReal: u.tipoUnidad?.peso != null ? Number(u.tipoUnidad.peso) : 10,
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
      where: { unidadId: String(u.id) },
      relations: ['relacionada'],
      order: { id: 'ASC' },
    });
    const relacionesInternas = relsIntRaw
      .filter((r) => r.relacionada)
      .map((r) => ({
        id: Number(r.id),
        relacionadaId: Number(r.relacionadaId),
        codigo: r.relacionada.codigo ?? null,
        nombre: r.relacionada.nombre ?? null,
        sigla: r.relacionada.sigla ?? null,
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

    const inventariosRaw = await this.inventarioRepo.find({
      where: { unidadId: String(u.id) },
      order: { id: 'ASC' },
    });
    const inventarios = inventariosRaw.map((r) => this.mapInventario(r));

    // Las filas SIA de una unidad reclasificada se conservan pero no se exponen.
    const esCarrera = esClaseCarrera(u.tipoUnidad?.descripcion);
    const sia = esCarrera ? await this.findSiaRows(u.id) : [];

    return {
      id: Number(u.id),
      codigo: u.codigo,
      sigla: u.sigla,
      nombre: u.nombre,
      tipo: u.tipo?.descripcion ?? null,
      nivel: u.nivel?.descripcion ?? null,
      relacion: u.relacion?.codigo ?? null,
      str_relacion: u.relacion?.descripcion ?? null,
      relacion_id:
        u.relacionId != null
          ? Number(u.relacionId)
          : u.relacion?.id != null
            ? Number(u.relacion.id)
            : null,
      relacionId:
        u.relacionId != null
          ? Number(u.relacionId)
          : u.relacion?.id != null
            ? Number(u.relacion.id)
            : null,
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
      esTroncal: u.esTroncal ?? false,
      es_sub_troncal: u.esSubTroncal ?? false,
      esSubTroncal: u.esSubTroncal ?? false,
      es_subtroncal: u.esSubTroncal ?? false,
      esSubtroncal: u.esSubTroncal ?? false,
      lado: u.lado ?? 'AUTOMATICO',
      tipoUnidad: u.tipoUnidadId,
      clase: u.tipoUnidad?.descripcion ?? null,
      peso: u.tipoUnidad?.peso ?? null,
      es_staff:
        u.relacion?.codigo === 'S' ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('staff') ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('asesor'),
      esStaff:
        u.relacion?.codigo === 'S' ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('staff') ||
        (u.relacion?.descripcion ?? '').toLowerCase().includes('asesor'),
      peso_real: u.tipoUnidad?.peso != null ? Number(u.tipoUnidad.peso) : 10,
      pesoReal: u.tipoUnidad?.peso != null ? Number(u.tipoUnidad.peso) : 10,
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
      inventarios,
      esCarrera,
      sia,
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
      // Con el switch apagado los valores se conservan pero no se exponen.
      planificacionEstrategicaAplica: u.planificacionEstrategicaAplica ?? false,
      planificacionEstrategicaValor: u.planificacionEstrategicaAplica
        ? (u.planificacionEstrategicaValor ?? null)
        : null,
      planificacionEstrategica: u.planificacionEstrategicaAplica
        ? (u.planificacionEstrategica ?? null)
        : null,
    };
  }

  /**
   * Fusiona el bloque de Planificación Estratégica del DTO sobre la unidad
   * (`undefined` conserva, `null`/vacío limpia) y valida el estado final:
   * si aplica, porcentaje y descripción son obligatorios.
   */
  private applyPlanificacionEstrategica(u: Unidad, dto: UnidadDto) {
    if (dto.planificacionEstrategicaAplica !== undefined) {
      u.planificacionEstrategicaAplica = dto.planificacionEstrategicaAplica;
    }
    if (dto.planificacionEstrategicaValor !== undefined) {
      u.planificacionEstrategicaValor = dto.planificacionEstrategicaValor;
    }
    if (dto.planificacionEstrategica !== undefined) {
      u.planificacionEstrategica = dto.planificacionEstrategica?.trim() || null;
    }
    if (
      u.planificacionEstrategicaAplica &&
      (u.planificacionEstrategicaValor == null || !u.planificacionEstrategica)
    ) {
      throwBusiness(ErrorCodes.PLANIFICACION_ESTRATEGICA_INCOMPLETA);
    }
  }

  async lista() {
    const rows = await this.unidadRepo.find({
      relations: ['tipo', 'nivel', 'relacion', 'tipoUnidad', 'parent'],
    });

    rows.sort((a, b) => {
      const pesoA = a.tipoUnidad?.peso != null ? Number(a.tipoUnidad.peso) : 99;
      const pesoB = b.tipoUnidad?.peso != null ? Number(b.tipoUnidad.peso) : 99;
      if (pesoA !== pesoB) return pesoA - pesoB;

      const partsA = String(a.codigo || '')
        .split('.')
        .map((p) => parseInt(p, 10) || 0);
      const partsB = String(b.codigo || '')
        .split('.')
        .map((p) => parseInt(p, 10) || 0);
      const maxLen = Math.max(partsA.length, partsB.length);
      for (let i = 0; i < maxLen; i++) {
        const valA = partsA[i] ?? 0;
        const valB = partsB[i] ?? 0;
        if (valA !== valB) return valA - valB;
      }
      return String(a.codigo || '').localeCompare(String(b.codigo || ''));
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
      throwBusiness(ErrorCodes.UNIDAD_CODIGO_DUPLICADO);
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
    if (dto.sia?.length && !esClaseCarrera(clase.descripcion)) {
      throwBusiness(ErrorCodes.SIA_SOLO_CARRERA);
    }

    let sigla = (dto.sigla || '').trim();
    if (
      !sigla ||
      sigla === '-' ||
      sigla === dto.codigo ||
      /^[0-9]+(\.[0-9]+)*\.?$/.test(sigla)
    ) {
      sigla = await this.generateUniqueSigla(dto.nombre);
    } else {
      sigla = sigla.slice(0, 32);
    }
    const esTroncal = dto.esTroncal ?? false;
    const incomingSubTroncal =
      dto.esSubTroncal ??
      dto.es_sub_troncal ??
      dto.esSubtroncal ??
      dto.es_subtroncal ??
      false;
    const esSubTroncal = esTroncal ? false : incomingSubTroncal;
    const lado = dto.lado ?? 'AUTOMATICO';
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
      esSubTroncal,
      lado,
      objetivo: dto.objetivo ?? null,
      baseLegal: dto.baseLegal ?? null,
      resCreacion: dto.resCreacion ?? null,
      fecCreacion: toDateOnly(dto.fecCreacion),
      tramitesAtendidos: dto.tramitesAtendidos ?? null,
      ejecucionPoa: dto.ejecucionPoa ?? null,
      ejecucionPresupuestaria: dto.ejecucionPresupuestaria ?? null,
      cargaHorariaProgramada: dto.cargaHorariaProgramada ?? null,
      cargaHorariaEjecutada: dto.cargaHorariaEjecutada ?? null,
      infraestructura: dto.infraestructura ?? null,
      ubicacion: dto.ubicacion ?? null,
      planificacionEstrategicaAplica: false,
      planificacionEstrategicaValor: null,
      planificacionEstrategica: null,
    });
    this.applyPlanificacionEstrategica(entity, dto);
    const saved = await this.unidadRepo.manager.transaction(async (m) => {
      const row = await m.save(entity);
      if (dto.dependenciasFuncionales?.length) {
        await this.replaceDependencias(m, row.id, dto.dependenciasFuncionales);
      }
      if (dto.relacionesInternas?.length) {
        await this.replaceRelacionesInternas(m, row.id, dto.relacionesInternas);
      }
      if (dto.relacionesExternas?.length) {
        await this.replaceRelacionesExternas(m, row.id, dto.relacionesExternas);
      }
      if (dto.inventarios?.length) {
        await this.syncInventarios(m, row.id, dto.inventarios);
      }
      if (dto.sia?.length) {
        await this.syncSia(m, row.id, dto.sia);
      }
      return row;
    });

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
        throwBusiness(ErrorCodes.UNIDAD_CODIGO_DUPLICADO);
      }
      u.codigo = dto.codigo;
    }
    if (dto.sigla !== undefined) {
      const s = (dto.sigla || '').trim();
      const currentCode = dto.codigo ?? u.codigo;
      if (
        s &&
        s !== '-' &&
        s !== currentCode &&
        !/^[0-9]+(\.[0-9]+)*\.?$/.test(s)
      ) {
        u.sigla = s.slice(0, 32);
      }
    }
    if (dto.nombre) u.nombre = dto.nombre;
    if (dto.oficial !== undefined) u.oficial = dto.oficial;
    if (dto.esTroncal !== undefined) {
      u.esTroncal = dto.esTroncal;
      if (dto.esTroncal) {
        u.esSubTroncal = false;
      }
      if (dto.lado !== undefined) {
        u.lado = dto.lado;
      }
    } else if (dto.lado !== undefined) {
      u.lado = dto.lado;
    }
    const incomingSubTroncal =
      dto.esSubTroncal !== undefined
        ? dto.esSubTroncal
        : dto.es_sub_troncal !== undefined
          ? dto.es_sub_troncal
          : dto.esSubtroncal !== undefined
            ? dto.esSubtroncal
            : dto.es_sub_troncal;
    if (incomingSubTroncal !== undefined) {
      u.esSubTroncal = u.esTroncal ? false : incomingSubTroncal;
    }
    if (dto.objetivo !== undefined) u.objetivo = dto.objetivo;
    if (dto.baseLegal !== undefined) u.baseLegal = dto.baseLegal;
    if (dto.resCreacion !== undefined) u.resCreacion = dto.resCreacion;
    if (dto.fecCreacion !== undefined) {
      u.fecCreacion = toDateOnly(dto.fecCreacion);
    }
    if (dto.tramitesAtendidos !== undefined)
      u.tramitesAtendidos = dto.tramitesAtendidos;
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
    if (dto.infraestructura !== undefined)
      u.infraestructura = dto.infraestructura;
    if (dto.ubicacion !== undefined) u.ubicacion = dto.ubicacion;
    this.applyPlanificacionEstrategica(u, dto);
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
    let clase: TipoUnidad | null = null;
    if (dto.tipoUnidad !== undefined) {
      clase = await this.claseRepo.findOne({
        where: { id: dto.tipoUnidad },
      });
      if (!clase) notFound(dto.tipoUnidad);
      u.tipoUnidadId = dto.tipoUnidad;
    }
    // Se evalúa con la clase final: puede cambiar en este mismo PUT.
    let sincronizarSia = false;
    if (dto.sia !== undefined) {
      clase ??= await this.claseRepo.findOne({
        where: { id: u.tipoUnidadId },
      });
      sincronizarSia = esClaseCarrera(clase?.descripcion);
      if (dto.sia.length && !sincronizarSia) {
        throwBusiness(ErrorCodes.SIA_SOLO_CARRERA);
      }
    }
    if (dto.parentId !== undefined) {
      await this.assertNoCycle(id, dto.parentId);
      u.parentId = dto.parentId != null ? String(dto.parentId) : null;
    }

    await this.unidadRepo.manager.transaction(async (m) => {
      await m.save(u);
      if (dto.dependenciasFuncionales) {
        await this.replaceDependencias(m, id, dto.dependenciasFuncionales);
      }
      if (dto.relacionesInternas !== undefined) {
        await this.replaceRelacionesInternas(m, id, dto.relacionesInternas);
      }
      if (dto.relacionesExternas !== undefined) {
        await this.replaceRelacionesExternas(m, id, dto.relacionesExternas);
      }
      if (dto.inventarios !== undefined) {
        await this.syncInventarios(m, id, dto.inventarios);
      }
      if (sincronizarSia) {
        await this.syncSia(m, id, dto.sia!);
      }
    });

    return id;
  }

  /** Conserva el orden de `ids` y descarta unidades inexistentes o eliminadas. */
  private async existingUnidadIds(
    m: EntityManager,
    ids: number[],
  ): Promise<number[]> {
    if (!ids.length) return [];
    const rows = await m.find(Unidad, {
      select: { id: true },
      where: { id: In(ids.map(String)) },
    });
    const found = new Set(rows.map((r) => Number(r.id)));
    return ids.filter((x) => found.has(x));
  }

  private async replaceRelacionesInternas(
    m: EntityManager,
    unidadId: number | string,
    items: readonly RelItem[],
  ) {
    const rels = normalizeRelIds(items, unidadId);
    const ids = await this.existingUnidadIds(m, [...rels.keys()]);
    await m.delete(UnidadRelacionInterna, { unidadId: String(unidadId) });
    if (!ids.length) return;
    await m.insert(
      UnidadRelacionInterna,
      ids.map((relId) => ({
        unidadId: String(unidadId),
        relacionadaId: String(relId),
        tipo: rels.get(relId) ?? null,
      })),
    );
  }

  private async replaceDependencias(
    m: EntityManager,
    unidadId: number | string,
    items: readonly RelItem[],
  ) {
    const deps = normalizeRelIds(items, unidadId);
    const ids = await this.existingUnidadIds(m, [...deps.keys()]);
    await m.delete(UnidadDependenciaFuncional, {
      unidadId: String(unidadId),
    });
    if (!ids.length) return;
    await m.insert(
      UnidadDependenciaFuncional,
      ids.map((depId) => ({
        unidadId: String(unidadId),
        dependenciaId: String(depId),
      })),
    );
  }

  private async replaceRelacionesExternas(
    m: EntityManager,
    unidadId: number | string,
    items: readonly (string | UnidadRelacionExternaDto)[],
  ) {
    const descripciones = items
      .map((item) =>
        String(
          (typeof item === 'object' ? item?.descripcion : item) ?? '',
        ).trim(),
      )
      .filter(Boolean);
    await m.delete(UnidadRelacionExterna, { unidadId: String(unidadId) });
    if (!descripciones.length) return;
    await m.insert(
      UnidadRelacionExterna,
      descripciones.map((descripcion) => ({
        unidadId: String(unidadId),
        descripcion,
      })),
    );
  }

  /**
   * Deja el inventario vigente de la unidad igual a `items`: actualiza las filas
   * con `id`, crea las que no lo traen y da de baja las que no se enviaron.
   * Un `id` de otra unidad aborta la transacción.
   */
  private async syncInventarios(
    m: EntityManager,
    unidadId: number | string,
    items: readonly UnidadInventarioItemDto[],
  ) {
    const actuales = await m.find(UnidadInventario, {
      where: { unidadId: String(unidadId) },
    });
    const porId = new Map(actuales.map((r) => [Number(r.id), r]));
    const enviados = new Set<number>();
    for (const item of items) {
      if (item.id == null) continue;
      if (enviados.has(item.id)) {
        throwBusiness(ErrorCodes.INVENTARIO_ID_DUPLICADO, item.id);
      }
      if (!porId.has(item.id)) {
        throwBusiness(ErrorCodes.INVENTARIO_NO_PERTENECE_UNIDAD, item.id);
      }
      enviados.add(item.id);
    }

    const bajas = actuales.filter((r) => !enviados.has(Number(r.id)));
    if (bajas.length) await m.softRemove(bajas);

    const filas = items.map((item) => {
      const row =
        item.id != null
          ? porId.get(item.id)!
          : m.create(UnidadInventario, { unidadId: String(unidadId) });
      row.descripcion = item.descripcion.trim();
      row.cantidad = item.cantidad;
      return row;
    });
    if (filas.length) await m.save(filas);
  }

  /** Igual que `syncInventarios`, para las filas SIA de una Carrera. */
  private async syncSia(
    m: EntityManager,
    unidadId: number | string,
    items: readonly UnidadSiaItemDto[],
  ) {
    items.forEach((item) => this.assertSiaConValor(item));
    const actuales = await m.find(UnidadSia, {
      where: { unidadId: String(unidadId) },
    });
    const porId = new Map(actuales.map((r) => [Number(r.id), r]));
    const enviados = new Set<number>();
    for (const item of items) {
      if (item.id == null) continue;
      if (enviados.has(item.id)) {
        throwBusiness(ErrorCodes.SIA_ID_DUPLICADO, item.id);
      }
      if (!porId.has(item.id)) {
        throwBusiness(ErrorCodes.SIA_NO_PERTENECE_UNIDAD, item.id);
      }
      enviados.add(item.id);
    }

    const bajas = actuales.filter((r) => !enviados.has(Number(r.id)));
    if (bajas.length) await m.softRemove(bajas);

    const filas = items.map((item) => {
      const row =
        item.id != null
          ? porId.get(item.id)!
          : m.create(UnidadSia, { unidadId: String(unidadId) });
      this.assignSia(row, item);
      return row;
    });
    if (filas.length) await m.save(filas);
  }

  async remove(id: number) {
    const u = await this.unidadRepo.findOne({ where: { id: String(id) } });
    if (!u) notFound(id);
    const hasChildren = await this.unidadRepo.count({
      where: { parentId: String(id) },
    });
    if (hasChildren > 0) {
      throw new BusinessException(
        'No se puede eliminar: tiene unidades dependientes.',
        HttpStatus.BAD_REQUEST,
      );
    }
    await this.unidadRepo.softRemove(u);
    return id;
  }

  private async assertNoCycle(
    unidadId: number,
    parentId: number | null | undefined,
  ) {
    if (parentId == null) return;
    if (Number(parentId) === Number(unidadId)) {
      throwBusiness(ErrorCodes.UNIDAD_PARENT_SELF);
    }
    let current: string | null = String(parentId);
    const seen = new Set<string>([String(unidadId)]);
    while (current) {
      if (seen.has(current)) {
        throwBusiness(ErrorCodes.UNIDAD_PARENT_CYCLE);
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
      throwBusiness(ErrorCodes.FUNCION_YA_PRIMERA);
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
      throwBusiness(ErrorCodes.FUNCION_YA_ULTIMA);
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
      throwBusiness(ErrorCodes.DEPENDENCIA_SELF);
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
      throwBusiness(ErrorCodes.DEPENDENCIA_DUPLICADA);
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
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
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
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
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
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
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
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
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

  // --- INVENTARIOS ---
  private mapInventario(r: UnidadInventario) {
    return {
      id: Number(r.id),
      descripcion: r.descripcion,
      cantidad: r.cantidad,
    };
  }

  private async assertUnidadExists(unidadId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
  }

  /** Busca por (id, unidad): un ítem de otra unidad responde 404. */
  private async findInventarioOrFail(unidadId: number, inventarioId: number) {
    await this.assertUnidadExists(unidadId);
    const row = await this.inventarioRepo.findOne({
      where: { id: String(inventarioId), unidadId: String(unidadId) },
    });
    if (!row) notFound(inventarioId);
    return row;
  }

  async listInventarios(unidadId: number) {
    await this.assertUnidadExists(unidadId);
    const rows = await this.inventarioRepo.find({
      where: { unidadId: String(unidadId) },
      order: { id: 'ASC' },
    });
    return rows.map((r) => this.mapInventario(r));
  }

  async getInventario(unidadId: number, inventarioId: number) {
    return this.mapInventario(
      await this.findInventarioOrFail(unidadId, inventarioId),
    );
  }

  async addInventario(unidadId: number, dto: UnidadInventarioDto) {
    await this.assertUnidadExists(unidadId);
    const saved = await this.inventarioRepo.save(
      this.inventarioRepo.create({
        unidadId: String(unidadId),
        descripcion: dto.descripcion.trim(),
        cantidad: dto.cantidad,
      }),
    );
    return this.mapInventario(saved);
  }

  async updateInventario(
    unidadId: number,
    inventarioId: number,
    dto: UnidadInventarioDto,
  ) {
    const row = await this.findInventarioOrFail(unidadId, inventarioId);
    row.descripcion = dto.descripcion.trim();
    row.cantidad = dto.cantidad;
    return this.mapInventario(await this.inventarioRepo.save(row));
  }

  async removeInventario(unidadId: number, inventarioId: number) {
    const row = await this.findInventarioOrFail(unidadId, inventarioId);
    await this.inventarioRepo.softRemove(row);
    return true;
  }

  // --- SIA (solo Carreras) ---
  private mapSia(r: UnidadSia) {
    const valores = Object.fromEntries(
      SIA_CAMPOS.map((campo) => [campo, r[campo] ?? null]),
    ) as Pick<UnidadSia, (typeof SIA_CAMPOS)[number]>;
    return { id: Number(r.id), ...valores };
  }

  /** Copia todas las columnas SIA del DTO; las omitidas quedan en null. */
  private assignSia(row: UnidadSia, dto: UnidadSiaDto) {
    for (const campo of SIA_CAMPOS) row[campo] = dto[campo] ?? null;
  }

  private assertSiaConValor(dto: UnidadSiaDto) {
    if (SIA_CAMPOS.every((campo) => dto[campo] == null)) {
      throwBusiness(ErrorCodes.SIA_FILA_VACIA);
    }
  }

  private async findSiaRows(unidadId: number | string) {
    const rows = await this.siaRepo.find({
      where: { unidadId: String(unidadId) },
      order: { id: 'ASC' },
    });
    return rows.map((r) => this.mapSia(r));
  }

  /** 404 si la unidad no existe; indica si su clase es Carrera. */
  private async unidadEsCarrera(unidadId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
      relations: ['tipoUnidad'],
    });
    if (!u) notFound(unidadId);
    return esClaseCarrera(u.tipoUnidad?.descripcion);
  }

  private async assertUnidadCarrera(unidadId: number) {
    if (!(await this.unidadEsCarrera(unidadId))) {
      throwBusiness(ErrorCodes.SIA_SOLO_CARRERA, unidadId);
    }
  }

  /** Busca por (id, unidad): una fila de otra unidad responde 404. */
  private async findSiaOrFail(unidadId: number, siaId: number) {
    const row = await this.siaRepo.findOne({
      where: { id: String(siaId), unidadId: String(unidadId) },
    });
    if (!row) notFound(siaId);
    return row;
  }

  /** En una unidad que no es Carrera devuelve `[]` (filas ocultas). */
  async listSia(unidadId: number) {
    if (!(await this.unidadEsCarrera(unidadId))) return [];
    return this.findSiaRows(unidadId);
  }

  async getSia(unidadId: number, siaId: number) {
    if (!(await this.unidadEsCarrera(unidadId))) notFound(siaId);
    return this.mapSia(await this.findSiaOrFail(unidadId, siaId));
  }

  async addSia(unidadId: number, dto: UnidadSiaDto) {
    await this.assertUnidadCarrera(unidadId);
    this.assertSiaConValor(dto);
    const row = this.siaRepo.create({ unidadId: String(unidadId) });
    this.assignSia(row, dto);
    return this.mapSia(await this.siaRepo.save(row));
  }

  async updateSia(unidadId: number, siaId: number, dto: UnidadSiaDto) {
    await this.assertUnidadCarrera(unidadId);
    this.assertSiaConValor(dto);
    const row = await this.findSiaOrFail(unidadId, siaId);
    this.assignSia(row, dto);
    return this.mapSia(await this.siaRepo.save(row));
  }

  async removeSia(unidadId: number, siaId: number) {
    await this.assertUnidadCarrera(unidadId);
    const row = await this.findSiaOrFail(unidadId, siaId);
    await this.siaRepo.softRemove(row);
    return true;
  }

  async findEntityForPdf(id: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(id) },
      relations: ['tipo', 'nivel', 'relacion', 'tipoUnidad', 'parent'],
    });
    if (!u) notFound(id);
    const detail = await this.mapDetail(u);
    if (!detail.relacionesInternas.length) return detail;

    const universo = await this.unidadRepo.find({
      relations: ['tipo', 'tipoUnidad'],
    });
    return {
      ...detail,
      relacionesInternas: resumirRelacionesInternas(
        detail.relacionesInternas,
        universo.map((x) => ({
          id: Number(x.id),
          claseId: x.tipoUnidadId != null ? Number(x.tipoUnidadId) : null,
          claseNombre: x.tipoUnidad?.descripcion ?? null,
          tipoId: x.tipoId != null ? Number(x.tipoId) : null,
          tipoNombre: x.tipo?.descripcion ?? null,
        })),
        id,
      ),
    };
  }

  async getDashboardStats(filters?: {
    clase?: string;
    nivel?: string;
    tipo?: string;
    relacion?: string;
  }) {
    const params: any[] = [];
    const filterClauses: string[] = [];

    if (filters?.clase) {
      params.push(filters.clase.trim());
      filterClauses.push(`tu_filter.descripcion = $${params.length}`);
    }
    if (filters?.nivel) {
      params.push(filters.nivel.trim());
      filterClauses.push(`cn_filter.descripcion = $${params.length}`);
    }
    if (filters?.tipo) {
      params.push(filters.tipo.trim());
      filterClauses.push(`ct_filter.descripcion = $${params.length}`);
    }
    if (filters?.relacion) {
      params.push(filters.relacion.trim());
      filterClauses.push(
        `(cr_filter.descripcion ILIKE $${params.length} OR cr_filter.codigo ILIKE $${params.length})`,
      );
    }

    const filterJoinSql = `
      LEFT JOIN tipo_unidad tu_filter ON u.tipo_unidad_id = tu_filter.id AND tu_filter.deleted_at IS NULL
      LEFT JOIN catalogo_nivel cn_filter ON u.nivel_id = cn_filter.id AND cn_filter.deleted_at IS NULL
      LEFT JOIN catalogo_tipo ct_filter ON u.tipo_id = ct_filter.id AND ct_filter.deleted_at IS NULL
      LEFT JOIN catalogo_relacion cr_filter ON u.relacion_id = cr_filter.id AND cr_filter.deleted_at IS NULL
    `;

    const whereBase = ['u.deleted_at IS NULL', ...filterClauses].join(' AND ');

    // 1. Resumen general
    const resumenSql = `
      SELECT
        COUNT(*)::int as total,
        COUNT(*) FILTER (WHERE u.oficial = true)::int as oficiales,
        COUNT(*) FILTER (WHERE u.oficial = false OR u.oficial IS NULL)::int as "noOficiales",
        COUNT(*) FILTER (WHERE UPPER(r.descripcion) LIKE '%STAFF%' OR UPPER(r.descripcion) LIKE '%ASESOR%')::int as staff
      FROM unidad u
      ${filterJoinSql}
      LEFT JOIN catalogo_relacion r ON u.relacion_id = r.id AND r.deleted_at IS NULL
      WHERE ${whereBase}
    `;
    const resumenRaw = await this.unidadRepo.query(resumenSql, params);

    // 2. Conteo por Clase / Tipo de Instancia
    const porClaseSql = `
      SELECT
        tu.id,
        tu.descripcion,
        tu.color,
        tu.peso,
        COUNT(u.id)::int as count
      FROM tipo_unidad tu
      LEFT JOIN unidad u ON u.tipo_unidad_id = tu.id AND u.deleted_at IS NULL
      ${filterClauses.length ? filterJoinSql : ''}
      WHERE tu.deleted_at IS NULL AND tu.activo = true
      ${filterClauses.length ? `AND (${filterClauses.join(' AND ')})` : ''}
      GROUP BY tu.id, tu.descripcion, tu.color, tu.peso
      ORDER BY tu.peso ASC, tu.descripcion ASC
    `;
    const porClase = await this.unidadRepo.query(porClaseSql, params);

    // 3. Conteo por Nivel Jerárquico
    const porNivelSql = `
      SELECT
        cn.id,
        cn.descripcion,
        COUNT(u.id)::int as count
      FROM catalogo_nivel cn
      LEFT JOIN unidad u ON u.nivel_id = cn.id AND u.deleted_at IS NULL
      ${filterClauses.length ? filterJoinSql : ''}
      WHERE cn.deleted_at IS NULL AND cn.activo = true
      ${filterClauses.length ? `AND (${filterClauses.join(' AND ')})` : ''}
      GROUP BY cn.id, cn.descripcion
      ORDER BY cn.id ASC
    `;
    const porNivel = await this.unidadRepo.query(porNivelSql, params);

    // 4. Conteo por Tipo de Unidad
    const porTipoSql = `
      SELECT
        ct.id,
        ct.descripcion,
        COUNT(u.id)::int as count
      FROM catalogo_tipo ct
      LEFT JOIN unidad u ON u.tipo_id = ct.id AND u.deleted_at IS NULL
      ${filterClauses.length ? filterJoinSql : ''}
      WHERE ct.deleted_at IS NULL AND ct.activo = true
      ${filterClauses.length ? `AND (${filterClauses.join(' AND ')})` : ''}
      GROUP BY ct.id, ct.descripcion
      ORDER BY ct.id ASC
    `;
    const porTipo = await this.unidadRepo.query(porTipoSql, params);

    // 5. Conteo por Tipo de Relación
    const porRelacionSql = `
      SELECT
        cr.id,
        cr.descripcion,
        COUNT(u.id)::int as count
      FROM catalogo_relacion cr
      LEFT JOIN unidad u ON u.relacion_id = cr.id AND u.deleted_at IS NULL
      ${filterClauses.length ? filterJoinSql : ''}
      WHERE cr.deleted_at IS NULL AND cr.activo = true
      ${filterClauses.length ? `AND (${filterClauses.join(' AND ')})` : ''}
      GROUP BY cr.id, cr.descripcion
      ORDER BY cr.id ASC
    `;
    const porRelacion = await this.unidadRepo.query(porRelacionSql, params);

    // 6. Recientes (últimas 6 según universo filtrado)
    const recientesSql = `
      SELECT
        u.id,
        u.codigo,
        u.nombre,
        u.sigla,
        COALESCE(tu.color, '#1976D2') as color,
        tu.descripcion as clase,
        u.fec_creacion::text as "fecCreacion",
        u.created_at as "createdAt"
      FROM unidad u
      LEFT JOIN tipo_unidad tu ON u.tipo_unidad_id = tu.id AND tu.deleted_at IS NULL
      ${filterClauses.length ? filterJoinSql : ''}
      WHERE ${whereBase}
      ORDER BY u.id DESC
      LIMIT 6
    `;
    const recientes = await this.unidadRepo.query(recientesSql, params);

    const resumen = resumenRaw[0] || {
      total: 0,
      oficiales: 0,
      noOficiales: 0,
      staff: 0,
    };

    return {
      resumen,
      porClase,
      porNivel,
      porTipo,
      porRelacion,
      recientes,
    };
  }

  async getDescendientesStats(unidadId: number) {
    const unidadMadre = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
      relations: ['tipoUnidad'],
    });
    if (!unidadMadre) notFound(unidadId);

    const arbol = await this.unidadRepo.query(
      `
      WITH RECURSIVE descendientes AS (
        SELECT
          u.id,
          u.codigo,
          u.nombre,
          u.sigla,
          u.parent_id,
          u.tipo_unidad_id,
          u.oficial,
          0 as level
        FROM unidad u
        WHERE u.id = $1 AND u.deleted_at IS NULL

        UNION ALL

        SELECT
          h.id,
          h.codigo,
          h.nombre,
          h.sigla,
          h.parent_id,
          h.tipo_unidad_id,
          h.oficial,
          d.level + 1
        FROM unidad h
        INNER JOIN descendientes d ON h.parent_id = d.id
        WHERE h.deleted_at IS NULL
      )
      SELECT
        d.id,
        d.codigo,
        d.nombre,
        d.sigla,
        d.parent_id as "parentId",
        d.oficial,
        d.level,
        COALESCE(tu.color, '#1976D2') as color,
        tu.descripcion as clase,
        tu.id as "claseId"
      FROM descendientes d
      LEFT JOIN tipo_unidad tu ON d.tipo_unidad_id = tu.id AND tu.deleted_at IS NULL
      ORDER BY d.level ASC, d.codigo ASC
    `,
      [String(unidadId)],
    );

    const conteoPorClase: Record<string, number> = {};
    let totalDependientes = 0;

    for (const item of arbol) {
      if (item.level > 0) {
        totalDependientes++;
        const claseNombre = item.clase || 'OTRA UNIDAD';
        conteoPorClase[claseNombre] = (conteoPorClase[claseNombre] || 0) + 1;
      }
    }

    return {
      unidad: {
        id: Number(unidadMadre.id),
        nombre: unidadMadre.nombre,
        codigo: unidadMadre.codigo,
        sigla: unidadMadre.sigla,
        clase: unidadMadre.tipoUnidad?.descripcion,
      },
      totalDependientes,
      conteoPorClase,
      arbol,
    };
  }

  async getConfig() {
    const row = await this.mofConfigRepo.findOne({ where: { id: 1 } });
    if (!row) {
      return { ...MOF_CONFIG_FALLBACK };
    }
    return {
      defaults: { ...MOF_CONFIG_FALLBACK.defaults, ...(row.defaults || {}) },
      reglas: { ...MOF_CONFIG_FALLBACK.reglas, ...(row.reglas || {}) },
      paleta:
        Array.isArray(row.paleta) && row.paleta.length > 0
          ? row.paleta
          : MOF_CONFIG_FALLBACK.paleta,
      passwordPolicy: {
        ...MOF_CONFIG_FALLBACK.passwordPolicy,
        ...(row.passwordPolicy || {}),
      },
    };
  }

  async getPasswordMinLength(): Promise<number> {
    const config = await this.getConfig();
    const min = Number(config.passwordPolicy?.minLength);
    return Number.isFinite(min) && min >= 6 ? min : 6;
  }

  async updateConfig(dto: UpdateMofConfigDto) {
    let row = await this.mofConfigRepo.findOne({ where: { id: 1 } });
    if (!row) {
      row = this.mofConfigRepo.create({
        id: 1,
        ...MOF_CONFIG_FALLBACK,
      });
    }

    if (dto.defaults) {
      row.defaults = { ...row.defaults, ...dto.defaults };
    }
    if (dto.reglas) {
      row.reglas = { ...row.reglas, ...dto.reglas };
    }
    if (dto.paleta) {
      for (const fila of dto.paleta) {
        if (!Array.isArray(fila) || fila.some((c) => typeof c !== 'string')) {
          throw new BusinessException(
            'La paleta debe ser una grilla de colores hexadecimales',
            HttpStatus.BAD_REQUEST,
          );
        }
      }
      row.paleta = dto.paleta;
    }
    if (dto.passwordPolicy) {
      row.passwordPolicy = {
        ...MOF_CONFIG_FALLBACK.passwordPolicy,
        ...row.passwordPolicy,
        ...dto.passwordPolicy,
      };
    }

    await this.mofConfigRepo.save(row);
    return this.getConfig();
  }
}
