# Backend MOF

Backend NestJS del Manual de Organización y Funciones (MOF): catálogos, organigrama, cargos y API alineada al frontend.

## Stack

- NestJS 11
- TypeORM + PostgreSQL (`synchronize: false`)
- Passport JWT / Local
- Swagger en `/api`
- Jest (unit + e2e)

## Requisitos

- Node.js 20+
- PostgreSQL
- npm

Para levantar **frontend + backend + postgres** juntos, usa Docker desde la raíz del repositorio (ver el [README raíz](../README.md)).

## Arranque (modo manual)

No hace falta el dump legacy ni correr el ScriptETL. El organigrama migrado viaja en el repo como snapshot SQL.

```bash
git clone https://github.com/AIVERKE/MOF.git
cd MOF/backend
cp .env.example .env          # ajustar DB_PASSWORD si tu Postgres no usa 123456
createdb -U postgres mof_db   # omitir si la BD ya existe
npm install
npm run migration:run         # crea el esquema
npm run seed:auth             # crea el usuario administrador inicial
npm run seed                  # carga organigrama, cargos y personas
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

Para Docker, usa `.env.docker.example` (`DB_HOST=db`).

## Seed de datos

`npm run seed` ejecuta [`src/database/seed-1/etl-data.seeder.ts`](src/database/seed-1/etl-data.seeder.ts) e inserta el snapshot [`src/database/seed-1/etl-snapshot.sql`](src/database/seed-1/etl-snapshot.sql) (salida del ScriptETL).

Si `unidad` ya tiene filas, el seed **no pisa** nada. Para recargar desde cero:

```bash
npm run seed -- --force
```

### Qué inserta

| Tabla | Filas (snapshot actual) |
|-------|------------------------:|
| `unidad` | 159 (158 con `parent_id`) |
| `tipo_unidad` | 21 |
| `unidad_funcion` | 1889 |
| `unidad_dependencia_funcional` | 158 |
| `cargo` | 171 (dataset Excel con `nivel_orden` / `ambito`) |
| `persona` | 3 |
| `cargo_unidad` | 197 |
| `catalogo_tipo` / `catalogo_nivel` / `catalogo_relacion` | A/B/C/N/Z, D/E/O, L/S/F/X |

### Cargos desde Excel (MOF-014)

Fuente: [`seed-1/sources/AJUSTES_NOMINAS.CARGOS_S-MAU.1.xlsx`](src/database/seed-1/sources/AJUSTES_NOMINAS.CARGOS_S-MAU.1.xlsx).

| Hoja | Columnas | Persistencia |
|------|----------|--------------|
| `CARGOS ADM` | `CARGO`, `NIVEL` (26=Rectorado … 1) | `ambito=ADM`, `nivel_orden` |
| `CARGOS ACAD` | `CARGO`, `CARGA HORARIA` | `ambito=ACAD`, `nivel_orden=NULL` |

Procedimiento de carga / recarga (idempotente; **no** trunca ni toca `parent_id` / `cargo_unidad`):

```bash
npm run migration:run          # incluye nivel_orden + ambito
npm run seed:cargos:extract    # regenera cargos-dataset.json desde el Excel
npm run seed:cargos            # upsert merge por codigo / alias
npm run seed:export            # opcional: congela resultado en etl-snapshot.sql
```

El dataset versionable es [`seed-1/cargos-dataset.json`](src/database/seed-1/cargos-dataset.json). Re-ejecutar `seed:cargos` no duplica: match por `codigo` o alias (p.ej. `RECTORA` ↔ `RECTOR/A`).

### Usuario administrador y alta de usuarios

`npm run seed:auth` ([`src/database/seed-1/auth.seeder.ts`](src/database/seed-1/auth.seeder.ts)) crea el primer usuario con rol `ADMIN` (`admin@admin.com` / `admin123`, credenciales de desarrollo). Es el único usuario con contraseña predefinida: entra directo por el login normal. Los demás se crean desde la interfaz.

**Alta de un usuario (rol ADMIN, `POST /seguridad/usuarios`)**

El administrador registra la identidad de la persona, no una contraseña:

```json
{
  "email": "operador@umsa.bo",
  "ci": "8123456",
  "nombres": "Juan Carlos",
  "apellidoPaterno": "Pérez",
  "apellidoMaterno": "Gutiérrez",
  "roles": ["OPERADOR"],
  "enabled": true
}
```

El alta, en una sola transacción:

1. Inserta el registro en `persona` y lo vincula en `usuario.id_persona`.
2. Deriva `usuario.nombre` de los nombres y apellidos.
3. Guarda un hash aleatorio en `password_hash` (columna `NOT NULL`) y marca `debe_cambiar_password = true`. Nadie conoce ese texto plano, así que la cuenta no es accesible por login.
4. Asigna los roles.
5. Registra la creación en `auditoria_cambio` (`tabla_afectada='usuario'`, `accion='CREATE'`, `id_usuario` = administrador autenticado).

El email es el único identificador de acceso: no existe un campo `username`.

**Primer acceso del usuario nuevo**

Mientras `debe_cambiar_password` sea `true`, `POST /auth/login` responde `401` con `errorCode` `PRIMER_ACCESO_REQUERIDO`. La secuencia es:

```bash
# 1) Identificarse con email + C.I. -> token temporal (15 min, solo sirve para esto)
curl -X POST http://localhost:3000/auth/primer-acceso \
  -H 'Content-Type: application/json' \
  -d '{"email":"operador@umsa.bo","ci":"8123456"}'

