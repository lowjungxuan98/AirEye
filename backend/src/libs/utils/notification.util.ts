import type { Message } from "firebase-admin/messaging";

export const GRIM_NOTIFICATION_TYPES = ["silent", "notify"] as const;
export type GrimNotificationType = (typeof GRIM_NOTIFICATION_TYPES)[number];

export const GRIM_NOTIFICATION_ROLES = ["receiver", "sender"] as const;
export type GrimNotificationRole = (typeof GRIM_NOTIFICATION_ROLES)[number];

export type GrimNotificationKind = "new_result" | "capture_request" | "export_refresh";

export type GrimNotificationOptions = {
  kind: GrimNotificationKind;
  type: GrimNotificationType;
  role: GrimNotificationRole;
  title?: string;
  body?: string;
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

  const message: Message = {
    topic,
    data,
    android: {
      priority: "high"
    },
    apns: {
      headers: options.type === "silent" ? { "apns-priority": "5" } : { "apns-priority": "10" },
      payload: {
        aps: options.type === "silent" ? { contentAvailable: true } : {}
      }
    }
  };

  if (options.type === "notify") {
    const notification = {
      title: options.title ?? "GRIM",
      body: options.body ?? "New result is ready."
    };

    return {
      ...message,
      notification,
      android: {
        ...message.android,
        notification: {
          ...notification,
          channelId: "grim_results",
          priority: "high"
        }
      },
      apns: {
        ...message.apns,
        payload: {
          aps: {
            alert: notification,
            sound: "default"
          }
        }
      }
    };
  }

  return message;
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
