import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';

@Entity('persona')
export class Persona extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_persona' })
  idPersona: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 32, unique: true })
  ci: string;

  @Column({ type: 'varchar', length: 128 })
  nombre: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  paterno: string | null;

  @Column({ type: 'varchar', length: 128, nullable: true })
  materno: string | null;

  @Column({ name: 'fecha_nacimiento', type: 'date', nullable: true })
  fechaNacimiento: Date | null;

  @Column({ type: 'varchar', length: 1, nullable: true })
  genero: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  celular: string | null;

  @Index()
  @Column({ type: 'varchar', length: 255, nullable: true })
  email: string | null;

  @Column({ type: 'varchar', length: 512, nullable: true })
  direccion: string | null;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  foto: string | null;
}
