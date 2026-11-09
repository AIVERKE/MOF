# Módulo de Unidades Organizacionales (MOF)

Módulo encargado de la gestión integral de las unidades organizacionales según el modelo documental **S-MAU** (Detalle de la Unidad Organizacional).

## Campos del Detalle S-MAU (26 Campos + Inventarios + SIA + Planificación Estratégica + Proyectos)

1. **NOMBRE DE LA UNIDAD ORGANIZACIONAL** (`nombre`)
2. **SIGLA** (`sigla`)
3. **CÓDIGO** (`codigo`)
4. **RESOLUCIÓN DE CREACIÓN** (`resCreacion`)
5. **FECHA DE CREACIÓN** (`fecCreacion`)
6. **NIVEL DE AUTORIDAD** (`tipoUnidad` / `clase`)
7. **NIVEL JERÁRQUICO** (`nivel`)
8. **TIPO** (`tipo`)
9. **RELACIÓN** (`relacion`)
10. **DEPENDENCIA LINEAL** (`parentId` / `parent`)
11. **DEPENDENCIA FUNCIONAL** (`dependenciasFuncionales` - unidades de las que depende)
12. **UNIDADES DEPENDIENTES (LINEAL)** (`hijasLineales` - unidades que dependen linealmente)
13. **UNIDADES DEPENDIENTES (FUNCIONAL)** (`hijasFuncionales` - unidades que dependen funcionalmente)
14. **OBJETIVO** (`objetivo`)
15. **BASE LEGAL** (`baseLegal` - base legal general de la unidad)
16. **FUNCIONES Y BASE LEGAL** (`funciones` - funciones con su base legal específica)
17. **RELACIONAMIENTO Y COORDINACIÓN INTERNA** (`relacionesInternas` / `unidad_relacion_interna` para unidades del catálogo, `coordinacionesInternas` / `unidad_coordinacion_interna` para textos libres; lista unificada en `relacionamientoInterno`)
18. **RELACIONAMIENTO Y COORDINACIÓN INTERINSTITUCIONAL** (`relacionesExternas` / `unidad_relacion_externa`)
19. **PERSONAL (FIJO)** (`cargos` / talento humano asignado)
20. **TRÁMITES ATENDIDOS** (`tramitesAtendidos` / `tramites_atendidos`)
21. **EJECUCIÓN POA** (`ejecucionPoa` / `ejecucion_poa`)
22. **EJECUCIÓN PRESUPUESTARIA** (`ejecucionPresupuestaria` / `ejecucion_presupuestaria`)
23. **CARGA HORARIA PROGRAMADA** (`cargaHorariaProgramada` / `carga_horaria_programada`)
24. **CARGA HORARIA EJECUTADA** (`cargaHorariaEjecutada` / `carga_horaria_ejecutada`)
25. **INFRAESTRUCTURA FÍSICA ULITIZADA** (`infraestructura` / `infraestructura_fisica`)
26. **UBICACIÓN** (`ubicacion`)
27. **INVENTARIOS** (`inventarios` / `unidad_inventario`) — filas de descripción y cantidad, propias de cada unidad
28. **SIA** (`sia` / `unidad_sia`) — filas de aprobados, reprobados y matriculados; solo en unidades de tipo Carrera
29. **PLANIFICACIÓN ESTRATÉGICA** (`planificacionEstrategicaAplica`, `planificacionEstrategicaValor`, `planificacionEstrategica`) — switch, porcentaje 0–100 y descripción
30. **PROYECTOS** (`proyectos` / `proyecto` + `proyecto_unidad` + `tipo_proyecto`) — tipo del catálogo (tres programas oficiales más los que añadan los usuarios) y detalle; solo en Decanatos y unidades que dependen de uno; un proyecto puede ser conjunto entre varias unidades

## Endpoints Principales

### Unidades

