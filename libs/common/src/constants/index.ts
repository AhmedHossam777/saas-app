export const Queues = {
  AUTH: 'auth_queue',
  TENANT: 'tenant_queue',
  CHAT: 'chat_queue',
} as const;

export const JWTConfig = {
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',  
} as const;