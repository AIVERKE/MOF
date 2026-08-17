import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import * as labsComponents from 'vuetify/labs/components'
import '@mdi/font/css/materialdesignicons.css'

// Idioma español (completo)
import { es } from 'vuetify/locale'

const vuetify = createVuetify({
    components: {
        ...components,
        ...labsComponents,
    },
    directives,
    locale: {
        locale: "es",
        fallback: 'es',   // fuerza todo a español
        messages: { es },       //
    },
    theme: {
        defaultTheme: 'light',
        themes: {
            light: {
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
                    // Colores adicionales para mayor gama
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
                }
            },
            dark: {
                colors: {
                    primary: '#818CF8', // Indigo 400 (brighter on dark bg)
                    secondary: '#A78BFA', // Violet 400
                    accent: '#60A5FA', // Blue 400
                    success: '#34D399', // Emerald 400
                    warning: '#FBBF24', // Amber 400
                    error: '#F87171', // Red 400
                    info: '#22D3EE', // Cyan 400
                    background: '#030712', // Slate 950 (deep dark background)
                    surface: '#0F172A', // Slate 900 (card background)
                    // Custom dark neutrals
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
                }
            }
        }
    }
})

export default vuetify