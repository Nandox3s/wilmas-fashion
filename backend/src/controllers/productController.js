import { asyncHandler } from '../utils/errors.js'
export const list = asyncHandler(async (req, res) => res.json(await req.services.products.list(req.query)))
export const get = asyncHandler(async (req, res) => res.json(await req.services.products.get(req.params.id)))
export const create = asyncHandler(async (req, res) => res.status(201).json(await req.services.products.create(req.body, req.user.id)))
export const update = asyncHandler(async (req, res) => res.json(await req.services.products.update(req.params.id, req.body, req.user.id)))
export const updatePrice = asyncHandler(async (req, res) => res.json(await req.services.products.update(req.params.id, { price: req.body.price, ...(req.body.discount === undefined ? {} : { discount: req.body.discount }) }, req.user.id)))
export const updateStock = asyncHandler(async (req, res) => res.json(await req.services.products.update(req.params.id, { stock: req.body.stock }, req.user.id)))
export const remove = asyncHandler(async (req, res) => res.json(await req.services.products.remove(req.params.id)))
