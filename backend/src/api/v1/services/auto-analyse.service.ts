import type {
  AutoAnalyseFlagRepository,
  AutoAnalyseService as AutoAnalyseServiceContract
} from "../model/services.model";

export class AutoAnalyseService implements AutoAnalyseServiceContract {
  constructor(private readonly repository: AutoAnalyseFlagRepository) {}

  async getAutoAnalyseEnabled(): Promise<boolean> {
    return (await this.repository.getAutoAnalyseEnabled()) ?? true;
  }

  async setAutoAnalyseEnabled(autoAnalyse: boolean): Promise<{ auto_analyse: boolean }> {
    await this.repository.setAutoAnalyseEnabled(autoAnalyse);
    return { auto_analyse: autoAnalyse };
  }
}
