import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cargo } from './entities/cargo.entity';
import { CargoUnidad } from './entities/cargo-unidad.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CargoDto, SetCargoDto } from './dto/cargo.dto';
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
    @InjectRepository(Unidad)
    private readonly unidadRepo: Repository<Unidad>,
  ) {}

  private mapCargo(c: Cargo) {
    return {
      id: Number(c.id),
      codigo: c.codigo,
      nombre: c.nombre,
      descripcion: c.descripcion ?? c.nombre,
      activo: c.activo,
    };
  }

  async list() {
    const rows = await this.cargoRepo.find({ order: { nombre: 'ASC' } });
    return rows.map((c) => this.mapCargo(c));
  }

  async findOne(id: number) {
    const c = await this.cargoRepo.findOne({ where: { id: String(id) } });
    if (!c) notFound(id);
    return this.mapCargo(c);
  }

  async create(dto: CargoDto) {
    const saved = await this.cargoRepo.save(
      this.cargoRepo.create({
        nombre: dto.descripcion,
        descripcion: dto.descripcion,
        activo: dto.activo ?? true,
        unicoEnUnidad: false,
      }),
    );
    return this.mapCargo(saved);
  }

  async update(id: number, dto: CargoDto) {
    const c = await this.cargoRepo.findOne({ where: { id: String(id) } });
    if (!c) notFound(id);
    c.nombre = dto.descripcion;
    c.descripcion = dto.descripcion;
    if (dto.activo !== undefined) c.activo = dto.activo;
    await this.cargoRepo.save(c);
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
      descripcion: r.cargo?.descripcion ?? r.cargo?.nombre ?? '',
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
