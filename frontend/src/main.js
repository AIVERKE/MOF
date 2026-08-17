import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createPinia } from 'pinia'
import router from './router'
import vuetify from './plugins/vuetify'
import highcharts from './plugins/highcharts'

const app=createApp(App)
app.use(createPinia())
app.use(router)
app.use(vuetify)
highcharts(app)
app.mount('#app')

// createApp(App).mount('#app')
