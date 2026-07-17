import type { RouteObject } from 'react-router-dom'

export type RouteInfo = {
    path: string;
    id:number;
    parentId:number;
}

export async function parseRoutes(): Promise<Array<RouteInfo>> {
  const routes = await import('../src/router/config').then(m => m.default).catch((e) => {
    return []
  });
  let res: RouteInfo[] = []
  let id = 0
  function dfs(route: RouteObject, parent: RouteInfo) {
    const { path = '', children, index } = route
    id++
    const isIndex = index === true || path === ''
    const isAbsolute = path && path[0] === '/'
    const indexFilterPath = isIndex ? parent.path : `${parent.path}/${path}`
    const routePath = isAbsolute && !isIndex ? path : indexFilterPath
    const routeInfo: RouteInfo = {
      id,
      parentId: parent.id,
      path: '/' + routePath.split('/').filter(Boolean).join('/'),
    }
    if(!/\*/.test(routeInfo.path)) {
      res.push(routeInfo)
    }
    if (children) {
      children.forEach(child => dfs(child, routeInfo))
    }
  }

  routes.forEach(route => dfs(route, { id: 0, path: '', parentId: 0 }))
  const uniquePaths = new Set<string>();
  res = res.filter(route => {
    if (uniquePaths.has(route.path)) {
      return false;
    } else {
      uniquePaths.add(route.path);
      return true;
    }
  });
  return res
}