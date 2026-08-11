# ETL: umsa_db → esquema MOF

Migra datos del dump antiguo (`backendSpringSMAU/database/umsa_db.sql`, schema `umsa`) hacia la BD nueva `mof_db`.

## 1. Restaurar el dump en una BD temporal

```bash
# Desde la raíz del monorepo o con ruta absoluta al dump
createdb -U postgres umsa_legacy

# El dump es grande y puede pedir roles/schemas; si falla por OWNER, usa:
psql -U postgres -d umsa_legacy -v ON_ERROR_STOP=0 -f backendSpringSMAU/database/umsa_db.sql
```

Verifica que exista el schema:

```bash
psql -U postgres -d umsa_legacy -c "\dn umsa"
psql -U postgres -d umsa_legacy -c "SELECT COUNT(*) FROM umsa.unidad;"
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

| Origen `umsa` | Destino |
|---------------|---------|
| (seed) catálogos A/B/C, D/E/O, L/S | `catalogo_tipo`, `catalogo_nivel`, `catalogo_relacion` |
| `tipo_unidad` | `tipo_unidad` (genera `codigo`) |
| `persona` | `persona` |
| `cargo` | `cargo` |
| `unidad` | `unidad` (2 pases parent; genera `sigla`) |
| `unidad_funcion` | `unidad_funcion` |
| `unidad_dependencia` | `unidad_dependencia_funcional` |
| `unidad_relexterno` / `unidad_relinterno` | relaciones |
| `unidad_parent` | `unidad_jerarquia_hist` |
| `asignacion_personal` | `cargo_unidad` + `asignacion_cargo` (si hay datos) |

**No migra:** `public.*`, usuarios/roles MOF, auditoría.

## Checklist de verificación

Tras `--truncate`, comparar counts impresos al final del script:

- `umsa.unidad` ≈ `unidad`
- `umsa.tipo_unidad` ≈ `tipo_unidad`
- `umsa.cargo` ≈ `cargo`
- `umsa.unidad_funcion` ≈ `unidad_funcion`
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

- Solo se lee schema **`umsa`** (no el organigrama plano de `public.unidad`).
- IDs de origen se preservan (`unidad_id` → `unidad.id`, etc.) y se reajustan secuencias.
- Si el dump no tiene `asignacion_personal`, la fase 9 es no-op.
