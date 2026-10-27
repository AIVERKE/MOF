import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Proyecto } from './proyecto.entity';
import { Unidad } from './unidad.entity';

/** Unidades que participan en un proyecto. Los vínculos se borran físicamente. */
@Entity('proyecto_unidad')
@Index('IDX_proyecto_unidad_unidad', ['unidadId'])
export class ProyectoUnidad {
  @PrimaryColumn({
    name: 'proyecto_id',
    type: 'bigint',
    primaryKeyConstraintName: 'PK_proyecto_unidad',
  })
  proyectoId: string;

  @PrimaryColumn({
    name: 'unidad_id',
    type: 'bigint',
    primaryKeyConstraintName: 'PK_proyecto_unidad',
  })
  unidadId: string;

  @ManyToOne(() => Proyecto, (p) => p.unidades, { nullable: false })
  @JoinColumn({
    name: 'proyecto_id',
    foreignKeyConstraintName: 'FK_proyecto_unidad_proyecto',
  })
  proyecto: Proyecto;

  @ManyToOne(() => Unidad, (u) => u.proyectos, { nullable: false })
  @JoinColumn({
    name: 'unidad_id',
    foreignKeyConstraintName: 'FK_proyecto_unidad_unidad',
  })
  unidad: Unidad;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
