import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { OAuth2Client } from 'google-auth-library';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { ConflictError, UnauthorizedError } from '../../shared/errors/AppError';
import { requireAuth } from '../../shared/middlewares/auth.middleware';

export const authRouter = Router();
const googleClient = new OAuth2Client();
const credentialSchema = z.object({ credential: z.string().min(40).max(10_000), accountType: z.enum(['TOURIST', 'BUSINESS_OWNER']).default('TOURIST') });
const emailSchema = z.string().trim().email().max(255).transform((email) => email.toLowerCase());
const passwordSchema = z.string().min(8).max(72).refine((password) => Buffer.byteLength(password, 'utf8') <= 72, 'La contraseña es demasiado larga.');
const registerSchema = z.object({ fullName: z.string().trim().min(2).max(150), email: emailSchema, password: passwordSchema, accountType: z.enum(['TOURIST', 'BUSINESS_OWNER']).default('TOURIST') });
const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(72).refine((password) => Buffer.byteLength(password, 'utf8') <= 72) });

function createSession(user: { id: string; role: string; fullName: string; email: string }) {
  const token = jwt.sign({ role: user.role }, env.JWT_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
    algorithm: 'HS256',
  });
  return { token, user: { id: user.id, fullName: user.fullName, email: user.email, role: user.role } };
}

// El Client ID es público; la validación criptográfica de la identidad siempre ocurre en la API.
authRouter.get('/google/config', (_req, res) => {
  res.json({ data: { clientId: env.GOOGLE_CLIENT_ID || null } });
});

// El registro tradicional crea una cuenta de visitante con contraseña protegida por bcrypt.
authRouter.post('/register', async (req, res) => {
  const input = registerSchema.parse(req.body);
  const exists = await prisma.user.findUnique({ where: { email: input.email } });
  if (exists) throw new ConflictError('Ya existe una cuenta con ese correo. Inicia sesión o usa Google.');

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { fullName: input.fullName, email: input.email, passwordHash, authProvider: 'LOCAL', role: input.accountType },
  });
  res.status(201).json({ data: createSession(user) });
});

authRouter.post('/login', async (req, res) => {
  const input = loginSchema.parse(req.body);
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  const passwordMatches = user?.passwordHash ? await bcrypt.compare(input.password, user.passwordHash) : false;
  if (!user || user.authProvider !== 'LOCAL' || !passwordMatches || !user.isActive) {
    throw new UnauthorizedError('Correo o contraseña incorrectos.');
  }
  res.json({ data: createSession(user) });
});

// Un usuario autenticado puede habilitar su cuenta de anfitrión; solo podrá
// administrar los establecimientos que cree a su propio nombre.
authRouter.post('/business-owner', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user!.id } });
  if (!user || !user.isActive) throw new UnauthorizedError('Esta cuenta no está disponible.');
  if (user.role === 'TOURIST') {
    await prisma.user.update({ where: { id: user.id }, data: { role: 'BUSINESS_OWNER' } });
    user.role = 'BUSINESS_OWNER';
  }
  res.json({ data: createSession(user) });
});

authRouter.post('/google', async (req, res) => {
  const { credential, accountType } = credentialSchema.parse(req.body);
  if (!env.GOOGLE_CLIENT_ID) {
    res.status(503).json({ error: { message: 'El inicio de sesión con Google aún no está configurado.' } });
    return;
  }

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.GOOGLE_CLIENT_ID });
    payload = ticket.getPayload();
  } catch {
    throw new UnauthorizedError('No se pudo verificar la cuenta de Google. Intenta iniciar sesión de nuevo.');
  }

  if (!payload?.sub || !payload.email || payload.email_verified !== true) {
    throw new UnauthorizedError('Google no devolvió una cuenta verificada.');
  }

  let user = await prisma.user.findUnique({ where: { googleId: payload.sub } });
  if (!user) {
    const existingEmail = await prisma.user.findUnique({ where: { email: payload.email.toLowerCase() } });
    if (existingEmail && existingEmail.authProvider !== 'GOOGLE') {
      throw new ConflictError('Ese correo ya tiene una cuenta local. Inicia sesión con ella para vincular Google.');
    }
    if (existingEmail?.googleId && existingEmail.googleId !== payload.sub) {
      throw new ConflictError('Ese correo ya está vinculado a otra cuenta de Google.');
    }

    user = existingEmail
      ? await prisma.user.update({ where: { id: existingEmail.id }, data: { googleId: payload.sub } })
      : await prisma.user.create({
        data: {
          googleId: payload.sub,
          fullName: payload.name?.slice(0, 150) || payload.email.split('@')[0],
          email: payload.email.toLowerCase(),
          authProvider: 'GOOGLE',
          role: accountType,
        },
      });
  }

  if (!user.isActive) throw new UnauthorizedError('Esta cuenta está desactivada.');
  res.json({ data: createSession(user) });
});
