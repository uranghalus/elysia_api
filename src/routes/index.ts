import Elysia from 'elysia';
import { AuthenticationRoutes } from './auth/authentication';

export const route = new Elysia().group('/api', (app) =>
  app.use(AuthenticationRoutes)
);
