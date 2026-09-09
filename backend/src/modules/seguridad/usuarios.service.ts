import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { In, Repository } from 'typeorm';
import {
  BusinessException,
  notFound,
} from '../../common/exceptions/business.exception';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';
import { UsuarioRol } from '../auth/entities/usuario-rol.entity';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

export type UsuarioListItem = {
  id: string;
  email: string;
  nombre: string | null;
  enabled: boolean;
  roles: string[];
};

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepo: Repository<UsuarioRol>,
  ) {}

  private mapUsuario(user: Usuario): UsuarioListItem {
    const roles = (user.usuarioRoles ?? [])
      .map((ur) => ur.rol?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    return {
      id: String(user.id),
      email: user.email,
      nombre: user.nombre,
      enabled: user.enabled,
      roles,
    };
  }

  private async findUsuarioOrFail(id: string): Promise<Usuario> {
    const user = await this.usuarioRepo.findOne({
      where: { id },
      relations: ['usuarioRoles', 'usuarioRoles.rol'],
    });
    if (!user) {
      notFound(id);
    }
    return user;
  }

  private async resolveActiveRoles(codigos: string[]): Promise<Rol[]> {
    const unique = [...new Set(codigos)];
    const roles = await this.rolRepo.find({
      where: { codigo: In(unique), activo: true },
    });
    if (roles.length !== unique.length) {
      const found = new Set(roles.map((r) => r.codigo));
      const missing = unique.filter((c) => !found.has(c));
      throw new BusinessException(
        `Roles inválidos o inactivos: ${missing.join(', ')}`,
        HttpStatus.BAD_REQUEST,
      );
    }
    return roles;
  }

  private async assignRoles(usuarioId: string, roles: Rol[]): Promise<void> {
    await this.usuarioRolRepo.delete({ usuarioId });
    if (roles.length === 0) return;
    const rows = roles.map((rol) =>
      this.usuarioRolRepo.create({
        usuarioId,
        rolId: rol.id,
      }),
    );
    await this.usuarioRolRepo.save(rows);
  }

  async listar(): Promise<UsuarioListItem[]> {
    const users = await this.usuarioRepo.find({
      relations: ['usuarioRoles', 'usuarioRoles.rol'],
      order: { id: 'ASC' },
    });
    return users.map((u) => this.mapUsuario(u));
  }

  async crear(dto: CreateUsuarioDto): Promise<UsuarioListItem> {
    const existing = await this.usuarioRepo.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new BusinessException(
        `Ya existe un usuario con el email ${dto.email}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const roles = await this.resolveActiveRoles(dto.roles);
    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = this.usuarioRepo.create({
      email: dto.email,
      passwordHash,
      nombre: dto.nombre?.trim() || null,
      enabled: dto.enabled ?? true,
    });
    const saved = await this.usuarioRepo.save(user);
    await this.assignRoles(String(saved.id), roles);

    return this.mapUsuario(await this.findUsuarioOrFail(String(saved.id)));
  }

  async actualizar(
    id: string,
    dto: UpdateUsuarioDto,
  ): Promise<UsuarioListItem> {
    const user = await this.findUsuarioOrFail(id);

    if (dto.email != null && dto.email !== user.email) {
      const clash = await this.usuarioRepo.findOne({
        where: { email: dto.email },
      });
      if (clash && String(clash.id) !== String(id)) {
        throw new BusinessException(
          `Ya existe un usuario con el email ${dto.email}`,
          HttpStatus.BAD_REQUEST,
        );
      }
      user.email = dto.email;
    }

    if (dto.nombre !== undefined) {
      user.nombre = dto.nombre?.trim() || null;
    }

    if (dto.enabled !== undefined) {
      user.enabled = dto.enabled;
    }

    if (dto.password) {
      user.passwordHash = await bcrypt.hash(dto.password, 10);
    }

    await this.usuarioRepo.save(user);

    if (dto.roles) {
      const roles = await this.resolveActiveRoles(dto.roles);
      await this.assignRoles(String(user.id), roles);
    }

    return this.mapUsuario(await this.findUsuarioOrFail(String(user.id)));
  }

  async actualizarEstado(
    id: string,
    enabled: boolean,
  ): Promise<UsuarioListItem> {
    const user = await this.findUsuarioOrFail(id);
    user.enabled = enabled;
    await this.usuarioRepo.save(user);
    return this.mapUsuario(await this.findUsuarioOrFail(String(user.id)));
  }
}
