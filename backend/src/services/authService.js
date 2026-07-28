import bcryptjs from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { HttpError } from '../utils/errors.js'
import { emailIsValid, publicUser, text } from '../utils/validation.js'

export class AuthService {
  constructor(prisma) { this.prisma = prisma }
  token(user) { return jwt.sign({ userId: user.id, email: user.email, role: user.role }, env.jwtSecret, { expiresIn: '7d' }) }
  response(user) { return { token: this.token(user), user: publicUser(user), expiresIn: 604800 } }
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
    if (!user || !(await bcryptjs.compare(input.password, user.password))) throw new HttpError(401, 'Invalid email or password')
    return this.response(user)
  }
}
