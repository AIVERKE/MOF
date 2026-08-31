import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cargo } from './entities/cargo.entity';
import { CargoUnidad } from './entities/cargo-unidad.entity';
import { AsignacionCargo } from './entities/asignacion-cargo.entity';
import { CargoJerarquiaHist } from './entities/cargo-jerarquia-hist.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CargoDto, CargoSetParentDto, SetCargoDto } from './dto/cargo.dto';
import {
  BusinessException,
  notFound,
} from '../../common/exceptions/business.exception';
import { RestMessages } from '../../common/constants/rest-messages';

@Injectable()
export class CargosService {
  constructor(
    @InjectRepository(Cargo)
    private readonly cargoRepo: Repository<Cargo>,
    @InjectRepository(CargoUnidad)
    private readonly cargoUnidadRepo: Repository<CargoUnidad>,
    @InjectRepository(AsignacionCargo)
    private readonly asignacionRepo: Repository<AsignacionCargo>,
    @InjectRepository(CargoJerarquiaHist)
    private readonly histRepo: Repository<CargoJerarquiaHist>,
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
  ) {}

  private mapCargo(c: Cargo) {
    return {
      id: Number(c.id),
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion ?? null,
      activo: c.activo,
      parentId: c.parentId != null ? Number(c.parentId) : null,
      parentNombre: c.parent
        ? (c.parent.nombre ?? c.parent.descripcion ?? null)
        : null,
    };
  }

