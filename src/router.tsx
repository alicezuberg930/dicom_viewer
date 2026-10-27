import {
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from '@tanstack/react-router'
import { App } from './App'
import { ListPage } from './routes/list'
import { ViewerPage } from './routes/viewer'

const rootRoute = createRootRoute({
  component: App,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  beforeLoad: () => {
    throw redirect({ to: '/list' })
  },
})

const listRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/list',
  component: ListPage,
})

const viewerRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/viewer/$id',
  component: ViewerPage,
})

const routeTree = rootRoute.addChildren([indexRoute, listRoute, viewerRoute])

const router = createRouter({
  routeTree,
  defaultPreload: 'intent',
  scrollRestoration: true,
})

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

export { router }