- `GET /api/v1/mof/unidades`: Listar unidades.
- `GET /api/v1/mof/unidades/:id`: Obtener detalle completo con los 26 campos S-MAU, hijas y relaciones.
- `POST /api/v1/mof/unidades`: Crear nueva unidad.
- `PUT /api/v1/mof/unidades/:id`: Actualizar unidad (incluyendo 7 campos operativos y relaciones).
- `DELETE /api/v1/mof/unidades/:id`: Baja lógica (soft-delete).
- `PUT /api/v1/mof/unidades/:id/setparent`: Cambiar dependencia jerárquica con registro histórico.
- `GET /api/v1/mof/unidades/pdf/:id`: Exportación en PDF con el formato oficial del MOF (ver [Reporte PDF](#reporte-pdf-formato-oficial-del-mof)).

### Relacionamiento y Coordinación Interna

- `GET /api/v1/mof/unidades/:id/relaciones-internas`: Listar unidades relacionadas internamente.
- `POST /api/v1/mof/unidades/:id/relaciones-internas`: Agregar relación interna `{ relacionadaId: number, tipo?: string }`.
- `DELETE /api/v1/mof/unidades/:id/relaciones-internas/:relacionId`: Eliminar relación interna.

#### Textos libres (sección O del MOF)
La coordinación interna admite dos tipos de ítem, que conviven:

- **Unidades del catálogo** (`relacionesInternas`, tabla `unidad_relacion_interna`): igual que siempre, sin cambios.
- **Textos libres** (`coordinacionesInternas`, tabla `unidad_coordinacion_interna`): descripciones o agrupaciones abiertas como «Unidades Organizacionales de la Facultad» o «Departamento de Planificación y Coordinación». Columna `descripcion` `text`, sin tope de longitud.

Son campos y tablas independientes: cambiar uno no toca el otro.

##### Lectura
`GET /api/v1/mof/unidades/:id` trae tres listas:

```json
{
  "relacionesInternas": [
    { "id": 7, "relacionadaId": 20, "codigo": "1.2.3", "nombre": "CARRERA DE INFORMÁTICA", "sigla": "INF", "tipo": null }
  ],
  "coordinacionesInternas": [
    { "id": 1, "descripcion": "Unidades Organizacionales de la Facultad" },
    { "id": 2, "descripcion": "Departamento de Planificación y Coordinación" }
  ],
  "relacionamientoInterno": [
    { "orden": 1, "origen": "TEXTO",  "id": 1, "descripcion": "Unidades Organizacionales de la Facultad" },
    { "orden": 2, "origen": "TEXTO",  "id": 2, "descripcion": "Departamento de Planificación y Coordinación" },
    { "orden": 3, "origen": "UNIDAD", "id": 7, "descripcion": "CARRERA DE INFORMÁTICA",
      "relacionadaId": 20, "codigo": "1.2.3", "sigla": "INF", "tipo": null }
  ]
}
```

- `relacionesInternas`: sin cambios. La sigue usando el selector de unidades del formulario.
- `coordinacionesInternas`: textos libres en orden de alta. Es lo que edita el formulario.
- `relacionamientoInterno`: la lista ya unificada y numerada que muestra el panel lateral. Primero van los textos libres y después las unidades vinculadas, cada grupo en su orden de alta. `orden` va de 1 a n sin cortes. En los ítems `UNIDAD`, `descripcion` es el nombre de la unidad e `id` es el de la fila de relación (no el de la unidad: ese es `relacionadaId`).

##### Escritura desde el formulario
`POST /api/v1/mof/unidades` y `PUT /api/v1/mof/unidades/:id` aceptan `coordinacionesInternas`:

```json
"coordinacionesInternas": [
  "Unidades Organizacionales de la Facultad",
  "Departamento de Planificación y Coordinación"
]
```

- Reemplaza la lista completa en el orden enviado. Así se editan textos (se manda el texto nuevo en su posición) y se eliminan (se deja de mandar).
- `[]` vacía la lista. Si se omite el campo, no se modifica. Un `PUT` que solo trae `relacionesInternas` conserva los textos, y al revés.
- Cada ítem puede ser un string o `{ "descripcion": "…" }`. Se recorta y se colapsan los espacios internos. Los textos vacíos y los repetidos exactos se descartan sin error. Sin límite de longitud ni lista de caracteres.
- Un ítem que no es texto (número, `null`, etc.) responde 400 `VALIDATION_FAILED` (`"Cada coordinación interna debe ser un texto"`) y no se guarda nada.
- Se guarda en la misma transacción que el resto de la unidad: si algo falla, no se guarda nada.

##### Endpoints por ítem (escritura: ADMIN, OPERADOR)
- `GET /api/v1/mof/unidades/:id/coordinaciones-internas`: lista `[{ id, descripcion }]`.
- `GET /api/v1/mof/unidades/:id/coordinaciones-internas/:coordinacionId`: un ítem.
- `POST /api/v1/mof/unidades/:id/coordinaciones-internas`: agrega `{ descripcion }`. Devuelve `{ id, descripcion }`.
- `PUT /api/v1/mof/unidades/:id/coordinaciones-internas/:coordinacionId`: reemplaza `{ descripcion }`. Devuelve `{ id, descripcion }`.
- `DELETE /api/v1/mof/unidades/:id/coordinaciones-internas/:coordinacionId`: elimina el ítem.

`descripcion` es obligatoria (vacía tras recortar → 400 `VALIDATION_FAILED`). Un ítem de otra unidad o una unidad inexistente responde 404 (`NOT_FOUND`). Estos cambios no generan auditoría ni avisos a la Gaceta (`OrganigramaSubscriber` solo sigue `unidad` y `unidad_funcion`), igual que las relaciones externas.

##### Reporte PDF
En `GET /api/v1/mof/unidades/pdf/:id`, la sección **O. Relacionamiento y coordinación interna** es una **lista numerada continua** (`1.`, `2.`, …; `UnidadPdfService.relacionamientoInterno`): primero los textos libres, tal como se escribieron, y después las unidades vinculadas. Las unidades conservan el resumen por grupos (`Todas las Carreras (12)`, etc.) y salen con su nombre corto en tipo título, como el resto del formato oficial (la sigla solo se agrega si dos unidades quedan con el mismo nombre). Las líneas siguientes de un ítem se sangran bajo el texto. **P. Interinstitucional** también va numerada. Ver [Reporte PDF](#reporte-pdf-formato-oficial-del-mof).

##### Integración en el front
1. **Mappers** (`frontend/src/utils/mofMappers.js`):
   - En el formulario vacío (junto a `relacionesInternas: []`, ~línea 120): `coordinacionesInternas: []`.
   - Detalle → formulario (después de `relacionesExternas`, ~línea 261): `coordinacionesInternas: (raw.coordinacionesInternas || []).map((c) => ({ id: c.id, descripcion: c.descripcion || "" }))`.
   - Formulario → payload (junto a `relacionesExternas`, ~línea 473): `coordinacionesInternas: (formData.coordinacionesInternas || []).map((c) => (typeof c === "object" ? c.descripcion : String(c)).trim()).filter(Boolean)`. Enviarlo **siempre**, aunque esté vacío, para que se persistan las eliminaciones.
   - Agregar casos en `utils/__tests__/mofMappers.spec.js` (ida y vuelta, vacíos descartados).
2. **Formulario** (`frontend/src/views/MOF/unidades/UnidadFormDialog.vue`, sección `section-relacionamiento`):
   - No tocar el `SelectAllUnidades` de "Coordinación Interna (Unidades relacionadas)" (`internalRelUnitIds`).
   - Debajo, agregar el bloque "Coordinación Interna (texto libre)", copiado del bloque interinstitucional (`nuevaRelacionExterna` / `agregarRelacionExterna` / `eliminarRelacionExterna`):
     - `v-text-field` con `@keydown.enter.prevent` y botón «Agregar» deshabilitado si el texto está vacío;
     - no agregar un texto repetido (comparación tras `trim`).
   - Lista de los textos agregados, en el orden en que se mandan:
     - cada ítem se puede **editar** (lápiz → campo editable en línea con confirmar/cancelar; no se guarda vacío) y **eliminar** (cerrar o ícono de basura);
     - una lista vertical (`v-list` o filas) queda mejor que chips, porque los textos pueden ser largos.
   - Los cambios viajan en el `POST`/`PUT` de la unidad: no hace falta llamar a los endpoints por ítem.
   - Hint nuevo `coordinacionInternaTexto` en `frontend/src/config/hints.js` (`hints.unidadForm`).
   - Sin `maxlength`: el backend no tiene tope.
3. **Detalle** (`frontend/src/composables/useUnidadDetails.js`, donde se arma `relaciones_internas` ~línea 151): agregar `relacionamiento_interno: Array.isArray(data.relacionamientoInterno) ? data.relacionamientoInterno : []`. Mantener `relaciones_internas` como está.
4. **Panel lateral** (`frontend/src/views/MOF/unidades/UnidadDetailsDrawer.vue`):
   - Badge del panel (~línea 156): `relIntCount = data.relacionamiento_interno?.length ?? data.relaciones_internas?.length ?? 0`.
   - Panel `relaciones_internas` (~líneas 903-957): recorrer `detailData.relacionamiento_interno` con `:key="rel.origen + rel.id"` y anteponer `{{ rel.orden }}.` a cada fila.
     - `origen === 'TEXTO'`: ícono `mdi-text-box-outline` y `rel.descripcion`, sin chips.
     - `origen === 'UNIDAD'`: la fila actual, con `rel.descripcion` como nombre y los chips de `sigla`, `codigo` y `tipo`.
   - El mensaje "Sin relacionamiento interno registrado." se muestra solo si la lista unificada está vacía.
5. **Fuera de alcance**: la coordinación interinstitucional (UI y payload sin cambios), inventarios, SIA y proyectos.

### Relacionamiento y Coordinación Interinstitucional (Externa)

- `GET /api/v1/mof/unidades/:id/relaciones-externas`: Listar coordinaciones externas.
- `POST /api/v1/mof/unidades/:id/relaciones-externas`: Registrar coordinación externa `{ descripcion: string }`.
- `PUT /api/v1/mof/unidades/:id/relaciones-externas/:relacionId`: Actualizar coordinación externa.
- `DELETE /api/v1/mof/unidades/:id/relaciones-externas/:relacionId`: Eliminar coordinación externa.

### Inventarios

`GET /api/v1/mof/unidades/:id` incluye `inventarios: [{ id, descripcion, cantidad }]` (orden de alta).

Sincronización desde el formulario (`POST`/`PUT /api/v1/mof/unidades/:id`), campo opcional `inventarios`:

```json
"inventarios": [
  { "id": 12, "descripcion": "Computadora de escritorio", "cantidad": 3 },
  { "descripcion": "Silla giratoria", "cantidad": 10 }
]
```

- Fila con `id` → se actualiza; fila sin `id` → se crea; fila vigente que no se envía → baja lógica. `[]` vacía el inventario; omitir el campo no lo modifica.
- `descripcion`: texto obligatorio, sin límite de longitud (se recorta). `cantidad`: entero ≥ 1. No se admiten otros campos.
- Errores: `INVENTARIO_NO_PERTENECE_UNIDAD` (400, `id` de otra unidad o inexistente), `INVENTARIO_ID_DUPLICADO` (400), `VALIDATION_FAILED` (400). Ante un error no se guarda nada.

Endpoints por ítem (escritura: ADMIN, OPERADOR):

- `GET /api/v1/mof/unidades/:id/inventarios`: Listar inventario de la unidad.
- `GET /api/v1/mof/unidades/:id/inventarios/:inventarioId`: Obtener ítem.
- `POST /api/v1/mof/unidades/:id/inventarios`: Agregar ítem `{ descripcion: string, cantidad: number }`.
- `PUT /api/v1/mof/unidades/:id/inventarios/:inventarioId`: Actualizar ítem `{ descripcion, cantidad }`.
- `DELETE /api/v1/mof/unidades/:id/inventarios/:inventarioId`: Eliminar ítem (baja lógica).

Un ítem de otra unidad responde 404 (`NOT_FOUND`).

### SIA (solo Carreras)

Una unidad es Carrera cuando la descripción de su clase (`tipo_unidad`) contiene "CARRERA" (ej: `DIRECCIONES DE CARRERA`), sin distinguir mayúsculas ni acentos. La regla vive en `catalogos/clase-carrera.ts` y se expone como `esCarrera`:

- `GET /api/v1/mof/clases`: cada clase trae `esCarrera`. Sirve para mostrar u ocultar la tabla al elegir la clase en el formulario.
- `GET /api/v1/mof/unidades/:id`: trae `esCarrera` y `sia: [{ id, aprobados, reprobados, matriculados }]` (orden de alta). Si la unidad no es Carrera, `sia` es `[]`.

Sincronización desde el formulario (`POST`/`PUT /api/v1/mof/unidades/:id`), campo opcional `sia`, misma convención que `inventarios`:

```json
"sia": [
  { "id": 7, "aprobados": 120, "reprobados": 30, "matriculados": 150 },
  { "aprobados": null, "reprobados": null, "matriculados": 80 }
]
```

- Fila con `id` → se actualiza; fila sin `id` → se crea; fila vigente que no se envía → baja lógica. `[]` vacía la tabla; omitir el campo no la modifica.
- Cada columna es opcional: entero ≥ 0 o `null`. La fila debe traer al menos un valor. No se admiten otras columnas (`VALIDATION_FAILED`).
- Se valida con la clase final de la unidad, así que en el mismo `PUT` se puede cambiar a Carrera y enviar `sia`.
- En una unidad que no es Carrera, enviar filas responde `SIA_SOLO_CARRERA`; `sia: []` se ignora.
- Si una Carrera se reclasifica, sus filas se conservan pero no se exponen; reaparecen si vuelve a ser Carrera.
- Errores (400): `SIA_SOLO_CARRERA`, `SIA_FILA_VACIA`, `SIA_NO_PERTENECE_UNIDAD` (`id` de otra unidad o inexistente), `SIA_ID_DUPLICADO`, `VALIDATION_FAILED`. Ante un error no se guarda nada.

Endpoints por fila (escritura: ADMIN, OPERADOR):

- `GET /api/v1/mof/unidades/:id/sia`: Listar filas SIA (`[]` si la unidad no es Carrera).
- `GET /api/v1/mof/unidades/:id/sia/:siaId`: Obtener fila.
- `POST /api/v1/mof/unidades/:id/sia`: Agregar fila `{ aprobados?, reprobados?, matriculados? }`.
- `PUT /api/v1/mof/unidades/:id/sia/:siaId`: Reemplazar fila (las columnas omitidas quedan en `null`).
- `DELETE /api/v1/mof/unidades/:id/sia/:siaId`: Eliminar fila (baja lógica).

Una fila de otra unidad responde 404 (`NOT_FOUND`); en una unidad que no es Carrera, `GET` de una fila responde 404 y las escrituras `SIA_SOLO_CARRERA`.

Agregar una columna cuando se formalice la lista completa: columna en `UnidadSia` + migración, propiedad en `UnidadSiaDto` y `UnidadSiaResponseDto`, y su nombre en `SIA_CAMPOS` (`dto/unidad.dto.ts`). El servicio recorre `SIA_CAMPOS`, así que la lógica no cambia.

### Proyectos (Decanato hacia abajo)

#### Qué unidades aplican
Una unidad lleva Proyectos si su clase es Decanato **o** si algún ancestro por `parent_id` lo es. Una clase es Decanato cuando su descripción contiene "DECANATO" (`DECANATOS`, `VICEDECANATOS`), sin distinguir mayúsculas ni acentos. La regla vive en `catalogos/clase-decanato.ts`.

- Aplican: decanatos, vicedecanatos, carreras, institutos, laboratorios, posgrados y demás dependencias de una facultad.
- No aplican: Rectorado, Vicerrectorado, Secretarías, Direcciones y demás unidades del nivel central.
- Si una unidad deja de aplicar (cambia de clase o de padre), sus proyectos se conservan pero no se exponen ni cuentan. Reaparecen si vuelve a aplicar.
- No tiene relación con el texto de funciones que mencione investigación o interacción: son entidades aparte.

#### Modelo
- `tipo_proyecto`: catálogo `id`, `descripcion` (`text`), `activo`, auditoría. La migración `1793500000000-CreateTipoProyecto` lo crea con:
  1. Programa Académico
  2. Programa Investigación
  3. Programa Interacción Social y Extensión Universitaria

  Los usuarios pueden añadir otros (`POST /mof/proyectos/tipos`). La misma migración reasignó los proyectos que tenían tipo libre por palabra clave (`investig` → 2; `interacc`/`extens` → 3; el resto → 1) y eliminó la columna `proyecto.tipo`.
- `proyecto`: `id`, `tipo_proyecto_id` (FK a `tipo_proyecto`, obligatorio), `detalle` (`text`), auditoría y baja lógica.
- `proyecto_unidad`: (`proyecto_id`, `unidad_id`). Un proyecto conjunto (ej. Informática + Química) tiene una fila por unidad y **suma 1 en el contador de cada una**.

#### Lectura
`GET /api/v1/mof/clases`: cada clase trae `esDecanato`.

`GET /api/v1/mof/unidades`: cada unidad trae `aplicaProyectos` y `proyectosCount` (proyectos en los que participa, incluidos los conjuntos; `0` si no aplica). Solo cuenta los de la propia unidad, no los de sus subunidades.

`GET /api/v1/mof/unidades/:id`:

```json
{
  "aplicaProyectos": true,
  "proyectosCount": 3,
  "proyectos": [
    { "id": 5, "tipoId": 3, "tipo": "Programa Interacción Social y Extensión Universitaria",
      "detalle": "Brigadas de salud comunitaria",
      "unidades": [{ "id": 10, "codigo": "…", "sigla": "FCS-DEC", "nombre": "FACULTAD DE CIENCIAS SOCIALES - DECANATO" }] },
    { "id": 6, "tipoId": 2, "tipo": "Programa Investigación", "detalle": "Química computacional",
      "unidades": [
        { "id": 21, "codigo": "…", "sigla": "INF", "nombre": "CARRERA DE INFORMÁTICA" },
        { "id": 22, "codigo": "…", "sigla": "QMC", "nombre": "CARRERA DE QUÍMICA" }
      ] },
    { "id": 9, "tipoId": 2, "tipo": "Programa Investigación", "detalle": "Observatorio social", "unidades": [ … ] }
  ],
  "proyectosPorTipo": [
    { "tipo": "Programa Interacción Social y Extensión Universitaria", "cantidad": 1, "proyectos": [ { "id": 5, … } ] },
    { "tipo": "Programa Investigación", "cantidad": 2, "proyectos": [ { "id": 6, … }, { "id": 9, … } ] }
  ]
}
```

- `proyectos`: orden de alta. `unidades`: todas las participantes vigentes, incluida la consultada (orden por nombre). Más de una significa proyecto conjunto.
- `proyectosPorTipo`: grupos en orden alfabético. Es lo que muestra el panel lateral.
- Si la unidad no aplica: `aplicaProyectos: false`, `proyectosCount: 0` y ambas listas `[]`.

- Cada proyecto trae `tipoId` (id del catálogo) y `tipo` (su descripción).

#### Catálogo de tipos
- `GET /api/v1/mof/proyectos/tipos`: tipos activos en orden de alta (primero los tres programas), con los proyectos vigentes de cada uno: `[{ "id": 1, "tipo": "Programa Académico", "cantidad": 4 }, …]`.
- `POST /api/v1/mof/proyectos/tipos` (ADMIN, OPERADOR): `{ "tipo": "Programa de Posgrado" }`. Recorta y colapsa espacios. Si ya existe uno equivalente sin distinguir mayúsculas ni acentos, devuelve ese (y lo reactiva si estaba inactivo) en lugar de duplicarlo. Responde `{ id, tipo, cantidad }`.

#### Escritura desde el formulario
`POST /api/v1/mof/unidades` y `PUT /api/v1/mof/unidades/:id` aceptan `proyectos`, con la misma convención que `inventarios`:

```json
"proyectos": [
  { "id": 5, "tipoId": 3, "detalle": "Brigadas de salud comunitaria" },
  { "id": 6, "tipoId": 2, "detalle": "Química computacional", "unidadIds": [22] },
  { "tipoId": 4, "detalle": "Primera edición", "unidadIds": [] }
]
```

- Con `id` → se actualiza; sin `id` → se crea; un proyecto vigente de la unidad que no se envía → **la unidad se desvincula** (las demás participantes lo conservan; si no queda ninguna, el proyecto se da de baja). `[]` desvincula todos; omitir el campo no modifica nada.
- `tipoId`: obligatorio; debe existir en `tipo_proyecto` y estar activo (`TIPO_PROYECTO_NO_EXISTE`). Para un tipo nuevo, crearlo antes con `POST /mof/proyectos/tipos`.
- `detalle`: texto obligatorio, sin límite de longitud. No se admiten otros campos.
- `unidadIds`: **otras** unidades participantes. La unidad del formulario siempre participa (no hace falta incluirla; se ignoran repetidos). Si se envía, reemplaza la lista; si se omite en un proyecto existente, sus participantes no cambian. En uno nuevo, omitirlo equivale a `[]`.
- Se valida con la clase y el padre **finales**: en el mismo `PUT` se puede mover la unidad bajo un Decanato y enviar `proyectos`. En el `POST`, con `tipoUnidad` y `parentId` del cuerpo.
- En una unidad que no aplica, enviar filas responde `PROYECTOS_NO_APLICA`; `proyectos: []` se ignora.
- Errores (400): `PROYECTOS_NO_APLICA`, `PROYECTO_UNIDAD_NO_APLICA` (una unidad de `unidadIds` no existe o no aplica; `data` trae el id), `PROYECTO_NO_PERTENECE_UNIDAD` (`id` de un proyecto en el que la unidad no participa), `PROYECTO_ID_DUPLICADO`, `TIPO_PROYECTO_NO_EXISTE`, `VALIDATION_FAILED`. Ante un error no se guarda nada.

#### Endpoints por proyecto (escritura: ADMIN, OPERADOR)
- `GET /api/v1/mof/unidades/:id/proyectos`: proyectos de la unidad (`[]` si no aplica).
- `GET /api/v1/mof/unidades/:id/proyectos/:proyectoId`: un proyecto.
- `POST /api/v1/mof/unidades/:id/proyectos`: `{ tipoId, detalle, unidadIds? }`. Devuelve el proyecto con sus `unidades`.
- `PUT /api/v1/mof/unidades/:id/proyectos/:proyectoId`: reemplaza `tipoId` y `detalle`; `unidadIds` como arriba.
- `DELETE /api/v1/mof/unidades/:id/proyectos/:proyectoId`: desvincula la unidad (baja lógica si era la última).

Un proyecto en el que la unidad no participa responde 404 (`NOT_FOUND`); en una unidad que no aplica, `GET` de un proyecto responde 404 y las escrituras `PROYECTOS_NO_APLICA`.

#### Integración en el front
1. **Formulario** (`frontend/src/views/MOF/unidades/UnidadFormDialog.vue`, mappers en `frontend/src/utils/mofMappers.js`):
   - Mostrar la sección cuando la clase elegida tiene `esDecanato` (de `GET /mof/clases`) **o** el padre elegido tiene `aplicaProyectos` (de `GET /mof/unidades`). Recalcular al cambiar clase o padre. Al abrir una unidad existente, el detalle ya trae `aplicaProyectos`.
   - Filas `{ id?, tipoId, tipo, detalle, unidadIds }` (`tipo` solo para mostrar; se envía `tipoId`). Inicializar desde `detalle.proyectos`, con `unidadIds` = `p.unidades.map(u => u.id)` sin la unidad actual.
   - Tipo: `v-autocomplete` sobre `GET /mof/proyectos/tipos`, con la acción «Añadir tipo de proyecto» al final de la lista (abre un diálogo, hace `POST /mof/proyectos/tipos` y deja el tipo nuevo seleccionado). `detalle`: `v-textarea`. Componente: `UnidadProyectoTable.vue`.
   - Unidades participantes: autocompletar múltiple sobre `GET /mof/unidades` filtrado por `aplicaProyectos` y sin la unidad actual.
   - Enviar `proyectos` en el `POST`/`PUT` solo si la sección está visible. Si no lo está, no enviar el campo.
2. **Organigrama** (`frontend/src/views/MOF/OrganigramaVueFlow.vue`):
   - Al armar `data` del nodo (donde se asigna `childrenCount`), agregar `proyectosCount: u.proyectosCount ?? 0`.
   - Debajo del badge de subunidades, una línea `v-if="data.proyectosCount > 0"` con `1 proyecto` / `N proyectos`, con el mismo estilo de `children-badge`. No cambiar el resto de la tarjeta. Las unidades que no aplican siempre traen `0`, así que no muestran la línea.
3. **Panel lateral** (`frontend/src/views/MOF/unidades/UnidadDetailsDrawer.vue`):
   - Bloque "Proyectos" solo si `aplicaProyectos` y `proyectosCount > 0`.
   - Recorrer `proyectosPorTipo`: encabezado con `tipo` y `cantidad`, y por cada proyecto su `detalle`. Si `p.unidades.length > 1`, mostrar chips con las otras unidades (proyecto conjunto).
   - Fuera de alcance: reporte PDF.

### Sigla
`sigla` es opcional en `POST`/`PUT /api/v1/mof/unidades/:id` y es **texto libre**: admite espacios y cualquier signo (`SEC GRAL`, `SEC@GRAL #1`, `D’ALES`), sin límite de longitud. Se guarda recortada (`trim`) y no es única.

- El servicio ignora sin error una sigla vacía, `-`, igual al código o solo numérica (ej. `1.2.3`). En el alta, la sigla se autogenera a partir del nombre; en la edición, se conserva la actual.
- Ya no se trunca: una sigla de cualquier largo se guarda completa (antes se cortaba a 32).
- El front sigue exigiéndola y rechazando que sea igual al código o solo numérica (`siglaNotCodigo`, `siglaValida` en `frontend/src/utils/rules.js`).

### Textos libres sin límite de longitud

Los campos de texto de la ficha técnica, inventarios, proyectos, funciones, cargos y clases no tienen listas de caracteres permitidos/prohibidos ni topes de longitud. Se quitaron los `@Matches` y `@MaxLength` de los DTOs, y la migración `1793300000000-TextosSinLimiteDeLongitud` pasó sus columnas de `varchar(n)` a `text`:

| Tabla | Columnas (largo anterior) |
| --- | --- |
| `unidad` | `codigo` (64), `sigla` (32), `nombre` (255), `res_creacion` (512) |
| `unidad_funcion` | `funcion` (1024), `base_legal` (1024) |
| `unidad_inventario` | `descripcion` (1024) |
| `unidad_relacion_externa` | `descripcion` (1024) |
| `unidad_relacion_interna` | `tipo` (32) |
| `unidad_jerarquia_hist` | `razon` (512) |
| `proyecto` | `tipo` (120); luego reemplazada por `tipo_proyecto_id` (`1793500000000-CreateTipoProyecto`) |
| `cargo` | `codigo` (64), `nombre` (255), `descripcion` (512) |
| `cargo_nivel` | `nombre` (128), `descripcion` (512) |
| `cargo_jerarquia_hist`, `asignacion_cargo_hist` | `razon` (512) |
| `tipo_unidad` (clases) | `codigo` (32), `descripcion` (255) |

- `codigo` admite espacios y cualquier signo; sigue siendo obligatorio y único entre las unidades vigentes (`UNIDAD_CODIGO_DUPLICADO`).
- `nombre` sigue siendo obligatorio. Los campos operativos (`tramitesAtendidos`, `ejecucionPoa`, `ejecucionPresupuestaria`, `cargaHorariaProgramada`, `cargaHorariaEjecutada`, `infraestructura`, `ubicacion`), `objetivo`, `baseLegal` y `planificacionEstrategica` ya no rechazan `@ # $ ^ * ~ { } [ ] | \ < >`.
- Se mantienen las validaciones numéricas: `planificacionEstrategicaValor` de 0 a 100 con hasta 2 decimales; `cantidad` de inventario entera ≥ 1; columnas SIA enteras ≥ 0.
- Siguen con formato fijo (no son texto libre): `color` (`#RRGGBB`), `lado`, `cargo.ambito` y `cargo_nivel.letra`.
- Fuera de alcance: usuarios (`usuario`, `persona`).
- `varchar` → `text` no reescribe la tabla y conserva los índices. El `down` vuelve a `varchar(n)` y **falla** si ya hay textos más largos, en lugar de recortarlos.

Integración en el front (solo quitar restricciones, sin lógica nueva):
1. **`frontend/src/utils/rules.js`**:
   - `codigo`: dejar solo la obligatoriedad (`'El código es requerido'`), sin el regex `^[A-Z0-9.-]+$`.
   - Eliminar `siglaFormato`, `nombreUnidad` y `sinCaracteresRaros`.
   - Mantener `required`, `minLength`, `siglaNotCodigo`, `siglaValida` y `porcentajePlanificacion`.
   - Actualizar `utils/__tests__/rules.spec.js`: quitar el bloque `rules.siglaFormato` y agregar casos de `rules.codigo` con espacios y símbolos (`'1.2 A/B'` → `true`).
2. **`frontend/src/views/MOF/unidades/UnidadFormDialog.vue`**:
   - Nombre (~línea 820): `:rules="[rules.required, rules.minLength(4)]"`.
   - Sigla (~líneas 831–832): quitar `rules.siglaFormato` y el atributo `maxlength="32"`; quedan `required`, `siglaNotCodigo(formData.codigo)` y `siglaValida`.
   - Código (~línea 843): sin cambios en el template; la regla `rules.codigo` ya queda permisiva.
   - Ejecución POA, Ejecución Presupuestaria, Carga Horaria Programada/Ejecutada, Ubicación, Infraestructura y Trámites (~líneas 1253–1325): quitar `:rules="[rules.sinCaracteresRaros]"`.
   - Planificación Estratégica (~línea 1392): `:rules="[rules.required]"`. El porcentaje conserva `porcentajePlanificacion`.
3. **`frontend/src/views/MOF/unidades/UnidadInventarioTable.vue`** (~línea 177): quitar `maxlength="1024"` de la descripción. La cantidad conserva su validación de entero ≥ 1.
4. **Cargos y clases**: quitar `maxlength`/`counter` de Nombre (255) y Descripción (512) en `frontend/src/views/MOF/cargos/CargoCatalogDialog.vue` (~líneas 78–91) y `frontend/src/views/MOF/clases/HierarchyManagerDrawer.vue` (~líneas 797–809).
5. Si el formulario de Proyectos o de Funciones agrega `maxlength`, no ponerlo: el backend no tiene tope.

### Reporte PDF (formato oficial del MOF)
`GET /api/v1/mof/unidades/pdf/:id` (y `GET /api/v1/integraciones/mpp/unidades/:id/pdf`) arma el documento con la plantilla oficial (`FORMATO MOF.pdf`): hoja Carta, tabla de bordes negros y títulos en gris, secciones A–U. Lo dibuja `UnidadPdfService` con los datos de `UnidadesService.findEntityForPdf`.

- **Encabezado** (solo primera página): logo · "UNIVERSIDAD MAYOR DE SAN ANDRÉS / {facultad} / MANUAL DE ORGANIZACIÓN Y FUNCIONES" · celda con los textos fijos "RESOLUCIÓN HCU QUE APRUEBA EL MOF" y "Versión" en gris (el sistema no guarda esos datos). `{facultad}` es la "FACULTAD DE …" del nombre del primer nodo de la cadena `parent_id` que la menciona (normalmente el Decanato); si ninguno, `ADMINISTRACIÓN CENTRAL`.
- **A–J**: A nombre corto de la unidad, B código, C resolución, D fecha, E nivel, F tipo, G dependencia lineal, H dependencias funcionales (sin repetir al padre), I/J unidades dependientes lineales y funcionales numeradas. **K**: organigrama con el padre, la unidad resaltada y hasta 8 hijas lineales (desde la 9.ª, una caja "+N MÁS").
- **L** objetivo; **M** funciones numeradas | **N** base legal de la unidad (si está vacía, las bases legales distintas de sus funciones con viñetas); **O** coordinación interna | **P** interinstitucional, ambas numeradas; **Q/R/S/U** bloque de firmas. Ya no lleva código QR.
- Las columnas siguen en la página siguiente cuando no entran; un texto más largo que una página se parte entre renglones. Como en Word, cada tramo termina en el último renglón que entró, y el bloque de firmas también puede seguir en la página siguiente.
- Vacíos: listas y dependencias muestran "Ninguna."; C, D y N quedan en blanco.

**Tipografía y medidas** (tomadas de `FORMATO MOF.pdf`, Word 2016):
- Arial 11 en valores, listas y objetivo; Arial Bold 11 en títulos (L, O y P en 10); encabezado Bold 12/11/12; B. CÓDIGO en Arial Italic 11; "RESOLUCIÓN HCU…" y "Versión" en Arial Italic 8/9 gris `#BFBFBF`; Q/R/S/U y "FECHA:" en Arial Narrow Bold 10; "Nombre:"/"Cargo:" en Arial Bold 10. Interlineado sencillo de Word (1.15 × tamaño).
- Fuente: se usa la **Arial del sistema** (`C:\Windows\Fonts`, `/usr/share/fonts/truetype/msttcorefonts`, `/Library/Fonts`) o una copia en `src/assets/fonts` (ignorada por git: Arial es de Microsoft y no se versiona). Si falta alguna variante, se usa **Liberation Sans** (`src/assets/fonts`, licencia OFL), que tiene las mismas medidas que Arial; sin Arial Narrow, la Bold se angosta al 82 % (Arial Narrow mide el 82 % de Arial). En Docker (Alpine) sale Liberation.
- Cortes de renglón: `wrapLines` corta como Word, sin contar el espacio que sigue a la última palabra y midiendo con un factor de 0.993 (Word usa anchos de pantalla de Arial algo más angostos). Con ese valor se reproducen todos los cortes del formato oficial.
- Medidas de tabla, columnas, sangrías de listas y firmas: constantes `PAGE_MARGINS`, `WIDTH`, `LIST`, `HEADER`, `FIRMA` y `FIRMA_ROWS` de `unidad-pdf.service.ts`.
- Diferencias que se dejaron a propósito: "Versión" sin número (el sistema no lo guarda) y el organigrama K, que sigue el diseño propio (padre → unidad → hijas) en lugar de dibujar las unidades de staff a los costados.

**Nombre corto** (`unidad-pdf-texto.ts`, no cambia la BD):
- `nombreCorto` quita al inicio los prefijos de sigla con guion (`FMENTM - `, `DEC-`, `CARR.TS-`, `FO.DEC-`) y `FACULTAD DE … - `: `FMENTM - FACULTAD DE MEDICINA… - DECANATO` → `DECANATO`. Un guion dentro del nombre (`DIRECCIÓN DE CARRERA- INGENIERÍA ELÉCTRICA`, `INSTITUTO … - IEA`) se conserva.
- E. Nivel jerárquico (`nivelMof`): solo el nivel, sin subcategoría. "Ejecutivo Estratégico Facultativo", "Ejecutivo Estratégico Institucional" y "Ejecutivo Operativo" → "Ejecutivo"; "Operativo" y "Directorio" quedan igual.
- F. Tipo de unidad (`tipoUnidadMof`): sin la aclaración entre paréntesis. "Sustantivo (Académico)" → "Sustantivo".
- J. Unidades dependientes (funcional) (`UnidadesService.hijasFuncionalesMof`, solo para el PDF): se quitan las que ya cuelgan por línea de la unidad (hijas, nietas…), porque esa dependencia ya está implícita en la estructura. El Decanato de Medicina tiene registradas como funcionales a Vicedecanato, Centro de Seguimiento y tres Institutos de Investigación (bisnietos vía las Carreras), y su MOF dice "Ninguna.". El detalle de la API no cambia.
- `tituloEs` pasa a tipo título los nombres guardados en MAYÚSCULAS (conectores en minúscula; siglas entre paréntesis, palabras sin vocales y siglas conocidas se respetan). Un texto que ya trae minúsculas no se toca. Se aplica a nombres de unidades, nivel y tipo; objetivo, funciones, base legal y relaciones externas salen tal como están guardados.
- En una lista, dos unidades que quedan con el mismo nombre corto llevan su primera sigla: "Unidad de Administración Desconcentrada (FMENTM)".

### Métricas de uso (vistas y descargas)
Dos contadores por unidad en `unidad`: `vistas_count` (aperturas de la ficha técnica) y `descargas_count` (descargas del PDF). Son `integer NOT NULL DEFAULT 0` con CHECK `>= 0`, así que persisten en base de datos. Cada unidad tiene los suyos.

- `GET /api/v1/mof/unidades/:id` devuelve `vistasCount` y `descargasCount`. **No incrementa nada**: lo usan también el formulario de edición y el organigrama.
- `POST /api/v1/mof/unidades/:id/vistas` (sin body, cualquier usuario autenticado) suma 1 a las vistas y devuelve los dos totales ya actualizados:
  ```json
  { "status": true, "message": "Registrado exitosamente", "data": { "vistasCount": 13, "descargasCount": 3 } }
  ```
  Si la unidad no existe o fue dada de baja, responde 404 `NOT_FOUND`.
- `GET /api/v1/mof/unidades/pdf/:id` suma 1 a las descargas cada vez que el PDF se genera con éxito. No suma vistas y si la generación falla no cuenta. Si falla el conteo, el PDF se entrega igual y el error queda en el log.
- El incremento es un `UPDATE` atómico en SQL. Aperturas simultáneas no se pierden y el incremento no cambia `updated_at`. Tampoco genera auditoría ni avisos a la Gaceta (`OrganigramaSubscriber`). Las columnas tienen `insert`/`update: false`, así que guardar la unidad nunca las modifica.

Integración en el front:
- En `loadUnidadDetails` (`useUnidadDetails.js`), llamar a `POST …/vistas` junto con el `GET` del detalle y mostrar los totales que devuelve el POST, que ya incluyen la vista actual.
- No llamarlo desde el formulario ni desde el organigrama.
- Tras un `verReporte` exitoso, sumar 1 localmente a `descargasCount` del drawer o volver a pedir el detalle. El PDF no devuelve los totales.

### Planificación Estratégica

Tres columnas en `unidad`: `planificacion_estrategica_aplica` (boolean, default `false`), `planificacion_estrategica_valor` (`numeric(5,2)`, CHECK 0–100) y `planificacion_estrategica` (text). Se envían en `POST`/`PUT /api/v1/mof/unidades/:id`:

```json
{
  "planificacionEstrategicaAplica": true,
  "planificacionEstrategicaValor": 75.5,
  "planificacionEstrategica": "Plan Estratégico Institucional 2026–2030, eje 2"
}
```

- `planificacionEstrategicaAplica` es el switch del formulario. En un alta, si se omite, vale `false`.
- Con el switch en `true`, el porcentaje y la descripción son obligatorios. Si falta alguno, responde `PLANIFICACION_ESTRATEGICA_INCOMPLETA` (400) y no se guarda nada.
- En `PUT`, los campos omitidos se conservan y la regla se valida sobre el estado final. Un `PUT` que solo trae `planificacionEstrategicaAplica: true` es válido si la unidad ya tenía porcentaje y descripción guardados.
- `null` o un texto vacío limpian el valor.
- El porcentaje acepta de 0 a 100 con hasta 2 decimales. Fuera de rango, o con más decimales, responde `VALIDATION_FAILED`.
- Con el switch en `false`, el porcentaje y la descripción se conservan en la base, pero `GET /api/v1/mof/unidades/:id` los devuelve `null`. Reaparecen al volver a activar el switch.
- Es independiente del catálogo TIPO (`tipo`).

### Colores del organigrama

El color de cada caja sale de tres fuentes, en este orden:

1. **Color propio de la unidad**: columna `unidad.color` (`varchar(7)`, `NULL` por defecto, CHECK `^#[0-9A-F]{6}$`). `NULL` significa "hereda de la Clase".
2. **Color de la Clase**: `tipo_unidad.color`. Se edita en Jerarquías → Instancias (`PUT /api/v1/mof/clases/:id`).
3. **Paleta de nodos**: `mof_config.paleta_nodos` (`jsonb`, lista de `#RRGGBB`). Se asigna por posición de la Clase en el catálogo (`paletaNodos[idx % paletaNodos.length]`) cuando ni la unidad ni su Clase tienen color. Arranca con los 8 colores que el front tenía fijos en `INTENSE_NODE_PALETTE`.

`mof_config.paleta` (la grilla 12×5) **sigue siendo solo los swatches** de los selectores de color; no colorea nodos.

#### Lectura
`GET /api/v1/mof/unidades` y `GET /api/v1/mof/unidades/:id` devuelven tres propiedades:

```json
{ "id": 10, "nombre": "Facultad de Agronomía", "color": "#00897B", "colorPropio": "#00897B", "colorClase": "#C62828" }
{ "id": 11, "nombre": "Centro de Calidad",     "color": "#E91E63", "colorPropio": null,      "colorClase": "#E91E63" }
{ "id": 12, "nombre": "Unidad sin clase con color", "color": null, "colorPropio": null,      "colorClase": null }
```

- `colorPropio`: lo guardado en la unidad (`null` = hereda).
- `colorClase`: `tipo_unidad.color` (puede ser `null`).
- `color`: el efectivo, `colorPropio ?? colorClase`. Se mantiene por compatibilidad: antes era siempre el color de la Clase. Si es `null`, el front aplica la paleta de nodos.

#### Escritura
`color` es opcional en `POST /api/v1/mof/unidades` y `PUT /api/v1/mof/unidades/:id`:

| Valor enviado | Resultado |
| --- | --- |
| se omite | `POST`: hereda (`null`). `PUT`: se conserva el guardado. |
| `null` o `""` | Vuelve a heredar de la Clase (`null`). |
| `"#00897b"` | Se guarda en mayúsculas: `#00897B`. |
| igual al color de la Clase (sin importar mayúsculas) | Se guarda `null`: la unidad sigue a su Clase si esta cambia de color. |
| `"#ABC"`, `"#12345678"`, `"rojo"` | 400 `VALIDATION_FAILED`: `"El color debe tener el formato hexadecimal #RRGGBB"`. No se guarda nada. |

- La comparación con la Clase usa la Clase **final**: si el mismo `PUT` cambia `tipoUnidad`, se compara con la nueva.
- Si un `PUT` solo cambia `tipoUnidad` y el color propio guardado coincide con el de la nueva Clase, se limpia a `null`.
- Cambiar el color de una unidad es un cambio de la unidad: genera auditoría y aviso a la Gaceta (`OrganigramaSubscriber`).

#### Paleta de nodos en la configuración
`GET /api/v1/mof/config` (cualquier usuario autenticado) incluye `paletaNodos`:

```json
{
  "status": true,
  "data": {
    "defaults": { "...": "..." },
    "reglas": { "...": "..." },
    "paleta": [["#1976D2", "#2196F3", "..."]],
    "paletaNodos": ["#1D4ED8", "#B91C1C", "#047857", "#B45309", "#6D28D9", "#BE185D", "#0369A1", "#C2410C"],
    "passwordPolicy": { "minLength": 6 }
  }
}
```

`PUT /api/v1/mof/config` (solo `ADMIN`; otro rol responde 403) acepta `paletaNodos` junto a los demás campos o sola:

```json
{ "paletaNodos": ["#1d4ed8", "#B91C1C", "#047857"] }
```

- Reemplaza la lista completa y la guarda en mayúsculas. La respuesta es la configuración completa ya actualizada.
- De 1 a 24 colores, todos `#RRGGBB`. Una lista vacía, más de 24 colores o un color inválido responden 400 `VALIDATION_FAILED` sin guardar nada.
- Si se omite, la paleta de nodos guardada no cambia.
- Además, los swatches de `paleta` ahora también deben ser `#RRGGBB` (antes se aceptaba cualquier texto). El `<input type="color">` de Configuración ya cumple.

Integración en el front:
1. **Store** (`frontend/src/stores/config_mof.js`): agregar `paletaNodos` a `DEFAULT_CONFIG` (los 8 colores de `INTENSE_NODE_PALETTE`), a `applyPayload` (con el mismo fallback que `paleta`) y exponer un `computed` `paletaNodos`.
2. **Helper** (`frontend/src/utils/mofHelpers.js`): `getIntenseNodeColor(val, clases, isColorblind, paleta = INTENSE_NODE_PALETTE)` debe usar `paleta` en lugar de la constante. Si la lista llega vacía, usar `INTENSE_NODE_PALETTE`. Actualizar los tests de `utils/__tests__/mofHelpers.spec.js`.
3. **Organigrama** (`frontend/src/views/MOF/OrganigramaVueFlow.vue`, `computeNodeVisuals`):
   - Precedencia: `u.colorPropio` → `u.colorClase` → `getIntenseNodeColor(u.clase, clasesStore.clases, isColorblindMode, configStore.paletaNodos)` → `staffDefault`/`claseDefault`.
   - La lista negra de grises (`#757575`, `#9E9E9E`, …) solo debe filtrar `colorClase`. Un `colorPropio` gris lo eligió el usuario y se respeta.
   - El cálculo de nodos debe depender reactivamente de `configStore.paletaNodos` (incluirlo en el `computed`/`watch` que arma los nodos) para que al guardar la paleta se recoloreen las cajas sin recargar.
   - Asegurar que el store de configuración esté cargado (`fetchConfig`) al entrar al organigrama. Así, al recargar la app, se usa la paleta guardada.
   - **No tocar** el override `noOficialAnalitico` de la vista Analítica ni el modo daltónico: siguen teniendo prioridad sobre las tres fuentes.
4. **Configuración** (`frontend/src/views/Configuracion.vue`): bloque nuevo "Colores de nodos del organigrama" con una fila de `<input type="color">` (agregar o quitar colores, de 1 a 24), guardado con `PUT /mof/config { paletaNodos }`. Solo editable por ADMIN (`isAdmin`), como la grilla de swatches.
5. **Formulario de unidad** (`UnidadFormDialog.vue`, `frontend/src/utils/mofMappers.js`):
   - Quitar el fallback `"#1976D2"` de `color` en los mappers (líneas `d.color || …`, `raw.color || …`, `formData.color || …`).
   - Al editar, inicializar el picker con `colorPropio`, no con `color`.
   - Quitar el watcher que copia el color de la Clase a `formData.color` al cambiar la Clase. Mostrar el color de la Clase solo como vista previa cuando `colorPropio` es `null`.
   - Agregar "Usar color de la Clase", que envía `color: null`.
6. **Tabla del organigrama** (`OrganigramaVueFlow.vue`, etiqueta "Personalizado"): mostrarla con `u.colorPropio`, no con `u.color`.

Mientras el front no se actualice, el comportamiento visual no cambia: `color` sigue trayendo el color de la Clase y el formulario actual, que manda ese mismo color, se guarda como `null`. La única diferencia: si la Clase no tiene color, el formulario actual manda `#1976D2` y queda como color propio.
