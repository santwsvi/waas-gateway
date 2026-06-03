export enum MessageStatus {
  Pending = 'PENDING',
  Queued = 'QUEUED',
  Sending = 'SENDING',
  Sent = 'SENT',
  Delivered = 'DELIVERED',
  Read = 'READ',
  Failed = 'FAILED',
  Retrying = 'RETRYING',
  DeadLettered = 'DEAD_LETTERED',
  Received = 'RECEIVED',
}

export enum MessageDirection {
  Outbound = 'OUTBOUND',
  Inbound = 'INBOUND',
}
