# 🎨 Guía Rápida de Estilos y Tokens Maestros (Sistema MOF)

> **Archivo Maestro de Referencia (Design System Master)**  
> Implementado en base a Material Design 3, WCAG AA y la paleta institucional oficial.

---

## 🧭 La Regla Rápida de los 3 Colores de Acción
1. **Navegación y Estructura:** Azul Petróleo (`#1A4756`) y Marfil (`#E4F1DD`).
2. **Interacción y Selección:** Turquesa (`#028191`).
3. **Acción Determinante (Guardar / Crear):** Coral (`#F04D65`).

---

## 📦 1. Botones (Copy & Paste)

| Acción | Apariencia | Código para copiar |
|---|---|---|
| **Guardar / Crear (CTA Principal)** | Coral Sólido | `<v-btn class="btn-cta">Guardar Cambios</v-btn>` |
| **Acción Primaria Estándar** | Petróleo Sólido | `<v-btn class="btn-primary">Buscar / Ingresar</v-btn>` |
| **Acción Secundaria / Herramienta** | Turquesa Tonal (15%) | `<v-btn class="btn-secondary">Exportar / Descargar</v-btn>` |
| **Neutro / Cancelar** | Outlined Azul Acero | `<v-btn class="btn-neutral">Cancelar / Volver</v-btn>` |
| **Peligro / Destructivo** | Rojo Sólido | `<v-btn class="btn-danger">Eliminar Registro</v-btn>` |

---

## 🏷️ 2. Chips y Etiquetas de Estado

```html
<!-- Activo / Aprobado / Vigente -->
<v-chip class="chip-activo">Vigente</v-chip>

<!-- Pendiente / En Revisión -->
<v-chip class="chip-pendiente">En Revisión</v-chip>

<!-- Rechazado / Inactivo -->
<v-chip class="chip-rechazado">Rechazado</v-chip>

<!-- Borrador / Sin Iniciar -->
<v-chip class="chip-borrador">Borrador</v-chip>

<!-- Categoría Informativa -->
<v-chip class="chip-categoria">Dirección General</v-chip>

<!-- Badge de Contador -->
<span class="badge-contador">3 pendientes</span>
```

---

## 🗂️ 3. Tarjetas y Tablas (Automáticas)

Gracias a los **defaults de Vuetify**, cualquier tarjeta o tabla adopta las reglas M3 sin necesidad de clases adicionales:

```html
<!-- La tarjeta ya nace blanca, con radio de 16px y borde sutil al 20% -->
<v-card class="pa-4">
  <v-card-title>Título de la Sección</v-card-title>
  <v-card-subtitle>Descripción o subtítulo explicativo</v-card-subtitle>

  <!-- La tabla ya incluye cabecera en petróleo institucional y hover crema al 50% -->
  <v-table>
    <thead>
      <tr>
        <th>Código</th>
        <th>Nombre de la Unidad</th>
        <th>Estado</th>
        <th class="text-right">Acciones</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>DIR-001</td>
        <td>Rectorado</td>
        <td><v-chip class="chip-activo">Activo</v-chip></td>
        <td class="text-right">
          <!-- Iconos estándar de fila -->
          <v-btn icon="mdi-eye" size="small" variant="text" class="btn-icon-ver" />
          <v-btn icon="mdi-pencil" size="small" variant="text" class="btn-icon-editar" />
          <v-btn icon="mdi-delete" size="small" variant="text" class="btn-icon-eliminar" />
        </td>
      </tr>
    </tbody>
  </v-table>
</v-card>
```

---

## 📊 4. Gráficos Estadísticos (Highcharts)

Para cualquier gráfico nuevo, importa la secuencia oficial de 5 series desde el archivo maestro JS:

```javascript
import { SERIES_COLORS, THEME_COLORS } from '@/config/designSystem';

// Secuencia estricta:
// 1: #1A4756 (Principal)
// 2: #028191 (Comparativa)
// 3: #F04D65 (Meta / Alerta)
// 4: #3C6893 (Histórico)
// 5: #2E8B57 (Exitosos)
```

---

## 📁 Ubicación de los Archivos Maestros
* **Tokens y Lógica JS:** `frontend/src/config/designSystem.js`
* **Estilos y Capas CSS:** `frontend/src/style.css`
* **Fuentes Google:** `frontend/index.html` (Fuente Urbanist)
