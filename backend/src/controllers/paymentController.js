import { asyncHandler } from '../utils/errors.js'
export const create = asyncHandler(async (req, res) => res.status(201).json(await req.services.payments.create(req.body, req.user)))
export const confirm = asyncHandler(async (req, res) => res.json(await req.services.payments.confirm(req.body)))
export const webhook = asyncHandler(async (req, res) => res.json(await req.services.payments.webhook(req.body)))
export const get = asyncHandler(async (req, res) => res.json(await req.services.payments.get(req.params.id, req.user)))
export const preparePayphone = asyncHandler(async (req, res) => res.status(201).json(await req.services.payments.preparePayphone(req.body, req.user)))
export const confirmPayphone = asyncHandler(async (req, res) => res.json(await req.services.payments.confirmPayphone(req.body, req.user)))
export const reverse = asyncHandler(async (req, res) => res.json(await req.services.payments.reverse(req.params.paymentId, req.body, req.user)))
export const refund = asyncHandler(async (req, res) => res.json(await req.services.payments.refund(req.params.paymentId, req.body, req.user)))
