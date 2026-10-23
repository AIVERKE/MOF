# Módulo de Unidades Organizacionales (MOF)

Módulo encargado de la gestión integral de las unidades organizacionales según el modelo documental **S-MAU** (Detalle de la Unidad Organizacional).

## Campos del Detalle S-MAU (26 Campos + Inventarios + SIA)

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
17. **RELACIONAMIENTO Y COORDINACIÓN INTERNA** (`relacionesInternas` / `unidad_relacion_interna`)
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

## Endpoints Principales

### Unidades
- `GET /api/v1/mof/unidades`: Listar unidades.
- `GET /api/v1/mof/unidades/:id`: Obtener detalle completo con los 26 campos S-MAU, hijas y relaciones.
- `POST /api/v1/mof/unidades`: Crear nueva unidad.
- `PUT /api/v1/mof/unidades/:id`: Actualizar unidad (incluyendo 7 campos operativos y relaciones).
- `DELETE /api/v1/mof/unidades/:id`: Baja lógica (soft-delete).
- `PUT /api/v1/mof/unidades/:id/setparent`: Cambiar dependencia jerárquica con registro histórico.
- `GET /api/v1/mof/unidades/pdf/:id`: Exportación en PDF.

### Relacionamiento y Coordinación Interna
- `GET /api/v1/mof/unidades/:id/relaciones-internas`: Listar unidades relacionadas internamente.
- `POST /api/v1/mof/unidades/:id/relaciones-internas`: Agregar relación interna `{ relacionadaId: number, tipo?: string }`.
- `DELETE /api/v1/mof/unidades/:id/relaciones-internas/:relacionId`: Eliminar relación interna.

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
- `descripcion`: texto obligatorio (máx. 1024, se recorta). `cantidad`: entero ≥ 1. No se admiten otros campos.
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
