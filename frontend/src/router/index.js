import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import Login from '../views/Login.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'login',
      component: Login
    },
    {
      path: '/dashboard',
      name: 'home',
      component: () => import('../views/Home.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/usuarios',
      name: 'usuarios',
      component: () => import('../views/Usuarios.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/productos',
      name: 'productos',
      component: () => import('../views/Productos.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reportes/ejecutivo',
      name: 'dashboard_ejecutivo',
      component: () => import('../views/MOF/DashboardEjecutivo.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/reportes/facultativo',
      name: 'dashboard_facultativo',
      component: () => import('../views/MOF/DashboardFacultativo.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/configuracion',
      name: 'configuracion',
      component: () => import('../views/Configuracion.vue'),
      meta: { requiresAuth: true }
    },
    {
      path:"/mof/listar-unidades",
      name:'listar_unidades',
      component: () => import('../views/MOF/ListarUnidades.vue'),
      meta: { requiresAuth: true }
    },
    {
        path:"/mof/registrar-unidad",
        name:"registro_unidad",
        component: () => import('../views/MOF/RegistrarUnidad.vue'),
        meta: { requiresAuth: true }
    },
    {
        path:"/mof/arbol-unidades",
        name:"tree_unidades",
        component: () => import('../views/MOF/TreeUnidades.vue'),
        meta: { requiresAuth: true }
    },
    {
      path:"/mof/organigrama-unidades",
      name:"organigrama_unidades",
      component: () => import('../views/MOF/OrganigramaVueFlow.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  const isAuthenticated = !!authStore.token

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/')
  } else if (to.path === '/' && isAuthenticated) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router