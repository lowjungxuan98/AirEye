import { Router, type RequestHandler } from "express";

export type RouteMethod = "get" | "post" | "put";

export type RouteDefinition = {
  method: RouteMethod;
  path: string;
  handlers: RequestHandler[];
};

export function wrapAsync(handler: RequestHandler): RequestHandler {
  return (req, res, next) => {
    void Promise.resolve(handler(req, res, next)).catch(next);
  };
}

export function createRouter(routes: RouteDefinition[]): Router {
  const router = Router();
  for (const route of routes) {
    const handlers = route.handlers.map(wrapAsync);
    switch (route.method) {
      case "get":
        router.get(route.path, ...handlers);
        break;
      case "post":
        router.post(route.path, ...handlers);
        break;
      case "put":
        router.put(route.path, ...handlers);
        break;
      default:
        route.method satisfies never;
    }
  }
  return router;
}
