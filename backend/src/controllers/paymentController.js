import { asyncHandler } from '../utils/errors.js'
export const create = asyncHandler(async (req, res) => res.status(201).json(await req.services.payments.create(req.body, req.user)))
export const confirm = asyncHandler(async (req, res) => res.json(await req.services.payments.confirm(req.body)))
export const webhook = asyncHandler(async (req, res) => res.json(await req.services.payments.webhook(req.body)))
export const get = asyncHandler(async (req, res) => res.json(await req.services.payments.get(req.params.id, req.user)))
