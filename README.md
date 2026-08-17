# MOF - Instalación y ejecución

Guía rápida para levantar el Manual de Organización y Funciones en dos modos:

- **Con Docker (recomendado)**: levanta `frontend + backend + postgres` con un solo comando.
- **Sin Docker (manual)**: útil para desarrollo local sin contenedores.

```bash
git clone https://github.com/AIVERKE/MOF.git
cd MOF
```

## Quickstart (30 segundos)

Desde la raíz del proyecto:

```bash
docker compose up --build -d
docker compose run --rm backend npm run migration:run:prod
docker compose --profile cli run --rm backend-cli npm run seed
docker compose up -d backend frontend
```

Abrir:

- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:3000/api`

## Qué incluye el repositorio

- `backend/`: API en NestJS + TypeORM.
- `frontend/`: cliente web en Vue + Vite + Vuetify.
- `docker-compose.yml`: orquestación completa del stack.

## Requisitos

### Opción A - Docker

- Docker Desktop (o Docker Engine).
- Docker Compose v2 (`docker compose`).

Verifica con:

```bash
docker --version
docker compose version
```

### Opción B - Manual (sin Docker)

- Node.js 20 recomendado (18+ compatible).
- npm.
- PostgreSQL (16 recomendado, 14+ compatible).

Verifica con los siguientes comandos:

```bash
node -v
npm -v
psql --version
```

## 1) Levantar todo con Docker (orden recomendado)

Desde la raíz del proyecto:

```bash
docker compose up --build -d
```

Luego ejecuta migraciones (obligatorio la primera vez o con BD vacía):

```bash
docker compose run --rm backend npm run migration:run:prod
```

Carga el snapshot del organigrama (el servicio `backend-cli` usa el stage de build, que incluye `ts-node`):

```bash
docker compose --profile cli run --rm backend-cli npm run seed
```

Finalmente, asegura backend y frontend activos:

```bash
docker compose up -d backend frontend
```

Cuando termine, tendrás disponibles:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:3000`
- Swagger: `http://localhost:3000/api`
- PostgreSQL: disponible solo dentro de la red Docker (no expuesto al host)

### Comandos útiles Docker

Detener servicios:

```bash
docker compose down
```

Detener y borrar volumen de PostgreSQL (reinicio limpio):

```bash
docker compose down -v
```

Ver logs:

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f db
```

Conectarte a PostgreSQL desde tu máquina host no está habilitado en este modo para evitar conflictos de puerto. Si necesitas acceso externo, puedes mapear puertos temporalmente en `docker-compose.yml`.

## 2) Migraciones TypeORM (modo Docker)

Comandos disponibles:

```bash
docker compose run --rm backend npm run migration:run:prod
docker compose run --rm backend npm run migration:revert:prod
```

Usa `run --rm` en lugar de `exec` si `backend` está en restart-loop.

Nota: `migration:generate` se recomienda en modo manual/local (con devDependencies), no en el contenedor runtime de producción.

Para recargar el seed:

```bash
docker compose --profile cli run --rm backend-cli npm run seed -- --force
```

## 3) Levantar proyecto sin Docker (manual)

### Paso A - Backend

1. Entra a la carpeta:

```bash
cd backend
```

2. Instala dependencias:

```bash
npm install
```

3. Crea tu archivo de entorno:

```bash
cp .env.example .env
```

Si estás en PowerShell y no tienes `cp`:

```powershell
Copy-Item .env.example .env
```

4. Asegura que PostgreSQL esté encendido y crea la base configurada en `.env` (por defecto `mof_db`).

5. Ejecuta migraciones y el seed:

```bash
npm run migration:run
npm run seed
```

6. Inicia backend:

```bash
npm run start:dev
```

Detalle de seeders y ETL: [backend/README.md](backend/README.md).

### Paso B - Frontend

En otra terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

Accede al frontend en la URL que muestre Vite (por defecto `http://localhost:5173`).

Detalle del cliente: [frontend/README.md](frontend/README.md).

## 4) Validación rápida

Checklist mínimo después de levantar:

- `http://localhost:5173` carga el frontend.
- `http://localhost:3000/api` abre Swagger.
- El backend responde sin errores de conexión a DB.
- `npm run build` funciona en `backend` y `frontend`.

## 5) CI (GitHub Actions)

Workflows en la raíz del repo:

- Backend: `.github/workflows/backend-ci.yml`
- Frontend: `.github/workflows/frontend-ci.yml`

Ambos se ejecutan en `push` y `pull_request` a `main`, con filtros `paths` para correr solo cuando cambian archivos de su área.

## 6) Problemas comunes

- `docker: command not found`
  - Instala Docker Desktop y reinicia terminal.
- `Container ... is restarting` al correr `docker compose exec backend ...`
  - El backend está en crash-loop. Corre migraciones con:
  - `docker compose run --rm backend npm run migration:run:prod`
  - Luego el seed: `docker compose --profile cli run --rm backend-cli npm run seed`
  - Luego: `docker compose up -d backend frontend`.
- Error de conexión a PostgreSQL en backend manual
  - Revisa `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` en `backend/.env`.
- Frontend sin datos
  - Verifica que backend esté activo en `http://localhost:3000`.
  - Revisa `VITE_API_BASE_URL` en `frontend/.env`.
