import { createRouter, createWebHistory } from 'vue-router'


const routes = [
    {
        path: '/',
        name: 'index',
        component: () => import('@/views/index.vue'),
        redirect: '/project'
    },
    {
        path: '/project',
        name: 'project',
        component: () => import('@/views/project.vue'),
        redirect: '/project/list',
        children: [
            {
                path: 'list',
                name: 'list',
                component: () => import('@/views/project/list.vue')
            },
            {
                path: ':_id',
                name: 'api',
                component: () => import('@/views/project/api.vue')
            }
        ]
    },

]

const router = createRouter({
    history: createWebHistory(),
    routes
})

export default router
