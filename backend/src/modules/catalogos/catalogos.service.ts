import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CatalogoTipo } from './entities/catalogo-tipo.entity';
import { CatalogoNivel } from './entities/catalogo-nivel.entity';
import { CatalogoRelacion } from './entities/catalogo-relacion.entity';
import { TipoUnidad } from './entities/tipo-unidad.entity';
import { CatalogoItemDto, ClaseDto } from './dto/catalogo.dto';
import { BusinessException, notFound } from '../../common/exceptions/business.exception';
import { RestMessages } from '../../common/constants/rest-messages';
import { HttpStatus } from '@nestjs/common';

type CatalogEntity = CatalogoTipo | CatalogoNivel | CatalogoRelacion;

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(CatalogoTipo)
    private readonly tipoRepo: Repository<CatalogoTipo>,
    @InjectRepository(CatalogoNivel)
    private readonly nivelRepo: Repository<CatalogoNivel>,
    @InjectRepository(CatalogoRelacion)
    private readonly relacionRepo: Repository<CatalogoRelacion>,
    @InjectRepository(TipoUnidad)
    private readonly claseRepo: Repository<TipoUnidad>,
  ) {}

  private mapItem(row: CatalogEntity) {
    return {
      id: row.id,
      codigo: row.codigo,
      descripcion: row.descripcion,
      activo: row.activo,
      value: row.codigo,
      description: row.descripcion,
    };
  }

  private mapClase(row: TipoUnidad) {
    return {
      id: row.id,
      codigo: row.codigo,
      descripcion: row.descripcion,
      peso: row.peso,
      color: row.color,
      activo: row.activo,
      oficial: row.activo,
    };
  }

  private nextCodigo(existing: { codigo: string }[]): string {
    const used = new Set(existing.map((e) => e.codigo.toUpperCase()));
    for (let i = 0; i < 26; i++) {
      const letter = String.fromCharCode(65 + i);
      if (!used.has(letter)) return letter;
    }
    return `X${Date.now() % 1000}`;
  }

  // ---- Tipos ----
  async listTipos() {
    const rows = await this.tipoRepo.find({ order: { id: 'ASC' } });
    return rows.map((r) => this.mapItem(r));
  }

  async createTipo(dto: CatalogoItemDto) {
    const all = await this.tipoRepo.find();
    const entity = this.tipoRepo.create({
      codigo: this.nextCodigo(all),
      descripcion: dto.descripcion,
      activo: dto.activo ?? true,
    });
    const saved = await this.tipoRepo.save(entity);
    return this.mapItem(saved);
  }

  async updateTipo(id: number, dto: CatalogoItemDto) {
    const row = await this.tipoRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    if (dto.descripcion !== undefined) row.descripcion = dto.descripcion;
    if (dto.activo !== undefined) row.activo = dto.activo;
    return this.mapItem(await this.tipoRepo.save(row));
  }

  async deleteTipo(id: number) {
    const row = await this.tipoRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    await this.tipoRepo.softRemove(row);
    return id;
  }

  // ---- Niveles ----
  async listNiveles() {
    const rows = await this.nivelRepo.find({ order: { id: 'ASC' } });
    return rows.map((r) => this.mapItem(r));
  }

  async createNivel(dto: CatalogoItemDto) {
    const all = await this.nivelRepo.find();
    const entity = this.nivelRepo.create({
      codigo: this.nextCodigo(all),
      descripcion: dto.descripcion,
      activo: dto.activo ?? true,
    });
    return this.mapItem(await this.nivelRepo.save(entity));
  }

  async updateNivel(id: number, dto: CatalogoItemDto) {
    const row = await this.nivelRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    if (dto.descripcion !== undefined) row.descripcion = dto.descripcion;
    if (dto.activo !== undefined) row.activo = dto.activo;
    return this.mapItem(await this.nivelRepo.save(row));
  }

  async deleteNivel(id: number) {
    const row = await this.nivelRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    await this.nivelRepo.softRemove(row);
    return id;
  }

  // ---- Relaciones ----
  async listRelaciones() {
    const rows = await this.relacionRepo.find({ order: { id: 'ASC' } });
    return rows.map((r) => this.mapItem(r));
  }

  async createRelacion(dto: CatalogoItemDto) {
    const all = await this.relacionRepo.find();
    const entity = this.relacionRepo.create({
      codigo: this.nextCodigo(all),
      descripcion: dto.descripcion,
      activo: dto.activo ?? true,
    });
    return this.mapItem(await this.relacionRepo.save(entity));
  }

  async updateRelacion(id: number, dto: CatalogoItemDto) {
    const row = await this.relacionRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    if (dto.descripcion !== undefined) row.descripcion = dto.descripcion;
    if (dto.activo !== undefined) row.activo = dto.activo;
    return this.mapItem(await this.relacionRepo.save(row));
  }

  async deleteRelacion(id: number) {
    const row = await this.relacionRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    await this.relacionRepo.softRemove(row);
    return id;
  }

  // ---- Clases (tipo_unidad) ----
  async listClases() {
    const rows = await this.claseRepo.find({ order: { peso: 'ASC', id: 'ASC' } });
    return rows.map((r) => this.mapClase(r));
  }

  async createClase(dto: ClaseDto) {
    const max = await this.claseRepo
      .createQueryBuilder('c')
      .select('MAX(c.peso)', 'max')
      .getRawOne<{ max: string | null }>();
    const nextPeso = (max?.max ? Number(max.max) : 0) + 1;
    const codigo = `C${Date.now() % 100000}`;
    const activo = dto.activo ?? dto.oficial ?? true;
    const entity = this.claseRepo.create({
      codigo,
      descripcion: dto.descripcion,
      color: dto.color ?? null,
      peso: nextPeso,
      activo,
    });
    return this.mapClase(await this.claseRepo.save(entity));
  }

  async updateClase(id: number, dto: ClaseDto) {
    const row = await this.claseRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    if (dto.descripcion !== undefined) row.descripcion = dto.descripcion;
    if (dto.color !== undefined) row.color = dto.color;
    if (dto.activo !== undefined) row.activo = dto.activo;
    else if (dto.oficial !== undefined) row.activo = dto.oficial;
    return this.mapClase(await this.claseRepo.save(row));
  }

  async deleteClase(id: number) {
    const row = await this.claseRepo.findOne({ where: { id } });
    if (!row) notFound(id);
    await this.claseRepo.softRemove(row);
    return id;
  }

  async subirClase(id: number) {
    const rows = await this.claseRepo.find({ order: { peso: 'ASC', id: 'ASC' } });
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) notFound(id);
    if (idx === 0) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }
    const current = rows[idx];
    const prev = rows[idx - 1];
    const tmp = current.peso;
    current.peso = prev.peso;
    prev.peso = tmp;
    await this.claseRepo.save([current, prev]);
    return id;
  }

  async bajarClase(id: number) {
    const rows = await this.claseRepo.find({ order: { peso: 'ASC', id: 'ASC' } });
    const idx = rows.findIndex((r) => r.id === id);
    if (idx < 0) notFound(id);
    if (idx === rows.length - 1) {
      throw new BusinessException(RestMessages.ERROR, HttpStatus.BAD_REQUEST);
    }
    const current = rows[idx];
    const next = rows[idx + 1];
    const tmp = current.peso;
    current.peso = next.peso;
    next.peso = tmp;
    await this.claseRepo.save([current, next]);
    return id;
  }
}
