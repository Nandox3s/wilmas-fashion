import { asyncHandler } from '../utils/errors.js'
export const presign = asyncHandler(async (req, res) => res.json(await req.services.storage.presign(req.body)))
export const complete = asyncHandler(async (req, res) => res.json(await req.services.storage.complete(req.body)))
