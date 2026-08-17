# Frontend MOF

Cliente web del Manual de Organización y Funciones (MOF). Permite administrar la estructura organizacional con organigramas interactivos y catálogos jerárquicos.

## Tecnologías

- Vue 3 (Composition API)
- Vite
- Vuetify 3
- Pinia
- Vue Flow + Dagre
- jsPDF y html-to-image

## Requisitos

- Node.js 18+ (20 recomendado)
- npm
- El backend de este monorepo corriendo en `http://localhost:3000`

Para levantar **frontend + backend + postgres** juntos, usa Docker desde la raíz (ver el [README raíz](../README.md)).

## Instalación (modo manual)

```bash
git clone https://github.com/AIVERKE/MOF.git
cd MOF/frontend
cp .env.example .env
npm install
npm run dev
```

La aplicación queda en `http://localhost:5173`.

Si estás en PowerShell y no tienes `cp`:

```powershell
Copy-Item .env.example .env
```

## Variables de entorno

`.env.example` define la URL del API:

```
VITE_API_BASE_URL=http://localhost:3000
```

La configuración centralizada está en `src/config/api.js`.

## Estructura

- `src/views/MOF/`: vistas del módulo (organigrama, unidades, catálogos, dashboards).
- `src/stores/`: comunicación con el API (Pinia).
- `src/utils/mofHelpers.js`: pesos jerárquicos y formateo.

## Comandos

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Vite). |
| `npm run build` | Build de producción en `dist/`. |
| `npm run preview` | Previsualiza el build de producción. |