  private normalizeDescripcion(value?: string | null): string | null {
    if (value == null) return null;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private async assertNoCycle(
    cargoId: number,
    parentId: number | null | undefined,
  ) {
    if (parentId == null) return;
    if (Number(parentId) === Number(cargoId)) {
      throw new BusinessException(
        'No se puede asignar el cargo como padre de sí mismo.',
        HttpStatus.BAD_REQUEST,
      );
    }
    let current: string | null = String(parentId);
    const seen = new Set<string>([String(cargoId)]);
    while (current) {
      if (seen.has(current)) {
        throw new BusinessException(
          'La asignación de padre generaría un ciclo en la jerarquía de cargos.',
          HttpStatus.BAD_REQUEST,
        );
      }
      seen.add(current);
      const node = await this.cargoRepo.findOne({ where: { id: current } });
      current = node?.parentId ?? null;
    }
  }

  private async assertParentExists(parentId: number) {
    const parent = await this.cargoRepo.findOne({
      where: { id: String(parentId) },
    });
    if (!parent) notFound(parentId);
    return parent;
  }

  /**
   * Bloquea soft delete / desactivación si hay hijos activos o vínculos.
   */
  private async assertCanDeactivateOrDelete(
    id: number,
    action: 'eliminar' | 'desactivar',
  ) {
    const idStr = String(id);

    const hijosActivos = await this.cargoRepo.count({
      where: { parentId: idStr, activo: true },
    });
    if (hijosActivos > 0) {
      throw new BusinessException(
        `No se puede ${action}: tiene ${hijosActivos} cargo(s) hijo(s) activo(s).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const unidadesVinculadas = await this.cargoUnidadRepo.count({
      where: { cargoId: idStr, activo: true },
    });
    if (unidadesVinculadas > 0) {
      throw new BusinessException(
        `No se puede ${action}: está asignado a ${unidadesVinculadas} unidad(es).`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const asignaciones = await this.asignacionRepo.count({
      where: { cargoId: idStr, activo: true },
    });
    if (asignaciones > 0) {
      throw new BusinessException(
        `No se puede ${action}: tiene ${asignaciones} asignación(es) de personal activa(s).`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async writeJerarquiaHist(
    cargoId: string,
    parentIdAnterior: string | null,
    parentIdNuevo: string | null,
    razon?: string | null,
  ) {
    const prev = parentIdAnterior ?? null;
    const next = parentIdNuevo ?? null;
    if (prev === next) return;
    await this.histRepo.save(
      this.histRepo.create({
        cargoId,
        parentIdAnterior: prev,
        parentIdNuevo: next,
        razon: razon ?? null,
      }),
    );
  }

  async list() {
    const rows = await this.cargoRepo.find({
      relations: ['parent'],
      order: { nombre: 'ASC' },
    });
    return rows.map((c) => this.mapCargo(c));
  }

  async findOne(id: number) {
    const c = await this.cargoRepo.findOne({
      where: { id: String(id) },
      relations: ['parent'],
    });
    if (!c) notFound(id);
    return this.mapCargo(c);
  }

  async create(dto: CargoDto) {
    let parentId: string | null = null;
    if (dto.parentId != null) {
      await this.assertParentExists(dto.parentId);
      parentId = String(dto.parentId);
    }

    const saved = await this.cargoRepo.save(
      this.cargoRepo.create({
        nombre: dto.nombre.trim(),
        descripcion: this.normalizeDescripcion(dto.descripcion),
        activo: dto.activo ?? true,
        unicoEnUnidad: false,
        parentId,
      }),
    );

    if (parentId != null) {
      await this.writeJerarquiaHist(saved.id, null, parentId);
    }

    const withParent = await this.cargoRepo.findOne({
      where: { id: saved.id },
      relations: ['parent'],
    });
    return this.mapCargo(withParent!);
  }

  async update(id: number, dto: CargoDto) {
    const c = await this.cargoRepo.findOne({ where: { id: String(id) } });
    if (!c) notFound(id);

    if (dto.activo === false && c.activo !== false) {
      await this.assertCanDeactivateOrDelete(id, 'desactivar');
    }

    c.nombre = dto.nombre.trim();
    c.descripcion = this.normalizeDescripcion(dto.descripcion);
    if (dto.activo !== undefined) c.activo = dto.activo;
    await this.cargoRepo.save(c);
    return id;
  }

  async remove(id: number) {
    const c = await this.cargoRepo.findOne({ where: { id: String(id) } });
    if (!c) notFound(id);
    await this.assertCanDeactivateOrDelete(id, 'eliminar');
    await this.cargoRepo.softRemove(c);
    return id;
  }

  async setParent(id: number, dto: CargoSetParentDto) {
    const c = await this.cargoRepo.findOne({ where: { id: String(id) } });
    if (!c) notFound(id);

    const newParentId =
      dto.parentId === null || dto.parentId === undefined
        ? null
        : Number(dto.parentId);

    if (newParentId != null) {
      await this.assertParentExists(newParentId);
    }
    await this.assertNoCycle(id, newParentId);

    const anterior = c.parentId;
    const nuevo = newParentId != null ? String(newParentId) : null;

    if ((anterior ?? null) === (nuevo ?? null)) {
      return id;
    }

    c.parentId = nuevo;
    await this.cargoRepo.save(c);
    await this.writeJerarquiaHist(String(id), anterior, nuevo, dto.razon);
    return id;
  }

  async personal(unidadId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
    const rows = await this.cargoUnidadRepo.find({
      where: { unidadId: String(unidadId), activo: true },
      relations: ['cargo'],
      order: { id: 'ASC' },
    });
    return rows.map((r) => ({
      id: Number(r.id),
      nombre: r.cargo?.nombre ?? '',
      descripcion: r.cargo?.descripcion ?? null,
      cargoId: Number(r.cargoId),
    }));
  }

  async asignar(unidadId: number, dto: SetCargoDto) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
    const cargo = await this.cargoRepo.findOne({
      where: { id: String(dto.cargoId) },
    });
    if (!cargo) notFound(dto.cargoId);

    if (cargo.unicoEnUnidad) {
      const exists = await this.cargoUnidadRepo.findOne({
        where: {
          unidadId: String(unidadId),
          cargoId: String(dto.cargoId),
          activo: true,
        },
      });
      if (exists) {
        throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
      }
    }

    await this.cargoUnidadRepo.save(
      this.cargoUnidadRepo.create({
        unidadId: String(unidadId),
        cargoId: String(dto.cargoId),
        activo: true,
      }),
    );
    return unidadId;
  }

  async removerAsignacion(unidadId: number, assignmentId: number) {
    const u = await this.unidadRepo.findOne({
      where: { id: String(unidadId) },
    });
    if (!u) notFound(unidadId);
    const row = await this.cargoUnidadRepo.findOne({
      where: { id: String(assignmentId), unidadId: String(unidadId) },
    });
    if (!row) notFound(assignmentId);
    await this.cargoUnidadRepo.softRemove(row);
    return assignmentId;
  }
}
