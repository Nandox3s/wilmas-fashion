import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'
import { emailIsValid, publicUser, text } from '../utils/validation.js'

export class AuthService {
  constructor(prisma, socialProviders = {}) { this.prisma = prisma; this.socialProviders = socialProviders }
  token(user) { return jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn }) }
  response(user) {
    const token = this.token(user)
    const payload = jwt.decode(token)
    return { token, user: publicUser(user), expiresIn: payload.exp - payload.iat }
  }
  async register(input) {
    const name = text(input.name, 'Name')
    const email = String(input.email || '').trim().toLowerCase()
    if (!emailIsValid(email)) throw new HttpError(400, 'Invalid email format')
    if (typeof input.password !== 'string' || input.password.length < 8) throw new HttpError(400, 'Password must be at least 8 characters')
    if (await this.prisma.user.findUnique({ where: { email } })) throw new HttpError(409, 'Email already registered')
    const user = await this.prisma.user.create({ data: { name, email, password: await bcryptjs.hash(input.password, 12), role: 'USER' } })
    return this.response(user)
  }
  async login(input) {
    const email = String(input.email || '').trim().toLowerCase()
    if (!emailIsValid(email) || typeof input.password !== 'string') throw new HttpError(400, 'Email and password are required')
    const user = await this.prisma.user.findUnique({ where: { email } })
    if (!user) throw new HttpError(401, 'Invalid email or password')
    if (!user.password) throw new HttpError(401, 'This account uses social login', 'SOCIAL_LOGIN_REQUIRED')
    if (!(await bcryptjs.compare(input.password, user.password))) throw new HttpError(401, 'Invalid email or password')
    return this.response(user)
  }

  async socialLogin(provider, token) {
    const verifier = this.socialProviders[provider]
    if (!verifier) throw new HttpError(503, `${provider} login is not configured`, 'SOCIAL_AUTH_NOT_CONFIGURED')
    const profile = await verifier.verify(token)
    const email = String(profile.email || '').trim().toLowerCase()
    if (!emailIsValid(email)) throw new HttpError(401, `A verified email is required for ${provider} login`, 'SOCIAL_EMAIL_REQUIRED')
    const providerName = provider.toUpperCase()

    const link = async (db) => {
      const identity = await db.userAuthProvider.findUnique({
        where: { provider_providerId: { provider: providerName, providerId: profile.providerId } },
        include: { user: true },
      })
      if (identity) return identity.user

      let user = await db.user.findUnique({ where: { email } })
      if (!user) {
        user = await db.user.create({ data: {
          name: text(profile.name || email.split('@')[0], 'Name'),
          email,
          password: null,
          avatar: this.safeAvatar(profile.avatar),
          role: 'USER',
        } })
      } else if (!user.avatar && this.safeAvatar(profile.avatar)) {
        user = await db.user.update({ where: { id: user.id }, data: { avatar: this.safeAvatar(profile.avatar) } })
      }

      await db.userAuthProvider.create({ data: { provider: providerName, providerId: profile.providerId, userId: user.id } })
      return user
    }

    try {
      const user = typeof this.prisma.$transaction === 'function'
        ? await this.prisma.$transaction(link)
        : await link(this.prisma)
      return this.response(user)
    } catch (error) {
      if (error?.code !== 'P2002') throw error
      const identity = await this.prisma.userAuthProvider.findUnique({
        where: { provider_providerId: { provider: providerName, providerId: profile.providerId } },
        include: { user: true },
      })
      if (identity?.user?.email === email) return this.response(identity.user)
      throw new HttpError(409, `This ${provider} account is already linked`, 'SOCIAL_ACCOUNT_CONFLICT')
    }
  }

  safeAvatar(value) {
    if (typeof value !== 'string' || value.length > 2048) return null
    try { const url = new URL(value); return url.protocol === 'https:' ? url.toString() : null } catch { return null }
  }

  google(input) { return this.socialLogin('google', input.credential) }
  facebook(input) { return this.socialLogin('facebook', input.accessToken) }
}
