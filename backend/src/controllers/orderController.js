import { asyncHandler } from '../utils/errors.js'
export const create = asyncHandler(async (req, res) => res.status(201).json(await req.services.orders.create(req.body, req.user)))
export const get = asyncHandler(async (req, res) => res.json(await req.services.orders.byReference(req.params.reference, req.user)))
export const mine = asyncHandler(async (req, res) => res.json(await req.services.orders.mine(req.user.id)))
