import type {
  SendNotificationService as SendNotificationServiceContract,
  ResultNotifier
} from "../model/services.model";

export class SendNotificationService implements SendNotificationServiceContract {
  constructor(private readonly notifier: ResultNotifier) {}

  async sendNotification(): Promise<void> {
    await this.notifier.broadcastCaptureRequest();
  }
}
