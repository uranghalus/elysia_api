import { Elysia } from 'elysia';
import { route } from './routes';
import cors from '@elysiajs/cors';

const app = new Elysia().use(cors()).use(route).listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);
