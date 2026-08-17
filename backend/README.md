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
| `cargo` | 23 |
| `persona` | 3 |
| `cargo_unidad` | 197 |
| `catalogo_tipo` / `catalogo_nivel` / `catalogo_relacion` | A/B/C/N/Z, D/E/O, L/S/F/X |

### Otros seeders

| Script | Uso |
|--------|-----|
| `npm run seed` | Snapshot ETL (recomendado al clonar) |
| `npm run seed -- --force` | Trunca tablas de dominio y recarga el snapshot |
| `npm run seed:catalogos` | Solo catálogos mínimos (A/B/C, D/E/O, L/S), sin organigrama |
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
| `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` | PostgreSQL destino (`mof_db`) |
| `JWT_SECRET`, `JWT_EXPIRES_IN` | Auth JWT |
| `LEGACY_DB_*` | Solo para ScriptETL (BD temporal `umsa_legacy`) |

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
| `npm run seed:catalogos` | Solo catálogos mínimos |
| `npm run seed:export` | Regenera `seed-1/etl-snapshot.sql` desde `mof_db` |
| `npm run etl:umsa` | ScriptETL (requiere `umsa_legacy`; ver `src/database/etl/README.md`) |
