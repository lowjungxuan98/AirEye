import type { Message } from "firebase-admin/messaging";

export const GRIM_NOTIFICATION_TYPES = ["silent"] as const;
export type GrimNotificationType = (typeof GRIM_NOTIFICATION_TYPES)[number];

export const GRIM_NOTIFICATION_ROLES = ["receiver", "sender"] as const;
export type GrimNotificationRole = (typeof GRIM_NOTIFICATION_ROLES)[number];

export type GrimNotificationKind = "capture_request" | "export_refresh";

export type GrimNotificationOptions = {
  kind: GrimNotificationKind;
  type: GrimNotificationType;
  role: GrimNotificationRole;
  data?: Record<string, string | number | boolean | null | undefined>;
};

export function buildFcmTopicNotificationMessage(
  topic: string,
  options: GrimNotificationOptions
): Message {
  const data = stringifyFcmData({
    ...options.data,
    kind: options.kind,
    notificationType: options.type,
    notification_type: options.type,
    role: options.role,
    targetRole: options.role
  });

  return {
    topic,
    data,
    android: {
      priority: "high"
    },
    apns: {
      headers: { "apns-priority": "5" },
      payload: {
        aps: { contentAvailable: true }
      }
    }
  };
}

function stringifyFcmData(
  data: Record<string, string | number | boolean | null | undefined>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}
