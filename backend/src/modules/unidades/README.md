# Módulo de Unidades Organizacionales (MOF)

Módulo encargado de la gestión integral de las unidades organizacionales según el modelo documental **S-MAU** (Detalle de la Unidad Organizacional).

## Campos del Detalle S-MAU (26 Campos)

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
