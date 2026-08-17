# ETL: dump umsa_db → esquema MOF (Nest)

Migra datos de [`backendSpringSMAU/database/umsa_db.sql`](../../../backendSpringSMAU/database/umsa_db.sql) hacia la BD nueva `mof_db`.

## Fuente según el dump

El script detecta automáticamente de dónde leer el organigrama:

| Si hay filas en… | Lee catálogos / unidades / hijas de |
|------------------|-------------------------------------|
| `mof.unidad`     | schema **`mof`** (`clase`, `tipo`, `nivel`, `relacion`, `unidad_*`) |
| si no            | schema **`umsa`** (dump anterior) |

Personas, cargos y `asignacion_personal` siempre salen de **`umsa`**.

En el dump actual (2026-08-12) `umsa.unidad` está vacío; el organigrama real (~159 unidades) está en `mof.*`.

## 1. Restaurar el dump en una BD temporal

```bash
# Desde la raíz del monorepo o con ruta absoluta al dump
dropdb -U postgres --if-exists umsa_legacy
createdb -U postgres umsa_legacy

# El dump puede pedir roles/schemas (root); si falla por OWNER, usa:
psql -U postgres -d umsa_legacy -v ON_ERROR_STOP=0 -f backendSpringSMAU/database/umsa_db.sql
```

Verifica:

```bash
psql -U postgres -d umsa_legacy -c "SELECT COUNT(*) FROM mof.unidad;"
psql -U postgres -d umsa_legacy -c "SELECT COUNT(*) FROM umsa.cargo;"
```

## 2. Configurar `.env` en backend-MOF

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=123456
DB_DATABASE=mof_db

LEGACY_DB_HOST=localhost
LEGACY_DB_PORT=5432
LEGACY_DB_USERNAME=postgres
LEGACY_DB_PASSWORD=123456
LEGACY_DB_DATABASE=umsa_legacy
```

## 3. Asegurar schema destino

```bash
cd backend-MOF
npm run migration:run
```

## 4. Ejecutar el ETL

```bash
# Solo simulación (no escribe)
npm run etl:umsa -- --dry-run

# Carga limpia recomendada (trunca tablas MOF de dominio y migra)
npm run etl:umsa -- --truncate

# Upsert sin truncar (ON CONFLICT por id)
npm run etl:umsa
```

## Qué migra / qué no

| Origen | Destino |
|--------|---------|
| seed + `mof.tipo/nivel/relacion` | `catalogo_tipo` A/B/C (+N/Z), `catalogo_nivel` D/E/O, `catalogo_relacion` L/S/F/X |
| `mof.clase` (o `umsa.tipo_unidad`) | `tipo_unidad` (genera `codigo`) |
| `umsa.persona` | `persona` |
| `umsa.cargo` | `cargo` |
| `mof.unidad` (o `umsa.unidad`) | `unidad` (2 pases parent; genera `sigla`) |
| `*.unidad_funcion` | `unidad_funcion` |
| `*.unidad_dependencia` | `unidad_dependencia_funcional` |
| `*.unidad_relexterno` / `_relinterno` | relaciones |
| `umsa.unidad_parent` | `unidad_jerarquia_hist` (si hay filas) |
| `umsa.asignacion_personal` | `cargo_unidad` + `asignacion_cargo` (si hay persona) |

**No migra:** `public.*`, usuarios/roles MOF, auditoría, `mof.mof` (versión Spring).

## Checklist de verificación

Tras `--truncate`, comparar counts impresos al final del script:

- `mof.unidad` ≈ `unidad`
- `mof.clase` ≈ `tipo_unidad`
- `umsa.cargo` ≈ `cargo`
- `mof.unidad_funcion` ≈ `unidad_funcion`
- Spot-check:

```sql
-- Destino
SELECT id, codigo, sigla, tipo_id, nivel_id, relacion_id, parent_id FROM unidad LIMIT 20;
SELECT u.codigo, ct.codigo AS tipo, cn.codigo AS nivel
FROM unidad u
JOIN catalogo_tipo ct ON ct.id = u.tipo_id
JOIN catalogo_nivel cn ON cn.id = u.nivel_id;
```

## Notas

- IDs de origen se preservan (`unidad.id`, `clase.id` → `tipo_unidad.id`, etc.).
- Catálogos MOF Spring (enteros) se mapean a códigos de 1 letra del esquema nuevo.
- Si `asignacion_personal.administrativo` es NULL, solo se crea `cargo_unidad`.

Tras un ETL exitoso, regenera el seed que viaja con el repo:

```bash
npm run seed:export   # escribe src/database/seed-1/etl-snapshot.sql
```

Quien clone `backend-MOF` no necesita el dump ni `umsa_legacy`: `npm run migration:run && npm run seed`.
