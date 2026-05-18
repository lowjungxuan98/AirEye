import multer from "multer";

export const API_ERROR_MESSAGES = {
  internalServerError: "Internal server error",
  invalidMultipartRequest: "Invalid multipart request",
  imageTooLarge: "image exceeds the 500 MB limit",
  promptFileTooLarge: "Each prompt file must be at most 2 MB",
  imageRequired: "image is required",
  importNoStreamOutput: "Import produced no stream output",
  regenerateNoStreamOutput: "Regenerate produced no stream output",
  expectedJsonObjectBody: "Expected a JSON object body",
  expectedJsonObjectBodyOrMultipart: "Expected a JSON object body or multipart/form-data",
  textMustBeString: "text must be a string",
  imageUrlMissingUploadObjectName: "imageUrl must contain an upload object name",
  uploadNotFound: "upload not found",
  uploadFailed: "upload failed",
  invalidProvider:
    "Expected provider to be one of: openrouter, openai, nvidia, deepseek",
  unsupportedImageUpload: "Only image uploads are supported",
  unsupportedPromptUpload: "Prompt files must be text/plain, text/*, or .txt",
  invalidPromptSecret: "Invalid or missing X-Grim-Prompt-Secret header",
  invalidPage: "page must be a positive integer",
  invalidLimit: "limit must be a positive integer",
  missingPromptUpdate:
    "Provide at least one prompt: JSON keys extractTextPrompt / analyzingTextPrompt / formatGuardPrompt, or multipart fields extract_text / analyzing_text / format_guard (file or text)"
} as const;

export const API_ERROR_CODES = {
  invalidRequest: "INVALID_REQUEST",
  internalError: "INTERNAL_ERROR",
  notFound: "NOT_FOUND",
  unsupportedFileType: "UNSUPPORTED_FILE_TYPE",
  imageTooLarge: "IMAGE_TOO_LARGE",
  promptFileTooLarge: "PROMPT_FILE_TOO_LARGE",
  invalidProvider: "INVALID_PROVIDER",
  providerNotConfigured: "PROVIDER_NOT_CONFIGURED",
  unauthorized: "UNAUTHORIZED"
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];
export type ApiErrorPayload = { code: string; message: string };

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ApiErrorCode | string,
    message: string
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function invalidRequest(message: string): ApiError {
  return new ApiError(400, API_ERROR_CODES.invalidRequest, message);
}

export function internalError(message: string = API_ERROR_MESSAGES.internalServerError): ApiError {
  return new ApiError(500, API_ERROR_CODES.internalError, message);
}

export function notFound(message: string): ApiError {
  return new ApiError(404, API_ERROR_CODES.notFound, message);
}

export function unsupportedFileType(message: string): ApiError {
  return new ApiError(415, API_ERROR_CODES.unsupportedFileType, message);
}

export function imageTooLarge(): ApiError {
  return new ApiError(413, API_ERROR_CODES.imageTooLarge, API_ERROR_MESSAGES.imageTooLarge);
}

export function promptFileTooLarge(): ApiError {
  return new ApiError(
    413,
    API_ERROR_CODES.promptFileTooLarge,
    API_ERROR_MESSAGES.promptFileTooLarge
  );
}

export function invalidProvider(message: string = API_ERROR_MESSAGES.invalidProvider): ApiError {
  return new ApiError(400, API_ERROR_CODES.invalidProvider, message);
}

export function providerNotConfigured(provider: string): ApiError {
  return new ApiError(
    503,
    API_ERROR_CODES.providerNotConfigured,
    `Current provider is not configured: ${provider}`
  );
}

export function unauthorized(message: string): ApiError {
  return new ApiError(401, API_ERROR_CODES.unauthorized, message);
}

export function uploadNotFound(): ApiError {
  return notFound(API_ERROR_MESSAGES.uploadNotFound);
}

export function fieldMustBeNonEmptyString(field: string): ApiError {
  return invalidRequest(`${field} must be a non-empty string`);
}

export function promptFieldMustBeString(field: string): ApiError {
  return invalidRequest(`${field} must be a string`);
}

export function mapImageMulterError(error: multer.MulterError): ApiError {
  if (error.code === "LIMIT_FILE_SIZE") {
    return imageTooLarge();
  }
  return invalidRequest(API_ERROR_MESSAGES.invalidMultipartRequest);
}

export function mapPromptMulterError(error: multer.MulterError): ApiError {
  if (error.code === "LIMIT_FILE_SIZE") {
    return promptFileTooLarge();
  }
  return invalidRequest(error.message);
}

export function mapRequestError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }
  if (error instanceof multer.MulterError) {
    return mapImageMulterError(error);
  }
  return internalError();
}

export function toErrorPayload(error: unknown): ApiErrorPayload {
  if (error instanceof ApiError) {
    return { code: error.code, message: error.message };
  }
  if (error instanceof Error && error.message.trim()) {
    return {
      code: API_ERROR_CODES.internalError,
      message: error.message.trim().slice(0, 200)
    };
  }
  return {
    code: API_ERROR_CODES.internalError,
    message: API_ERROR_MESSAGES.internalServerError
  };
}
