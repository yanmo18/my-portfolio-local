import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  // router是一个数组，每个元素都是一个路由对象
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
    // （）=》import()懒加载，当用户访问该路由时才加载组件，优化首页性能
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/admin',
    name: 'Admin',
    redirect: '/admin/projects',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAuth: true },
    // meta:{requiresAuth:true} 表示该路由需要用户登录才能访问
    // 当用户未登录时，会跳转到登录页
    // 当用户已登录时，会继续访问该路由
       children: [
      {
        path: 'projects',
        name: 'AdminProjects',
        component: () => import('../views/admin/AdminProjects.vue')
      },
      {
        path: 'profile',
        name: 'AdminProfile',
        component: () => import('../views/admin/AdminProfile.vue')
      },
      {
        path: 'awards',
        name: 'AdminAwards',
        component: () => import('../views/admin/AdminAwards.vue')
      },
      {
        path: 'experience',
        name: 'AdminExperience',
        component: () => import('../views/admin/AdminExperience.vue')
      },
      {
        path: 'resume',
        name: 'AdminResume',
        component: () => import('../views/admin/AdminResume.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHistory(),
  // 挂载路由配置
  routes
})
// router是一个路由实例，用于管理路由配置和导航,启用history模式，不显示#号
// 路由守卫，用于在路由切换前进行权限校验
router.beforeEach((to, from, next) => {
  // to,目标路由对象
  // from,当前路由对象
  // next,路由切换函数，next()放行，next('/login')跳转到登录页，使用redirect重定向到其他路由。next(admin)跳转到admin路由 
  const isAuthenticated = !!localStorage.getItem('token')
  // 检查用户是否已登录
  // 如果用户未登录，且目标路由需要登录权限，跳转到登录页
  // 如果用户已登录，且目标路由不需要登录权限，继续访问目标路由
  // 如果用户未登录，且目标路由不需要登录权限，继续访问目标路由
  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.path === '/login' && isAuthenticated) {
    next('/admin')
  } else {
    next()
  }
})

export default router