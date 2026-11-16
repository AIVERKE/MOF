import {
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Programa } from './programa.entity';
import { Unidad } from './unidad.entity';

/** Unidades que participan en un programa. Los vínculos se borran físicamente. */
@Entity('programa_unidad')
@Index('IDX_programa_unidad_unidad', ['unidadId'])
export class ProgramaUnidad {
  @PrimaryColumn({
    name: 'programa_id',
    type: 'bigint',
    primaryKeyConstraintName: 'PK_programa_unidad',
  })
  programaId: string;

  @PrimaryColumn({
    name: 'unidad_id',
    type: 'bigint',
    primaryKeyConstraintName: 'PK_programa_unidad',
  })
  unidadId: string;

  @ManyToOne(() => Programa, (p) => p.unidades, { nullable: false })
  @JoinColumn({
    name: 'programa_id',
    foreignKeyConstraintName: 'FK_programa_unidad_programa',
  })
  programa: Programa;

  @ManyToOne(() => Unidad, (u) => u.programas, { nullable: false })
  @JoinColumn({
    name: 'unidad_id',
    foreignKeyConstraintName: 'FK_programa_unidad_unidad',
  })
  unidad: Unidad;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
