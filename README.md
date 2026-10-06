# MOF MANUAL DE ORGANIZACIÓN Y FUNCIONES - Instalación y ejecución

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
docker compose --profile cli run --rm backend-cli npm run seed:auth
docker compose --profile cli run --rm backend-cli npm run seed
docker compose up -d backend frontend
```

Abrir:

- Frontend: `http://localhost:5173`
- Swagger: `http://localhost:3000/api`

Primer acceso (credenciales de desarrollo):

- Email: `admin@admin.com`
- Password: `admin123`

Estas credenciales son **únicamente para desarrollo**: no se usan ni se siembran en producción. Permiten el acceso inicial en local; los demás usuarios se crean desde la interfaz. Para desplegar, ver [Producción (Docker)](#producción-docker).

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

Crea el usuario administrador inicial (credenciales únicamente de desarrollo: `admin@admin.com` / `admin123`; no correr en producción). Los demás usuarios se crean desde la interfaz del sistema:

```bash
docker compose --profile cli run --rm backend-cli npm run seed:auth
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

Compose publica 3000 y 5173 solo en `127.0.0.1` del host: son URLs de desarrollo y no se alcanzan desde otra máquina.

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

### Producción (Docker)

`docker-compose.yml` es el entorno de desarrollo: fija `NODE_ENV=development` y un `JWT_SECRET` de ejemplo público. En producción se suma el override `docker-compose.prod.yml`, que pone `NODE_ENV=production` y lee `JWT_SECRET` y `CORS_ORIGIN` del host:

```bash
export JWT_SECRET="$(openssl rand -base64 48)"   # guardarlo; rotarlo invalida las sesiones
export CORS_ORIGIN="https://mof-demo.fcpn.edu.bo,https://mof-smau.fcpn.edu.bo"
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

- También se pueden definir en un `.env` en la raíz del repo. Ese archivo está en `.gitignore` y **no se commitea**.
- Compose no levanta si falta `JWT_SECRET` o `CORS_ORIGIN`.
- `CORS_ORIGIN` lleva los dominios públicos sin `:3000`.
- Con `NODE_ENV=production` el backend aborta al arrancar si `JWT_SECRET` es el valor de ejemplo (`super_secret_key_random_string`), `secret`, o tiene menos de 32 caracteres.
- No correr `seed:auth` en producción: la cuenta `admin@admin.com` / `admin123` es solo de desarrollo.

#### Exposición: Apache es el único punto público

```
Internet ── HTTPS 443 ──> Apache (host)
                           ├── /auth/, /api/v1/, /seguridad/, /versiones/ ──> 127.0.0.1:3000 (Nest)
                           └── /                                         ──> 127.0.0.1:5173 (SPA)
```

- Compose publica el backend en `127.0.0.1:3000` y el frontend en `127.0.0.1:5173`. PostgreSQL no tiene puerto publicado. Dentro del contenedor Nest sigue escuchando en `0.0.0.0:3000`; no cambiar `app.listen` a loopback, porque Docker no llegaría al proceso.
- La API **no** se publica en `:3000` hacia Internet. Se consume por `https://<dominio>/auth/...`, `/api/v1/...`, etc.
- `docker-compose.prod.yml` construye el frontend con `VITE_API_BASE_URL` vacío: el SPA llama al API por su mismo origen, así una sola imagen sirve a `mof-demo` y `mof-smau`. La URL se hornea en el build, por eso cada cambio exige `--build`.
- Detrás de Apache, Nest habla HTTP: `HTTPS_KEY_PATH` y `HTTPS_CERT_PATH` van vacías y `TRUST_PROXY` queda en 1 (default en producción).
- El VirtualHost (uno por dominio, con `ProxyPass`/`ProxyPassReverse` para `/auth/`, `/api/v1/`, `/seguridad/` y `/versiones/` antes de `/`, y sin compartir `DocumentRoot` con otra app) lo configura el administrador del servidor.

Orden de despliegue (no invertir; si el 3000 deja de estar publicado mientras el JS viejo apunta a `:3000`, se cae el login):

1. Infraestructura activa los `ProxyPass` hacia `127.0.0.1:3000` y `127.0.0.1:5173`.
2. Desarrollo reconstruye y despliega el frontend sin `:3000`. El backend de MPP pasa a usar `https://mof-smau.fcpn.edu.bo/api/v1/integraciones/mpp/...`.
3. Desarrollo aplica este compose (bind a `127.0.0.1`): desde aquí 3000 y 5173 dejan de ser públicos.
4. Infraestructura deja solo 80/443 abiertos en el firewall (APACHE-002).

Verificación en el servidor:

```bash
ss -ltnp | grep -E ':3000|:5173|:5432'                 # 3000 y 5173 en 127.0.0.1; 5432 no aparece
docker compose exec frontend grep -rl ':3000' /usr/share/nginx/html   # sin resultados
curl -m 5 http://IP_PUBLICA:3000   # desde fuera: debe fallar
```

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

5. Ejecuta migraciones y los seeds:

```bash
npm run migration:run
npm run seed:auth
npm run seed
```

`seed:auth` crea el usuario administrador de desarrollo (`admin@admin.com` / `admin123`) para el primer acceso. Esas credenciales son únicamente de desarrollo: no usar ni sembrar en producción. Los demás usuarios se crean desde la interfaz del sistema.

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
  - Luego el seed de auth: `docker compose --profile cli run --rm backend-cli npm run seed:auth`
  - Luego el seed de organigrama: `docker compose --profile cli run --rm backend-cli npm run seed`
  - Luego: `docker compose up -d backend frontend`.
- Error de conexión a PostgreSQL en backend manual
  - Revisa `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE` en `backend/.env`.
- Frontend sin datos
  - Verifica que backend esté activo en `http://localhost:3000`.
  - Revisa `VITE_API_BASE_URL` en `frontend/.env`.
