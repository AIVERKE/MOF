import { Repository } from 'typeorm';
import { Unidad } from './entities/unidad.entity';
import { UnidadFuncion } from './entities/unidad-funcion.entity';
import { UnidadDependenciaFuncional } from './entities/unidad-dependencia-funcional.entity';
import { UnidadJerarquiaHist } from './entities/unidad-jerarquia-hist.entity';
import { CatalogoTipo } from '../catalogos/entities/catalogo-tipo.entity';
import { CatalogoNivel } from '../catalogos/entities/catalogo-nivel.entity';
import { CatalogoRelacion } from '../catalogos/entities/catalogo-relacion.entity';
import { TipoUnidad } from '../catalogos/entities/tipo-unidad.entity';
import {
  DependenciaFuncionalDto,
  SetParentDto,
  UnidadDto,
  UnidadFuncionDto,
} from './dto/unidad.dto';
import {
  BusinessException,
  notFound,
} from '../../common/exceptions/business.exception';
import { RestMessages } from '../../common/constants/rest-messages';
import {
  ConflictException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
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
      const byId = await repo.findOne({ where: { id } as never });
      if (byId) return byId.id;
    }
    const code = String(value);
    const byCodigo = await repo.findOne({ where: { codigo: code } as never });
    if (byCodigo) return byCodigo.id;
    const byDesc = await repo.findOne({
      where: { descripcion: code } as never,
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

    return {
      id: Number(u.id),
      codigo: u.codigo,
      sigla: u.sigla,
      nombre: u.nombre,
      tipo: u.tipo?.descripcion ?? null,
      nivel: u.nivel?.descripcion ?? null,
      relacion: u.relacion?.codigo ?? null,
      resCreacion: u.resCreacion,
      baseLegal: u.baseLegal,
      fecCreacion: u.fecCreacion,
      objetivo: u.objetivo,
      parent: parent
        ? {
            id: Number(parent.id),
            codigo: parent.codigo,
            nombre: parent.nombre,
          }
        : null,
      oficial: u.oficial,
      tipoUnidad: u.tipoUnidadId,
      clase: u.tipoUnidad?.descripcion ?? null,
      peso: u.tipoUnidad?.peso ?? null,
      color: u.tipoUnidad?.color ?? null,
      funciones,
      dependenciasFuncionales: deps.map((d) => ({
        id: Number(d.dependenciaId),
        codigo: d.dependencia?.codigo,
        nombre: d.dependencia?.nombre,
      })),
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
    const clase = await this.claseRepo.findOne({
      where: { id: dto.tipoUnidad },
    });
    if (!clase) notFound(dto.tipoUnidad);

    const sigla = (dto.sigla ?? dto.codigo).slice(0, 32);
    const entity = this.unidadRepo.create({
      codigo: dto.codigo,
      sigla,
      nombre: dto.nombre,
      parentId: dto.parentId != null ? String(dto.parentId) : null,
      tipoId,
      nivelId,
      relacionId,
      tipoUnidadId: dto.tipoUnidad,
      oficial: dto.oficial ?? false,
      objetivo: dto.objetivo ?? null,
      baseLegal: dto.baseLegal ?? null,
      resCreacion: dto.resCreacion ?? null,
      fecCreacion: dto.fecCreacion ? new Date(dto.fecCreacion) : null,
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
    if (dto.objetivo !== undefined) u.objetivo = dto.objetivo;
    if (dto.baseLegal !== undefined) u.baseLegal = dto.baseLegal;
    if (dto.resCreacion !== undefined) u.resCreacion = dto.resCreacion;
    if (dto.fecCreacion !== undefined) {
      u.fecCreacion = dto.fecCreacion ? new Date(dto.fecCreacion) : null;
    }
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

  async deleteFuncion(unidadId: number, funcionId: number) {
    const f = await this.funcionRepo.findOne({
      where: { id: String(funcionId), unidadId: String(unidadId) },
    });
    if (!f) notFound(funcionId);
    await this.funcionRepo.softRemove(f);
    return null;
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
