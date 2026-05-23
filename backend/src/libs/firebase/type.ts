import type { AIREYE_NOTIFICATION_ROLES, AIREYE_NOTIFICATION_TYPES } from "./constants";

export type AirEyeNotificationType = (typeof AIREYE_NOTIFICATION_TYPES)[number];
export type AirEyeNotificationRole = (typeof AIREYE_NOTIFICATION_ROLES)[number];
export type AirEyeNotificationKind = "capture_request" | "export_refresh";

export type AirEyeNotificationDataValue = string | number | boolean | null | undefined;

export type AirEyeNotificationOptions = {
  kind: AirEyeNotificationKind;
  type: AirEyeNotificationType;
  role: AirEyeNotificationRole;
  data?: Record<string, AirEyeNotificationDataValue>;
};
