import type { AiFlagRepository, AiService as AiServiceContract } from "../model/services.model";

export class AiService implements AiServiceContract {
  constructor(private readonly repository: AiFlagRepository) {}

  async getAiEnabled(): Promise<boolean> {
    return (await this.repository.getAiEnabled()) ?? true;
  }

  async setAiEnabled(ai: boolean): Promise<{ ai: boolean }> {
    await this.repository.setAiEnabled(ai);
    return { ai };
  }
}
