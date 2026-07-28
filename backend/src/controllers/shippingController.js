import { asyncHandler } from '../utils/errors.js'

export const getOrderShipment = asyncHandler(async (req, res) => {
  res.json(await req.services.shipping.byOrder(req.params.orderId, req.user))
})

export const getOrderTracking = asyncHandler(async (req, res) => {
  res.json(await req.services.shipping.tracking(req.params.orderId, req.user))
})

export const createOrderShipment = asyncHandler(async (req, res) => {
  res.status(201).json(await req.services.shipping.createForOrder(req.params.orderId, req.body, req.user))
})

export const patchShipment = asyncHandler(async (req, res) => {
  res.json(await req.services.shipping.patchShipment(req.params.shipmentId, req.body, req.user))
})

export const addShipmentEvent = asyncHandler(async (req, res) => {
  res.status(201).json(await req.services.shipping.addEvent(req.params.shipmentId, req.body, req.user))
})

export const markShipmentShipped = asyncHandler(async (req, res) => {
  res.json(await req.services.shipping.markShipped(req.params.shipmentId, req.body, req.user))
})

export const markShipmentDelivered = asyncHandler(async (req, res) => {
  res.json(await req.services.shipping.markDelivered(req.params.shipmentId, req.body, req.user))
})
