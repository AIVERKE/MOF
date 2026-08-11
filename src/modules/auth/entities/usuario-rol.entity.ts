import {
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from './rol.entity';

@Entity('usuario_rol')
export class UsuarioRol {
  @PrimaryColumn({ name: 'usuario_id', type: 'bigint' })
  usuarioId: string;

  @PrimaryColumn({ name: 'rol_id', type: 'smallint' })
  rolId: number;

  @ManyToOne(() => Usuario, (usuario) => usuario.usuarioRoles, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'usuario_id' })
  usuario: Usuario;

  @ManyToOne(() => Rol, (rol) => rol.usuarioRoles, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'rol_id' })
  rol: Rol;

  @CreateDateColumn({ name: 'assigned_at', type: 'timestamptz' })
  assignedAt: Date;
}
