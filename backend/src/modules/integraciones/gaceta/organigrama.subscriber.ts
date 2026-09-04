import { Injectable, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  DataSource,
  EntitySubscriberInterface,
  InsertEvent,
  RemoveEvent,
  SoftRemoveEvent,
  UpdateEvent,
} from 'typeorm';
import { AuditoriaService } from '../../versiones/auditoria.service';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { UnidadFuncion } from '../../unidades/entities/unidad-funcion.entity';
import { GacetaSyncService } from './gaceta-sync.service';

/** Los dos ids que interesan de una entidad del organigrama. */
interface ClaveEntidad {
  id?: string | number | null;
  unidadId?: string | number | null;
}

/**
 * Capta los cambios del organigrama sin que ningún servicio tenga que
 * acordarse de avisar.
 *
 * POR QUÉ UN SUBSCRIBER Y NO UNA LLAMADA EN CADA MÉTODO
 * UnidadesService guarda desde varios sitios (create, update, setParent, las
 * funciones, las dependencias...). Poner un aviso en cada uno funciona hasta
 * que alguien añade el siguiente método y se olvida — y ese olvido no falla:
 * simplemente deja a la Gaceta desactualizada en silencio. Enganchado a la
 * capa de persistencia, cualquier forma de guardar queda cubierta.
 *
 * QUÉ UNIDAD SE ANOTA
 * Lo que el consumidor tiene que releer no siempre es el registro que cambió:
 * si se edita una FUNCIÓN, el registro es la función pero la ficha que hay que
 * rehacer es la de su unidad. Por eso `unidadAfectadaId` se calcula aquí.
 *
 * Los cambios de catálogos (tipos, niveles) no se propagan: no alteran el
 * texto de ninguna ficha por sí solos, y la reconciliación periódica los
 * recoge cuando alguna unidad los usa.
 */
@Injectable()
export class OrganigramaSubscriber implements EntitySubscriberInterface {
  private readonly log = new Logger(OrganigramaSubscriber.name);

  constructor(
    @InjectDataSource() dataSource: DataSource,
    private readonly auditoria: AuditoriaService,
    private readonly sync: GacetaSyncService,
  ) {
    dataSource.subscribers.push(this);
  }

  // Sin listenTo(): escucha todas las entidades y filtra abajo, porque hay que
  // seguir dos (Unidad y UnidadFuncion) y listenTo solo admite una. El filtro
  // es también lo que evita el bucle: los cambios de la propia tabla de
  // auditoría no vuelven a auditarse.
  //
  // La entidad se identifica por los METADATOS del evento, no con `instanceof`:
  // TypeORM entrega en `event.entity` lo que le hayan pasado, y un
  // `repo.update(id, {...})` o un `save()` sobre un objeto literal llegan como
  // objeto plano, no como instancia. Con instanceof ese cambio no generaba
  // evento — y no fallaba: dejaba la Gaceta desactualizada en silencio, que es
  // justo lo que este subscriber existe para evitar.
  private objetivoDe(event: {
    metadata?: { target?: unknown };
  }): 'unidad' | 'unidad_funcion' | null {
    const target = event.metadata?.target;
    if (target === Unidad) return 'unidad';
    if (target === UnidadFuncion) return 'unidad_funcion';
    return null;
  }

  private unidadDe(entidad: unknown, tabla: string): string | null {
    const e = (entidad ?? {}) as ClaveEntidad;
    const valor = tabla === 'unidad_funcion' ? e.unidadId : e.id;
    // Las columnas bigint llegan como string desde Postgres y como number si
    // el objeto lo armo el propio codigo; cualquier otra cosa no es un id.
    if (typeof valor === 'string') return valor || null;
    if (typeof valor === 'number') return String(valor);
    return null;
  }

  private async anotar(
    entidad: unknown,
    accion: string,
    event: {
      manager: InsertEvent<unknown>['manager'];
      metadata?: { target?: unknown };
    },
    anteriores?: unknown,
  ): Promise<void> {
    const tabla = this.objetivoDe(event);
    if (!tabla) return;
    // El id puede venir en la entidad o, en un update parcial, solo en la fila
    // que TypeORM leyo antes de escribir.
    const unidadId =
      this.unidadDe(entidad, tabla) ?? this.unidadDe(anteriores, tabla);
    if (!unidadId) return;
    try {
      await this.auditoria.registrarCambio(
        {
          tablaAfectada: tabla,
          idRegistroOriginal:
            (entidad as ClaveEntidad)?.id ??
            (anteriores as ClaveEntidad)?.id ??
            null,
          accion,
          datosAnteriores: anteriores ?? null,
          datosNuevos: entidad,
          unidadAfectadaId: unidadId,
        },
        // Mismo manager = misma transacción: el evento se confirma con el
        // cambio o no se confirma ninguno de los dos.
        event.manager,
      );
    } catch (e: unknown) {
      // Auditar no puede tumbar la operación del usuario. Si esto falla, el
      // cambio se guarda igual y lo recupera la reconciliación.
      this.log.error(
        `no se pudo anotar el cambio de la unidad ${unidadId}: ${
          e instanceof Error ? e.message : String(e)
        }`,
      );
    }
  }

  async afterInsert(event: InsertEvent<unknown>): Promise<void> {
    await this.anotar(event.entity, 'CREATE', event);
  }

  async afterUpdate(event: UpdateEvent<unknown>): Promise<void> {
    await this.anotar(event.entity, 'UPDATE', event, event.databaseEntity);
  }

  async afterSoftRemove(event: SoftRemoveEvent<unknown>): Promise<void> {
    // Baja lógica (deleted_at): para la Gaceta la unidad deja de existir.
    await this.anotar(event.entity, 'DELETE', event, event.databaseEntity);
  }

  async afterRemove(event: RemoveEvent<unknown>): Promise<void> {
    await this.anotar(
      event.entity ?? event.databaseEntity,
      'DELETE',
      event,
      event.databaseEntity,
    );
  }

  /**
   * El cambio ya está confirmado: se puede entregar. El barrido periódico de
   * GacetaSyncService lo recogería igual dentro de unos segundos; este empujón
   * es lo que hace que en la práctica llegue en menos de uno.
   */
  afterTransactionCommit(): void {
    this.sync.empujar();
  }
}
