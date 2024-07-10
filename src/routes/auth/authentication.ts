import cookie from '@elysiajs/cookie';
import Elysia from 'elysia';
import { prisma } from '../../lib/prisma';
import {
  comparePassword,
  getExpTimestamp,
  hashPassword,
  md5hash,
} from '../../utils';
import { reverseGeocodingAPI } from '../../lib/geoapify';
import { randomUUID } from 'crypto';
import { jwtAccessSetup, jwtRefreshSetup } from '../../lib/jwt';
import { loginBodySchema, registerBodySchema } from '../../schema/auth-schema';
import { ACCESS_TOKEN_EXP } from '../../config/constant';
export const AuthenticationRoutes = (app: Elysia) =>
  app.group('/auth', (app) =>
    app
      .use(cookie())
      .use(jwtAccessSetup)
      .use(jwtRefreshSetup)
      //LINK   Register Handler
      .post(
        '/signup',
        async function handler({ body, set, jwtRefresh }: any) {
          const emailExist = await prisma.user.findUnique({
            where: { email: body.email },
            select: {
              id: true,
            },
          });

          if (emailExist) {
            set.status = 400;
            return {
              success: false,
              data: null,
              message: 'Email address already in use.',
            };
          }
          // validate duplicate username
          const usernameExists = await prisma.user.findUnique({
            where: {
              username: body.username,
            },
            select: {
              id: true,
            },
          });

          if (usernameExists) {
            set.status = 400;
            return {
              success: false,
              data: null,
              message: 'Someone already taken this username.',
            };
          }
          // validate duplicate name
          const { hash, salt } = await hashPassword(body.password);
          const emailHash = md5hash(body.email);
          const refreshId = randomUUID();
          const refreshToken = await jwtRefresh.sign({
            id: refreshId,
          });

          const hashedToken = new Bun.CryptoHasher('sha512')
            .update(refreshToken)
            .digest('hex');
          const profileImage = `https://www.gravatar.com/avatar/${emailHash}?d=identicon`;

          let location;
          if (body.location) {
            const [lat, lon] = body.location;
            location = await reverseGeocodingAPI(lat, lon);
          }
          const user = await prisma.user.create({
            data: {
              name: body.name,
              username: body.username,
              email: body.email,
              hash: hash,
              salt: salt,
              profileImage: profileImage,
              location: location,
              refreshToken: {
                create: {
                  hashedToken,
                  id: refreshId,
                },
              },
            },
          });
          return {
            message: 'Account created successfully',
            data: {
              user,
            },
          };
        },
        {
          body: registerBodySchema,
        }
      )
      //   LINK Login Handler
      .post(
        '/signin',
        async function handler({
          body,
          set,
          jwtAccess,
          jwtRefresh,
          cookie: { accToken, refToken },
        }: any) {
          // Cari Pengguna
          const user = await prisma.user.findFirst({
            where: {
              OR: [{ username: body.username }, { email: body.username }],
            },
            select: {
              id: true,
              hash: true,
              salt: true,
            },
          });
          // Jika pengguna tidak ditemukan
          if (!user) {
            set.status = 404;
            return {
              message: 'Username or Email Doesnt Exist!',
              succes: false,
            };
          }
          const matchPassword = comparePassword(
            body.password,
            user.salt,
            user.hash
          );
          if (!matchPassword) {
            set.status = 403;
            return {
              message: 'Password is incorrect!',
              succes: false,
            };
          }
          const refreshId = randomUUID();
          const refreshToken = await jwtRefresh.sign({
            id: refreshId,
          });
          const hashedToken = new Bun.CryptoHasher('sha512')
            .update(refreshToken)
            .digest('hex');

          await prisma.refreshToken.create({
            data: {
              hashedToken,
              id: refreshId,
              userId: user.id,
            },
          });
          const accesstoken = await jwtAccess.sign({
            id: user.id,
            exp: getExpTimestamp(ACCESS_TOKEN_EXP),
          });
          accToken.set({
            value: accesstoken,
            httpOnly: true,
            maxAge: ACCESS_TOKEN_EXP,
            path: '/',
          });
          // Set user profile as online and store refreshToken
          const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: { isOnline: true },
          });
          return {
            success: true,
            data: { user: updatedUser, accesstoken: accesstoken },
            message: 'Account login successfully',
          };
        },
        {
          body: loginBodySchema,
        }
      )
  );
