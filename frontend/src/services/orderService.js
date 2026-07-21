import axios from 'axios'
import { authConfig } from './apiClient'
export const createOrder = async (data) => (await axios.post('/api/orders', data, authConfig())).data
export const getMyOrders = async () => (await axios.get('/api/orders/my-orders', authConfig())).data
export const getOrder = async (reference) => (await axios.get(`/api/orders/${encodeURIComponent(reference)}`, authConfig())).data
export const getAdminOrders = async () => (await axios.get('/api/admin/orders', authConfig())).data
export const createPayment = async (data) => (await axios.post('/api/payments/create', data, authConfig())).data
export const confirmPayment = async (data) => (await axios.post('/api/payments/confirm', data)).data
export const getInvoiceForOrder = async (reference) => (await axios.get(`/api/invoices/order/${encodeURIComponent(reference)}`, authConfig())).data
export const getInvoiceDocument = async (id, type) => (await axios.get(`/api/invoices/${id}/${type}-url`, authConfig())).data
