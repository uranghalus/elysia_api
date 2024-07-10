import { t } from 'elysia';

const registerBodySchema = t.Object({
  name: t.String({ maxLength: 60, minLength: 1 }),
  username: t.String({ maxLength: 50, minLength: 3 }),
  email: t.String({ format: 'email' }),
  password: t.String({ minLength: 8 }),
  location: t.Optional(t.Tuple([t.Number(), t.Number()])),
  isAdult: t.Boolean(),
});
const loginBodySchema = t.Object({
  username: t.String(),
  password: t.String({ minLength: 8 }),
});
export { registerBodySchema, loginBodySchema };
