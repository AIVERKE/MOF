import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { CatalogoTipo } from '../../catalogos/entities/catalogo-tipo.entity';
import { CatalogoNivel } from '../../catalogos/entities/catalogo-nivel.entity';
import { CatalogoRelacion } from '../../catalogos/entities/catalogo-relacion.entity';
import { TipoUnidad } from '../../catalogos/entities/tipo-unidad.entity';
import { Usuario } from '../../auth/entities/usuario.entity';
import { UnidadFuncion } from './unidad-funcion.entity';
import { UnidadRelacionExterna } from './unidad-relacion-externa.entity';
import { UnidadRelacionInterna } from './unidad-relacion-interna.entity';

@Entity('unidad')
export class Unidad extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 64, unique: true })
  codigo: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, unique: true })
  sigla: string;

  @Column({ type: 'varchar', length: 255 })
  nombre: string;

  @ManyToOne(() => Unidad, (unidad) => unidad.hijos, { nullable: true })
  @JoinColumn({ name: 'parent_id' })
  parent: Unidad | null;

  @Column({ name: 'parent_id', type: 'bigint', nullable: true })
  parentId: string | null;

  @OneToMany(() => Unidad, (unidad) => unidad.parent)
  hijos: Unidad[];

  @ManyToOne(() => TipoUnidad, { nullable: false })
  @JoinColumn({ name: 'tipo_unidad_id' })
  tipoUnidad: TipoUnidad;

  @Column({ name: 'tipo_unidad_id', type: 'smallint' })
  tipoUnidadId: number;

  @ManyToOne(() => CatalogoTipo, { nullable: false })
  @JoinColumn({ name: 'tipo_id' })
  tipo: CatalogoTipo;

  @Column({ name: 'tipo_id', type: 'smallint' })
  tipoId: number;

  @ManyToOne(() => CatalogoNivel, { nullable: false })
  @JoinColumn({ name: 'nivel_id' })
  nivel: CatalogoNivel;

  @Column({ name: 'nivel_id', type: 'smallint' })
  nivelId: number;

  @ManyToOne(() => CatalogoRelacion, { nullable: false })
  @JoinColumn({ name: 'relacion_id' })
  relacion: CatalogoRelacion;

  @Column({ name: 'relacion_id', type: 'smallint' })
  relacionId: number;

  @Column({ type: 'boolean', default: false })
  oficial: boolean;

  @Column({ type: 'text', nullable: true })
  objetivo: string | null;

  @Column({ name: 'base_legal', type: 'text', nullable: true })
  baseLegal: string | null;

  @Column({ name: 'res_creacion', type: 'varchar', length: 512, nullable: true })
  resCreacion: string | null;

  @Column({ name: 'fec_creacion', type: 'date', nullable: true })
  fecCreacion: Date | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'created_by' })
  createdByUser: Usuario | null;

  @Column({ name: 'created_by', type: 'bigint', nullable: true })
  createdBy: string | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'updated_by' })
  updatedByUser: Usuario | null;

  @Column({ name: 'updated_by', type: 'bigint', nullable: true })
  updatedBy: string | null;

  @OneToMany(() => UnidadFuncion, (funcion) => funcion.unidad)
  funciones: UnidadFuncion[];

  @OneToMany(() => UnidadRelacionExterna, (rel) => rel.unidad)
  relacionesExternas: UnidadRelacionExterna[];

  @OneToMany(() => UnidadRelacionInterna, (rel) => rel.unidad)
  relacionesInternas: UnidadRelacionInterna[];
}
