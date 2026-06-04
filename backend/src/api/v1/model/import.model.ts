export type AirEyeUpload = {
  createdAt: number;
  updatedAt: number;
  extractedText?: string;
  finalText?: string;
  imageUrl?: string;
  bucket?: string;
  objectKey?: string;
  errorMessage?: string;
};

export type AirEyeUploadRow = AirEyeUpload & { id: string };

export type UploadedWorkflowImage = {
  uploadId: string;
  imageUrl: string;
  bucket?: string;
  objectKey?: string;
};

export type QueuedWorkflowResponse = {
  status: "queued";
  jobId: string;
  uploadId: string;
};

export type ImportRequest = {
  imageBuffer: Buffer;
  imageMimeType: string;
};
