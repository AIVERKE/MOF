import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import * as labsComponents from 'vuetify/labs/components'
import '@mdi/font/css/materialdesignicons.css'

// Idioma español (completo)
import { es } from 'vuetify/locale'

import { themes } from './themes'

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
        defaultTheme:
            typeof localStorage !== "undefined"
                ? (localStorage.getItem("mof_theme_mode") || localStorage.getItem("mof_theme") || "light")
                : "light",
        themes,
    }
})

export default vuetify