# 2) Definir la contraseña con ese token
curl -X POST http://localhost:3000/auth/cambiar-password \
  -H 'Content-Type: application/json' \
  -d '{"token":"<token>","password":"miClaveSegura123"}'

# 3) A partir de aquí, login normal con email + contraseña
```

El token temporal lleva un `purpose` propio y `JwtStrategy` lo rechaza en cualquier ruta protegida, así que no vale como sesión. Si el administrador define una contraseña al editar el usuario (`password` en `PUT /seguridad/usuarios/:id`), el primer acceso deja de ser necesario.

### Otros seeders

| Script | Uso |
|--------|-----|
| `npm run seed` | Snapshot ETL (recomendado al clonar) |
| `npm run seed -- --force` | Trunca tablas de dominio y recarga el snapshot |
| `npm run seed:auth` | Crea el primer usuario administrador (`admin@admin.com`) |
| `npm run seed:catalogos` | Solo catálogos mínimos (A/B/C, D/E/O, L/S), sin organigrama |
| `npm run seed:cargos:extract` | Lee el Excel y escribe `cargos-dataset.json` |
| `npm run seed:cargos` | Upsert idempotente de cargos desde el JSON |
| `npm run seed:export` | Regenera `etl-snapshot.sql` desde la BD actual (`mof_db`) |

Tras un ETL nuevo, actualiza el seed del repo así:

```bash
npm run etl:umsa -- --truncate
npm run seed:export
```

El flujo completo dump → `umsa_legacy` → `mof_db` está en [`src/database/etl/README.md`](src/database/etl/README.md). Quien solo clone este backend **no lo necesita**.

## Configuración

Variables en `.env` (ver `.env.example`):

| Variable | Descripción |
|----------|-------------|
| `PORT` | Puerto HTTP (3000) |
| `CORS_ORIGIN` | Orígenes permitidos (coma-separados). En producción obligatorio y no puede ser `*` |
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL destino (`mof_db`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth JWT (`JWT_SECRET` obligatorio; no puede ser vacío ni `secret`) |
| `LEGACY_DB_*` | Solo para ScriptETL (BD temporal `umsa_legacy`) |

## Envelope de respuesta y errores

Éxito y fallo usan el mismo envelope:

```json
{
  "timestamp": "2026-09-15T15:00:00.000Z",
  "status": true,
  "message": "Realizado correctamente",
  "data": { }
}
```

En errores, `status` es `false` y se agrega **`errorCode`** (código estable). `message` y `data` se mantienen por compatibilidad.

Catálogo fuente: [`src/common/errors.ts`](src/common/errors.ts).

| errorCode | HTTP | Mensaje (ES) | Acción frontend sugerida |
|-----------|------|--------------|--------------------------|
| `CATALOG_REF_NOT_FOUND` | 400 | Referencia de catálogo no encontrada | Mostrar mensaje |
| `UNIDAD_CODIGO_DUPLICADO` | 400 | Ya existe una unidad con ese código | Mostrar mensaje / corregir código |
| `UNIDAD_PARENT_SELF` | 400 | Una unidad no puede ser padre de sí misma | Mostrar mensaje |
| `UNIDAD_PARENT_CYCLE` | 400 | La asignación generaría un ciclo en la jerarquía | Mostrar mensaje |
| `FUNCION_YA_PRIMERA` | 400 | La función ya está en la primera posición | Mostrar mensaje |
| `FUNCION_YA_ULTIMA` | 400 | La función ya está en la última posición | Mostrar mensaje |
| `DEPENDENCIA_SELF` | 400 | No se puede depender de sí misma | Mostrar mensaje |
| `DEPENDENCIA_DUPLICADA` | 409 | La dependencia funcional ya existe | Mostrar mensaje |
| `CLASE_YA_PRIMERA` | 400 | La clase ya está en la primera posición | Mostrar mensaje |
| `CLASE_YA_ULTIMA` | 400 | La clase ya está en la última posición | Mostrar mensaje |
| `CARGO_YA_ASIGNADO_UNICO` | 400 | Ese cargo único ya está asignado en la unidad | Mostrar mensaje |
| `USUARIO_CI_DUPLICADO` | 400 | Ya existe una persona registrada con ese C.I. | Mostrar mensaje / corregir C.I. |
| `PRIMER_ACCESO_REQUERIDO` | 401 | Debe completar el primer acceso con su correo y C.I. | Ofrecer la pantalla de primer acceso |
| `PRIMER_ACCESO_INVALIDO` | 401 | Los datos de primer acceso no son válidos | Mostrar mensaje |
| `VALIDATION_FAILED` | 400 | Error de validación | Traducir reglas class-validator |
| `UNAUTHORIZED` | 401 | No autenticado | Logout + redirect a login |
| `FORBIDDEN` | 403 | Sin permisos para realizar esta acción | Snackbar de permisos |
| `NOT_FOUND` | 404 | Registro no encontrado | Mostrar mensaje |
| `INTERNAL_ERROR` | 500 | Error de servidor | Mostrar mensaje genérico |
| `REQUEST_ERROR` | 400 | Error en la solicitud | Mostrar message / fallback |

El frontend (`parseApiError`) prioriza `errorCode` → mensaje amigable y degrada a `message` si el código no existe.

## Estructura

```
backend/
├── src/
│   ├── main.ts
│   ├── data-source.ts              # CLI TypeORM (migraciones)
│   ├── database/
│   │   ├── run-seeder.ts
│   │   ├── seed-1/
│   │   │   ├── etl-data.seeder.ts  # seed por defecto
│   │   │   ├── etl-snapshot.sql    # datos del ETL (commit al repo)
│   │   │   ├── export-snapshot.ts  # npm run seed:export
│   │   │   └── catalogos.seeder.ts
│   │   └── etl/                    # ScriptETL opcional (dump → mof_db)
│   ├── migrations/
│   └── modules/
│       ├── auth/
│       ├── catalogos/
│       ├── unidades/
│       ├── cargos/
│       ├── personas/
│       └── versiones/
├── Dockerfile
├── .env.example
└── package.json
```

## Scripts útiles

| Script | Descripción |
|--------|-------------|
| `npm run build` | Compila a `dist/` |
| `npm run start:dev` | Desarrollo con watch |
| `npm run start:prod` | Producción (`node dist/main`) |
| `npm run lint` | ESLint |
| `npm run test` | Tests unitarios |
| `npm run test:e2e` | Tests e2e |
| `npm run migration:generate` | Genera migración (TypeORM) |
| `npm run migration:run` | Ejecuta migraciones |
| `npm run migration:revert` | Revierte última migración |
| `npm run seed` | Carga el snapshot ETL |
| `npm run seed -- --force` | Trunca y recarga el snapshot |
| `npm run seed:auth` | Usuario administrador inicial |
| `npm run seed:catalogos` | Solo catálogos mínimos |
| `npm run seed:export` | Regenera `seed-1/etl-snapshot.sql` desde `mof_db` |
| `npm run seed:cargos:extract` | Excel → `cargos-dataset.json` |
| `npm run seed:cargos` | Upsert de cargos (nivel/ámbito) sin romper FKs |
| `npm run etl:umsa` | ScriptETL (requiere `umsa_legacy`; ver `src/database/etl/README.md`) |
