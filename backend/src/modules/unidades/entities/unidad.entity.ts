import {
  Check,
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  type ValueTransformer,
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
import { UnidadInventario } from './unidad-inventario.entity';
import { UnidadSia } from './unidad-sia.entity';
import { ProyectoUnidad } from './proyecto-unidad.entity';

/** El driver de pg devuelve `numeric` como string. */
const numericTransformer: ValueTransformer = {
  to: (value?: number | null) => value,
  from: (value?: string | null) => (value == null ? null : Number(value)),
};

@Entity('unidad')
@Index('IDX_unidad_codigo_activo', ['codigo'], {
  unique: true,
  where: '"deleted_at" IS NULL',
})
@Check(
  'CHK_unidad_planificacion_estrategica_valor',
  '"planificacion_estrategica_valor" IS NULL OR ("planificacion_estrategica_valor" >= 0 AND "planificacion_estrategica_valor" <= 100)',
)
@Check('CHK_unidad_vistas_count', '"vistas_count" >= 0')
@Check('CHK_unidad_descargas_count', '"descargas_count" >= 0')
@Check('CHK_unidad_color', `"color" IS NULL OR "color" ~ '^#[0-9A-F]{6}$'`)
export class Unidad extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Column({ type: 'varchar', length: 64 })
  codigo: string;

  @Index()
  @Column({ type: 'varchar', length: 32 })
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

  @Column({ name: 'es_troncal', type: 'boolean', default: false })
  esTroncal: boolean;

  @Column({ name: 'es_sub_troncal', type: 'boolean', default: false })
  esSubTroncal: boolean;

  @Column({ name: 'lado', type: 'varchar', length: 20, default: 'AUTOMATICO' })
  lado: string;

  /** Color propio en el organigrama (`#RRGGBB`). `null` hereda el de la Clase. */
  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string | null;

  @Column({ type: 'text', nullable: true })
  objetivo: string | null;

  @Column({ name: 'base_legal', type: 'text', nullable: true })
  baseLegal: string | null;

  @Column({
    name: 'res_creacion',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  resCreacion: string | null;

  @Column({ name: 'fec_creacion', type: 'date', nullable: true })
  fecCreacion: string | null;

  @Column({ name: 'tramites_atendidos', type: 'text', nullable: true })
  tramitesAtendidos: string | null;

  @Column({ name: 'ejecucion_poa', type: 'text', nullable: true })
  ejecucionPoa: string | null;

  @Column({ name: 'ejecucion_presupuestaria', type: 'text', nullable: true })
  ejecucionPresupuestaria: string | null;

  @Column({ name: 'carga_horaria_programada', type: 'text', nullable: true })
  cargaHorariaProgramada: string | null;

  @Column({ name: 'carga_horaria_ejecutada', type: 'text', nullable: true })
  cargaHorariaEjecutada: string | null;

  @Column({ name: 'infraestructura', type: 'text', nullable: true })
  infraestructura: string | null;

  @Column({ name: 'ubicacion', type: 'text', nullable: true })
  ubicacion: string | null;

  /** Switch del bloque: con `false` el valor y el texto se conservan pero no se exponen. */
  @Column({
    name: 'planificacion_estrategica_aplica',
    type: 'boolean',
    default: false,
  })
  planificacionEstrategicaAplica: boolean;

  /** Porcentaje 0–100 de la planificación estratégica. */
  @Column({
    name: 'planificacion_estrategica_valor',
    type: 'numeric',
    precision: 5,
    scale: 2,
    nullable: true,
    transformer: numericTransformer,
  })
  planificacionEstrategicaValor: number | null;

  @Column({ name: 'planificacion_estrategica', type: 'text', nullable: true })
  planificacionEstrategica: string | null;

  /**
   * Contadores de uso. Solo los modifica el UPDATE atómico de
   * `UnidadesService.incrementarContador`: con `insert`/`update` en `false`, un
   * `save()` de la unidad no los escribe ni pisa un incremento concurrente.
   */
  @Column({
    name: 'vistas_count',
    type: 'int',
    default: 0,
    insert: false,
    update: false,
  })
  vistasCount: number;

  @Column({
    name: 'descargas_count',
    type: 'int',
    default: 0,
    insert: false,
    update: false,
  })
  descargasCount: number;

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

  @OneToMany(() => UnidadInventario, (inv) => inv.unidad)
  inventarios: UnidadInventario[];

  @OneToMany(() => UnidadSia, (sia) => sia.unidad)
  sia: UnidadSia[];

  @OneToMany(() => ProyectoUnidad, (pu) => pu.unidad)
  proyectos: ProyectoUnidad[];
}
