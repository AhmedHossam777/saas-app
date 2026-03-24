export interface UserRegisteredEvent {
  userId: string;
  email: string;
  name: string;
  timestamp: string;
}

export interface MessageSentEvent {
  messageId: string;
  senderId: string;
  tenantId: string;
  channelId: string;
  content: string;
  timestamp: string;
}

export const RabbitMQEvents = {
  USER_REGISTERED: 'user.registered',
  USER_DELETED: 'user.deleted',
  MESSAGE_SENT: 'message.sent',
  MEMBER_INVITED: 'member.invited',
} as const;
