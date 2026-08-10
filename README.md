# backend-MOF

Backend NestJS del sistema MOF. Esqueleto de arquitectura clonado desde el backend MPP (NestJS 11 + TypeORM + PostgreSQL), **sin lógica de negocio ni mapeo de entidades** (tickets posteriores).

## Stack

- NestJS 11
- TypeORM + PostgreSQL (`synchronize: false`)
- Passport JWT / Local
- Swagger en `/api`
- Jest (unit + e2e)

## Estructura

```
backend-MOF/
├── src/
│   ├── main.ts                 # CORS, ValidationPipe, Swagger "MOF API"
│   ├── app.module.ts           # Solo AuthModule + VersionesModule
│   ├── app.controller.ts
│   ├── app.service.ts
│   ├── data-source.ts          # DataSource CLI (migraciones)
│   ├── database/
│   │   ├── run-seeder.ts
│   │   ├── seed-1/             # vacío (pendiente)
│   │   ├── seed-2/
│   │   └── seed-3/
│   ├── migrations/             # vacío (pendiente)
│   └── modules/
│       ├── auth/               # esqueleto (sin SeguridadModule)
│       └── versiones/          # esqueleto (sin entidades reales)
├── test/
├── Dockerfile
├── .env.example
└── package.json                # name: backend-mof
```

## Requisitos

- Node.js 20+
- PostgreSQL
- npm

## Configuración

```bash
cp .env.example .env
```

Ajusta `DB_*`, `PORT`, `JWT_SECRET` y `JWT_EXPIRES_IN` según tu entorno. Para Docker, usa `.env.docker.example` como referencia (`DB_HOST=db`).

## Instalación y ejecución

```bash
npm install
npm run start:dev
```

- API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`

### Scripts útiles

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
| `npm run seed -- <ruta>` | Ejecuta un seeder (`run-seeder.ts`) |

## Estado actual

- Configuración raíz y bootstrap listos.
- Módulos `auth` y `versiones` como esqueletos compilables (sin lógica).
- Sin entidades TypeORM, migraciones ni seeds de datos.
- Login real, auditoría y mapeo de tablas: tickets posteriores.
