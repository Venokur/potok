import { createRouter, createWebHistory } from 'vue-router'

import { initAuth, useAuth } from '@/composables/useAuth'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: { name: 'tickets' } },
    {
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { layout: 'auth', guestOnly: true },
    },
    {
      path: '/register',
      name: 'register',
      component: () => import('@/views/RegisterView.vue'),
      meta: { layout: 'auth', guestOnly: true },
    },
    {
      path: '/tickets',
      name: 'tickets',
      component: () => import('@/views/TicketsView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tickets/new',
      name: 'ticket-new',
      component: () => import('@/views/TicketNewView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/tickets/:id',
      name: 'ticket-detail',
      component: () => import('@/views/TicketDetailView.vue'),
      meta: { requiresAuth: true },
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  await initAuth()
  const { user } = useAuth()

  if (to.meta.requiresAuth && !user.value) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }

  if (to.meta.guestOnly && user.value) {
    return { name: 'tickets' }
  }

  return true
})

export default router
