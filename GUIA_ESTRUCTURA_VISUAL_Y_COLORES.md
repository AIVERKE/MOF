# Guía de Estructura Visual, Componentes y Asignación de Colores
**Sistema S-MAU (Manual de Organización y Funciones - UMSA)**  
*Documento de referencia para reestructuración de diseño e identidad visual*

---

## 1. Arquitectura Visual del Frontend

El sistema está construido sobre el ecosistema **Vue 3 + Vuetify 3 (v3.10.x)** complementado con:
- **@mdi/font**: Iconografía Material Design Icons.
- **@vue-flow**: Visualizador interactivo del organigrama institucional con Dagre layout.
- **Highcharts / highcharts-vue**: Gráficos analíticos y dashboards ejecutivos/facultativos.
- **CSS centralizado**: [frontend/src/style.css](file:///D:/MOF/frontend/src/style.css) con escala tipográfica *Inter* y utilidades Slate.
- **Sistema de Temas**: [frontend/src/plugins/themes.js](file:///D:/MOF/frontend/src/plugins/themes.js) con 5 temas nativos (Claro, Oscuro y 3 modos para accesibilidad daltónica: Protanopia, Deuteranopia, Tritanopia).

---

## 2. Inventario Completo de Componentes Visuales

A continuación se detalla cada componente presente en el sistema, su ubicación en el código y el rol de color que desempeña.

### 2.1. Barras y Navegación (Bars & Headers)

| Componente | Archivo Fuente | Rol en la Interfaz | Cómo toma el color actualmente |
| :--- | :--- | :--- | :--- |
| **`v-app-bar`** | [AppLayout.vue](file:///D:/MOF/frontend/src/components/layout/AppLayout.vue) | Barra superior fija del sistema (70px). Contiene el logo S-MAU, selector de tema, notificaciones y menú de perfil. | Fondo `surface`, título con icono `primary`, borde inferior `neutral-300` (claro) / `neutral-700` (oscuro). |
| **`v-navigation-drawer`** | [AppLayout.vue](file:///D:/MOF/frontend/src/components/layout/AppLayout.vue) | Menú lateral deslizable y redimensionable en escritorio. Contiene enlaces con iconos (`v-list-item`) y grupos colapsables (`v-list-group`). | Fondo `surface`, texto de ítems `.text-slate-800` / `.text-slate-600`, enlaces activos resaltados con `primary`. |
| **`v-bottom-navigation`** | [AppLayout.vue](file:///D:/MOF/frontend/src/components/layout/AppLayout.vue) | Barra de navegación fija inferior para dispositivos móviles (`smAndDown`). | `color="primary"`, fondo `surface`. |
| **`v-toolbar` (Paneles)** | [HierarchyManagerDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/clases/HierarchyManagerDrawer.vue)<br>[UnidadDetailsDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadDetailsDrawer.vue) | Cabecera superior compacta dentro de los cajones laterales. | - En Catálogos: `color="secondary"`.<br>- En Ficha de Unidad: `color="detailData?.color || 'primary'"` (dinámico por unidad). |
| **Encabezados y Breadcrumbs** | En todas las vistas (`ListarUnidades`, `Organigrama`, `Usuarios`, `Dashboards`) | Títulos de página `text-h4` / `text-h5` con iconos institucionales y ruta de navegación. | Título en `.text-slate-800`, subtítulo en `.text-slate-500`, ítem activo en `.text-primary`. |

---

### 2.2. Barras de Carga, Spinners y Estados (Loading & Feedback)

| Componente | Archivo Fuente | Rol en la Interfaz | Cómo toma el color actualmente |
| :--- | :--- | :--- | :--- |
| **`v-progress-linear`** | [ListarUnidades.vue](file:///D:/MOF/frontend/src/views/MOF/ListarUnidades.vue)<br>[OrganigramaVueFlow.vue](file:///D:/MOF/frontend/src/views/MOF/OrganigramaVueFlow.vue)<br>[TreeUnidades.vue](file:///D:/MOF/frontend/src/views/MOF/TreeUnidades.vue)<br>[HierarchyManagerDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/clases/HierarchyManagerDrawer.vue)<br>[Configuracion.vue](file:///D:/MOF/frontend/src/views/Configuracion.vue) | Barra delgada horizontal de carga indeterminada (2px a 6px) sobre tablas, tarjetas y drawers. | `color="primary"`. |
| **`v-progress-circular`** | [MofLoadingOverlay.vue](file:///D:/MOF/frontend/src/views/MOF/common/MofLoadingOverlay.vue)<br>[Login.vue](file:///D:/MOF/frontend/src/views/Login.vue)<br>Vistas con tarjetas | Spinner circular para indicar proceso en segundo plano. | `color="primary"` en vistas, `color="white"` dentro de botones de envío. |
| **`MofLoadingOverlay.vue`** | [MofLoadingOverlay.vue](file:///D:/MOF/frontend/src/views/MOF/common/MofLoadingOverlay.vue) | Modal flotante translúcido (`v-overlay`) para exportaciones de reportes PDF y CSV. | Tarjeta `bg-white text-slate-800` (claro) o `bg-grey-darken-4 text-white` (oscuro), spinner `primary`. |
| **`v-empty-state`** | [OrganigramaVueFlow.vue](file:///D:/MOF/frontend/src/views/MOF/OrganigramaVueFlow.vue) | Pantalla de estado cuando no hay datos o cuando se bloquea una vista (ej. organigrama en móvil vertical). | Icono slate neutro, botón CTA `color="primary"`. |

---

### 2.3. Botones y Acciones (Buttons & Toggles)

| Categoría | Variantes Vuetify | Dónde se utiliza | Asignación de Color |
| :--- | :--- | :--- | :--- |
| **Botón Primario** | `variant="flat"`, `variant="elevated"` | "Guardar Unidad", "Nuevo Usuario", "Añadir Raíz", "Ingresar al Sistema". | `color="primary"`, texto blanco de alto contraste (`#FFFFFF`). |
| **Botón Secundario / Tonal** | `variant="tonal"` | "PDF", "Jerarquías", "Guardar defaults" en configuración. | `color="primary"` o `color="secondary"`, fondo con opacidad del 15% y texto del color base. |
| **Botón Neutro / Contorno** | `variant="outlined"` | "Limpiar filtros", botones de cancelar. | `color="grey-darken-2"`, borde slate. |
| **Botón de Texto** | `variant="text"` | "Cancelar", "Cerrar", enlaces secundarios. | `variant="text"`, hereda texto neutro o `primary`. |
| **Botones de Alternancia (`v-btn-toggle`)** | `variant="outlined"`, `rounded="lg"` | - Modos de vista: `INTEGRAL`, `ANALÍTICA`, `OFICIAL`.<br>- Modo Tabla vs Modo Tarjetas móvil.<br>- Tipo de gráfico: Barras (`column`) vs Circular (`pie`).<br>- Filtro de usuarios: Activos / Inactivos / Todos.<br>- Lado en organigrama: Izquierda / Centro / Derecha. | El botón seleccionado toma `color="primary"` (en oscuro se aplica estilo específico en [style.css](file:///D:/MOF/frontend/src/style.css)). |
| **Botones de Icono de Acción Rápida** | `icon`, `variant="text"`, `density="compact"` | Acciones directas por fila en tablas y nodos: | - Ver ficha: `color="blue-darken-2"`<br>- PDF: `color="red-darken-2"`<br>- Editar: `color="orange-darken-2"` / `warning`<br>- Eliminar: `color="error"`<br>- Mover arriba/abajo: `color="primary"` |
| **Menús Desplegables de Botón** | `MofReportMenu.vue`<br>`UnidadActionsMenu.vue` | Menú desplegable de 3 puntos (`mdi-dots-vertical`) y menú "Descargar PDF / CSV". | Botón activador tonal/flat; lista emergente con iconos semánticos (Rojo para PDF, Verde para CSV, Azul para ver). |

---

### 2.4. Formularios y Controles de Entrada (Inputs)

| Componente | Variantes en el Sistema | Dónde se utiliza | Comportamiento de Color |
| :--- | :--- | :--- | :--- |
| **`v-text-field`** | - `variant="underlined"` (diálogos de edición)<br>- `variant="outlined"` (búsquedas y logins) | [UnidadFormDialog.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadFormDialog.vue)<br>[Login.vue](file:///D:/MOF/frontend/src/views/Login.vue)<br>[Usuarios.vue](file:///D:/MOF/frontend/src/views/Usuarios.vue) | Línea base neutra, al enfocar se ilumina con `primary`. Mensajes de validación en `error` y textos de ayuda en `.v-messages__message` (WCAG Slate 700 / Slate 300). |
| **`v-textarea`** | `variant="underlined"`, `auto-grow` | Objetivos institucionales, funciones, trámites y razones de reasignación. | Hereda el foco `primary`. |
| **`v-select` / `v-autocomplete`** | `variant="outlined"`, `density="compact"` | Selectores modulares de catálogo: `SelectAllTipos`, `SelectAllNiveles`, `SelectAllRelaciones`, `SelectAllClases`, `SelectAllCargos`, `SelectAllUnidades`. | Borde neutro slate, foco `primary`, chips de selección integrados. |
| **`v-switch`** | `density="comfortable"`, `inset` | - "¿Es Unidad Oficial?"<br>- "¿Es Troncal Principal?"<br>- "¿Es Sub-troncal?"<br>- Estado de usuario Activo/Inactivo | `color="primary"` (activo) o `color="teal-darken-1"`. Inactivo permanece en gris neutro. |
| **`v-checkbox` / `v-checkbox-btn`** | Estándar | Selección múltiple de permisos o asignaciones. | `color="primary"`. |
| **`v-color-picker` e inputs hex** | Modo swatches | Personalización de color de unidad y matriz de paleta institucional en Configuración. | Paleta de 16 colores base institucionales (`swatches`). |

---

### 2.5. Tablas y Estructuras de Datos (Data Display)

| Componente | Archivo Fuente | Aspecto y Tratamiento de Color |
| :--- | :--- | :--- |
| **`v-data-table`** | [ListarUnidades.vue](file:///D:/MOF/frontend/src/views/MOF/ListarUnidades.vue)<br>[Usuarios.vue](file:///D:/MOF/frontend/src/views/Usuarios.vue)<br>[Auditoria.vue](file:///D:/MOF/frontend/src/views/Auditoria.vue) | Cabeceras de tabla con clase `.bg-indigo-lighten-5` o borders slate, hover sobre filas, y **barra indicadora vertical de 4px** al inicio de cada fila con el color de la clase institucional de la unidad. |
| **`v-table` (Tablas compactas)** | [UnidadFormDialog.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadFormDialog.vue) | Tabla interna para listar Funciones y Base Legal. Posee divisores reforzados `.border-r-slate` y `.border-b-slate`. |
| **Árbol de Jerarquías** | [TreeUnidades.vue](file:///D:/MOF/frontend/src/views/MOF/TreeUnidades.vue) | Nodos con sangría visual, conectores de nivel, iconos de estado y chips de clase. |
| **Tarjetas Móviles (`isCardView`)** | [ListarUnidades.vue](file:///D:/MOF/frontend/src/views/MOF/ListarUnidades.vue)<br>[DashboardEjecutivo.vue](file:///D:/MOF/frontend/src/views/MOF/DashboardEjecutivo.vue) | Reemplazo responsive de tabla para teléfonos: tarjetas con borde izquierdo de 6px del color de la unidad y chips alineados. |

---

### 2.6. Tarjetas, Acordeones y Pestañas (Containers)

| Componente | Archivo Fuente | Función y Color |
| :--- | :--- | :--- |
| **`v-card`** | En todas las vistas | Tarjetas contenedoras principales con `elevation="1"` a `"3"`, esquinas redondeadas (`rounded-xl` / `rounded-lg`) y borde fino `.border-slate-200`. |
| **Tarjetas KPI de Métricas** | [Home.vue](file:///D:/MOF/frontend/src/views/Home.vue)<br>[DashboardEjecutivo.vue](file:///D:/MOF/frontend/src/views/MOF/DashboardEjecutivo.vue) | Cajas destacadas de estadísticas con fondos en gradiente (`linear-gradient(135deg, #667EEA 0%, #764BA2 100%)`) o `color="primary"` con texto blanco de alto contraste. |
| **`v-expansion-panels` (Acordeón)** | [UnidadDetailsDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadDetailsDrawer.vue)<br>[OrganigramaVueFlow.vue](file:///D:/MOF/frontend/src/views/MOF/OrganigramaVueFlow.vue) | - Ficha Técnica: 10 paneles temáticos con títulos en `text-primary` y badges de conteo.<br>- Organigrama: Panel superior colapsable de filtros. |
| **`v-tabs` & `v-window`** | [HierarchyManagerDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/clases/HierarchyManagerDrawer.vue)<br>[Configuracion.vue](file:///D:/MOF/frontend/src/views/Configuracion.vue) | Pestañas de navegación interna (Instancias, Niveles, Tipos, Relaciones, Cargos). La pestaña activa toma `color="primary"`. |

---

### 2.7. Diálogos, Modales y Drawers Laterales (Modals)

| Ventana / Diálogo | Archivo | Semántica y Color Recomendado |
| :--- | :--- | :--- |
| **Edición de Unidad (`UnidadFormDialog`)** | [UnidadFormDialog.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadFormDialog.vue) | Modal amplio o fullscreen en móvil. Estilo neutro con botones primarios `primary` y selector de color integrado. |
| **Eliminar Unidad (`UnidadDeleteDialog`)** | [UnidadDeleteDialog.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadDeleteDialog.vue) | Diálogo destructivo: título y botón principal en `error` (`#EF4444`). |
| **Cambio de Dependencia (`UnidadDependencyDialog`)** | [UnidadDependencyDialog.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadDependencyDialog.vue) | Diálogo de precaución: alerta tonal en `warning` (`#F59E0B`) y botón `primary`. |
| **Ficha Técnica (`UnidadDetailsDrawer`)** | [UnidadDetailsDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadDetailsDrawer.vue) | Cajón deslizante derecho (redimensionable). Su barra superior toma el color de la unidad seleccionada. |
| **Gestión de Jerarquías (`HierarchyManagerDrawer`)** | [HierarchyManagerDrawer.vue](file:///D:/MOF/frontend/src/views/MOF/clases/HierarchyManagerDrawer.vue) | Cajón deslizante derecho para catálogos. Barra superior en `secondary`. |

---

### 2.8. Chips, Badges y Estados (Indicators)

| Elemento | Componente / Clase | Dónde se muestra | Color asignado |
| :--- | :--- | :--- | :--- |
| **Sigla Institucional** | `.chip-sigla` (`v-chip`) | Listado, Árbol y Ficha | `variant="outlined"`, `color="primary"`. |
| **Clase / Instancia** | `.chip-clase` (`v-chip`) | Listado, Nodos, Tablas | **Color dinámico de la clase** asignado desde BD (`clase.color`) con contraste automático calculado para el texto (blanco o negro). |
| **Nivel Jerárquico** | `.chip-nivel` (`v-chip`) | Listado y Ficha | `variant="tonal"`, `color="indigo-darken-2"`. |
| **Oficial / No Oficial** | Texto / Etiqueta | Listado y Organigrama | Verde (`success`) para "OFICIAL", Gris (`#94A3B8`) o fila atenuada para "NO OFICIAL". En modo daltónico se sustituye por azul. |
| **Roles de Usuario** | `v-chip` | Vista Usuarios | `ADMIN` (`deep-purple`), `OPERADOR` (`primary`), `USER` (`grey`). |
| **Badges numéricos** | `v-badge` | Pestañas de catálogos | Fondo `grey` o `primary`. |
| **Avatar de Usuario** | `v-avatar` | AppBar y Listas | Fondo `primary` o `indigo-lighten-4` con iniciales en alto contraste. |

---

### 2.9. Alertas y Notificaciones (Feedback)

| Componente | Archivo / Uso | Variantes y Colores |
| :--- | :--- | :--- |
| **`v-alert`** | Alertas informativas de dashboards, advertencias de formularios, mensajes de error en Login. | `variant="tonal"`, tipos: `info` (Cyan/Azul), `success` (Verde), `warning` (Ámbar), `error` (Rojo). |
| **`v-snackbar`** | Notificación emergente (Toast) gestionada con `useSnackbar()`. | Colores dinámicos: `success` (guardado exitoso), `error` (fallo de API), `warning` (validación). |
| **`v-tooltip`** | Tooltips presentes en prácticamente todos los botones de iconos y chips. | Fondo oscuro estándar del sistema con texto blanco contrastante. |

---

### 2.10. Organigrama Interactivo y Gráficos (Data Visualization)

| Elemento | Tecnología | Color / Estilo |
| :--- | :--- | :--- |
| **Nodos del Organigrama** | `@vue-flow` (`.custom-node`) | Fondo blanco/oscuro con barra superior del color de su Clase. Al navegar por teclado toma un foco accesible azul (`#2563EB` en claro, `#60A5FA` en oscuro). |
| **Líneas y Conectores** | `@vue-flow` (`.vue-flow__edge-path`) | Negro sólido (`#000000`, 3px) en modo claro y gris claro (`#E2E8F0`, 3px) en modo oscuro. |
| **Controles Flotantes de Zoom** | Botones flotantes (`.floating-zoom-panel`) | Botones elevados con fondo `surface` e iconos neutros. |
| **Filtros de Color de Nodos (`FILTER_COLORS`)** | [OrganigramaVueFlow.vue](file:///D:/MOF/frontend/src/views/MOF/OrganigramaVueFlow.vue) | - Unidad seleccionada: `#047857` (Verde esmeralda)<br>- Dependencia funcional: `#B91C1C` (Rojo intenso)<br>- Búsqueda activa: `#B45309` (Ámbar)<br>- Filtro por nivel: `#6D28D9` (Violeta)<br>- Filtro por tipo: `#0369A1` (Cielo)<br>- Filtro por clase: `#C2410C` (Naranja) |
| **Gráficos Highcharts** | `highcharts-vue` | Barras y circulares configurados con colores accesibles en [chartHelpers.js](file:///D:/MOF/frontend/src/utils/chartHelpers.js). |

---

## 3. Matriz de Asignación de Colores y Tokens

El diseño se estructura en **3 capas de color**:

```
┌────────────────────────────────────────────────────────┐
│  CAPA 1: Tokens Globales de Tema (themes.js)           │
│  primary, secondary, accent, surface, background, etc. │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  CAPA 2: Escala Neutra y Superficies (style.css)       │
│  Slate 50 a Slate 900, bordes, divisores, cabeceras    │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│  CAPA 3: Colores Semánticos Institucionales            │
│  Colores de Clases/Nodos en BD y filtros de organigrama│
└────────────────────────────────────────────────────────┘
```

### 3.1. Tokens en `themes.js` y sus Componentes Vinculados

| Token de Vuetify | Rol Recomendado | Componentes que lo consumen |
| :--- | :--- | :--- |
| `primary` | Color principal de identidad (marca). | Botones flat, `v-progress-linear`, `v-progress-circular`, botones toggle activos, `v-switch` activo, pestañas `v-tab` activas, chips de sigla, icono del logo. |
| `secondary` | Color de soporte / complementario. | Toolbar de `HierarchyManagerDrawer`, botones de catálogo, acciones secundarias. |
| `accent` | Acento de contraste para detalles o resaltados. | Indicadores secundarios y bordes de foco. |
| `background` | Fondo global de la ventana (`#app`). | Fondo de toda la aplicación detrás de las tarjetas. |
| `surface` | Fondo de tarjetas y paneles. | Fondos de `v-card`, `v-app-bar`, `v-navigation-drawer`, `v-dialog`, menús desplegables. |
| `success` | Confirmación / estado positivo. | Estado "OFICIAL", snackbars de guardado exitoso, alertas de éxito, switches activos. |
| `warning` | Advertencia / precaución. | Botón de editar (`mdi-pencil`), diálogo de cambio de dependencia, alertas preventivas. |
| `error` | Estado crítico / eliminación. | Botón eliminar (`mdi-delete`), modal de confirmación destructiva, errores de formulario. |
| `info` | Notificaciones y explicaciones. | Alertas contextuales, notas de dashboards, hints descriptivos. |

---

## 4. Guía Paso a Paso para Realizar la Reestructuración

Para aplicar una nueva paleta de colores de forma ordenada y sin romper estilos:

1. **Definir la paleta en [themes.js](file:///D:/MOF/frontend/src/plugins/themes.js)**:
   - Modificar los valores hexadecimales en `lightTheme.colors` y `darkTheme.colors`.
   - Ajustar los temas daltónicos (`protanopiaTheme`, `deuteranopiaTheme`, `tritanopiaTheme`) manteniendo las escalas de contraste Okabe-Ito / Wong recomendadas.

2. **Ajustar superficies neutras en [style.css](file:///D:/MOF/frontend/src/style.css)**:
   - Si se cambia la temperatura de los grises (ej. de Slate azulado a Zinc neutro o Stone cálido), actualizar las clases `.bg-slate-50`, `.bg-slate-100`, `.border-slate-200` y sus equivalentes dentro de `.v-theme--dark`.

3. **Reemplazar clases fijas por variantes del tema**:
   - Actualmente existen clases como `.bg-indigo-lighten-5` en cabeceras de tablas/cards de dashboards. Se recomienda sustituirlas por `bg-primary-lighten-5` o por variables del tema para que reaccionen automáticamente al cambiar el color `primary`.
   - Revisar [UnidadActionsMenu.vue](file:///D:/MOF/frontend/src/views/MOF/unidades/UnidadActionsMenu.vue) donde hay clases como `text-blue-lighten-2` y `bg-grey-darken-4` fijadas en el menú contextual.

4. **Configurar los colores de los Nodos e Instancias**:
   - Los colores de los nodos rectangulares del organigrama (Rectorado, Facultades, Carreras, etc.) se gestionan desde la base de datos a través de la pestaña **Instancias** en el drawer de *Jerarquías* o en [Configuracion.vue](file:///D:/MOF/frontend/src/views/Configuracion.vue).
   - Asegurarse de que cada clase tenga un color con suficiente luminosidad o saturación para que la función `getContrastingTextColor()` calcule correctamente el texto blanco o negro del chip.
