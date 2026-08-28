const APPLICATION_KEYS = new Set(['JWT_SECRET', 'PAYPHONE_TOKEN', 'PAYPHONE_STORE_ID', 'PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'DATIL_API_KEY', 'SES_FROM_EMAIL'])

async function secret(client, arn) {
  const { GetSecretValueCommand } = await import('@aws-sdk/client-secrets-manager')
  const response = await client.send(new GetSecretValueCommand({ SecretId: arn }))
  if (!response.SecretString) throw new Error('Managed secret does not contain a SecretString')
  return JSON.parse(response.SecretString)
}

export async function loadManagedSecrets() {
  const appArn = process.env.APP_SECRET_ARN
  const rdsArn = process.env.RDS_SECRET_ARN
  if (!appArn && !rdsArn) return
  const { SecretsManagerClient } = await import('@aws-sdk/client-secrets-manager')
  const client = new SecretsManagerClient({ region: process.env.AWS_REGION || 'us-east-1' })
  if (appArn) {
    const values = await secret(client, appArn)
    for (const [key, value] of Object.entries(values)) if (APPLICATION_KEYS.has(key) && typeof value === 'string' && value) process.env[key] = value
  }
  if (rdsArn) {
    const values = await secret(client, rdsArn)
    const required = ['username', 'password', 'host', 'port']
    if (!required.every((key) => values[key])) throw new Error('RDS managed secret is incomplete')
    const database = process.env.DATABASE_NAME || 'wilmas_fashion'
    process.env.DATABASE_URL = `postgresql://${encodeURIComponent(values.username)}:${encodeURIComponent(values.password)}@${values.host}:${values.port}/${encodeURIComponent(database)}?schema=public&sslmode=require`
  }
}
