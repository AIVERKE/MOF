import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { AuditableEntity } from '../../../common/entities/auditable.entity';
import { Persona } from '../../personas/entities/persona.entity';
import { UsuarioRol } from './usuario-rol.entity';

@Entity('usuario')
export class Usuario extends AuditableEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @ManyToOne(() => Persona, { nullable: true })
  @JoinColumn({ name: 'id_persona' })
  persona: Persona | null;

  @Column({ name: 'id_persona', type: 'bigint', nullable: true })
  idPersona: string | null;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ name: 'password_hash', type: 'varchar', length: 255 })
  passwordHash: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  nombre: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  denomination: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  address: string | null;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @OneToMany(() => UsuarioRol, (usuarioRol) => usuarioRol.usuario)
  usuarioRoles: UsuarioRol[];
}
