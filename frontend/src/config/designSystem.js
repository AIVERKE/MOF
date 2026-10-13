/**
 * ==============================================================================
 * ARCHIVO MAESTRO DE DISEÑO (DESIGN SYSTEM MASTER) - SISTEMA MOF
 * ==============================================================================
 * Fuente única de la verdad para tokens, paleta institucional (Modo Claro y Oscuro),
 * modos de accesibilidad daltónica, tipografía Urbanist, botones M3 y defaults de Vuetify.
 */

// 1. Tokens de Modo Claro (Light Mode) - Paleta Institucional
export const LIGHT_THEME_TOKENS = {
  // Capas de Profundidad
  canvas: '#E4F1DD', // Capa 0: Fondo general de pantalla (Marfil Suave)
  surface: '#FFFFFF', // Capa 1: Tarjetas, tablas y paneles (Blanco Puro)
  border: '#3C6893', // Borde perimetral (Azul Acero)
  borderRgba: 'rgba(60, 104, 147, 0.20)',

  // Colores Institucionales y de Acción
  petroleo: '#1A4756', // Azul Petróleo (Títulos, navegación, botones estándar)
  turquesa: '#028191', // Turquesa (Interacción, foco, enlaces, tabs activas)
  marfil: '#E4F1DD', // Marfil / Crema suave
  acero: '#3C6893', // Azul Acero (Subtítulos, bordes, cancelar)
  coral: '#F04D65', // Coral (CTA Principal: Guardar / Crear / Badges de conteo)

  // Feedback y Estados
  rojo: '#D93852', // Rojo Sobrio (Peligro, eliminar, errores críticos)
  verde: '#2E8B57', // Verde Esmeralda (Éxito, activo, switches habilitados)
  ambar: '#E69F00', // Ámbar (Advertencias, pendientes)
  ambarBg: '#FFF3E0', // Fondo ámbar suave para chips
  ambarText: '#B45309', // Texto ámbar oscuro legible

  // Tipografía y Neutrales Slate
  titleColor: '#1A4756',
  subtitleColor: '#3C6893',
  textMain: '#1E293B', // Slate Oscuro (Texto de cuerpo, lectura continua)
  textMuted: '#64748B', // Gris Neutro (Hints, captions, subtítulos secundarios)
  placeholder: '#94A3B8', // Gris claro para placeholders
  gridline: '#E2E8F0', // Cuadrícula sutil de gráficos y divisores
  tableHover: 'rgba(228, 241, 221, 0.50)',
  tableHeadBg: 'rgba(26, 71, 86, 0.06)',
};

// 2. Tokens de Modo Oscuro Institucional (Dark Mode - Petróleo Noche)
// Derivado armónicamente de la paleta institucional para descanso visual nocturno
export const DARK_THEME_TOKENS = {
  // Capas de Profundidad
  canvas: '#0A1920', // Capa 0: Pizarra Petróleo Profundo (descanso visual nocturno)
  surface: '#132630', // Capa 1: Superficie elevada de tarjetas en petróleo noche
  border: '#5C8BB8', // Borde perimetral nocturno
  borderRgba: 'rgba(112, 153, 194, 0.25)',

  // Colores Institucionales y de Acción Nocturnos
  petroleo: '#3BA3B8', // Versión clara y luminosa del azul petróleo
  turquesa: '#00BCD4', // Turquesa brillante accesible sobre fondo oscuro
  marfil: 'rgba(228, 241, 221, 0.12)', // Tint marfil sutil para hovers
  acero: '#82A7CD', // Azul Acero luminoso para subtítulos
  coral: '#F45D74', // Coral vibrante M3 para CTA nocturno

  // Feedback y Estados
  rojo: '#F87171', // Rojo legible sobre oscuro
  verde: '#34D399', // Verde esmeralda luminoso
  ambar: '#FBBF24', // Ámbar accesible
  ambarBg: 'rgba(245, 158, 11, 0.15)',
  ambarText: '#FCD34D',

  // Tipografía y Neutrales
  titleColor: '#E4F1DD', // El marfil institucional ilumina los títulos nocturnos con calidez
  subtitleColor: '#82A7CD',
  textMain: '#F1F5F9', // Slate claro de alto contraste
  textMuted: '#94A3B8',
  placeholder: '#64748B',
  gridline: '#1E3845',
  tableHover: 'rgba(2, 129, 145, 0.20)',
  tableHeadBg: 'rgba(30, 56, 69, 0.85)',
};

// Alias por defecto
export const THEME_COLORS = LIGHT_THEME_TOKENS;

// 3. Secuencia Estricta de 5 Colores para Gráficos (Highcharts / ApexCharts)
export const SERIES_COLORS = [
  '#1A4756', // Serie 1 (Categoría Principal / Mayor volumen)
  '#028191', // Serie 2 (Segunda categoría / Comparativa)
  '#F04D65', // Serie 3 (Categoría destacada, alerta o meta)
  '#3C6893', // Serie 4 (Categoría complementaria / Histórico)
  '#2E8B57', // Serie 5 (Categoría exitosa / Aprobados)
];

// 4. Defaults Globales para Vuetify 3 (Material Design 3)
export const vuetifyDefaults = {
  VCard: {
    elevation: 0,
    rounded: 'xl', // Radio de 16px para tarjetas
    color: 'surface',
  },
  VBtn: {
    rounded: 'lg', // Bordes redondeados M3
    elevation: 0,
  },
  VTextField: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'accent', // Foco en turquesa
  },
  VSelect: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'accent',
  },
  VAutocomplete: {
    variant: 'outlined',
    density: 'comfortable',
    color: 'accent',
  },
  VTooltip: {
    color: '#1A4756', // Tooltip oscuro petróleo
  },
  VProgressLinear: {
    color: 'accent',
    rounded: true,
  },
  VProgressCircular: {
    color: 'primary',
  },
};
