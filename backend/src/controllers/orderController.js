import { asyncHandler } from '../utils/errors.js'
export const create = asyncHandler(async (req, res) => res.status(201).json(await req.services.orders.create(req.body, req.user)))
export const get = asyncHandler(async (req, res) => res.json(await req.services.orders.byReference(req.params.reference, req.user)))
export const mine = asyncHandler(async (req, res) => res.json(await req.services.orders.mine(req.user.id)))

export const invoice = asyncHandler(async (req, res) => {
	res.json(await req.services.invoices.byOrderId(req.params.orderId, req.user))
})

const sendDocument = (type) => asyncHandler(async (req, res) => {
	const file = await req.services.invoices.orderDocument(req.params.orderId, type, req.user)
	if (file.signed.startsWith('data:')) {
		const encoded = file.signed.split(',')[1] || ''
		const body = Buffer.from(encoded, 'base64')
		res.setHeader('Content-Type', file.mime)
		res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`)
		res.setHeader('Cache-Control', 'no-store')
		res.status(200).send(body)
		return
	}
	res.json({ url: file.signed, filename: file.filename, contentType: file.mime })
})

export const invoicePdf = sendDocument('pdf')
export const invoiceXml = sendDocument('xml')
