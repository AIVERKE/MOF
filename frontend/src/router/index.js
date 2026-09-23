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
      meta: { requiresAuth: true, roles: ['ADMIN'] }
    },
    {
      path: '/auditoria',
      name: 'auditoria',
      component: () => import('../views/Auditoria.vue'),
      meta: { requiresAuth: true, roles: ['ADMIN'] }
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
    return
  }

  if (to.path === '/' && isAuthenticated) {
    next('/dashboard')
    return
  }

  const requiredRoles = to.meta.roles
  if (
    Array.isArray(requiredRoles) &&
    requiredRoles.length > 0 &&
    isAuthenticated
  ) {
    const allowed = requiredRoles.some((role) => authStore.hasRole(role))
    if (!allowed) {
      next('/dashboard')
      return
    }
  }

  next()
})

export default router