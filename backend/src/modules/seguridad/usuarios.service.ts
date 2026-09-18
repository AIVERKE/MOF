import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { ErrorCodes } from '../../common/errors';
import {
  BusinessException,
  notFound,
  throwBusiness,
} from '../../common/exceptions/business.exception';
import { Usuario } from '../auth/entities/usuario.entity';
import { Rol } from '../auth/entities/rol.entity';
import { UsuarioRol } from '../auth/entities/usuario-rol.entity';
import { Persona } from '../personas/entities/persona.entity';
import { AuditoriaService } from '../versiones/auditoria.service';
import { MofConfig } from '../unidades/entities/mof-config.entity';
import { resolvePasswordMinLength } from '../../common/password-policy.util';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

export type UsuarioListItem = {
  id: string;
  email: string;
  nombre: string | null;
  ci: string | null;
  nombres: string | null;
  apellidoPaterno: string | null;
  apellidoMaterno: string | null;
  enabled: boolean;
  debeCambiarPassword: boolean;
  roles: string[];
};

/** Nombre completo para mostrar, a partir de los datos de la persona. */
function nombreCompleto(
  nombres: string,
  paterno?: string | null,
  materno?: string | null,
): string {
  return [nombres, paterno, materno]
    .map((parte) => parte?.trim())
    .filter((parte): parte is string => Boolean(parte))
    .join(' ');
}

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepo: Repository<Usuario>,
    @InjectRepository(Rol)
    private readonly rolRepo: Repository<Rol>,
    @InjectRepository(UsuarioRol)
    private readonly usuarioRolRepo: Repository<UsuarioRol>,
    @InjectRepository(Persona)
    private readonly personaRepo: Repository<Persona>,
    @InjectRepository(MofConfig)
    private readonly mofConfigRepo: Repository<MofConfig>,
    private readonly dataSource: DataSource,
    private readonly auditoria: AuditoriaService,
  ) {}

  private mapUsuario(user: Usuario): UsuarioListItem {
    const roles = (user.usuarioRoles ?? [])
      .map((ur) => ur.rol?.codigo)
      .filter((codigo): codigo is string => Boolean(codigo));

    const persona = user.persona ?? null;

    return {
      id: String(user.id),
      email: user.email,
      nombre: user.nombre,
      ci: persona?.ci ?? null,
      nombres: persona?.nombre ?? null,
      apellidoPaterno: persona?.paterno ?? null,
      apellidoMaterno: persona?.materno ?? null,
      enabled: user.enabled,
      debeCambiarPassword: user.debeCambiarPassword,
      roles,
    };
  }

  private async findUsuarioOrFail(id: string): Promise<Usuario> {
    const user = await this.usuarioRepo.findOne({
      where: { id },
      relations: ['usuarioRoles', 'usuarioRoles.rol', 'persona'],
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

  private async assignRoles(
    usuarioId: string,
    roles: Rol[],
    manager?: EntityManager,
  ): Promise<void> {
    const repo = manager
      ? manager.getRepository(UsuarioRol)
      : this.usuarioRolRepo;
    await repo.delete({ usuarioId });
    if (roles.length === 0) return;
    const rows = roles.map((rol) =>
      repo.create({
        usuarioId,
        rolId: rol.id,
      }),
    );
    await repo.save(rows);
  }

  async listar(): Promise<UsuarioListItem[]> {
    const users = await this.usuarioRepo.find({
      relations: ['usuarioRoles', 'usuarioRoles.rol', 'persona'],
      order: { id: 'ASC' },
    });
    return users.map((u) => this.mapUsuario(u));
  }

  /**
   * Alta de usuario: crea la persona, la vincula y deja el rastro de quién lo
   * hizo. El usuario nace sin contraseña utilizable; la define en el primer
   * acceso identificándose con su C.I.
   */
  async crear(
    dto: CreateUsuarioDto,
    idUsuarioAdmin?: string | null,
  ): Promise<UsuarioListItem> {
    const ci = dto.ci.trim();

    const emailEnUso = await this.usuarioRepo.findOne({
      where: { email: dto.email },
    });
    if (emailEnUso) {
      throw new BusinessException(
        `Ya existe un usuario con el email ${dto.email}`,
        HttpStatus.BAD_REQUEST,
      );
    }

    const ciEnUso = await this.personaRepo.findOne({ where: { ci } });
    if (ciEnUso) {
      throwBusiness(
        ErrorCodes.USUARIO_CI_DUPLICADO,
        ci,
        `Ya existe una persona registrada con el C.I. ${ci}`,
      );
    }

    const roles = await this.resolveActiveRoles(dto.roles);

    // Nadie conoce este texto plano, así que el hash es inservible para entrar:
    // cubre el NOT NULL de password_hash hasta que el usuario defina la suya.
    const passwordHash = await bcrypt.hash(randomBytes(32).toString('hex'), 10);
    const enabled = dto.enabled ?? true;

    const usuarioId = await this.dataSource.transaction(async (manager) => {
      const persona = await manager.getRepository(Persona).save(
        manager.getRepository(Persona).create({
          ci,
          nombre: dto.nombres.trim(),
          paterno: dto.apellidoPaterno?.trim() || null,
          materno: dto.apellidoMaterno?.trim() || null,
          email: dto.email,
        }),
      );

      const usuarioRepo = manager.getRepository(Usuario);
      const saved = await usuarioRepo.save(
        usuarioRepo.create({
          email: dto.email,
          passwordHash,
          nombre: nombreCompleto(
            dto.nombres,
            dto.apellidoPaterno,
            dto.apellidoMaterno,
          ),
          idPersona: String(persona.idPersona),
          enabled,
          debeCambiarPassword: true,
        }),
      );

      await this.assignRoles(String(saved.id), roles, manager);

      await this.auditoria.registrarCambio(
        {
          tablaAfectada: 'usuario',
          accion: 'CREATE',
          idRegistroOriginal: String(saved.id),
          datosNuevos: {
            email: dto.email,
            ci,
            nombres: dto.nombres.trim(),
            apellidoPaterno: dto.apellidoPaterno?.trim() || null,
            apellidoMaterno: dto.apellidoMaterno?.trim() || null,
            roles: roles.map((r) => r.codigo),
            enabled,
          },
          idUsuario: idUsuarioAdmin ?? null,
        },
        manager,
      );

      return String(saved.id);
    });

    return this.mapUsuario(await this.findUsuarioOrFail(usuarioId));
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

    await this.actualizarPersona(user, dto);

    if (dto.enabled !== undefined) {
      user.enabled = dto.enabled;
    }

    if (dto.password) {
      const minLength = await resolvePasswordMinLength(this.mofConfigRepo);
      if (dto.password.length < minLength) {
        throw new BusinessException(
          `La contraseña debe tener al menos ${minLength} caracteres`,
          HttpStatus.BAD_REQUEST,
        );
      }
      user.passwordHash = await bcrypt.hash(dto.password, 10);
      // El admin le dio una contraseña conocida: ya no necesita el primer acceso.
      user.debeCambiarPassword = false;
    }

    await this.usuarioRepo.save(user);

    if (dto.roles) {
      const roles = await this.resolveActiveRoles(dto.roles);
      await this.assignRoles(String(user.id), roles);
    }

    return this.mapUsuario(await this.findUsuarioOrFail(String(user.id)));
  }

  /**
   * Sincroniza los datos de identidad. Los usuarios creados antes de este
   * flujo no tienen persona, así que se les crea en la primera edición que
   * traiga C.I. y nombres.
   */
  private async actualizarPersona(
    user: Usuario,
    dto: UpdateUsuarioDto,
  ): Promise<void> {
    const ci = dto.ci?.trim();
    const traeDatosDePersona =
      ci != null ||
      dto.nombres !== undefined ||
      dto.apellidoPaterno !== undefined ||
      dto.apellidoMaterno !== undefined;

    if (!traeDatosDePersona) return;

    if (ci) {
      const clash = await this.personaRepo.findOne({
        where: user.idPersona ? { ci, idPersona: Not(user.idPersona) } : { ci },
      });
      if (clash) {
        throwBusiness(
          ErrorCodes.USUARIO_CI_DUPLICADO,
          ci,
          `Ya existe una persona registrada con el C.I. ${ci}`,
        );
      }
    }

    let persona = user.persona ?? null;

    if (!persona) {
      if (!ci || !dto.nombres?.trim()) {
        throw new BusinessException(
          'Para completar los datos de identidad se requieren C.I. y nombres',
          HttpStatus.BAD_REQUEST,
        );
      }
      persona = this.personaRepo.create({
        ci,
        nombre: dto.nombres.trim(),
        paterno: dto.apellidoPaterno?.trim() || null,
        materno: dto.apellidoMaterno?.trim() || null,
        email: user.email,
      });
    } else {
      if (ci) persona.ci = ci;
      if (dto.nombres !== undefined) {
        persona.nombre = dto.nombres.trim();
      }
      if (dto.apellidoPaterno !== undefined) {
        persona.paterno = dto.apellidoPaterno?.trim() || null;
      }
      if (dto.apellidoMaterno !== undefined) {
        persona.materno = dto.apellidoMaterno?.trim() || null;
      }
    }

    const guardada = await this.personaRepo.save(persona);
    user.persona = guardada;
    user.idPersona = String(guardada.idPersona);
    user.nombre = nombreCompleto(
      guardada.nombre,
      guardada.paterno,
      guardada.materno,
    );
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
