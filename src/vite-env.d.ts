/// <reference types="vite/client" />

interface ExportArduinoProjectResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
}

interface ProjectFileResult {
  ok: boolean;
  canceled?: boolean;
  filePath?: string;
  contents?: string;
  error?: string;
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

type AppUpdateStage = "idle" | "disabled" | "checking" | "available" | "downloading" | "ready" | "installing" | "up-to-date" | "error";

interface AppUpdateStatus {
  status: AppUpdateStage;
  currentVersion: string;
  version?: string;
  percent?: number;
  message: string;
}

interface ManagedProjectSummary {
  id: string;
  name: string;
  createdAt: string;
  modifiedAt: string;
  columns: number;
  rows: number;
  colorEnabled: boolean;
  screenCount: number;
  blockCount: number;
  previewText: string[];
}

interface ProjectLibraryListResult {
  ok: boolean;
  projects: ManagedProjectSummary[];
  error?: string;
}

interface ManagedProjectLoadResult {
  ok: boolean;
  project?: ManagedProjectSummary;
  contents?: string;
  error?: string;
}

interface ManagedProjectSaveResult {
  ok: boolean;
  project?: ManagedProjectSummary;
  error?: string;
}

interface ManagedProjectDeleteResult {
  ok: boolean;
  error?: string;
}

interface Window {
  minitelStudio?: {
    listProjects: () => Promise<ProjectLibraryListResult>;
    loadProject: (id: string) => Promise<ManagedProjectLoadResult>;
    saveProject: (payload: { id?: string; contents: string }) => Promise<ManagedProjectSaveResult>;
    deleteProject: (id: string) => Promise<ManagedProjectDeleteResult>;
    exportProject: (payload: { suggestedName: string; contents: string }) => Promise<ProjectFileResult>;
    importProject: () => Promise<ProjectFileResult>;
    exportArduinoProject: (payload: { projectName: string; code: string }) => Promise<ExportArduinoProjectResult>;
    listSerialPorts: () => Promise<ListSerialPortsResult>;
    uploadToEsp32: (payload: UploadEsp32Payload) => Promise<UploadEsp32Result>;
    onUploadProgress: (callback: (progress: UploadProgress) => void) => () => void;
    getUpdateStatus: () => Promise<AppUpdateStatus>;
    checkForUpdates: () => Promise<AppUpdateStatus>;
    installUpdate: () => Promise<AppUpdateStatus>;
    onUpdateStatus: (callback: (status: AppUpdateStatus) => void) => () => void;
  };
}
