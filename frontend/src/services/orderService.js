import axios from 'axios'
import { authConfig } from './apiClient'
export const createOrder = async (data) => (await axios.post('/api/orders', data, authConfig())).data
export const getMyOrders = async () => (await axios.get('/api/orders/my-orders', authConfig())).data
export const getOrder = async (reference) => (await axios.get(`/api/orders/${encodeURIComponent(reference)}`, authConfig())).data
export const getAdminOrders = async () => (await axios.get('/api/admin/orders', authConfig())).data
export const createPayment = async (data) => (await axios.post('/api/payments/create', data, authConfig())).data
export const confirmPayment = async (data) => (await axios.post('/api/payments/confirm', data)).data
export const preparePayphonePayment = async (data) => (await axios.post('/api/payments/payphone/prepare', data, authConfig())).data
export const confirmPayphonePayment = async (data) => (await axios.post('/api/payments/payphone/confirm', data, authConfig())).data
export const getInvoiceForOrder = async (reference) => (await axios.get(`/api/invoices/order/${encodeURIComponent(reference)}`, authConfig())).data
export const getInvoiceDocument = async (id, type) => (await axios.get(`/api/invoices/${id}/${type}-url`, authConfig())).data
export const getOrderInvoice = async (orderId) => (await axios.get(`/api/orders/${orderId}/invoice`, authConfig())).data
export const getOrderInvoicePdf = async (orderId) => (await axios.get(`/api/orders/${orderId}/invoice/pdf`, { ...authConfig(), responseType: 'blob' })).data
export const getOrderInvoiceXml = async (orderId) => (await axios.get(`/api/orders/${orderId}/invoice/xml`, { ...authConfig(), responseType: 'blob' })).data
export const getOrderShipment = async (orderId) => (await axios.get(`/api/orders/${orderId}/shipment`, authConfig())).data
export const getOrderTracking = async (orderId) => (await axios.get(`/api/orders/${orderId}/tracking`, authConfig())).data
export const adminCreateShipment = async (orderId, data) => (await axios.post(`/api/admin/orders/${orderId}/shipment`, data, authConfig())).data
export const adminPatchShipment = async (shipmentId, data) => (await axios.patch(`/api/admin/shipments/${shipmentId}`, data, authConfig())).data
export const adminAddShipmentEvent = async (shipmentId, data) => (await axios.post(`/api/admin/shipments/${shipmentId}/events`, data, authConfig())).data
export const adminMarkShipped = async (shipmentId, data = {}) => (await axios.post(`/api/admin/shipments/${shipmentId}/mark-shipped`, data, authConfig())).data
export const adminMarkDelivered = async (shipmentId, data = {}) => (await axios.post(`/api/admin/shipments/${shipmentId}/mark-delivered`, data, authConfig())).data
