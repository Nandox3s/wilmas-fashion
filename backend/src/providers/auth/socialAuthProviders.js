import { OAuth2Client } from 'google-auth-library'
import { env } from '../../config/env.js'
import { HttpError } from '../../utils/errors.js'

const unavailable = (provider) => new HttpError(503, `${provider} login is not configured`, 'SOCIAL_AUTH_NOT_CONFIGURED')
const invalid = (provider) => new HttpError(401, `Invalid ${provider} token`, 'INVALID_SOCIAL_TOKEN')

export class GoogleAuthProvider {
  constructor(clientId = env.googleClientId, client = new OAuth2Client(clientId)) {
    this.clientId = clientId
    this.client = client
  }

  async verify(credential) {
    if (!this.clientId) throw unavailable('Google')
    if (typeof credential !== 'string' || !credential.trim()) throw invalid('Google')
    try {
      const ticket = await this.client.verifyIdToken({ idToken: credential, audience: this.clientId })
      const payload = ticket.getPayload()
      if (!payload?.sub || !payload.email || payload.email_verified !== true) throw invalid('Google')
      return { providerId: payload.sub, email: payload.email, name: payload.name, avatar: payload.picture }
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw invalid('Google')
    }
  }
}

export class FacebookAuthProvider {
  constructor({ appId = env.facebookAppId, appSecret = env.facebookAppSecret, fetchImpl = globalThis.fetch } = {}) {
    this.appId = appId
    this.appSecret = appSecret
    this.fetch = fetchImpl
  }

  async verify(accessToken) {
    if (!this.appId || !this.appSecret) throw unavailable('Facebook')
    if (typeof accessToken !== 'string' || !accessToken.trim()) throw invalid('Facebook')
    try {
      const debugUrl = new URL('https://graph.facebook.com/debug_token')
      debugUrl.searchParams.set('input_token', accessToken)
      debugUrl.searchParams.set('access_token', `${this.appId}|${this.appSecret}`)
      const debugResponse = await this.fetch(debugUrl)
      const debug = await debugResponse.json()
      if (!debugResponse.ok || !debug.data?.is_valid || String(debug.data.app_id) !== this.appId || !debug.data.user_id) throw invalid('Facebook')

      const profileUrl = new URL(`https://graph.facebook.com/${encodeURIComponent(debug.data.user_id)}`)
      profileUrl.searchParams.set('fields', 'id,name,email,picture.type(large)')
      const profileResponse = await this.fetch(profileUrl, { headers: { Authorization: `Bearer ${accessToken}` } })
      const profile = await profileResponse.json()
      if (!profileResponse.ok || !profile.id || !profile.email) throw invalid('Facebook')
      return { providerId: profile.id, email: profile.email, name: profile.name, avatar: profile.picture?.data?.url }
    } catch (error) {
      if (error instanceof HttpError) throw error
      throw invalid('Facebook')
    }
  }
}
