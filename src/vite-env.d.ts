/// <reference types="vite/client" />

interface ExportArduinoProjectResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
}

interface SerialPortInfo {
  path: string;
  label: string;
  details?: string;
  fqbn?: string;
  likelyEsp32: boolean;
}

interface ListSerialPortsResult {
  ok: boolean;
  ports: SerialPortInfo[];
  engineReady: boolean;
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
  port?: string;
}

interface UploadProgress {
  stage: "detect" | "compile" | "upload" | "done";
  message: string;
}

interface Window {
  minitelStudio?: {
    exportArduinoProject: (payload: { projectName: string; code: string }) => Promise<ExportArduinoProjectResult>;
    listSerialPorts: () => Promise<ListSerialPortsResult>;
    uploadToEsp32: (payload: UploadEsp32Payload) => Promise<UploadEsp32Result>;
    onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
  };
}
