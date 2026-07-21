export class StorageProvider {
  async putObject() { throw new Error('putObject must be implemented') }
  async getSignedDownloadUrl() { throw new Error('getSignedDownloadUrl must be implemented') }
  async createPresignedUpload() { throw new Error('createPresignedUpload must be implemented') }
}
