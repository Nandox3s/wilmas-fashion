import { asyncHandler } from '../utils/errors.js'
export const get = asyncHandler(async (req, res) => res.json(await req.services.invoices.get(req.params.id, req.user)))
export const byOrder = asyncHandler(async (req, res) => res.json(await req.services.invoices.byOrder(req.params.orderReference, req.user)))
export const ride = asyncHandler(async (req, res) => res.json(await req.services.invoices.signed(req.params.id, 'ride', req.user)))
export const xml = asyncHandler(async (req, res) => res.json(await req.services.invoices.signed(req.params.id, 'xml', req.user)))
export const retry = asyncHandler(async (req, res) => res.json(await req.services.invoices.process(req.params.id)))
