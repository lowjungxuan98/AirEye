import type { RequestHandler } from "express";
import type { AutoAnalyseService } from "../model/services.model";
import { readBoolean, readJsonObjectBody } from "../../../libs/utils/request-body.util";

export function createPutAutoAnalyseHandler(autoAnalyseService: AutoAnalyseService): RequestHandler {
  return async (req, res) => {
    const body = readJsonObjectBody(req.body);
    res
      .status(200)
      .json(await autoAnalyseService.setAutoAnalyseEnabled(readBoolean(body, "auto_analyse")));
  };
}
