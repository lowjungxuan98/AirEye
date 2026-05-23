/** Default FCM topic name; AirEye clients subscribe with this string. */
export const DEFAULT_FCM_BROADCAST_TOPIC = "aireye_new_result";

export const AIREYE_NOTIFICATION_TYPES = ["silent"] as const;
export const AIREYE_NOTIFICATION_ROLES = ["receiver", "sender"] as const;
