export enum ChannelStatus {
  Created = 'CREATED',
  Connecting = 'CONNECTING',
  QrPending = 'QR_PENDING',
  Connected = 'CONNECTED',
  Reconnecting = 'RECONNECTING',
  Disconnected = 'DISCONNECTED',
  Failed = 'FAILED',
}

export enum ProviderType {
  Baileys = 'BAILEYS',
  MetaCloudApi = 'META_CLOUD_API',
  Twilio = 'TWILIO',
  InMemory = 'IN_MEMORY',
}
