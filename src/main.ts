import { createApp } from 'vue'
import { createPinia } from 'pinia'
import CoreuiVue from '@coreui/vue'

import App from './App.vue'
import { chatPersistencePlugin } from '@/stores/plugins/persistence'

import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap/dist/js/bootstrap.bundle.min.js'
import 'bootstrap-icons/font/bootstrap-icons.css'
// style要放置bootstrap之后
import './assets/scss/main.scss'

const app = createApp(App)

const pinia = createPinia()
pinia.use(chatPersistencePlugin)

app.use(pinia)
app.use(CoreuiVue)
app.mount('#app')
