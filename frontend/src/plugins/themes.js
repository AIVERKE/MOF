/**
 * Definición de las 5 paletas de tema para el sistema MOF.
 * Basadas en Material Design 3, WCAG AA y d3 Well_palettes / Wong / Okabe-Ito para accesibilidad daltónica.
 */

export const lightTheme = {
  dark: false,
  colors: {
    primary: '#4F46E5', // Indigo 600
    secondary: '#7C3AED', // Violet 600
    accent: '#2563EB', // Blue 600
    success: '#10B981', // Emerald 500
    warning: '#F59E0B', // Amber 500
    error: '#EF4444', // Red 500
    info: '#06B6D4', // Cyan 500
    background: '#F1F5F9', // Slate 100
    surface: '#FFFFFF',
    'primary-darken-1': '#3730A3',
    'primary-lighten-1': '#818CF8',
    'secondary-darken-1': '#5B21B6',
    'secondary-lighten-1': '#A78BFA',
    'neutral-50': '#F8FAFC',
    'neutral-100': '#F1F5F9',
    'neutral-200': '#E2E8F0',
    'neutral-300': '#CBD5E1',
    'neutral-400': '#94A3B8',
    'neutral-500': '#64748B',
    'neutral-600': '#475569',
    'neutral-700': '#334155',
    'neutral-800': '#1E293B',
    'neutral-900': '#0F172A',
  },
};

export const darkTheme = {
  dark: true,
  colors: {
    primary: '#818CF8', // Indigo 400
    secondary: '#A78BFA', // Violet 400
    accent: '#60A5FA', // Blue 400
    success: '#34D399', // Emerald 400
    warning: '#FBBF24', // Amber 400
    error: '#F87171', // Red 400
    info: '#22D3EE', // Cyan 400
    background: '#030712', // Slate 950
    surface: '#0F172A', // Slate 900
    'primary-darken-1': '#4F46E5',
    'primary-lighten-1': '#C7D2FE',
    'secondary-darken-1': '#7C3AED',
    'secondary-lighten-1': '#DDD6FE',
    'neutral-50': '#030712',
    'neutral-100': '#0F172A',
    'neutral-200': '#1E293B',
    'neutral-300': '#334155',
    'neutral-400': '#475569',
    'neutral-500': '#64748B',
    'neutral-600': '#94A3B8',
    'neutral-700': '#CBD5E1',
    'neutral-800': '#E2E8F0',
    'neutral-900': '#F1F5F9',
  },
};

/**
 * Protanopia (Deficiencia al rojo):
 * Evita mezclas rojo/verde utilizando contrastes altos de Azul Cobalto (#0072B2) y Ámbar Cálido (#E69F00).
 */
export const protanopiaTheme = {
  dark: false,
  colors: {
    primary: '#0072B2', // Azul Wong accesible
    secondary: '#E69F00', // Ámbar / Naranja cálido
    accent: '#56B4E9', // Azul cielo
    success: '#0072B2', // Azul diferenciado
    warning: '#F0E442', // Amarillo de alta visibilidad
    error: '#D55E00', // Bermellón oscuro
    info: '#009E73', // Verde azulado
    background: '#F8FAFC',
    surface: '#FFFFFF',
    'primary-darken-1': '#005584',
    'primary-lighten-1': '#56B4E9',
    'secondary-darken-1': '#B87F00',
    'secondary-lighten-1': '#F5BE4D',
    'neutral-50': '#F8FAFC',
    'neutral-100': '#F1F5F9',
    'neutral-200': '#E2E8F0',
    'neutral-300': '#CBD5E1',
    'neutral-400': '#94A3B8',
    'neutral-500': '#64748B',
    'neutral-600': '#475569',
    'neutral-700': '#334155',
    'neutral-800': '#1E293B',
    'neutral-900': '#0F172A',
  },
};

