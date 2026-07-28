import { InvoiceProvider } from './InvoiceProvider.js'

function sanitizeMessage(value) {
  return String(value || 'Datil request failed').replace(/https?:\/\/[^\s]+/gi, '[redacted-url]').slice(0, 240)
}

export class DatilProviderError extends Error {
  constructor(message, { status = 503, code = 'DATIL_CONFIGURATION_ERROR', details = null } = {}) {
    super(message)
    this.name = 'DatilProviderError'
    this.status = status
    this.code = code
    this.details = details
  }
}

function sanitizeResponse(response) {
  if (!response || typeof response !== 'object') return null
  return {
    status: response.status ?? response.httpStatus ?? null,
    code: response.code ?? response.errorCode ?? null,
    message: sanitizeMessage(response.message || response.error || response.detail || 'Datil request failed'),
  }
}

function bufferFromDocument(document, fallbackName) {
  if (Buffer.isBuffer(document)) return document
  if (typeof document === 'string') return Buffer.from(document)
  if (document && Buffer.isBuffer(document.body)) return document.body
  if (document && typeof document.body === 'string') return Buffer.from(document.body)
  throw new DatilProviderError(`Datil document '${fallbackName}' is missing or invalid`, { status: 502, code: 'DATIL_DOCUMENT_INVALID' })
}

export class DatilProvider extends InvoiceProvider {
  constructor({
    baseUrl = process.env.DATIL_BASE_URL,
    apiKey = process.env.DATIL_API_KEY,
    issuerRuc = process.env.DATIL_ISSUER_RUC,
    timeoutMs = Number(process.env.DATIL_TIMEOUT_MS || 15_000),
    client = globalThis.fetch?.bind(globalThis),
    operations = {},
    mappers = {},
  } = {}) {
    super()
    this.baseUrl = typeof baseUrl === 'string' ? baseUrl.trim().replace(/\/$/, '') : ''
    this.apiKey = typeof apiKey === 'string' ? apiKey.trim() : ''
    this.issuerRuc = typeof issuerRuc === 'string' ? issuerRuc.trim() : ''
    this.timeoutMs = Number.isFinite(timeoutMs) && timeoutMs > 0 ? timeoutMs : 15_000
    this.client = client
    this.operations = operations
    this.mappers = mappers
  }

  fail(message, { status = 503, code = 'DATIL_CONFIGURATION_ERROR', details = null } = {}) {
    throw new DatilProviderError(message, { status, code, details })
  }

  requireConfig(operationName) {
    if (!this.baseUrl) {
      this.fail('DATIL_BASE_URL is required but not configured', { code: 'DATIL_BASE_URL_MISSING' })
    }
    if (typeof this.client !== 'function') {
      this.fail('Datil HTTP client is not configured', { code: 'DATIL_HTTP_CLIENT_MISSING' })
    }
    if (!this.apiKey) {
      this.fail('DATIL_API_KEY is required but not configured', { code: 'DATIL_API_KEY_MISSING' })
    }
    if (!this.issuerRuc) {
      this.fail('DATIL_ISSUER_RUC is required but not configured', { code: 'DATIL_ISSUER_RUC_MISSING' })
    }
    const operation = this.operations[operationName]
    if (!operation || !operation.method || !operation.path) {
      this.fail(`Datil operation '${operationName}' is blocked until the official route and method are explicitly configured`, { code: 'DATIL_OPERATION_NOT_CONFIGURED' })
    }
    const mapper = this.mappers[operationName]
    if (typeof mapper !== 'function') {
      this.fail(`Datil operation '${operationName}' is blocked until a domain-to-provider mapper is injected`, { code: 'DATIL_MAPPER_NOT_CONFIGURED' })
    }
    return { operation, mapper }
  }

  async request(operationName, context) {
    const { operation, mapper } = this.requireConfig(operationName)
    const payload = mapper(context)
    const url = new URL(operation.path, this.baseUrl).toString()
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${this.apiKey}`,
      'X-Datil-Issuer-RUC': this.issuerRuc,
      ...(operation.headers || {}),
    }

    const response = await this.client(url, {
      method: operation.method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal: AbortSignal.timeout(this.timeoutMs),
    })

    const text = await response.text()
    let body = null
    try {
      body = text ? JSON.parse(text) : null
    } catch {
      body = text
    }

    if (!response.ok) {
      const details = sanitizeResponse(body)
      const status = response.status >= 500 ? 503 : response.status
      throw new DatilProviderError(`Datil request failed (${response.status})`, {
        status,
        code: 'DATIL_REQUEST_FAILED',
        details,
      })
    }

    return body
  }

  mapIssueInvoiceResponse(body, context) {
    return {
      provider: 'datil',
      status: body?.status || 'PENDING',
      externalId: body?.externalId || body?.id || null,
      accessKey: body?.accessKey || body?.authorizationNumber || null,
      authorizationNumber: body?.authorizationNumber || null,
      mock: Boolean(context?.mock),
      raw: body,
    }
  }

  mapStatusResponse(body) {
    return {
      provider: 'datil',
      status: body?.status || 'PENDING',
      externalId: body?.externalId || body?.id || null,
      raw: body,
    }
  }

  mapDocumentsResponse(body) {
    const xml = body?.xml ?? body?.documentXml ?? body?.documents?.xml ?? body?.documents?.invoiceXml
    const pdf = body?.pdf ?? body?.documentPdf ?? body?.documents?.pdf ?? body?.documents?.invoicePdf
    return {
      provider: 'datil',
      xml: bufferFromDocument(xml, 'xml'),
      pdf: bufferFromDocument(pdf, 'pdf'),
      raw: body,
    }
  }

  mapCreditNoteResponse(body) {
    return {
      provider: 'datil',
      status: body?.status || 'PENDING',
      externalId: body?.externalId || body?.id || null,
      raw: body,
    }
  }

  async issueInvoice(context = {}) {
    const response = await this.request('issueInvoice', context)
    return this.mapIssueInvoiceResponse(response, context)
  }

  async getInvoiceStatus(context = {}) {
    const response = await this.request('getInvoiceStatus', context)
    return this.mapStatusResponse(response)
  }

  async getInvoiceDocuments(context = {}) {
    const response = await this.request('getInvoiceDocuments', context)
    return this.mapDocumentsResponse(response)
  }

  async issueCreditNote(context = {}) {
    const response = await this.request('issueCreditNote', context)
    return this.mapCreditNoteResponse(response)
  }

  async downloadXml(context = {}) {
    return (await this.getInvoiceDocuments(context)).xml
  }

  async downloadRide(context = {}) {
    return (await this.getInvoiceDocuments(context)).pdf
  }

  async cancelInvoice() {
    this.fail('Datil cancellation is blocked until the official sandbox contract is documented', { code: 'DATIL_CANCEL_NOT_SUPPORTED' })
  }
}
