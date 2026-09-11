import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Usuario } from '../../auth/entities/usuario.entity';

/**
 * Registro de auditoría y, a la vez, BANDEJA DE SALIDA hacia los sistemas que
 * siguen los cambios del organigrama (hoy, la Gaceta IA).
 *
 * Son la misma tabla a propósito: si la auditoría y la cola de envío fueran
 * dos sitios distintos, existiría el caso de un cambio auditado que nunca se
 * envía y el de un envío sin rastro. La fila se escribe DENTRO de la misma
 * transacción que el cambio de datos, así que no puede haber uno sin el otro.
 */
@Entity('auditoria_cambio')
export class AuditoriaCambio {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: string;

  @Index()
  @Column({ name: 'tabla_afectada', type: 'varchar', length: 128 })
  tablaAfectada: string;

  @Column({ name: 'id_registro_original', type: 'bigint', nullable: true })
  idRegistroOriginal: string | null;

  @Column({ type: 'varchar', length: 16 })
  accion: string;

  @Column({ name: 'datos_anteriores', type: 'jsonb', nullable: true })
  datosAnteriores: Record<string, unknown> | null;

  @Column({ name: 'datos_nuevos', type: 'jsonb', nullable: true })
  datosNuevos: Record<string, unknown> | null;

  @ManyToOne(() => Usuario, { nullable: true })
  @JoinColumn({ name: 'id_usuario' })
  usuario: Usuario | null;

  @Column({ name: 'id_usuario', type: 'bigint', nullable: true })
  idUsuario: string | null;

  /**
   * Unidad a la que hay que volver a mirar por culpa de este cambio. No
   * siempre es `idRegistroOriginal`: cuando cambia una FUNCIÓN, el registro
   * afectado es la función, pero lo que el consumidor tiene que releer es su
   * unidad. Nulo cuando el cambio no toca al organigrama.
   */
  @Index()
  @Column({ name: 'unidad_afectada_id', type: 'bigint', nullable: true })
  unidadAfectadaId: string | null;

  /** Cuándo se confirmó la entrega. Nulo = pendiente de enviar. */
  @Index()
  @Column({ name: 'enviado_at', type: 'timestamptz', nullable: true })
  enviadoAt: Date | null;

  /** Envíos fallidos. Manda el retardo del reintento (backoff). */
  @Column({ type: 'int', default: 0 })
  intentos: number;

  /**
   * Cuándo se intentó por última vez. El backoff se mide desde aquí, no desde
   * `createdAt`: si se midiera desde la creación, un evento viejo que lleva
   * horas fallando se reintentaría en cada barrido.
   */
  @Column({ name: 'ultimo_intento_at', type: 'timestamptz', nullable: true })
  ultimoIntentoAt: Date | null;

  @Column({
    name: 'ultimo_error',
    type: 'varchar',
    length: 512,
    nullable: true,
  })
  ultimoError: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;
}
