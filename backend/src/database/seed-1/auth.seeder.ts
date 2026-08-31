import * as bcrypt from 'bcryptjs';
import { DataSource } from 'typeorm';
import type { Seeder } from 'typeorm-extension';
import { Rol } from '../../modules/auth/entities/rol.entity';
import { Usuario } from '../../modules/auth/entities/usuario.entity';
import { UsuarioRol } from '../../modules/auth/entities/usuario-rol.entity';

const ADMIN_EMAIL = 'admin@admin.com';
const ADMIN_PASSWORD = 'admin123';

export default class AuthSeeder implements Seeder {
  public async run(dataSource: DataSource): Promise<void> {
    const rolRepo = dataSource.getRepository(Rol);
    const usuarioRepo = dataSource.getRepository(Usuario);
    const usuarioRolRepo = dataSource.getRepository(UsuarioRol);

    const adminRole = await rolRepo.findOne({ where: { codigo: 'ADMIN' } });
    if (!adminRole) {
      throw new Error(
        'Rol ADMIN no encontrado. Ejecute las migraciones antes del seed de auth.',
      );
    }

    let admin = await usuarioRepo.findOne({ where: { email: ADMIN_EMAIL } });
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

    if (!admin) {
      admin = await usuarioRepo.save(
        usuarioRepo.create({
          email: ADMIN_EMAIL,
          passwordHash,
          nombre: 'Administrador',
          enabled: true,
        }),
      );
      console.log(`Usuario admin creado: ${ADMIN_EMAIL}`);
    } else {
      admin.passwordHash = passwordHash;
      admin.nombre = admin.nombre ?? 'Administrador';
      admin.enabled = true;
      admin = await usuarioRepo.save(admin);
      console.log(`Usuario admin actualizado: ${ADMIN_EMAIL}`);
    }

    const existingLink = await usuarioRolRepo.findOne({
      where: { usuarioId: admin.id, rolId: adminRole.id },
    });

    if (!existingLink) {
      await usuarioRolRepo.save(
        usuarioRolRepo.create({
          usuarioId: admin.id,
          rolId: adminRole.id,
        }),
      );
      console.log('Rol ADMIN asignado al usuario admin');
    }
  }
}
