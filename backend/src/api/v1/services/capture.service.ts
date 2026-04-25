import type {
  CaptureService as CaptureServiceContract,
  ResultNotifier
} from "../model/services.model";

export class CaptureService implements CaptureServiceContract {
  constructor(private readonly notifier: ResultNotifier) {}

  async sendCaptureNotification(): Promise<void> {
    await this.notifier.broadcastCaptureRequest();
  }
}
