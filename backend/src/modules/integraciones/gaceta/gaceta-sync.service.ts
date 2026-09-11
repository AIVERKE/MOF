import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import axios, { AxiosError } from 'axios';
import { AuditoriaService } from '../../versiones/auditoria.service';
import { AuditoriaCambio } from '../../versiones/entities/auditoria-cambio.entity';

/**
 * Entrega a la Gaceta IA los cambios del organigrama, casi en el momento.
 *
 * QUÉ SE MANDA Y QUÉ NO
 * Se manda el ID de la unidad, no sus datos. La Gaceta vuelve a MOF a leer el
 * estado actual. Parece un viaje de más y es justo lo contrario: si el evento
 * llevara los datos, dos cambios seguidos que se crucen en la red dejarían
 * indexada la versión vieja, porque ganaría el que llegue último y no el que
 * ocurrió último. Con el ID, gana siempre lo que MOF dice AHORA.
 *
 * POR QUÉ HAY UNA BANDEJA DE SALIDA Y NO UN POST DIRECTO
 * Un POST desde el servicio que guarda es el diseño obvio y se rompe el primer
 * día: si la Gaceta está apagada, reiniciándose o el enlace se cae, ese cambio
 * se pierde sin que nadie se entere y las dos bases quedan distintas para
 * siempre. Aquí el evento se escribe en `auditoria_cambio` DENTRO de la misma
 * transacción que el cambio de datos, y este servicio lo va vaciando. Mientras
 * no haya confirmación, el evento sigue pendiente.
 *
 * IDEMPOTENCIA
 * Cada envío lleva un `evento_id` estable (el id de la fila de auditoría). Si
 * la respuesta se pierde y se reintenta uno ya aplicado, la Gaceta lo reconoce
 * y no lo vuelve a aplicar. Por eso reintentar es seguro.
 *
 * SIN CONFIGURAR NO HACE NADA
 * Sin GACETA_URL, el servicio queda inactivo: MOF sigue funcionando igual y
 * los eventos se acumulan en la tabla, listos para cuando se configure.
 */
@Injectable()
export class GacetaSyncService {
  private readonly log = new Logger(GacetaSyncService.name);
  private readonly url: string;
  private readonly token: string;
  private readonly timeout: number;
  private readonly maxIntentos: number;
  private vaciando = false;

  constructor(
    private readonly config: ConfigService,
    private readonly auditoria: AuditoriaService,
  ) {
    this.url = (this.config.get<string>('GACETA_URL') ?? '').replace(
      /\/+$/,
      '',
    );
    this.token = this.config.get<string>('GACETA_ADMIN_TOKEN') ?? '';
    this.timeout = Number(this.config.get('GACETA_TIMEOUT_MS') ?? 8000);
    this.maxIntentos = Number(this.config.get('GACETA_MAX_INTENTOS') ?? 10);
  }

  get activo(): boolean {
    return this.url.length > 0;
  }

  /**
   * Barrido periódico: es la RED DE SEGURIDAD, no el camino normal.
   *
   * El camino normal es el empujón del subscriber justo después del commit,
   * que hace que el cambio llegue en menos de un segundo. Este intervalo
   * recoge lo que ese empujón no pudo entregar (la Gaceta estaba caída, MOF se
   * reinició a medias) y lo que se guardó fuera de una transacción, donde no
   * hay commit al que engancharse.
   */
  @Interval(5000)
  async barrido(): Promise<void> {
    await this.vaciar();
  }

  /** Empujón inmediato tras confirmar una transacción. No lanza nunca. */
  empujar(): void {
    void this.vaciar().catch((e: unknown) => {
      this.log.warn(`no se pudo vaciar la bandeja: ${mensaje(e)}`);
    });
  }

  async vaciar(): Promise<number> {
    if (!this.activo || this.vaciando) return 0;
    this.vaciando = true;
    let entregados = 0;
    try {
      const pendientes = await this.auditoria.pendientesDeEnviar();
      for (const evento of pendientes) {
        if (!this.toca(evento)) continue;
        const desenlace = await this.enviar(evento);
        if (desenlace === 'entregado') entregados++;
        // 'descartado' = la Gaceta lo rechazo por algo que no va a cambiar;
        // se sigue con los demas. 'reintentar' = no responde: cortar aqui,
        // insistir con los otros 49 solo gasta tiempo y llena el log.
        if (desenlace === 'reintentar') break;
      }
    } catch (e: unknown) {
      this.log.warn(`barrido interrumpido: ${mensaje(e)}`);
    } finally {
      this.vaciando = false;
    }
    return entregados;
  }

  /**
   * Backoff: tras un fallo se espera 2^intentos segundos (hasta 5 min) antes
   * de volver a intentarlo. Sin esto, una Gaceta caída se llevaría un intento
   * cada 5 segundos por cada evento pendiente.
   */
  private toca(evento: AuditoriaCambio): boolean {
    if (evento.intentos >= this.maxIntentos) return false;
    if (evento.intentos === 0) return true;
    const esperaMs = Math.min(2 ** evento.intentos * 1000, 300_000);
    const ultimo = evento.ultimoIntentoAt ?? evento.createdAt;
    return Date.now() - new Date(ultimo).getTime() >= esperaMs;
  }

  private async enviar(evento: AuditoriaCambio): Promise<Desenlace> {
    const cuerpo = {
      evento_id: `mof-${evento.id}`,
      accion: evento.accion === 'DELETE' ? 'delete' : 'upsert',
      unidad_id: Number(evento.unidadAfectadaId),
      origen: evento.tablaAfectada,
      ts: evento.createdAt,
    };
    try {
      await axios.post(`${this.url}/api/ingesta/mof`, cuerpo, {
        timeout: this.timeout,
        headers: this.token ? { 'X-Admin-Token': this.token } : {},
      });
      await this.auditoria.marcarEnviado(evento.id);
      return 'entregado';
    } catch (e: unknown) {
      const err = e as AxiosError;
      const estado = err.response?.status;
      // 4xx que no sea 429 es un evento que esta Gaceta nunca va a aceptar
      // (mal formado, endpoint desactivado): reintentarlo eternamente solo
      // taparía la cola. Se cuenta el intento y se sigue con el resto.
      const definitivo =
        !!estado && estado >= 400 && estado < 500 && estado !== 429;
      await this.auditoria.marcarFallido(
        evento.id,
        definitivo ? this.maxIntentos : evento.intentos,
        `${estado ?? 'sin respuesta'}: ${mensaje(e)}`,
      );
      if (definitivo) {
        this.log.warn(
          `evento ${evento.id} descartado por la Gaceta (${estado}); ` +
            `lo recogera la reconciliacion`,
        );
        return 'descartado';
      }
      this.log.warn(
        `evento ${evento.id} no entregado (${estado ?? 'sin respuesta'})`,
      );
      return 'reintentar';
    }
  }
}

/**
 * Que hacer con la cola despues de un envio.
 *  entregado  : la Gaceta lo confirmo.
 *  descartado : lo rechazo por algo que no va a cambiar solo (4xx que no es
 *               429); se sigue con los demas para que no tape la cola.
 *  reintentar : no respondio; el resto de la cola tampoco va a pasar ahora.
 */
type Desenlace = 'entregado' | 'descartado' | 'reintentar';

function mensaje(e: unknown): string {
  if (e instanceof Error) return e.message;
  return String(e);
}
