import { DataSource } from 'typeorm';
import { AuditoriaService } from '../../versiones/auditoria.service';
import { Unidad } from '../../unidades/entities/unidad.entity';
import { UnidadFuncion } from '../../unidades/entities/unidad-funcion.entity';
import { GacetaSyncService } from './gaceta-sync.service';
import { OrganigramaSubscriber } from './organigrama.subscriber';
import { CatalogoTipo } from '../../catalogos/entities/catalogo-tipo.entity';

/**
 * Lo que se protege aqui es lo que NO falla ruidosamente: un cambio que no
 * genera evento no rompe nada en MOF, solo deja la Gaceta desactualizada en
 * silencio hasta que alguien nota que la respuesta esta mal.
 */
describe('OrganigramaSubscriber', () => {
  let auditoria: { registrarCambio: jest.Mock };
  let sync: { empujar: jest.Mock };
  let subscriber: OrganigramaSubscriber;
  let dataSource: DataSource;

  const manager = {} as never;

  function evento(target: unknown, entity: unknown, databaseEntity?: unknown) {
    return { manager, metadata: { target }, entity, databaseEntity } as never;
  }

  beforeEach(() => {
    auditoria = { registrarCambio: jest.fn().mockResolvedValue({}) };
    sync = { empujar: jest.fn() };
    dataSource = { subscribers: [] } as unknown as DataSource;
    subscriber = new OrganigramaSubscriber(
      dataSource,
      auditoria as unknown as AuditoriaService,
      sync as unknown as GacetaSyncService,
    );
  });

  it('se registra solo en el DataSource', () => {
    expect(dataSource.subscribers).toContain(subscriber);
  });

  it('anota el alta de una unidad', async () => {
    await subscriber.afterInsert(evento(Unidad, { id: '12', nombre: 'IIQ' }));

    expect(auditoria.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({
        tablaAfectada: 'unidad',
        accion: 'CREATE',
        unidadAfectadaId: '12',
      }),
      manager,
    );
  });

  it('un cambio en una FUNCION apunta a su unidad, no a la funcion', async () => {
    // Lo que hay que releer no es el registro que cambio: la ficha que se
    // rehace es la de la unidad a la que pertenece esa funcion.
    await subscriber.afterUpdate(
      evento(UnidadFuncion, { id: '55', unidadId: '12' }),
    );

    const [cambio] = auditoria.registrarCambio.mock.calls[0] as [
      Record<string, unknown>,
    ];
    expect(cambio.tablaAfectada).toBe('unidad_funcion');
    expect(cambio.idRegistroOriginal).toBe('55');
    expect(cambio.unidadAfectadaId).toBe('12');
  });

  it('capta un objeto plano, no solo una instancia de la entidad', async () => {
    // TypeORM entrega en event.entity lo que le hayan pasado: un
    // repo.update(id, {...}) o un save() sobre un literal llegan como objeto
    // plano. Identificar la entidad con `instanceof` perdia esos cambios sin
    // avisar; por eso se mira event.metadata.target.
    await subscriber.afterUpdate(evento(Unidad, { id: 12, nombre: 'X' }));

    expect(auditoria.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({ unidadAfectadaId: '12' }),
      manager,
    );
  });

  it('saca el id de la fila previa cuando el update no lo trae', async () => {
    await subscriber.afterUpdate(
      evento(Unidad, { nombre: 'solo el nombre' }, { id: '12' }),
    );

    expect(auditoria.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({ unidadAfectadaId: '12' }),
      manager,
    );
  });

  it('la baja logica se propaga como DELETE', async () => {
    await subscriber.afterSoftRemove(evento(Unidad, { id: '12' }));

    expect(auditoria.registrarCambio).toHaveBeenCalledWith(
      expect.objectContaining({ accion: 'DELETE' }),
      manager,
    );
  });

  it('ignora las entidades que no son del organigrama', async () => {
    // Sin este filtro, escribir en la tabla de auditoria generaria otro evento
    // de auditoria: un bucle.
    await subscriber.afterInsert(evento(CatalogoTipo, { id: 1 }));

    expect(auditoria.registrarCambio).not.toHaveBeenCalled();
  });

  it('sin id no se anota nada a medias', async () => {
    await subscriber.afterInsert(evento(Unidad, {}));
    expect(auditoria.registrarCambio).not.toHaveBeenCalled();
  });

  it('un fallo al auditar no tumba la operacion del usuario', async () => {
    // Guardar la unidad tiene que seguir funcionando aunque la auditoria falle;
    // ese cambio lo recupera despues la reconciliacion.
    auditoria.registrarCambio.mockRejectedValue(new Error('sin conexion'));

    await expect(
      subscriber.afterInsert(evento(Unidad, { id: '12' })),
    ).resolves.toBeUndefined();
  });

  it('empuja la cola recien despues del commit', () => {
    subscriber.afterTransactionCommit();
    expect(sync.empujar).toHaveBeenCalled();
  });
});
