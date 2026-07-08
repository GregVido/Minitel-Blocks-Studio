/// <reference types="vite/client" />

interface SaveSketchResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
}

interface UploadEsp32Payload {
  code: string;
  board: string;
  port?: string;
}

interface UploadEsp32Result {
  ok: boolean;
  output: string;
  projectPath?: string;
  exitCode?: number;
}

interface Window {
  minitelStudio?: {
    saveArduinoSketch: (fileName: string, content: string) => Promise<SaveSketchResult>;
    uploadToEsp32: (payload: UploadEsp32Payload) => Promise<UploadEsp32Result>;
  };
}
