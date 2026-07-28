import { asyncHandler } from '../utils/errors.js'
export const register = asyncHandler(async (req, res) => res.status(201).json(await req.services.auth.register(req.body)))
export const login = asyncHandler(async (req, res) => res.json(await req.services.auth.login(req.body)))
export const me = asyncHandler(async (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, email: req.user.email, role: req.user.role } }))
