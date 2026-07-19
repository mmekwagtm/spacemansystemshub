import type { Notification } from "@spaceman/app-types";

export interface NotificationIntent {
  recipientId: string;
  type: string;
  title: string;
  body: string;
  route?: string;
}

export interface NotificationOutboxMessage extends NotificationIntent {
  channel: "in_app" | "fcm";
  deduplicationKey: string;
}

export function toInAppNotification(
  intent: NotificationIntent,
  metadata: Pick<Notification, "id" | "createdAt" | "createdBy" | "updatedAt" | "updatedBy">
): Notification {
  return {
    ...metadata,
    ...intent
  };
}

export function createRecipientScopedOutboxMessages(
  intent: NotificationIntent,
  deduplicationKey: string,
  includeFcm: boolean
): NotificationOutboxMessage[] {
  const messages: NotificationOutboxMessage[] = [
    { ...intent, channel: "in_app", deduplicationKey }
  ];

  if (includeFcm) {
    messages.push({ ...intent, channel: "fcm", deduplicationKey });
  }

  return messages;
}