/**
 * Deuteranopia (Deficiencia al verde):
 * Reemplaza combinaciones verdes conflictivas por escala azul - púrpura rojizo (#CC79A7) - bermellón.
 */
export const deuteranopiaTheme = {
  dark: false,
  colors: {
    primary: '#0072B2', // Azul profundo
    secondary: '#CC79A7', // Magenta / Púrpura rojizo Wong
    accent: '#56B4E9', // Azul cielo
    success: '#0072B2', // Azul seguro
    warning: '#E69F00', // Ámbar
    error: '#D55E00', // Bermellón
    info: '#56B4E9', // Azul cielo
    background: '#F8FAFC',
    surface: '#FFFFFF',
    'primary-darken-1': '#005584',
    'primary-lighten-1': '#56B4E9',
    'secondary-darken-1': '#9C4E79',
    'secondary-lighten-1': '#E0A3C5',
    'neutral-50': '#F8FAFC',
    'neutral-100': '#F1F5F9',
    'neutral-200': '#E2E8F0',
    'neutral-300': '#CBD5E1',
    'neutral-400': '#94A3B8',
    'neutral-500': '#64748B',
    'neutral-600': '#475569',
    'neutral-700': '#334155',
    'neutral-800': '#1E293B',
    'neutral-900': '#0F172A',
  },
};

/**
 * Tritanopia (Deficiencia al azul/amarillo):
 * Evita confusiones azul-amarillo mediante escala de alto contraste Bermellón (#D55E00) y Verde azulado (#009E73).
 */
export const tritanopiaTheme = {
  dark: false,
  colors: {
    primary: '#D55E00', // Bermellón brillante
    secondary: '#009E73', // Verde azulado profundo
    accent: '#CC79A7', // Púrpura
    success: '#009E73', // Verde azulado
    warning: '#D55E00', // Bermellón advertencia
    error: '#B91C1C', // Rojo oscuro contrastado
    info: '#009E73', // Verde azulado
    background: '#F8FAFC',
    surface: '#FFFFFF',
    'primary-darken-1': '#9C4500',
    'primary-lighten-1': '#FF7F24',
    'secondary-darken-1': '#006E50',
    'secondary-lighten-1': '#33CCA1',
    'neutral-50': '#F8FAFC',
    'neutral-100': '#F1F5F9',
    'neutral-200': '#E2E8F0',
    'neutral-300': '#CBD5E1',
    'neutral-400': '#94A3B8',
    'neutral-500': '#64748B',
    'neutral-600': '#475569',
    'neutral-700': '#334155',
    'neutral-800': '#1E293B',
    'neutral-900': '#0F172A',
  },
};

export const themes = {
  light: lightTheme,
  dark: darkTheme,
  protanopia: protanopiaTheme,
  deuteranopia: deuteranopiaTheme,
  tritanopia: tritanopiaTheme,
};

export const THEME_LIST = [
  {
    id: 'light',
    name: 'Claro',
    icon: 'mdi-white-balance-sunny',
    desc: 'Tema estándar de alto contraste diurno',
    isDark: false,
    isColorblind: false,
  },
  {
    id: 'dark',
    name: 'Oscuro',
    icon: 'mdi-weather-night',
    desc: 'Modo nocturno para descanso visual',
    isDark: true,
    isColorblind: false,
  },
  {
    id: 'protanopia',
    name: 'Protanopia',
    icon: 'mdi-eye-outline',
    desc: 'Optimizado para deficiencia al rojo',
    isDark: false,
    isColorblind: true,
  },
  {
    id: 'deuteranopia',
    name: 'Deuteranopia',
    icon: 'mdi-eye-outline',
    desc: 'Optimizado para deficiencia al verde',
    isDark: false,
    isColorblind: true,
  },
  {
    id: 'tritanopia',
    name: 'Tritanopia',
    icon: 'mdi-eye-outline',
    desc: 'Optimizado para deficiencia al azul/amarillo',
    isDark: false,
    isColorblind: true,
  },
];
