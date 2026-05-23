import type { Message } from "firebase-admin/messaging";
import type { AirEyeNotificationDataValue, AirEyeNotificationOptions } from "./type";

export function buildFcmTopicNotificationMessage(
  topic: string,
  options: AirEyeNotificationOptions
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
  data: Record<string, AirEyeNotificationDataValue>
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(data)
      .filter((entry): entry is [string, string | number | boolean] => entry[1] !== null && entry[1] !== undefined)
      .map(([key, value]) => [key, String(value)])
  );
}
