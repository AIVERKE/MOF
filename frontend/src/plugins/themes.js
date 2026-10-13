/**
 * Definición de las 5 paletas de tema para el sistema MOF.
 * Basadas en Material Design 3, WCAG AA y d3 Well_palettes / Wong / Okabe-Ito para accesibilidad daltónica.
 */

import { LIGHT_THEME_TOKENS, DARK_THEME_TOKENS } from '@/config/designSystem';

export const lightTheme = {
  dark: false,
  colors: {
    primary: LIGHT_THEME_TOKENS.petroleo, // #1A4756 Azul Petróleo
    secondary: LIGHT_THEME_TOKENS.acero, // #3C6893 Azul Acero
    accent: LIGHT_THEME_TOKENS.turquesa, // #028191 Turquesa
    cta: LIGHT_THEME_TOKENS.coral, // #F04D65 Coral CTA
    success: LIGHT_THEME_TOKENS.verde, // #2E8B57 Verde Esmeralda
    warning: LIGHT_THEME_TOKENS.ambar, // #E69F00 Ámbar
    error: LIGHT_THEME_TOKENS.rojo, // #D93852 Rojo Sobrio
    info: LIGHT_THEME_TOKENS.turquesa, // #028191 Turquesa
    background: LIGHT_THEME_TOKENS.canvas, // #E4F1DD Capa 0: Marfil Suave
    surface: LIGHT_THEME_TOKENS.surface, // #FFFFFF Capa 1: Blanco Puro
    'primary-darken-1': '#11303B',
    'primary-lighten-1': '#2C6C82',
    'secondary-darken-1': '#2B4D6E',
    'secondary-lighten-1': '#5C8BB8',
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
    primary: DARK_THEME_TOKENS.petroleo, // #3BA3B8 Petróleo nocturno
    secondary: DARK_THEME_TOKENS.acero, // #82A7CD Azul Acero claro
    accent: DARK_THEME_TOKENS.turquesa, // #00BCD4 Turquesa luminoso
    cta: DARK_THEME_TOKENS.coral, // #F45D74 Coral M3
    success: DARK_THEME_TOKENS.verde, // #34D399 Verde esmeralda
    warning: DARK_THEME_TOKENS.ambar, // #FBBF24 Ámbar legible
    error: DARK_THEME_TOKENS.rojo, // #F87171 Rojo accesible
    info: DARK_THEME_TOKENS.turquesa, // #00BCD4
    background: DARK_THEME_TOKENS.canvas, // #0A1920 Capa 0 nocturna
    surface: DARK_THEME_TOKENS.surface, // #132630 Capa 1 nocturna
    'primary-darken-1': '#1A4756',
    'primary-lighten-1': '#5EC2D6',
    'secondary-darken-1': '#3C6893',
    'secondary-lighten-1': '#A5C4E5',
    'neutral-50': '#0A1920',
    'neutral-100': '#132630',
    'neutral-200': '#1E3845',
    'neutral-300': '#2D4E60',
    'neutral-400': '#47687C',
    'neutral-500': '#64748B',
    'neutral-600': '#94A3B8',
    'neutral-700': '#CBD5E1',
    'neutral-800': '#E2E8F0',
    'neutral-900': '#F8FAFC',
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
    cta: '#D55E00', // Bermellón accesible para daltónicos
    success: '#0072B2', // Azul diferenciado
    warning: '#F0E442', // Amarillo de alta visibilidad
    error: '#D55E00', // Bermellón oscuro
    info: '#009E73', // Verde azulado
    background: LIGHT_THEME_TOKENS.canvas,
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
    cta: '#D55E00', // Bermellón accesible
    success: '#0072B2', // Azul seguro
    warning: '#E69F00', // Ámbar
    error: '#D55E00', // Bermellón
    info: '#56B4E9', // Azul cielo
    background: LIGHT_THEME_TOKENS.canvas,
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
    primary: '#C2410C', // Bermellón accesible WCAG AA
    secondary: '#009E73', // Verde azulado profundo
    accent: '#CC79A7', // Púrpura
    cta: '#C2410C', // Bermellón CTA
    success: '#009E73', // Verde azulado
    warning: '#C2410C', // Bermellón advertencia
    error: '#B91C1C', // Rojo oscuro contrastado
    info: '#009E73', // Verde azulado
    background: LIGHT_THEME_TOKENS.canvas,
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
