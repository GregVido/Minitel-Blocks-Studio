import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import appLogo from "../logo.png";
import Braces from "lucide-react/dist/esm/icons/braces.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import Cpu from "lucide-react/dist/esm/icons/cpu.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import FileCode2 from "lucide-react/dist/esm/icons/file-code-2.js";
import FileDown from "lucide-react/dist/esm/icons/file-down.js";
import House from "lucide-react/dist/esm/icons/house.js";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.js";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.js";
import Keyboard from "lucide-react/dist/esm/icons/keyboard.js";
import ListTree from "lucide-react/dist/esm/icons/list-tree.js";
import Monitor from "lucide-react/dist/esm/icons/monitor.js";
import Moon from "lucide-react/dist/esm/icons/moon.js";
import MousePointer2 from "lucide-react/dist/esm/icons/mouse-pointer-2.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Pause from "lucide-react/dist/esm/icons/pause.js";
import Play from "lucide-react/dist/esm/icons/play.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Radio from "lucide-react/dist/esm/icons/radio.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Redo2 from "lucide-react/dist/esm/icons/redo-2.js";
import Repeat from "lucide-react/dist/esm/icons/repeat.js";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import Save from "lucide-react/dist/esm/icons/save.js";
import Server from "lucide-react/dist/esm/icons/server.js";
import Sigma from "lucide-react/dist/esm/icons/sigma.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import StepForward from "lucide-react/dist/esm/icons/step-forward.js";
import Sun from "lucide-react/dist/esm/icons/sun.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Type from "lucide-react/dist/esm/icons/type.js";
import Undo2 from "lucide-react/dist/esm/icons/undo-2.js";
import Upload from "lucide-react/dist/esm/icons/upload.js";
import Usb from "lucide-react/dist/esm/icons/usb.js";
import Variable from "lucide-react/dist/esm/icons/variable.js";
import Volume2 from "lucide-react/dist/esm/icons/volume-2.js";
import Wifi from "lucide-react/dist/esm/icons/wifi.js";
import Wand2 from "lucide-react/dist/esm/icons/wand-2.js";
import X from "lucide-react/dist/esm/icons/x.js";
import type { LucideIcon } from "lucide-react";
import {
  ScreenDesigner,
  createDefaultScreenConfig,
  createMinitelScene,
  elementDimensions,
  fitElementsToScreen,
  makeSceneBox,
  makeSceneImage,
  makeSceneText,
  mosaicBits,
  type MinitelScene,
  type MinitelScreenConfig,
  type SceneElement,
  type SceneImageElement,
} from "./screen-designer";
import ProjectHub, { type NewProjectSettings } from "./project-hub";

type BlockKind = "event" | "action" | "control" | "value";
type InputType = "text" | "number" | "select" | "color" | "boolean" | "variable" | "condition" | "screen" | "query";
type ExprType = "number" | "boolean" | "text";
type VariableValueType = "number" | "text";
type RightTab = "preview" | "code" | "upload";
type WorkspaceMode = "blocks" | "designer";
type AppTheme = "light" | "dark";

type SelectOption = {
  label: string;
  value: string;
  group?: string;
};

type MinitelKeyOption = SelectOption & {
  sequence?: readonly number[];
  screenLabel?: string;
};

type LiteralExpr = {
  kind: "literal";
  valueType: ExprType;
  value: string | number | boolean;
};

type VariableExpr = {
  kind: "variable";
  valueType: ExprType;
  name: string;
};

type BinaryExpr = {
  kind: "binary";
  valueType: "number";
  op: "+" | "-" | "*" | "/" | "%";
  left: Expr;
  right: Expr;
};

type CompareExpr = {
  kind: "compare";
  valueType: "boolean";
  op: "==" | "!=" | "<" | "<=" | ">" | ">=";
  left: Expr;
  right: Expr;
};

type RandomExpr = {
  kind: "random";
  valueType: "number";
  from: Expr;
  to: Expr;
};

type LogicalExpr = {
  kind: "logical";
  valueType: "boolean";
  op: "&&" | "||";
  left: Expr;
  right: Expr;
};

type NotExpr = {
  kind: "not";
  valueType: "boolean";
  operand: Expr;
};

type Expr = LiteralExpr | VariableExpr | BinaryExpr | CompareExpr | RandomExpr | LogicalExpr | NotExpr;
type InputValue = string | number | boolean | Expr;
type Values = Record<string, InputValue>;

type BlockInput = {
  key: string;
  label: string;
  type: InputType;
  defaultValue: InputValue;
  options?: SelectOption[];
  min?: number;
  max?: number;
  step?: number;
  compact?: boolean;
  placeholder?: string;
  secret?: boolean;
  variableType?: VariableValueType | "any";
};

type SlotDefinition = {
  key: "children" | "elseChildren";
  label: string;
};

type BlockDefinition = {
  id: string;
  title: string;
  help: string;
  kind: BlockKind;
  category: string;
  color: string;
  inputs?: BlockInput[];
  slots?: SlotDefinition[];
  output?: Expr;
};

type EventInstance = {
  definitionId: string;
  values: Values;
};

type ProgramBlock = {
  id: string;
  definitionId: string;
  values: Values;
  children?: ProgramBlock[];
  elseChildren?: ProgramBlock[];
};

type ScriptStack = {
  id: string;
  event: EventInstance;
  blocks: ProgramBlock[];
};

type VariableDef = {
  id: string;
  name: string;
  valueType: VariableValueType;
  defaultValue: Expr;
};

type ProjectSnapshot = {
  stacks: ScriptStack[];
  variables: VariableDef[];
  screenConfig: MinitelScreenConfig;
  screens: MinitelScene[];
  activeScreenId: string;
  workspaceMode: WorkspaceMode;
};

type ProjectMetadata = {
  name: string;
  createdAt: string;
};

type ProjectFile = {
  format: "minitel-blocks-studio";
  version: 2;
  savedAt: string;
  board: string;
  metadata: ProjectMetadata;
  project: ProjectSnapshot;
};

type ParsedProjectFile = {
  project: ProjectSnapshot;
  board: string;
  metadata: ProjectMetadata;
};

type HistoryState = {
  past: ProjectSnapshot[];
  future: ProjectSnapshot[];
};

type MotionKind = "moving-up" | "moving-down" | "moving-drop" | "duplicating" | "history-flash";

type Category = {
  id: string;
  label: string;
  accent: string;
  icon: LucideIcon;
};

type DropLocation = {
  stackId: string;
  ownerId?: string;
  slot: "root" | "children" | "elseChildren";
  index: number;
};

type ExpressionPathPart = "left" | "right" | "from" | "to" | "operand";

type ExpressionDropOwner =
  | { owner: "block"; stackId: string; blockId: string; inputKey: string }
  | { owner: "event"; stackId: string; inputKey: string }
  | { owner: "variable"; variableId: string };

type ExpressionDropLocation = ExpressionDropOwner & {
  path: ExpressionPathPart[];
  accepts: "number" | "boolean" | "query";
  queryTarget?: {
    index: number;
    field: "key" | "value";
  };
};

type DragPayload =
  | { source: "palette"; definitionId: string }
  | { source: "workspace"; stackId: string; blockId: string }
  | { source: "stack"; stackId: string };

type DragPreviewState = {
  title: string;
  helper: string;
  color: string;
  shape: "brick" | "event-hat" | "c-block" | "value-block" | "condition-block";
  x: number;
  y: number;
};

type PendingPointerDrag = {
  payload: DragPayload;
  title: string;
  helper: string;
  color: string;
  shape: DragPreviewState["shape"];
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  started: boolean;
  sourceBlockId?: string;
  sourcePaletteId?: string;
  sourceStackId?: string;
  pointerId: number;
  sourceElement: HTMLElement;
};

type PreviewCell = {
  char: string;
  fg: string;
  bg: string;
};

type PreviewState = {
  cells: PreviewCell[];
  columns: number;
  rows: number;
  cursorColumn: number;
  cursorRow: number;
  fg: string;
  bg: string;
  textSize: string;
  baudRate: number;
  messages: string[];
  variables: Record<string, number | string>;
  colorEnabled: boolean;
};

type SimulationHttpState = {
  status: "loading" | "success" | "error";
  body?: string;
  statusCode?: number;
  resolvedUrl?: string;
  error?: string;
};

type SimulationHttpRequest = {
  key: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: string;
};

type UploadResult = {
  ok: boolean;
  output: string;
  projectPath?: string;
  exitCode?: number;
  port?: string;
};

type UploadStage = "idle" | "detect" | "compile" | "upload" | "done" | "error";

type BlockStyle = CSSProperties & {
  "--block-color": string;
};

type CategoryStyle = CSSProperties & {
  "--category-color": string;
};

type DragPreviewStyle = CSSProperties & {
  "--block-color": string;
};

type CodeContext = {
  keyVariable?: string;
  screens?: MinitelScene[];
  colorEnabled?: boolean;
};

type ProjectExample = {
  id: string;
  name: string;
  description: string;
  accent: string;
  create: () => ProjectSnapshot;
};

const DRAG_TYPE = "application/minitel-block";
const DELETE_ANIMATION_MS = 260;
const BLOCK_MOTION_MS = 430;
const HISTORY_LIMIT = 80;
const PROJECT_FILE_FORMAT = "minitel-blocks-studio";
const PROJECT_FILE_VERSION = 2;
const APP_THEME_STORAGE_KEY = "minitel-blocks-theme";
const APP_AUTO_SAVE_STORAGE_KEY = "minitel-blocks-auto-save";
const APP_AUTO_UPDATE_STORAGE_KEY = "minitel-blocks-auto-update";
const AUTO_SAVE_DELAY_MS = 900;
const DEFAULT_TEST_SERVER_PORT = 6663;

function initialTestServerStatus(): TestServerStatus {
  const baseUrl = "http://localhost:" + DEFAULT_TEST_SERVER_PORT;
  return {
    available: Boolean(window.minitelStudio?.getTestServerStatus),
    enabled: true,
    port: DEFAULT_TEST_SERVER_PORT,
    running: false,
    baseUrl,
    endpoints: {
      get: baseUrl + "/test",
      post: baseUrl + "/echo",
      put: baseUrl + "/echo",
      patch: baseUrl + "/echo",
      delete: baseUrl + "/echo",
    },
  };
}

function readInitialAppTheme(): AppTheme {
  try {
    const saved = window.localStorage.getItem(APP_THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function readInitialAutoSaveEnabled() {
  try {
    return window.localStorage.getItem(APP_AUTO_SAVE_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

function readInitialAutomaticUpdatesEnabled() {
  try {
    return window.localStorage.getItem(APP_AUTO_UPDATE_STORAGE_KEY) !== "false";
  } catch {
    return true;
  }
}

const initialAppTheme = readInitialAppTheme();
const initialAutoSaveEnabled = readInitialAutoSaveEnabled();
const initialAutomaticUpdatesEnabled = readInitialAutomaticUpdatesEnabled();
document.documentElement.dataset.theme = initialAppTheme;
document.documentElement.style.colorScheme = initialAppTheme;

const uid = () => "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
const num = (value: number): Expr => ({ kind: "literal", valueType: "number", value });
const textExpr = (value: string): Expr => ({ kind: "literal", valueType: "text", value });
const boolExpr = (value: boolean): Expr => ({ kind: "literal", valueType: "boolean", value });
const variableExpr = (name: string): Expr => ({ kind: "variable", valueType: "number", name });
const variableValueType = (variable: VariableDef): VariableValueType => variable.valueType === "text" ? "text" : "number";
const variableReferenceExpr = (variable: VariableDef): Expr => ({
  kind: "variable",
  valueType: variableValueType(variable),
  name: variable.name,
});
const binaryExpr = (op: BinaryExpr["op"], left: Expr, right: Expr): Expr => ({ kind: "binary", valueType: "number", op, left, right });
const addExpr = (left: Expr, right: Expr): Expr => binaryExpr("+", left, right);
const randomExpr = (from: Expr, to: Expr): Expr => ({ kind: "random", valueType: "number", from, to });
const compareExpr = (left: Expr, op: CompareExpr["op"], right: Expr): Expr => ({ kind: "compare", valueType: "boolean", op, left, right });
const logicalExpr = (left: Expr, op: LogicalExpr["op"], right: Expr): Expr => ({ kind: "logical", valueType: "boolean", op, left, right });
const notExpr = (operand: Expr): Expr => ({ kind: "not", valueType: "boolean", operand });

function expressionOperatorGlyph(op: BinaryExpr["op"] | CompareExpr["op"] | LogicalExpr["op"]) {
  if (op === "-") return "\u2212";
  if (op === "*") return "\u00d7";
  if (op === "/") return "\u00f7";
  if (op === "==") return "=";
  if (op === "!=") return "\u2260";
  if (op === "&&") return "et";
  if (op === "||") return "ou";
  return op;
}

function isExpr(value: InputValue | undefined): value is Expr {
  return Boolean(value && typeof value === "object" && "kind" in value);
}

function cloneValue<T extends InputValue>(value: T): T {
  if (isExpr(value)) {
    return JSON.parse(JSON.stringify(value)) as T;
  }
  return value;
}

function cloneBlock(block: ProgramBlock): ProgramBlock {
  return {
    id: uid(),
    definitionId: block.definitionId,
    values: Object.fromEntries(Object.entries(block.values).map(([key, value]) => [key, cloneValue(value)])),
    children: block.children?.map(cloneBlock),
    elseChildren: block.elseChildren?.map(cloneBlock),
  };
}

function cloneProjectSnapshot(snapshot: ProjectSnapshot): ProjectSnapshot {
  return JSON.parse(JSON.stringify(snapshot)) as ProjectSnapshot;
}

function collectBlockIds(blocks: ProgramBlock[]): string[] {
  return blocks.flatMap((block) => [block.id, ...collectBlockIds(block.children ?? []), ...collectBlockIds(block.elseChildren ?? [])]);
}

function textValue(value: InputValue | undefined, fallback: string) {
  if (value === undefined || value === null || isExpr(value)) {
    return fallback;
  }
  return String(value);
}

const QUERY_VARIABLE_PATTERN = /^\{\{mbs-variable:([^{}]+)\}\}$/;

type QueryParameterEntry = {
  key: string;
  value: string;
};

function queryVariableToken(name: string) {
  return "{{mbs-variable:" + encodeURIComponent(name.trim()) + "}}";
}

function queryVariableName(value: string) {
  const match = QUERY_VARIABLE_PATTERN.exec(value.trim());
  if (!match) return "";
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return "";
  }
}

function queryEntriesFromValue(value: unknown): QueryParameterEntry[] {
  if (typeof value !== "string") return [];
  const source = value.trim().replace(/^[?&]+/, "");
  if (!source) return [];
  return Array.from(new URLSearchParams(source).entries()).map(([key, parameterValue]) => ({
    key,
    value: parameterValue,
  }));
}

function queryValueFromEntries(entries: QueryParameterEntry[]) {
  const parameters = new URLSearchParams();
  entries.forEach((entry) => {
    const key = entry.key.trim();
    if (key) parameters.append(key, entry.value);
  });
  return parameters.toString();
}

function normalizeQueryString(value: unknown) {
  return queryValueFromEntries(queryEntriesFromValue(value));
}

function resolveQueryPart(value: string, variables: Record<string, number | string>) {
  const variableName = queryVariableName(value);
  return variableName ? String(variables[variableName] ?? "") : value;
}

function resolvedQueryEntries(rawQuery: unknown, variables: Record<string, number | string>) {
  return queryEntriesFromValue(rawQuery).flatMap((entry) => {
    const key = resolveQueryPart(entry.key, variables).trim();
    return key ? [{ key, value: resolveQueryPart(entry.value, variables) }] : [];
  });
}

function appendQueryToUrl(rawUrl: string, rawQuery: unknown, variables: Record<string, number | string> = {}) {
  const url = rawUrl.trim();
  const entries = resolvedQueryEntries(rawQuery, variables);
  if (entries.length === 0) return url;
  try {
    const parsedUrl = new URL(url);
    entries.forEach(({ key, value }) => parsedUrl.searchParams.append(key, value));
    return parsedUrl.toString();
  } catch {
    const hashIndex = url.indexOf("#");
    const base = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const hash = hashIndex >= 0 ? url.slice(hashIndex) : "";
    const separator = base.includes("?") ? (base.endsWith("?") || base.endsWith("&") ? "" : "&") : "?";
    return base + separator + queryValueFromEntries(entries) + hash;
  }
}

function httpRequestUrl(values: Values, variables: Record<string, number | string> = {}) {
  return appendQueryToUrl(textValue(values.url, ""), values.query, variables);
}

function replaceQueryFieldValue(rawQuery: unknown, index: number, field: "key" | "value", replacement: string) {
  const entries = queryEntriesFromValue(rawQuery);
  while (entries.length <= index) entries.push({ key: "", value: "" });
  entries[index] = { ...entries[index], [field]: replacement };
  if (field === "value" && !entries[index].key.trim()) entries[index].key = "parametre";
  return queryValueFromEntries(entries);
}

function replaceQueryVariableReference(rawQuery: unknown, previousName: string, nextName?: string) {
  const replacement = nextName ? queryVariableToken(nextName) : "";
  return queryValueFromEntries(queryEntriesFromValue(rawQuery).map((entry) => ({
    key: queryVariableName(entry.key) === previousName ? replacement : entry.key,
    value: queryVariableName(entry.value) === previousName ? replacement : entry.value,
  })));
}

function simulationHttpRequest(
  method: SimulationHttpRequest["method"],
  values: Values,
  variables: Record<string, number | string> = {},
): SimulationHttpRequest {
  const url = httpRequestUrl(values, variables);
  const body = method === "POST" || method === "PUT" || method === "PATCH" ? textValue(values.body, "{}") : undefined;
  return {
    key: JSON.stringify([method, url, body ?? ""]),
    method,
    url,
    body,
  };
}

function collectSimulationHttpRequests(
  stacks: ScriptStack[],
  variables: Record<string, number | string> = {},
  eventDefinitionIds?: string[],
) {
  const requests = new Map<string, SimulationHttpRequest>();
  const allowedEvents = eventDefinitionIds ? new Set(eventDefinitionIds) : null;
  const visit = (blocks: ProgramBlock[]) => {
    blocks.forEach((block) => {
      const method = block.definitionId === "http-get-json"
        ? "GET"
        : block.definitionId === "http-post-json"
          ? "POST"
          : block.definitionId === "http-put-json"
            ? "PUT"
            : block.definitionId === "http-patch-json"
              ? "PATCH"
              : block.definitionId === "http-delete-json"
                ? "DELETE"
                : null;
      if (method) {
        const request = simulationHttpRequest(method, block.values, variables);
        if (request.url) requests.set(request.key, request);
      }
      visit(block.children ?? []);
      visit(block.elseChildren ?? []);
    });
  };
  stacks.forEach((stack) => {
    if (!allowedEvents || allowedEvents.has(stack.event.definitionId)) visit(stack.blocks);
  });
  return Array.from(requests.values());
}

async function requestSimulationJson(request: SimulationHttpRequest): Promise<SimulationHttpResult> {
  const { method, url } = request;
  const requestBody = method === "POST" || method === "PUT" || method === "PATCH" ? request.body ?? "{}" : undefined;
  try {
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      if (new TextEncoder().encode(requestBody ?? "").byteLength > 2 * 1024 * 1024) {
        return { ok: false, url, error: "Le corps JSON dépasse la limite de 2 Mo." };
      }
      try {
        JSON.parse(requestBody ?? "");
      } catch {
        return { ok: false, url, error: "Le corps " + method + " n'est pas un JSON valide." };
      }
    }

    if (window.minitelStudio?.fetchJsonForSimulation) {
      return await window.minitelStudio.fetchJsonForSimulation({ method, url, body: requestBody });
    }

    const parsedUrl = new URL(url);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return { ok: false, url, error: "Seules les URL HTTP et HTTPS sont acceptées." };
    }
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10000);
    try {
      const response = await fetch(parsedUrl.toString(), {
        method,
        redirect: "follow",
        signal: controller.signal,
        headers: requestBody !== undefined
          ? { Accept: "application/json", "Content-Type": "application/json" }
          : { Accept: "application/json" },
        body: requestBody,
      });
      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (Number.isFinite(declaredLength) && declaredLength > 2 * 1024 * 1024) {
        return { ok: false, url: response.url || url, status: response.status, error: "La réponse JSON dépasse la limite de 2 Mo." };
      }
      const responseBody = await response.text();
      if (new TextEncoder().encode(responseBody).byteLength > 2 * 1024 * 1024) {
        return { ok: false, url: response.url || url, status: response.status, error: "La réponse JSON dépasse la limite de 2 Mo." };
      }
      if (!response.ok) {
        return { ok: false, url: response.url || url, status: response.status, error: "Le serveur a répondu avec le code HTTP " + response.status + "." };
      }
      try {
        JSON.parse(responseBody);
      } catch {
        return { ok: false, url: response.url || url, status: response.status, error: "La réponse reçue n'est pas un JSON valide." };
      }
      return { ok: true, url: response.url || url, status: response.status, body: responseBody };
    } finally {
      window.clearTimeout(timeout);
    }
  } catch (error) {
    return {
      ok: false,
      url,
      error: error instanceof DOMException && error.name === "AbortError"
        ? "La requête a dépassé 10 secondes."
        : "Connexion impossible : " + (error instanceof Error ? error.message : String(error)),
    };
  }
}

function boolValue(value: InputValue | undefined, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return fallback;
}

function cppString(value: InputValue | undefined) {
  const text = textValue(value, "");
  return "\"" + text.replace(/\\/g, "\\\\").replace(/"/g, "\\\"").replace(/\n/g, "\\n") + "\"";
}

function cppChar(value: InputValue | undefined) {
  const raw = textValue(value, "A");
  const first = raw.length > 0 ? raw[0] : "A";
  return "'" + first.replace(/\\/g, "\\\\").replace(/'/g, "\\'") + "'";
}

function sanitizeIdentifier(name: string) {
  const cleaned = name.trim().replace(/[^A-Za-z0-9_]/g, "_");
  if (!cleaned) {
    return "maVariable";
  }
  return /^[0-9]/.test(cleaned) ? "v_" + cleaned : cleaned;
}

function colorEnum(value: InputValue | undefined) {
  return "MinitelESP32::Color::" + textValue(value, "White");
}

function cppHexByte(value: number) {
  return "0x" + value.toString(16).toUpperCase().padStart(2, "0");
}

function keyCondition(value: InputValue | undefined) {
  const selectedKey = textValue(value, "A");
  const option = keyOptions.find((candidate) => candidate.value === selectedKey);
  if (option?.sequence) {
    return "key.matches(" + option.sequence.map(cppHexByte).join(", ") + ")";
  }
  return "key.isCharacter() && key.character == " + cppChar(selectedKey);
}

function previewKeyMatches(value: InputValue | undefined, previewKey: string) {
  return textValue(value, "A") === previewKey;
}

function minitelKeyLabel(value: string) {
  return keyOptions.find((option) => option.value === value)?.label ?? value;
}

function minitelKeyScreenLabel(value: string) {
  const option = keyOptions.find((candidate) => candidate.value === value);
  if (option?.screenLabel) return option.screenLabel;
  if (value === " ") return "ESPACE";
  return value.length === 1 ? value : option?.label.toUpperCase() ?? value.toUpperCase();
}

const colorOptions: SelectOption[] = [
  { label: "noir", value: "Black" },
  { label: "rouge", value: "Red" },
  { label: "vert", value: "Green" },
  { label: "jaune", value: "Yellow" },
  { label: "bleu", value: "Blue" },
  { label: "magenta", value: "Magenta" },
  { label: "cyan", value: "Cyan" },
  { label: "blanc", value: "White" },
];

const textSizeOptions: SelectOption[] = [
  { label: "normal", value: "Normal" },
  { label: "double hauteur", value: "DoubleHeight" },
  { label: "double largeur", value: "DoubleWidth" },
  { label: "grand", value: "DoubleSize" },
];

const lowercaseKeyOptions: MinitelKeyOption[] = Array.from("abcdefghijklmnopqrstuvwxyz", (letter) => ({
  label: letter + " minuscule",
  value: letter,
  group: "Lettres minuscules",
}));

const uppercaseKeyOptions: MinitelKeyOption[] = Array.from("ABCDEFGHIJKLMNOPQRSTUVWXYZ", (letter) => ({
  label: letter + " majuscule",
  value: letter,
  group: "Lettres majuscules",
}));

const digitKeyOptions: MinitelKeyOption[] = Array.from("0123456789", (digit) => ({
  label: digit,
  value: digit,
  group: "Chiffres",
}));

const symbolKeyOptions: MinitelKeyOption[] = Array.from({ length: 95 }, (_, index) => String.fromCharCode(0x20 + index))
  .filter((character) => !/[A-Za-z0-9]/.test(character))
  .map((character) => ({
    label: character === " " ? "Espace" : character,
    value: character,
    group: "Symboles et ponctuation",
    screenLabel: character === " " ? "ESPACE" : character,
  }));

const controlKeyOptions: MinitelKeyOption[] = Array.from({ length: 26 }, (_, index) => {
  const letter = String.fromCharCode(65 + index);
  return {
    label: "Ctrl + " + letter,
    value: "control:" + letter,
    group: "Combinaisons Ctrl",
    sequence: [index + 1],
    screenLabel: "CTRL " + letter,
  };
});

const keyOptions: MinitelKeyOption[] = [
  ...lowercaseKeyOptions,
  ...uppercaseKeyOptions,
  ...digitKeyOptions,
  ...symbolKeyOptions,
  { label: "Envoi", value: "minitel:send", group: "Touches Télétel", sequence: [0x13, 0x41], screenLabel: "ENVOI" },
  { label: "Retour", value: "minitel:return", group: "Touches Télétel", sequence: [0x13, 0x42], screenLabel: "RETOUR" },
  { label: "Répétition", value: "minitel:repeat", group: "Touches Télétel", sequence: [0x13, 0x43], screenLabel: "REPETITION" },
  { label: "Guide", value: "minitel:guide", group: "Touches Télétel", sequence: [0x13, 0x44], screenLabel: "GUIDE" },
  { label: "Annulation", value: "minitel:cancel", group: "Touches Télétel", sequence: [0x13, 0x45], screenLabel: "ANNULATION" },
  { label: "Sommaire", value: "minitel:summary", group: "Touches Télétel", sequence: [0x13, 0x46], screenLabel: "SOMMAIRE" },
  { label: "Correction", value: "minitel:correction", group: "Touches Télétel", sequence: [0x13, 0x47], screenLabel: "CORRECTION" },
  { label: "Suite", value: "minitel:next", group: "Touches Télétel", sequence: [0x13, 0x48], screenLabel: "SUITE" },
  { label: "Connexion / Fin", value: "minitel:connection", group: "Touches Télétel", sequence: [0x13, 0x49], screenLabel: "CONNEXION" },
  { label: "Entrée", value: "Enter", group: "Navigation et édition", sequence: [0x0D], screenLabel: "ENTREE" },
  { label: "Retour arrière", value: "Backspace", group: "Navigation et édition", sequence: [0x08], screenLabel: "RETOUR ARRIERE" },
  { label: "Tabulation", value: "key:tab", group: "Navigation et édition", sequence: [0x09], screenLabel: "TABULATION" },
  { label: "Saut de ligne", value: "key:line-feed", group: "Navigation et édition", sequence: [0x0A], screenLabel: "SAUT DE LIGNE" },
  { label: "Tabulation verticale", value: "key:vertical-tab", group: "Navigation et édition", sequence: [0x0B], screenLabel: "TAB VERTICALE" },
  { label: "Saut de page", value: "key:form-feed", group: "Navigation et édition", sequence: [0x0C], screenLabel: "SAUT DE PAGE" },
  { label: "Échap", value: "key:escape", group: "Navigation et édition", sequence: [0x1B], screenLabel: "ECHAP" },
  { label: "Supprimer (DEL)", value: "key:delete", group: "Navigation et édition", sequence: [0x7F], screenLabel: "SUPPRIMER" },
  { label: "Flèche haut", value: "cursor:up", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x41], screenLabel: "HAUT" },
  { label: "Flèche bas", value: "cursor:down", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x42], screenLabel: "BAS" },
  { label: "Flèche droite", value: "cursor:right", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x43], screenLabel: "DROITE" },
  { label: "Flèche gauche", value: "cursor:left", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x44], screenLabel: "GAUCHE" },
  { label: "Accueil", value: "edit:home", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x48], screenLabel: "ACCUEIL" },
  { label: "Supprimer une ligne", value: "edit:delete-line", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x4D], screenLabel: "SUPPRIMER LIGNE" },
  { label: "Insérer une ligne", value: "edit:insert-line", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x4C], screenLabel: "INSERER LIGNE" },
  { label: "Supprimer un caractère", value: "edit:delete-character", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x50], screenLabel: "SUPPRIMER CAR." },
  { label: "Commencer l'insertion", value: "edit:insert-start", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x34, 0x68], screenLabel: "DEBUT INSERTION" },
  { label: "Terminer l'insertion", value: "edit:insert-end", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x34, 0x6C], screenLabel: "FIN INSERTION" },
  { label: "Effacer la page", value: "edit:erase-page", group: "Navigation et édition", sequence: [0x1B, 0x5B, 0x32, 0x4A], screenLabel: "EFFACER PAGE" },
  { label: "Livre sterling £", value: "special:pound", group: "Accents et symboles Minitel", sequence: [0x19, 0x23], screenLabel: "LIVRE" },
  { label: "Section §", value: "special:section", group: "Accents et symboles Minitel", sequence: [0x19, 0x27], screenLabel: "SECTION" },
  { label: "Symbole flèche gauche", value: "special:left-arrow", group: "Accents et symboles Minitel", sequence: [0x19, 0x2C], screenLabel: "FLECHE GAUCHE" },
  { label: "Symbole flèche droite", value: "special:right-arrow", group: "Accents et symboles Minitel", sequence: [0x19, 0x2E], screenLabel: "FLECHE DROITE" },
  { label: "Symbole flèche bas", value: "special:down-arrow", group: "Accents et symboles Minitel", sequence: [0x19, 0x2F], screenLabel: "FLECHE BAS" },
  { label: "Degré °", value: "special:degree", group: "Accents et symboles Minitel", sequence: [0x19, 0x30], screenLabel: "DEGRE" },
  { label: "Plus ou moins ±", value: "special:plus-minus", group: "Accents et symboles Minitel", sequence: [0x19, 0x31], screenLabel: "PLUS OU MOINS" },
  { label: "Division ÷", value: "special:division", group: "Accents et symboles Minitel", sequence: [0x19, 0x38], screenLabel: "DIVISION" },
  { label: "Accent grave (TS + Suite)", value: "accent:grave", group: "Accents et symboles Minitel", sequence: [0x19, 0x41], screenLabel: "ACCENT GRAVE" },
  { label: "Accent aigu (TS + Retour)", value: "accent:acute", group: "Accents et symboles Minitel", sequence: [0x19, 0x42], screenLabel: "ACCENT AIGU" },
  { label: "Accent circonflexe (TS + Sommaire)", value: "accent:circumflex", group: "Accents et symboles Minitel", sequence: [0x19, 0x43], screenLabel: "CIRCONFLEXE" },
  { label: "Tréma (TS + Guide)", value: "accent:diaeresis", group: "Accents et symboles Minitel", sequence: [0x19, 0x48], screenLabel: "TREMA" },
  { label: "C cédille ç", value: "special:cedilla", group: "Accents et symboles Minitel", sequence: [0x19, 0x4B, 0x63], screenLabel: "C CEDILLE" },
  { label: "Ligature Œ", value: "special:oe-upper", group: "Accents et symboles Minitel", sequence: [0x19, 0x6A], screenLabel: "OE MAJUSCULE" },
  { label: "Ligature œ", value: "special:oe-lower", group: "Accents et symboles Minitel", sequence: [0x19, 0x7A], screenLabel: "OE MINUSCULE" },
  { label: "Eszett ß", value: "special:eszett", group: "Accents et symboles Minitel", sequence: [0x19, 0x7B], screenLabel: "ESZETT" },
  ...controlKeyOptions,
];

const browserMinitelKeyValues: Record<string, string> = {
  Enter: "Enter",
  Backspace: "Backspace",
  Delete: "key:delete",
  Tab: "key:tab",
  ArrowUp: "cursor:up",
  ArrowDown: "cursor:down",
  ArrowRight: "cursor:right",
  ArrowLeft: "cursor:left",
  Home: "edit:home",
  F1: "minitel:send",
  F2: "minitel:return",
  F3: "minitel:repeat",
  F4: "minitel:guide",
  F5: "minitel:cancel",
  F6: "minitel:summary",
  F7: "minitel:correction",
  F8: "minitel:next",
  F9: "minitel:connection",
};

const baudOptions: SelectOption[] = [
  { label: "300 bauds", value: "300" },
  { label: "1200 bauds", value: "1200" },
  { label: "4800 bauds", value: "4800" },
  { label: "9600 bauds", value: "9600" },
];

const categories: Category[] = [
  { id: "start", label: "Départ", accent: "#ffb703", icon: Play },
  { id: "screen", label: "Écran", accent: "#2785ff", icon: Monitor },
  { id: "text", label: "Texte", accent: "#8f5cf7", icon: Type },
  { id: "colors", label: "Couleurs", accent: "#18a058", icon: Palette },
  { id: "sound", label: "Son", accent: "#ff7a1a", icon: Volume2 },
  { id: "control", label: "Contrôle", accent: "#ff9f1c", icon: Repeat },
  { id: "variables", label: "Variables", accent: "#f25f5c", icon: Variable },
  { id: "operators", label: "Opérations", accent: "#59b45f", icon: Sigma },
  { id: "input", label: "Entrées", accent: "#e14d72", icon: Keyboard },
  { id: "network", label: "Réseau", accent: "#0b9f8a", icon: Wifi },
  { id: "graphics", label: "Graphique", accent: "#16a6b6", icon: Sparkles },
  { id: "advanced", label: "Avancé", accent: "#5d6679", icon: Cpu },
];

const blockDefinitions: BlockDefinition[] = [
  { id: "event-setup", title: "quand le Minitel démarre", help: "Pile exécutée une seule fois au démarrage de l'ESP32.", kind: "event", category: "start", color: "#ffb703" },
  { id: "event-loop", title: "répéter en continu", help: "Pile exécutée à chaque tour de boucle Arduino.", kind: "event", category: "start", color: "#ffb703" },
  { id: "event-key-any", title: "quand une touche arrive", help: "Pile exécutée quand le Minitel envoie une touche.", kind: "event", category: "start", color: "#ffb703" },
  { id: "event-key-char", title: "quand la touche", help: "Pile exécutée pour une touche précise.", kind: "event", category: "start", color: "#ffb703", inputs: [{ key: "key", label: "touche", type: "select", defaultValue: "A", options: keyOptions }] },

  { id: "reset-display", title: "préparer l'écran", help: "Texte normal, écran effacé, curseur en haut à gauche.", kind: "action", category: "screen", color: "#2785ff" },
  { id: "clear-screen", title: "effacer l'écran", help: "Vide les 40 colonnes et 24 lignes.", kind: "action", category: "screen", color: "#2785ff" },
  { id: "draw-screen", title: "dessiner l'écran", help: "Affiche une composition créée dans le mode Écran.", kind: "action", category: "screen", color: "#2785ff", inputs: [{ key: "screen", label: "écran", type: "screen", defaultValue: "" }] },
  { id: "home-cursor", title: "curseur à l'accueil", help: "Replace le curseur en haut à gauche.", kind: "action", category: "screen", color: "#2785ff" },
  { id: "move-to", title: "placer le curseur", help: "Déplace le curseur dans la grille 40 x 24.", kind: "action", category: "screen", color: "#2785ff", inputs: [
    { key: "column", label: "col", type: "number", defaultValue: num(1), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(1), min: 1, max: 24, compact: true },
  ] },
  { id: "cursor-toggle", title: "curseur", help: "Affiche ou masque le curseur du Minitel.", kind: "action", category: "screen", color: "#2785ff", inputs: [{ key: "enabled", label: "état", type: "select", defaultValue: "on", options: [{ label: "visible", value: "on" }, { label: "caché", value: "off" }] }] },

  { id: "print-text", title: "écrire", help: "Écrit à la position actuelle du curseur.", kind: "action", category: "text", color: "#8f5cf7", inputs: [{ key: "text", label: "texte", type: "text", defaultValue: "Salut Minitel" }] },
  { id: "print-line", title: "écrire une ligne", help: "Écrit un texte puis passe à la ligne.", kind: "action", category: "text", color: "#8f5cf7", inputs: [{ key: "text", label: "texte", type: "text", defaultValue: "Prêt" }] },
  { id: "print-at", title: "écrire à", help: "Place le curseur puis écrit un texte.", kind: "action", category: "text", color: "#8f5cf7", inputs: [
    { key: "column", label: "col", type: "number", defaultValue: num(2), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(3), min: 1, max: 24, compact: true },
    { key: "text", label: "texte", type: "text", defaultValue: "Bonjour" },
  ] },
  { id: "big-text-at", title: "grand texte à", help: "Écrit avec la taille double du Minitel.", kind: "action", category: "text", color: "#8f5cf7", inputs: [
    { key: "column", label: "col", type: "number", defaultValue: num(2), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(5), min: 1, max: 24, compact: true },
    { key: "text", label: "texte", type: "text", defaultValue: "MINITEL" },
  ] },
  { id: "text-size", title: "taille du texte", help: "Change la taille utilisée par les prochains textes.", kind: "action", category: "text", color: "#8f5cf7", inputs: [{ key: "size", label: "taille", type: "select", defaultValue: "Normal", options: textSizeOptions }] },

  { id: "foreground", title: "texte en couleur", help: "Change la couleur des caractères.", kind: "action", category: "colors", color: "#18a058", inputs: [{ key: "color", label: "couleur", type: "color", defaultValue: "Cyan", options: colorOptions }] },
  { id: "background", title: "fond en couleur", help: "Change la couleur de fond des prochains caractères.", kind: "action", category: "colors", color: "#18a058", inputs: [{ key: "color", label: "fond", type: "color", defaultValue: "Black", options: colorOptions }] },
  { id: "set-colors", title: "couleurs texte et fond", help: "Change les deux couleurs en même temps.", kind: "action", category: "colors", color: "#18a058", inputs: [
    { key: "fg", label: "texte", type: "color", defaultValue: "White", options: colorOptions, compact: true },
    { key: "bg", label: "fond", type: "color", defaultValue: "Blue", options: colorOptions, compact: true },
  ] },

  { id: "beep", title: "faire bip", help: "Déclenche le bip sonore du Minitel.", kind: "action", category: "sound", color: "#ff7a1a", inputs: [
    { key: "times", label: "fois", type: "number", defaultValue: num(1), min: 1, max: 99, compact: true },
    { key: "gap", label: "pause ms", type: "number", defaultValue: num(80), min: 0, max: 1000, compact: true },
  ] },
  { id: "wait", title: "attendre", help: "Pause le programme pendant quelques millisecondes.", kind: "action", category: "sound", color: "#ff7a1a", inputs: [{ key: "ms", label: "ms", type: "number", defaultValue: num(250), min: 0, max: 10000, step: 50 }] },

  { id: "control-repeat", title: "répéter", help: "Exécute les blocs internes plusieurs fois.", kind: "control", category: "control", color: "#ff9f1c", inputs: [{ key: "times", label: "fois", type: "number", defaultValue: num(10), min: 0, max: 999 }], slots: [{ key: "children", label: "faire" }] },
  { id: "control-forever", title: "toujours", help: "Boucle sans fin pour une animation ou une attente clavier.", kind: "control", category: "control", color: "#ff9f1c", slots: [{ key: "children", label: "faire" }] },
  { id: "control-if", title: "si", help: "Exécute les blocs internes si la condition est vraie.", kind: "control", category: "control", color: "#ff9f1c", inputs: [{ key: "condition", label: "condition", type: "condition", defaultValue: compareExpr(variableExpr("maVariable"), ">", num(0)) }], slots: [{ key: "children", label: "alors" }] },
  { id: "control-if-else", title: "si / sinon", help: "Choisit entre deux chemins.", kind: "control", category: "control", color: "#ff9f1c", inputs: [{ key: "condition", label: "condition", type: "condition", defaultValue: compareExpr(variableExpr("maVariable"), "==", num(1)) }], slots: [{ key: "children", label: "alors" }, { key: "elseChildren", label: "sinon" }] },
  { id: "control-for", title: "pour", help: "Fait évoluer une variable entre deux valeurs.", kind: "control", category: "control", color: "#ff9f1c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "compteur", variableType: "number" },
    { key: "from", label: "de", type: "number", defaultValue: num(1), compact: true },
    { key: "to", label: "à", type: "number", defaultValue: num(5), compact: true },
    { key: "step", label: "pas", type: "number", defaultValue: num(1), compact: true },
  ], slots: [{ key: "children", label: "faire" }] },

  { id: "var-set", title: "mettre variable à", help: "Initialise ou remplace la valeur d'une variable.", kind: "action", category: "variables", color: "#f25f5c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "maVariable", variableType: "number" },
    { key: "value", label: "valeur", type: "number", defaultValue: num(1) },
  ] },
  { id: "var-change", title: "ajouter à variable", help: "Ajoute un nombre à une variable.", kind: "action", category: "variables", color: "#f25f5c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "maVariable", variableType: "number" },
    { key: "delta", label: "valeur", type: "number", defaultValue: num(1) },
  ] },
  { id: "var-set-text", title: "mettre texte à", help: "Remplace le contenu d'une variable Texte.", kind: "action", category: "variables", color: "#e75669", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "texte", variableType: "text" },
    { key: "text", label: "texte", type: "text", defaultValue: "Bonjour", placeholder: "Texte à mémoriser" },
  ] },
  { id: "var-show", title: "afficher variable à", help: "Écrit la valeur d'une variable Nombre ou Texte à l'écran.", kind: "action", category: "variables", color: "#f25f5c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "maVariable", variableType: "any" },
    { key: "column", label: "col", type: "number", defaultValue: num(2), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(20), min: 1, max: 24, compact: true },
  ] },

  { id: "operator-add", title: "0 + 0", help: "Additionne deux nombres. Glisse ce bloc dans n'importe quelle valeur numérique.", kind: "value", category: "operators", color: "#42ad62", output: binaryExpr("+", num(0), num(0)) },
  { id: "operator-subtract", title: "0 − 0", help: "Soustrait le nombre de droite à celui de gauche.", kind: "value", category: "operators", color: "#42ad62", output: binaryExpr("-", num(0), num(0)) },
  { id: "operator-multiply", title: "1 × 1", help: "Multiplie deux nombres.", kind: "value", category: "operators", color: "#42ad62", output: binaryExpr("*", num(1), num(1)) },
  { id: "operator-divide", title: "10 ÷ 2", help: "Divise le nombre de gauche par celui de droite. Une division par zéro donne 0.", kind: "value", category: "operators", color: "#42ad62", output: binaryExpr("/", num(10), num(2)) },
  { id: "operator-random", title: "nombre aléatoire", help: "Choisit un nombre entier aléatoire entre deux bornes incluses. Les bornes acceptent aussi des calculs.", kind: "value", category: "operators", color: "#42ad62", output: randomExpr(num(1), num(10)) },
  { id: "operator-compare", title: "0 > 0", help: "Vrai si la valeur de gauche est plus grande.", kind: "value", category: "operators", color: "#59b45f", output: compareExpr(num(0), ">", num(0)) },
  { id: "operator-less", title: "0 < 0", help: "Vrai si la valeur de gauche est plus petite.", kind: "value", category: "operators", color: "#59b45f", output: compareExpr(num(0), "<", num(0)) },
  { id: "operator-equal", title: "0 = 0", help: "Vrai si les deux valeurs sont égales.", kind: "value", category: "operators", color: "#59b45f", output: compareExpr(num(0), "==", num(0)) },
  { id: "operator-and", title: "condition et condition", help: "Vrai uniquement si les deux conditions sont vraies.", kind: "value", category: "operators", color: "#59b45f", output: logicalExpr(compareExpr(num(0), ">", num(0)), "&&", compareExpr(num(0), ">", num(0))) },
  { id: "operator-or", title: "condition ou condition", help: "Vrai si au moins une des deux conditions est vraie.", kind: "value", category: "operators", color: "#59b45f", output: logicalExpr(compareExpr(num(0), ">", num(0)), "||", compareExpr(num(0), ">", num(0))) },
  { id: "operator-not", title: "non condition", help: "Inverse une condition vraie ou fausse.", kind: "value", category: "operators", color: "#59b45f", output: notExpr(compareExpr(num(0), ">", num(0))) },

  { id: "show-key", title: "afficher la touche reçue", help: "Écrit la touche lue par le Minitel, dans une pile de touche.", kind: "action", category: "input", color: "#e14d72", inputs: [
    { key: "column", label: "col", type: "number", defaultValue: num(2), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(22), min: 1, max: 24, compact: true },
  ] },
  { id: "read-line", title: "demander un texte", help: "Lit une ligne saisie au clavier du Minitel.", kind: "action", category: "input", color: "#e14d72", inputs: [{ key: "timeout", label: "timeout ms", type: "number", defaultValue: num(5000), min: 0, max: 60000, step: 500 }] },

  { id: "wifi-connect", title: "se connecter au Wi-Fi", help: "Connecte l'ESP32 au réseau indiqué. Place ce bloc dans la pile de démarrage.", kind: "action", category: "network", color: "#0b9f8a", inputs: [
    { key: "ssid", label: "SSID", type: "text", defaultValue: "", placeholder: "Nom du réseau" },
    { key: "password", label: "mot de passe", type: "text", defaultValue: "", placeholder: "Mot de passe", secret: true },
  ] },
  { id: "mqtt-connect", title: "se connecter au broker MQTT", help: "Connecte l'ESP32 à un broker MQTT. Place ce bloc après la connexion Wi-Fi.", kind: "action", category: "network", color: "#1678a8", inputs: [
    { key: "host", label: "broker", type: "text", defaultValue: "broker.hivemq.com", placeholder: "broker.exemple.com" },
    { key: "port", label: "port", type: "number", defaultValue: num(1883), min: 1, max: 65535, compact: true },
    { key: "clientId", label: "identifiant client", type: "text", defaultValue: "minitel-esp32", placeholder: "minitel-esp32" },
    { key: "username", label: "utilisateur", type: "text", defaultValue: "", placeholder: "Optionnel" },
    { key: "password", label: "mot de passe", type: "text", defaultValue: "", placeholder: "Optionnel", secret: true },
  ] },
  { id: "mqtt-subscribe", title: "s'abonner au topic MQTT", help: "Écoute les messages publiés sur un topic. Place ce bloc après la connexion au broker.", kind: "action", category: "network", color: "#1678a8", inputs: [
    { key: "topic", label: "topic", type: "text", defaultValue: "minitel/messages", placeholder: "minitel/messages" },
    { key: "qos", label: "qualité", type: "select", defaultValue: "0", options: [
      { label: "standard (QoS 0)", value: "0" },
      { label: "confirmée (QoS 1)", value: "1" },
    ] },
  ] },
  { id: "http-get-json", title: "requête GET JSON", help: "Télécharge une réponse JSON. Les clés et valeurs query acceptent aussi les blocs de variables.", kind: "action", category: "network", color: "#0b9f8a", inputs: [
    { key: "url", label: "URL", type: "text", defaultValue: "http://localhost:6663/test", placeholder: "http://localhost:6663/test" },
    { key: "query", label: "query", type: "query", defaultValue: "", placeholder: "clé = valeur" },
    { key: "target", label: "réponse dans", type: "variable", defaultValue: "reponseJson", variableType: "text" },
  ] },
  { id: "http-post-json", title: "requête POST JSON", help: "Envoie un corps JSON et stocke la réponse JSON dans une variable Texte.", kind: "action", category: "network", color: "#087f70", inputs: [
    { key: "url", label: "URL", type: "text", defaultValue: "http://localhost:6663/echo", placeholder: "http://localhost:6663/echo" },
    { key: "query", label: "query", type: "query", defaultValue: "", placeholder: "clé = valeur" },
    { key: "body", label: "corps JSON", type: "text", defaultValue: "{\"message\":\"bonjour\"}", placeholder: "{\"message\":\"bonjour\"}" },
    { key: "target", label: "réponse dans", type: "variable", defaultValue: "reponseJson", variableType: "text" },
  ] },
  { id: "http-put-json", title: "requête PUT JSON", help: "Met à jour une ressource avec un corps JSON et stocke la réponse dans une variable Texte.", kind: "action", category: "network", color: "#0a7282", inputs: [
    { key: "url", label: "URL", type: "text", defaultValue: "http://localhost:6663/echo", placeholder: "http://localhost:6663/echo" },
    { key: "query", label: "query", type: "query", defaultValue: "", placeholder: "clé = valeur" },
    { key: "body", label: "corps JSON", type: "text", defaultValue: "{\"message\":\"mise à jour\"}", placeholder: "{\"message\":\"mise à jour\"}" },
    { key: "target", label: "réponse dans", type: "variable", defaultValue: "reponseJson", variableType: "text" },
  ] },
  { id: "http-patch-json", title: "requête PATCH JSON", help: "Modifie partiellement une ressource avec un corps JSON et stocke la réponse dans une variable Texte.", kind: "action", category: "network", color: "#3f6fc4", inputs: [
    { key: "url", label: "URL", type: "text", defaultValue: "http://localhost:6663/echo", placeholder: "http://localhost:6663/echo" },
    { key: "query", label: "query", type: "query", defaultValue: "", placeholder: "clé = valeur" },
    { key: "body", label: "corps JSON", type: "text", defaultValue: "{\"champ\":\"nouvelle valeur\"}", placeholder: "{\"champ\":\"nouvelle valeur\"}" },
    { key: "target", label: "réponse dans", type: "variable", defaultValue: "reponseJson", variableType: "text" },
  ] },
  { id: "http-delete-json", title: "requête DELETE JSON", help: "Supprime une ressource et stocke la réponse JSON dans une variable Texte.", kind: "action", category: "network", color: "#c05268", inputs: [
    { key: "url", label: "URL", type: "text", defaultValue: "http://localhost:6663/echo", placeholder: "http://localhost:6663/echo" },
    { key: "query", label: "query", type: "query", defaultValue: "", placeholder: "clé = valeur" },
    { key: "target", label: "réponse dans", type: "variable", defaultValue: "reponseJson", variableType: "text" },
  ] },
  { id: "json-read-text", title: "lire texte du JSON", help: "Lit une clé dans le JSON. Utilise un chemin comme utilisateur.nom ou objets.0.titre.", kind: "action", category: "network", color: "#138c7d", inputs: [
    { key: "source", label: "JSON", type: "variable", defaultValue: "reponseJson", variableType: "text" },
    { key: "path", label: "clé", type: "text", defaultValue: "title", placeholder: "utilisateur.nom" },
    { key: "target", label: "texte dans", type: "variable", defaultValue: "texte", variableType: "text" },
  ] },
  { id: "json-read-number", title: "lire nombre du JSON", help: "Lit une valeur numérique dans le JSON et la range dans une variable Nombre.", kind: "action", category: "network", color: "#138c7d", inputs: [
    { key: "source", label: "JSON", type: "variable", defaultValue: "reponseJson", variableType: "text" },
    { key: "path", label: "clé", type: "text", defaultValue: "id", placeholder: "mesures.0.valeur" },
    { key: "target", label: "nombre dans", type: "variable", defaultValue: "maVariable", variableType: "number" },
  ] },
  { id: "json-if-has", title: "si le JSON contient", help: "Exécute les blocs internes seulement si la clé existe dans la réponse JSON.", kind: "control", category: "network", color: "#138c7d", inputs: [
    { key: "source", label: "JSON", type: "variable", defaultValue: "reponseJson", variableType: "text" },
    { key: "path", label: "clé", type: "text", defaultValue: "title", placeholder: "utilisateur.nom" },
  ], slots: [{ key: "children", label: "alors" }] },

  { id: "graphic-mode", title: "mode mosaïque", help: "Active les caractères graphiques du Minitel.", kind: "action", category: "graphics", color: "#16a6b6" },
  { id: "text-mode", title: "mode texte", help: "Revient aux caractères texte classiques.", kind: "action", category: "graphics", color: "#16a6b6" },
  { id: "mosaic-cell", title: "dessiner mosaïque à", help: "Dessine une cellule graphique composée de six petits pavés.", kind: "action", category: "graphics", color: "#16a6b6", inputs: [
    { key: "column", label: "col", type: "number", defaultValue: num(10), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(10), min: 1, max: 24, compact: true },
    { key: "topLeft", label: "HG", type: "boolean", defaultValue: true, compact: true },
    { key: "topRight", label: "HD", type: "boolean", defaultValue: true, compact: true },
    { key: "middleLeft", label: "MG", type: "boolean", defaultValue: true, compact: true },
    { key: "middleRight", label: "MD", type: "boolean", defaultValue: false, compact: true },
    { key: "bottomLeft", label: "BG", type: "boolean", defaultValue: true, compact: true },
    { key: "bottomRight", label: "BD", type: "boolean", defaultValue: false, compact: true },
  ] },

  { id: "set-baud", title: "régler la vitesse", help: "Choisit le débit utilisé pour communiquer avec le Minitel.", kind: "action", category: "advanced", color: "#5d6679", inputs: [{ key: "baud", label: "débit", type: "select", defaultValue: "1200", options: baudOptions }] },
  { id: "detect-baud", title: "détecter la vitesse", help: "Envoie une demande de statut au Minitel et teste 1200, 4800, 300 puis 9600 bauds.", kind: "action", category: "advanced", color: "#5d6679" },
  { id: "reset-protocol", title: "reset protocole Minitel", help: "Envoie ESC PRO1 RESET au terminal.", kind: "action", category: "advanced", color: "#5d6679" },
];

const blockById = blockDefinitions.reduce<Record<string, BlockDefinition>>((accumulator, definition) => {
  accumulator[definition.id] = definition;
  return accumulator;
}, {});


const supportedProjectBoards = new Set(["esp32dev", "nodemcu-32s", "esp32doit-devkit-v1"]);
const supportedSceneColors = new Set(["Black", "Red", "Green", "Yellow", "Blue", "Magenta", "Cyan", "White"]);
const supportedTextSizes = new Set(["Normal", "DoubleHeight", "DoubleWidth", "DoubleSize"]);
const supportedScreenPresets = new Set(["minitel-40", "small-32", "compact", "custom"]);

function importedRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function normalizeImportedNumberExpr(value: unknown, fallback: Expr = num(0)): Expr {
  const record = importedRecord(value);
  if (!record) {
    const numericValue = typeof value === "number" || typeof value === "string" ? Number(value) : Number.NaN;
    return Number.isFinite(numericValue) ? num(numericValue) : cloneValue(fallback);
  }
  if (record.kind === "literal") {
    const numericValue = Number(record.value);
    return Number.isFinite(numericValue) ? num(numericValue) : cloneValue(fallback);
  }
  if (record.kind === "variable" && typeof record.name === "string" && record.name.trim()) {
    return variableExpr(record.name.trim().slice(0, 64));
  }
  if (record.kind === "binary" && ["+", "-", "*", "/", "%"].includes(String(record.op))) {
    return {
      kind: "binary",
      valueType: "number",
      op: String(record.op) as BinaryExpr["op"],
      left: normalizeImportedNumberExpr(record.left),
      right: normalizeImportedNumberExpr(record.right),
    };
  }
  if (record.kind === "random") {
    return randomExpr(
      normalizeImportedNumberExpr(record.from, num(1)),
      normalizeImportedNumberExpr(record.to, num(10)),
    );
  }
  return cloneValue(fallback);
}

function normalizeImportedTextExpr(value: unknown, fallback: Expr = textExpr("")): Expr {
  const record = importedRecord(value);
  if (record?.kind === "literal") return textExpr(String(record.value ?? "").slice(0, 4096));
  if (["string", "number", "boolean"].includes(typeof value)) return textExpr(String(value).slice(0, 4096));
  return cloneValue(fallback);
}

function normalizeImportedCondition(value: unknown, fallback: Expr): Expr {
  const record = importedRecord(value);
  const emptyCondition = compareExpr(num(0), ">", num(0));
  if (record?.kind === "compare" && ["==", "!=", "<", "<=", ">", ">="].includes(String(record.op))) {
    return compareExpr(
      normalizeImportedNumberExpr(record.left),
      String(record.op) as CompareExpr["op"],
      normalizeImportedNumberExpr(record.right),
    );
  }
  if (record?.kind === "logical" && ["&&", "||"].includes(String(record.op))) {
    return logicalExpr(
      normalizeImportedCondition(record.left, emptyCondition),
      String(record.op) as LogicalExpr["op"],
      normalizeImportedCondition(record.right, emptyCondition),
    );
  }
  if (record?.kind === "not") {
    return notExpr(normalizeImportedCondition(record.operand, emptyCondition));
  }
  if (record?.kind === "literal" && typeof record.value === "boolean") {
    return boolExpr(record.value);
  }
  return cloneValue(fallback);
}

function normalizeImportedValues(definition: BlockDefinition, value: unknown): Values {
  const source = importedRecord(value);
  const values = defaultValues(definition);
  definition.inputs?.forEach((input) => {
    const importedValue = source?.[input.key];
    if (importedValue === undefined) return;
    if (input.type === "number") {
      values[input.key] = normalizeImportedNumberExpr(importedValue, input.defaultValue as Expr);
      return;
    }
    if (input.type === "condition") {
      values[input.key] = normalizeImportedCondition(importedValue, input.defaultValue as Expr);
      return;
    }
    if (input.type === "boolean") {
      values[input.key] = importedValue === true || importedValue === "true";
      return;
    }
    if (input.type === "text") {
      if (["string", "number", "boolean"].includes(typeof importedValue)) values[input.key] = String(importedValue).slice(0, 1024);
      return;
    }
    if (input.type === "query") {
      if (typeof importedValue === "string") values[input.key] = normalizeQueryString(importedValue.slice(0, 4096));
      return;
    }
    if (input.type === "variable") {
      if (typeof importedValue === "string" && importedValue.trim()) values[input.key] = importedValue.trim().slice(0, 64);
      return;
    }
    if (input.type === "screen") {
      if (typeof importedValue === "string") values[input.key] = importedValue.slice(0, 160);
      return;
    }
    const optionValue = typeof importedValue === "string" ? importedValue : String(importedValue);
    if (input.options?.some((option) => option.value === optionValue)) values[input.key] = optionValue;
  });
  return values;
}

function normalizeImportedBlock(value: unknown): ProgramBlock | null {
  const source = importedRecord(value);
  const definition = source && typeof source.definitionId === "string" ? blockById[source.definitionId] : undefined;
  if (!definition || definition.kind === "event" || definition.kind === "value") return null;
  const hasChildren = definition.slots?.some((slot) => slot.key === "children");
  const hasElseChildren = definition.slots?.some((slot) => slot.key === "elseChildren");
  return {
    id: uid(),
    definitionId: definition.id,
    values: normalizeImportedValues(definition, source?.values),
    children: hasChildren ? normalizeImportedBlocks(source?.children) : undefined,
    elseChildren: hasElseChildren ? normalizeImportedBlocks(source?.elseChildren) : undefined,
  };
}

function normalizeImportedBlocks(value: unknown): ProgramBlock[] {
  return (Array.isArray(value) ? value : []).map(normalizeImportedBlock).filter((block): block is ProgramBlock => block !== null);
}

function normalizeImportedStack(value: unknown): ScriptStack | null {
  const source = importedRecord(value);
  const eventSource = importedRecord(source?.event);
  const definition = eventSource && typeof eventSource.definitionId === "string" ? blockById[eventSource.definitionId] : undefined;
  if (!definition || definition.kind !== "event") return null;
  return {
    id: uid(),
    event: { definitionId: definition.id, values: normalizeImportedValues(definition, eventSource?.values) },
    blocks: normalizeImportedBlocks(source?.blocks),
  };
}

function normalizeImportedVariables(value: unknown): VariableDef[] {
  const usedNames = new Set<string>();
  const variables = (Array.isArray(value) ? value : []).flatMap((item) => {
    const source = importedRecord(item);
    if (!source || typeof source.name !== "string" || !source.name.trim()) return [];
    const baseName = source.name.trim().slice(0, 64);
    let name = baseName;
    let suffix = 2;
    while (usedNames.has(name)) {
      name = baseName.slice(0, 58) + "_" + suffix;
      suffix += 1;
    }
    usedNames.add(name);
    const valueType: VariableValueType = source.valueType === "text" ? "text" : "number";
    return [{
      id: uid(),
      name,
      valueType,
      defaultValue: valueType === "text" ? normalizeImportedTextExpr(source.defaultValue) : normalizeImportedNumberExpr(source.defaultValue),
    }];
  });
  return variables.length > 0 ? variables : createDefaultVariables();
}

function normalizeImportedScreenConfig(value: unknown): MinitelScreenConfig {
  const source = importedRecord(value);
  const fallback = createDefaultScreenConfig();
  const preset = typeof source?.preset === "string" && supportedScreenPresets.has(source.preset) ? source.preset as MinitelScreenConfig["preset"] : fallback.preset;
  const name = typeof source?.name === "string" && source.name.trim() ? source.name.trim().slice(0, 80) : fallback.name;
  const columnsValue = Number(source?.columns);
  const rowsValue = Number(source?.rows);
  return {
    preset,
    name,
    columns: Number.isFinite(columnsValue) ? clamp(columnsValue, 8, 80) : fallback.columns,
    rows: Number.isFinite(rowsValue) ? clamp(rowsValue, 8, 40) : fallback.rows,
    colorEnabled: source?.colorEnabled !== false,
  };
}

function normalizeSceneColor(value: unknown, fallback: SceneElement["fg"]): SceneElement["fg"] {
  return typeof value === "string" && supportedSceneColors.has(value) ? value as SceneElement["fg"] : fallback;
}

function normalizeImportedSceneElements(value: unknown, config: MinitelScreenConfig): SceneElement[] {
  const elements = (Array.isArray(value) ? value : []).flatMap((item): SceneElement[] => {
    const source = importedRecord(item);
    if (!source || typeof source.kind !== "string") return [];
    const xValue = Number(source.x);
    const yValue = Number(source.y);
    const x = Number.isFinite(xValue) ? clamp(xValue, 1, config.columns) : 1;
    const y = Number.isFinite(yValue) ? clamp(yValue, 1, config.rows) : 1;
    const fg = normalizeSceneColor(source.fg, "White");
    if (source.kind === "text") {
      const bg = normalizeSceneColor(source.bg, "Black");
      const size = typeof source.size === "string" && supportedTextSizes.has(source.size) ? source.size as "Normal" | "DoubleHeight" | "DoubleWidth" | "DoubleSize" : "Normal";
      return [{ id: uid(), kind: "text", text: typeof source.text === "string" ? source.text.slice(0, 1024) : "Texte", x, y, fg, bg, size }];
    }
    const widthValue = Number(source.width);
    const heightValue = Number(source.height);
    const width = Number.isFinite(widthValue) ? clamp(widthValue, 1, config.columns) : 1;
    const height = Number.isFinite(heightValue) ? clamp(heightValue, 1, config.rows) : 1;
    if (source.kind === "box") {
      return [{ id: uid(), kind: "box", x, y, width, height, fg, filled: source.filled === true }];
    }
    if (source.kind === "image") {
      const expectedLength = width * 2 * height * 3;
      const bitmap = (typeof source.bitmap === "string" ? source.bitmap.replace(/[^01]/g, "") : "").slice(0, expectedLength).padEnd(expectedLength, "0");
      const name = typeof source.name === "string" && source.name.trim() ? source.name.trim().slice(0, 80) : "Image";
      return [{ id: uid(), kind: "image", name, x, y, width, height, bitmap, fg }];
    }
    return [];
  });
  return fitElementsToScreen(elements, config);
}

function normalizeImportedScreens(value: unknown, config: MinitelScreenConfig): MinitelScene[] {
  const usedIds = new Set<string>();
  const screens = (Array.isArray(value) ? value : []).flatMap((item, index): MinitelScene[] => {
    const source = importedRecord(item);
    if (!source) return [];
    const rawId = typeof source.id === "string" && /^[A-Za-z0-9_-]+$/.test(source.id) ? source.id.slice(0, 160) : uid();
    let id = rawId;
    let suffix = 2;
    while (usedIds.has(id)) {
      id = rawId + "-" + suffix;
      suffix += 1;
    }
    usedIds.add(id);
    const name = typeof source.name === "string" && source.name.trim() ? source.name.trim().slice(0, 60) : "Écran " + (index + 1);
    return [{ id, name, elements: normalizeImportedSceneElements(source.elements, config) }];
  });
  return screens.length > 0 ? screens : [createMinitelScene("Écran principal")];
}

function repairScreenReferencesInBlocks(blocks: ProgramBlock[], screens: MinitelScene[]): ProgramBlock[] {
  const validIds = new Set(screens.map((screen) => screen.id));
  const fallbackId = screens[0]?.id ?? "";
  return blocks.map((block) => ({
    ...block,
    values: block.definitionId === "draw-screen" && !validIds.has(textValue(block.values.screen, "")) ? { ...block.values, screen: fallbackId } : block.values,
    children: block.children ? repairScreenReferencesInBlocks(block.children, screens) : block.children,
    elseChildren: block.elseChildren ? repairScreenReferencesInBlocks(block.elseChildren, screens) : block.elseChildren,
  }));
}

function repairScreenReferencesInStacks(stacks: ScriptStack[], screens: MinitelScene[]): ScriptStack[] {
  return stacks.map((stack) => ({ ...stack, blocks: repairScreenReferencesInBlocks(stack.blocks, screens) }));
}

function cleanProjectName(value: unknown, fallback = "Projet Minitel") {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim();
  return cleaned.slice(0, 80) || fallback;
}

function validProjectDate(value: unknown, fallback: string) {
  if (typeof value !== "string") return fallback;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function normalizeWorkspaceMode(value: unknown): WorkspaceMode {
  return value === "designer" ? "designer" : "blocks";
}

function serializeProjectFile(snapshot: ProjectSnapshot, board: string, metadata: ProjectMetadata) {
  const document: ProjectFile = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    board: supportedProjectBoards.has(board) ? board : "esp32dev",
    metadata: { name: cleanProjectName(metadata.name), createdAt: validProjectDate(metadata.createdAt, new Date().toISOString()) },
    project: cloneProjectSnapshot(snapshot),
  };
  return JSON.stringify(document, null, 2);
}

function parseProjectFile(contents: string): ParsedProjectFile {
  const parsed = JSON.parse(contents) as unknown;
  const document = importedRecord(parsed);
  if (!document) throw new Error("Ce fichier ne contient pas de projet.");
  if (document.format !== undefined && document.format !== PROJECT_FILE_FORMAT) throw new Error("Ce fichier appartient à une autre application.");
  if (typeof document.version === "number" && document.version > PROJECT_FILE_VERSION) throw new Error("Ce projet a été créé avec une version plus récente.");
  const projectSource = importedRecord(document.project) ?? document;
  if (!Array.isArray(projectSource.stacks)) throw new Error("Les blocs du projet sont absents.");
  const screenConfig = normalizeImportedScreenConfig(projectSource.screenConfig);
  const importedStacks = projectSource.stacks.map(normalizeImportedStack).filter((stack): stack is ScriptStack => stack !== null);
  const hasScreenCollection = Array.isArray(projectSource.screens);
  const legacyElements = hasScreenCollection ? [] : normalizeImportedSceneElements(projectSource.sceneElements, screenConfig);
  const screens = hasScreenCollection
    ? normalizeImportedScreens(projectSource.screens, screenConfig)
    : [createMinitelScene("Écran principal", legacyElements)];
  let stacks = importedStacks.length > 0 ? importedStacks : createBlankStacks();
  if (!hasScreenCollection && legacyElements.length > 0) {
    const drawScreen = makeBlock("draw-screen");
    drawScreen.values.screen = screens[0].id;
    const setupIndex = stacks.findIndex((stack) => stack.event.definitionId === "event-setup");
    if (setupIndex >= 0) {
      stacks = stacks.map((stack, index) => index === setupIndex ? { ...stack, blocks: [...stack.blocks, drawScreen] } : stack);
    } else {
      stacks = [makeStack("event-setup", [drawScreen]), ...stacks];
    }
  }
  stacks = repairScreenReferencesInStacks(stacks, screens);
  const requestedActiveScreenId = typeof projectSource.activeScreenId === "string" ? projectSource.activeScreenId : "";
  const activeScreenId = screens.some((screen) => screen.id === requestedActiveScreenId) ? requestedActiveScreenId : screens[0].id;
  const project: ProjectSnapshot = {
    stacks,
    variables: normalizeImportedVariables(projectSource.variables),
    screenConfig,
    screens,
    activeScreenId,
    workspaceMode: normalizeWorkspaceMode(projectSource.workspaceMode),
  };
  const board = typeof document.board === "string" && supportedProjectBoards.has(document.board) ? document.board : "esp32dev";
  const savedAt = validProjectDate(document.savedAt, new Date().toISOString());
  const metadataSource = importedRecord(document.metadata);
  const metadata = {
    name: cleanProjectName(metadataSource?.name, "Projet importé"),
    createdAt: validProjectDate(metadataSource?.createdAt, savedAt),
  };
  return { project, board, metadata };
}

const previewColors: Record<string, string> = {
  Black: "#11131a",
  Red: "#ff5a64",
  Green: "#40d070",
  Yellow: "#f8d557",
  Blue: "#4d8cff",
  Magenta: "#d86cff",
  Cyan: "#4ee0d6",
  White: "#f7f8ff",
};

function createDefaultVariables(): VariableDef[] {
  return [
    { id: uid(), name: "maVariable", valueType: "number", defaultValue: num(2) },
    { id: uid(), name: "compteur", valueType: "number", defaultValue: num(0) },
    { id: uid(), name: "reponseJson", valueType: "text", defaultValue: textExpr("{}") },
    { id: uid(), name: "texte", valueType: "text", defaultValue: textExpr("") },
  ];
}

function defaultValues(definition: BlockDefinition): Values {
  const values: Values = {};
  definition.inputs?.forEach((input) => {
    values[input.key] = cloneValue(input.defaultValue);
  });
  return values;
}

function makeBlock(definitionId: string): ProgramBlock {
  const definition = blockById[definitionId];
  return {
    id: uid(),
    definitionId,
    values: defaultValues(definition),
    children: definition.slots?.some((slot) => slot.key === "children") ? [] : undefined,
    elseChildren: definition.slots?.some((slot) => slot.key === "elseChildren") ? [] : undefined,
  };
}

function makeStack(eventDefinitionId: string, blocks: ProgramBlock[] = []): ScriptStack {
  return {
    id: uid(),
    event: { definitionId: eventDefinitionId, values: defaultValues(blockById[eventDefinitionId]) },
    blocks,
  };
}

function createExampleStacks() {
  const repeat = makeBlock("control-repeat");
  repeat.values.times = variableExpr("maVariable");
  repeat.children = [
    { ...makeBlock("beep"), values: { times: num(1), gap: num(80) } },
    { ...makeBlock("wait"), values: { ms: num(120) } },
  ];

  const branch = makeBlock("control-if-else");
  branch.values.condition = compareExpr(variableExpr("maVariable"), ">", num(1));
  branch.children = [{ ...makeBlock("print-at"), values: { column: num(2), row: num(12), text: "Variable > 1" } }];
  branch.elseChildren = [{ ...makeBlock("print-at"), values: { column: num(2), row: num(12), text: "Variable petite" } }];

  return [
    makeStack("event-setup", [
      makeBlock("reset-display"),
      { ...makeBlock("var-set"), values: { variable: "maVariable", value: addExpr(num(1), num(1)) } },
      { ...makeBlock("set-colors"), values: { fg: "Cyan", bg: "Black" } },
      { ...makeBlock("big-text-at"), values: { column: num(4), row: num(3), text: "MINITEL" } },
      { ...makeBlock("print-at"), values: { column: num(3), row: num(8), text: "Bonjour depuis l'ESP32" } },
      repeat,
    ]),
    makeStack("event-loop", [
      { ...makeBlock("set-colors"), values: { fg: "White", bg: "Blue" } },
      { ...makeBlock("print-at"), values: { column: num(2), row: num(24), text: "Appuie sur A, B ou Entree" } },
      branch,
      { ...makeBlock("wait"), values: { ms: num(300) } },
    ]),
    makeStack("event-key-char", [
      { ...makeBlock("foreground"), values: { color: "Yellow" } },
      { ...makeBlock("print-at"), values: { column: num(2), row: num(14), text: "Touche A recue !" } },
      { ...makeBlock("mosaic-cell"), values: { column: num(30), row: num(14), topLeft: true, topRight: true, middleLeft: false, middleRight: true, bottomLeft: true, bottomRight: true } },
    ]),
  ].map((stack, index) => (index === 2 ? { ...stack, event: { ...stack.event, values: { key: "A" } } } : stack));
}

function createBlankStacks() {
  return [makeStack("event-setup", [makeBlock("reset-display")])];
}

function createMenuStacks() {
  const aStack = makeStack("event-key-char", [
    { ...makeBlock("set-colors"), values: { fg: "Yellow", bg: "Black" } },
    { ...makeBlock("print-at"), values: { column: num(4), row: num(16), text: "Tu as choisi : JOUER   " } },
    { ...makeBlock("beep"), values: { times: num(2), gap: num(90) } },
  ]);
  aStack.event.values.key = "A";
  const bStack = makeStack("event-key-char", [
    { ...makeBlock("set-colors"), values: { fg: "Cyan", bg: "Black" } },
    { ...makeBlock("print-at"), values: { column: num(4), row: num(16), text: "Tu as choisi : AIDE    " } },
  ]);
  bStack.event.values.key = "B";
  return [
    makeStack("event-setup", [
      makeBlock("reset-display"),
      { ...makeBlock("set-colors"), values: { fg: "White", bg: "Blue" } },
      { ...makeBlock("print-at"), values: { column: num(4), row: num(4), text: "MENU MINITEL" } },
      { ...makeBlock("set-colors"), values: { fg: "Cyan", bg: "Black" } },
      { ...makeBlock("print-at"), values: { column: num(5), row: num(9), text: "A - Jouer" } },
      { ...makeBlock("print-at"), values: { column: num(5), row: num(11), text: "B - Aide" } },
    ]),
    aStack,
    bStack,
  ];
}

function createCounterStacks() {
  return [
    makeStack("event-setup", [
      makeBlock("reset-display"),
      { ...makeBlock("var-set"), values: { variable: "compteur", value: num(0) } },
      { ...makeBlock("foreground"), values: { color: "Cyan" } },
      { ...makeBlock("print-at"), values: { column: num(4), row: num(5), text: "COMPTEUR ANIME" } },
    ]),
    makeStack("event-loop", [
      { ...makeBlock("var-change"), values: { variable: "compteur", delta: num(1) } },
      { ...makeBlock("set-colors"), values: { fg: "Yellow", bg: "Black" } },
      { ...makeBlock("print-at"), values: { column: num(8), row: num(11), text: "Valeur :" } },
      { ...makeBlock("var-show"), values: { variable: "compteur", column: num(18), row: num(11) } },
      { ...makeBlock("wait"), values: { ms: num(500) } },
    ]),
  ];
}

function createKeyboardStacks() {
  return [
    makeStack("event-setup", [
      makeBlock("reset-display"),
      { ...makeBlock("foreground"), values: { color: "Green" } },
      { ...makeBlock("print-at"), values: { column: num(3), row: num(4), text: "TESTEUR DE CLAVIER" } },
      { ...makeBlock("print-at"), values: { column: num(3), row: num(8), text: "Appuie sur une touche" } },
    ]),
    makeStack("event-key-any", [
      { ...makeBlock("set-colors"), values: { fg: "Yellow", bg: "Blue" } },
      { ...makeBlock("print-at"), values: { column: num(3), row: num(14), text: "Touche recue :" } },
      { ...makeBlock("show-key"), values: { column: num(20), row: num(14) } },
      { ...makeBlock("beep"), values: { times: num(1), gap: num(60) } },
    ]),
  ];
}

function createPixelDemoBitmap(cellWidth: number, cellHeight: number) {
  const width = cellWidth * 2;
  const height = cellHeight * 3;
  let bitmap = "";
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const nx = (x - width / 2) / (width / 2);
      const ny = (y - height / 2) / (height / 2);
      const ring = nx * nx + ny * ny;
      const eye = (Math.abs(nx - 0.34) < 0.1 || Math.abs(nx + 0.34) < 0.1) && Math.abs(ny + 0.25) < 0.12;
      const smile = ny > 0.1 && ny < 0.5 && Math.abs(ring - 0.42) < 0.09;
      bitmap += ring > 0.75 && ring < 1.05 || eye || smile ? "1" : "0";
    }
  }
  return bitmap;
}

function defaultProjectVariables() {
  return createDefaultVariables();
}

function createScreenState(name = "Écran principal", elements: SceneElement[] = [], workspaceMode: WorkspaceMode = "blocks") {
  const screen = createMinitelScene(name, elements);
  return { screens: [screen], activeScreenId: screen.id, workspaceMode };
}

const projectExamples: ProjectExample[] = [
  {
    id: "discover",
    name: "Découverte",
    description: "Texte, couleurs, variables, répétition et touche A dans un projet prêt à explorer.",
    accent: "#2785ff",
    create: () => ({ stacks: createExampleStacks(), variables: defaultProjectVariables(), screenConfig: createDefaultScreenConfig(), ...createScreenState() }),
  },
  {
    id: "menu",
    name: "Menu interactif",
    description: "Un vrai petit menu piloté avec les touches A et B du Minitel.",
    accent: "#e14d72",
    create: () => ({ stacks: createMenuStacks(), variables: defaultProjectVariables(), screenConfig: createDefaultScreenConfig(), ...createScreenState() }),
  },
  {
    id: "counter",
    name: "Compteur animé",
    description: "Une variable évolue automatiquement et sa valeur apparaît à l'écran.",
    accent: "#ff9f1c",
    create: () => ({ stacks: createCounterStacks(), variables: [{ id: uid(), name: "compteur", valueType: "number", defaultValue: num(0) }], screenConfig: createDefaultScreenConfig(), ...createScreenState() }),
  },
  {
    id: "keyboard",
    name: "Clavier sonore",
    description: "Chaque touche reçue s'affiche et déclenche un bip.",
    accent: "#18a058",
    create: () => ({ stacks: createKeyboardStacks(), variables: defaultProjectVariables(), screenConfig: createDefaultScreenConfig(), ...createScreenState() }),
  },
  {
    id: "poster",
    name: "Affiche visuelle",
    description: "Une composition créée dans le mode Écran avec titre, cadre et pixel art.",
    accent: "#16a6b6",
    create: () => {
      const config = createDefaultScreenConfig();
      const imageWidth = 10;
      const imageHeight = 8;
      const screen = createMinitelScene("Affiche d'accueil", [
        makeSceneBox(2, 2, 37, 21, "Cyan", false),
        makeSceneText("MINITEL STUDIO", 7, 4, "Yellow", "DoubleWidth"),
        makeSceneText("Dessine ton ecran sans coder", 7, 19, "White"),
        makeSceneImage("Sourire", 15, 8, imageWidth, imageHeight, createPixelDemoBitmap(imageWidth, imageHeight), "Green"),
      ]);
      const drawScreen = makeBlock("draw-screen");
      drawScreen.values.screen = screen.id;
      return {
        stacks: [makeStack("event-setup", [drawScreen])],
        variables: defaultProjectVariables(),
        screenConfig: config,
        screens: [screen],
        activeScreenId: screen.id,
        workspaceMode: "designer",
      };
    },
  },
];

function createInitialProject() {
  return projectExamples[0].create();
}


const BROWSER_PROJECT_LIBRARY_KEY = "minitel-blocks-project-library-v1";

type BrowserProjectRecord = {
  id: string;
  contents: string;
  modifiedAt: string;
};

function createNewProjectSnapshot(settings: NewProjectSettings): ProjectSnapshot {
  const columns = clamp(settings.columns, 20, 80);
  const rows = clamp(settings.rows, 12, 40);
  const preset: MinitelScreenConfig["preset"] =
    columns === 40 && rows === 24 ? "minitel-40" :
    columns === 32 && rows === 20 ? "small-32" :
    columns === 40 && rows === 20 ? "compact" : "custom";
  const screenConfig: MinitelScreenConfig = {
    preset,
    name: "Minitel " + columns + " × " + rows,
    columns,
    rows,
    colorEnabled: settings.colorEnabled,
  };
  const screen = createMinitelScene("Écran principal");
  return {
    stacks: createBlankStacks(),
    variables: createDefaultVariables(),
    screenConfig,
    screens: [screen],
    activeScreenId: screen.id,
    workspaceMode: "blocks",
  };
}

function projectSnapshotSignature(snapshot: ProjectSnapshot, board: string, metadata: ProjectMetadata) {
  return JSON.stringify({
    board: supportedProjectBoards.has(board) ? board : "esp32dev",
    metadata: { name: cleanProjectName(metadata.name), createdAt: validProjectDate(metadata.createdAt, "") },
    project: cloneProjectSnapshot(snapshot),
  });
}

function countBlocksInProject(blocks: ProgramBlock[]): number {
  return blocks.reduce((total, block) => total + 1 + countBlocksInProject(block.children ?? []) + countBlocksInProject(block.elseChildren ?? []), 0);
}

function summarizeManagedProject(id: string, contents: string, modifiedAt: string): ManagedProjectSummary {
  const parsed = parseProjectFile(contents);
  const firstScreen = parsed.project.screens[0];
  const previewText = (firstScreen?.elements ?? [])
    .filter((element): element is Extract<SceneElement, { kind: "text" }> => element.kind === "text")
    .map((element) => element.text.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .slice(0, 3);
  return {
    id,
    name: parsed.metadata.name,
    createdAt: parsed.metadata.createdAt,
    modifiedAt: validProjectDate(modifiedAt, new Date().toISOString()),
    columns: parsed.project.screenConfig.columns,
    rows: parsed.project.screenConfig.rows,
    colorEnabled: parsed.project.screenConfig.colorEnabled,
    screenCount: parsed.project.screens.length,
    blockCount: parsed.project.stacks.reduce((total, stack) => total + countBlocksInProject(stack.blocks), 0),
    previewText,
  };
}

function readBrowserProjectRecords(): BrowserProjectRecord[] {
  try {
    const value = JSON.parse(window.localStorage.getItem(BROWSER_PROJECT_LIBRARY_KEY) || "[]") as unknown;
    if (!Array.isArray(value)) return [];
    return value.filter((item): item is BrowserProjectRecord => {
      if (!item || typeof item !== "object") return false;
      const record = item as Partial<BrowserProjectRecord>;
      return typeof record.id === "string" && typeof record.contents === "string" && typeof record.modifiedAt === "string";
    });
  } catch {
    return [];
  }
}

function writeBrowserProjectRecords(records: BrowserProjectRecord[]) {
  window.localStorage.setItem(BROWSER_PROJECT_LIBRARY_KEY, JSON.stringify(records));
}


async function readManagedProjectLibrary(): Promise<ManagedProjectSummary[]> {
  const bridge = window.minitelStudio;
  if (bridge?.listProjects) {
    const result = await bridge.listProjects();
    if (!result.ok) throw new Error(result.error || "Impossible de lire les projets.");
    return [...result.projects].sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt));
  }
  return readBrowserProjectRecords()
    .flatMap((record) => {
      try {
        return [summarizeManagedProject(record.id, record.contents, record.modifiedAt)];
      } catch {
        return [];
      }
    })
    .sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt));
}

async function loadManagedProjectRecord(id: string): Promise<{ contents: string; project: ManagedProjectSummary }> {
  const bridge = window.minitelStudio;
  if (bridge?.loadProject) {
    const result = await bridge.loadProject(id);
    if (!result.ok || !result.contents || !result.project) throw new Error(result.error || "Ce projet ne peut pas être ouvert.");
    return { contents: result.contents, project: result.project };
  }
  const record = readBrowserProjectRecords().find((item) => item.id === id);
  if (!record) throw new Error("Ce projet n'existe plus.");
  return { contents: record.contents, project: summarizeManagedProject(id, record.contents, record.modifiedAt) };
}

async function saveManagedProjectRecord(id: string | undefined, contents: string): Promise<ManagedProjectSummary> {
  const bridge = window.minitelStudio;
  if (bridge?.saveProject) {
    const result = await bridge.saveProject({ id, contents });
    if (!result.ok || !result.project) throw new Error(result.error || "Impossible de sauvegarder ce projet.");
    return result.project;
  }
  const projectId = id || (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : uid());
  const modifiedAt = new Date().toISOString();
  const records = readBrowserProjectRecords().filter((item) => item.id !== projectId);
  records.push({ id: projectId, contents, modifiedAt });
  writeBrowserProjectRecords(records);
  return summarizeManagedProject(projectId, contents, modifiedAt);
}

async function deleteManagedProjectRecord(id: string) {
  const bridge = window.minitelStudio;
  if (bridge?.deleteProject) {
    const result = await bridge.deleteProject(id);
    if (!result.ok) throw new Error(result.error || "Impossible de supprimer ce projet.");
    return;
  }
  writeBrowserProjectRecords(readBrowserProjectRecords().filter((item) => item.id !== id));
}

function exprCode(value: InputValue | undefined, fallback: Expr = num(0)): string {
  const expr = isExpr(value) ? value : fallback;
  switch (expr.kind) {
    case "literal":
      if (expr.valueType === "boolean") {
        return expr.value ? "true" : "false";
      }
      if (expr.valueType === "text") {
        return cppString(String(expr.value));
      }
      return String(Number(expr.value) || 0);
    case "variable":
      return sanitizeIdentifier(expr.name);
    case "binary": {
      const left = exprCode(expr.left);
      const right = exprCode(expr.right);
      if (expr.op === "/" || expr.op === "%") {
        return "((" + right + ") == 0 ? 0 : (" + left + " " + expr.op + " " + right + "))";
      }
      return "(" + left + " " + expr.op + " " + right + ")";
    }
    case "compare":
      return "(" + exprCode(expr.left) + " " + expr.op + " " + exprCode(expr.right) + ")";
    case "random":
      return "mbsRandomInclusive((long)(" + exprCode(expr.from) + "), (long)(" + exprCode(expr.to) + "))";
    case "logical":
      return "(" + exprCode(expr.left, boolExpr(false)) + " " + expr.op + " " + exprCode(expr.right, boolExpr(false)) + ")";
    case "not":
      return "(!(" + exprCode(expr.operand, boolExpr(false)) + "))";
  }
}

function exprPreviewNumber(value: InputValue | undefined, variables: Record<string, number | string>, fallback = 0): number {
  const expr = isExpr(value) ? value : typeof value === "number" ? num(value) : num(fallback);
  switch (expr.kind) {
    case "literal":
      return Number(expr.value) || 0;
    case "variable": {
      const numericValue = Number(variables[expr.name]);
      return Number.isFinite(numericValue) ? numericValue : 0;
    }
    case "binary": {
      const left = exprPreviewNumber(expr.left, variables, fallback);
      const right = exprPreviewNumber(expr.right, variables, fallback);
      if (expr.op === "+") return left + right;
      if (expr.op === "-") return left - right;
      if (expr.op === "*") return left * right;
      if (expr.op === "/") return right === 0 ? 0 : left / right;
      return right === 0 ? 0 : left % right;
    }
    case "random": {
      const first = Math.round(exprPreviewNumber(expr.from, variables, fallback));
      const last = Math.round(exprPreviewNumber(expr.to, variables, fallback));
      const low = Math.min(first, last);
      const high = Math.max(first, last);
      return low + Math.floor(Math.random() * (high - low + 1));
    }
    case "compare":
    case "logical":
    case "not":
      return exprPreviewBoolean(expr, variables) ? 1 : 0;
  }
}

function exprPreviewBoolean(value: InputValue | undefined, variables: Record<string, number | string>): boolean {
  const expr = isExpr(value) ? value : boolExpr(Boolean(value));
  if (expr.kind === "literal") {
    return Boolean(expr.value);
  }
  if (expr.kind === "compare") {
    const left = exprPreviewNumber(expr.left, variables);
    const right = exprPreviewNumber(expr.right, variables);
    if (expr.op === "==") return left === right;
    if (expr.op === "!=") return left !== right;
    if (expr.op === "<") return left < right;
    if (expr.op === "<=") return left <= right;
    if (expr.op === ">") return left > right;
    return left >= right;
  }
  if (expr.kind === "logical") {
    return expr.op === "&&"
      ? exprPreviewBoolean(expr.left, variables) && exprPreviewBoolean(expr.right, variables)
      : exprPreviewBoolean(expr.left, variables) || exprPreviewBoolean(expr.right, variables);
  }
  if (expr.kind === "not") {
    return !exprPreviewBoolean(expr.operand, variables);
  }
  return exprPreviewNumber(expr, variables) !== 0;
}

function expressionLabel(value: InputValue | undefined): string {
  if (!isExpr(value)) {
    return String(value ?? "");
  }
  if (value.kind === "literal") {
    return String(value.value);
  }
  if (value.kind === "variable") {
    return value.name;
  }
  if (value.kind === "binary" || value.kind === "compare") {
    return expressionLabel(value.left) + " " + expressionOperatorGlyph(value.op) + " " + expressionLabel(value.right);
  }
  if (value.kind === "random") {
    return "aléatoire " + expressionLabel(value.from) + " à " + expressionLabel(value.to);
  }
  if (value.kind === "logical") {
    return expressionLabel(value.left) + " " + expressionOperatorGlyph(value.op) + " " + expressionLabel(value.right);
  }
  return "non " + expressionLabel(value.operand);
}

function collectExprVariables(value: InputValue | undefined, target: Set<string>) {
  if (!isExpr(value)) {
    return;
  }
  if (value.kind === "variable") {
    target.add(value.name);
    return;
  }
  if (value.kind === "binary" || value.kind === "compare" || value.kind === "logical") {
    collectExprVariables(value.left, target);
    collectExprVariables(value.right, target);
    return;
  }
  if (value.kind === "random") {
    collectExprVariables(value.from, target);
    collectExprVariables(value.to, target);
    return;
  }
  if (value.kind === "not") {
    collectExprVariables(value.operand, target);
  }
}

function replaceNumberVariableReference(value: InputValue, variableName: string, replacement: Expr): InputValue {
  if (!isExpr(value)) return value;
  if (value.kind === "variable") return value.name === variableName ? cloneValue(replacement) : value;
  if (value.kind === "binary" || value.kind === "compare" || value.kind === "logical") {
    return {
      ...value,
      left: replaceNumberVariableReference(value.left, variableName, replacement) as Expr,
      right: replaceNumberVariableReference(value.right, variableName, replacement) as Expr,
    };
  }
  if (value.kind === "random") {
    return {
      ...value,
      from: replaceNumberVariableReference(value.from, variableName, replacement) as Expr,
      to: replaceNumberVariableReference(value.to, variableName, replacement) as Expr,
    };
  }
  if (value.kind === "not") {
    return { ...value, operand: replaceNumberVariableReference(value.operand, variableName, replacement) as Expr };
  }
  return value;
}

function repairVariableValues(
  definition: BlockDefinition | undefined,
  values: Values,
  variables: VariableDef[],
  previousName: string,
  numberReplacement: Expr,
  nextName?: string,
) {
  const nextValues = Object.fromEntries(Object.entries(values).map(([key, value]) => {
    const input = definition?.inputs?.find((item) => item.key === key);
    if (input?.type === "query") {
      return [key, replaceQueryVariableReference(value, previousName, nextName)];
    }
    if (input?.type === "variable" && value === previousName) {
      const expectedType = input.variableType ?? "number";
      const compatibleVariables = expectedType === "any"
        ? variables
        : variables.filter((variable) => variableValueType(variable) === expectedType);
      const renamedVariable = nextName ? variables.find((variable) => variable.name === nextName) : undefined;
      const renamedVariableIsCompatible = renamedVariable
        && (expectedType === "any" || variableValueType(renamedVariable) === expectedType);
      return [key, renamedVariableIsCompatible ? nextName : compatibleVariables[0]?.name ?? ""];
    }
    return [key, replaceNumberVariableReference(value, previousName, numberReplacement)];
  }));
  return nextValues as Values;
}

function repairVariableReferencesInBlocks(
  blocks: ProgramBlock[],
  variables: VariableDef[],
  previousName: string,
  numberReplacement: Expr,
  nextName?: string,
): ProgramBlock[] {
  return blocks.map((block) => ({
    ...block,
    values: repairVariableValues(blockById[block.definitionId], block.values, variables, previousName, numberReplacement, nextName),
    children: block.children ? repairVariableReferencesInBlocks(block.children, variables, previousName, numberReplacement, nextName) : undefined,
    elseChildren: block.elseChildren ? repairVariableReferencesInBlocks(block.elseChildren, variables, previousName, numberReplacement, nextName) : undefined,
  }));
}

function repairVariableReferencesInStacks(stacks: ScriptStack[], variables: VariableDef[], previousName: string, nextName?: string) {
  const renamedVariable = nextName ? variables.find((variable) => variable.name === nextName) : undefined;
  const replacementVariable = renamedVariable && variableValueType(renamedVariable) === "number"
    ? renamedVariable
    : variables.find((variable) => variableValueType(variable) === "number");
  const numberReplacement = replacementVariable ? variableExpr(replacementVariable.name) : num(0);
  return stacks.map((stack) => ({
    ...stack,
    event: {
      ...stack.event,
      values: repairVariableValues(blockById[stack.event.definitionId], stack.event.values, variables, previousName, numberReplacement, nextName),
    },
    blocks: repairVariableReferencesInBlocks(stack.blocks, variables, previousName, numberReplacement, nextName),
  }));
}

function walkBlocks(blocks: ProgramBlock[], visit: (block: ProgramBlock) => void) {
  blocks.forEach((block) => {
    visit(block);
    walkBlocks(block.children ?? [], visit);
    walkBlocks(block.elseChildren ?? [], visit);
  });
}

function projectUsesBlock(stacks: ScriptStack[], definitionId: string) {
  return stacks.some((stack) => {
    let found = false;
    walkBlocks(stack.blocks, (block) => {
      if (block.definitionId === definitionId) found = true;
    });
    return found;
  });
}

function collectVariableTypes(stacks: ScriptStack[], variables: VariableDef[]) {
  const types = new Map<string, VariableValueType>();
  const addVariable = (name: string, valueType: VariableValueType) => {
    const cleanName = name.trim();
    if (cleanName && !types.has(cleanName)) types.set(cleanName, valueType);
  };
  const collectNumberExpressions = (values: Iterable<InputValue>) => {
    const names = new Set<string>();
    Array.from(values).forEach((value) => collectExprVariables(value, names));
    names.forEach((name) => addVariable(name, "number"));
  };

  variables.forEach((variable) => addVariable(variable.name, variableValueType(variable)));
  stacks.forEach((stack) => {
    collectNumberExpressions(Object.values(stack.event.values));
    walkBlocks(stack.blocks, (block) => {
      const definition = blockById[block.definitionId];
      Object.entries(block.values).forEach(([key, value]) => {
        const input = definition?.inputs?.find((item) => item.key === key);
        if (input?.type === "variable" && typeof value === "string") {
          addVariable(value, input.variableType === "text" ? "text" : "number");
        }
        collectNumberExpressions([value]);
      });
    });
  });
  return Array.from(types.entries());
}

function pushLine(lines: string[], indent: number, line: string) {
  lines.push(" ".repeat(indent) + line);
}

function queryPartCode(value: string, variables: VariableDef[]) {
  const variableName = queryVariableName(value);
  if (!variableName) return cppString(value);
  return variables.some((variable) => variable.name === variableName)
    ? "String(" + sanitizeIdentifier(variableName) + ")"
    : "String()";
}

function appendHttpJsonRequestCode(
  lines: string[],
  indent: number,
  values: Values,
  variables: VariableDef[],
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
) {
  const target = sanitizeIdentifier(textValue(values.target, "reponseJson"));
  const queryEntries = queryEntriesFromValue(values.query);
  const requestExpression = (urlExpression: string) => method === "POST"
    ? "mbsHttpPostJson(" + urlExpression + ", " + cppString(textValue(values.body, "{}")) + ")"
    : method === "PUT"
      ? "mbsHttpPutJson(" + urlExpression + ", " + cppString(textValue(values.body, "{}")) + ")"
      : method === "PATCH"
        ? "mbsHttpPatchJson(" + urlExpression + ", " + cppString(textValue(values.body, "{}")) + ")"
        : method === "DELETE"
          ? "mbsHttpDeleteJson(" + urlExpression + ")"
          : "mbsHttpGetJson(" + urlExpression + ")";

  if (queryEntries.length === 0) {
    pushLine(lines, indent, target + " = " + requestExpression(cppString(textValue(values.url, ""))) + ";");
    return;
  }

  pushLine(lines, indent, "{");
  pushLine(lines, indent + 2, "String mbsUrl = " + cppString(textValue(values.url, "")) + ";");
  queryEntries.forEach((entry) => {
    pushLine(lines, indent + 2, "mbsAppendQuery(mbsUrl, " + queryPartCode(entry.key, variables) + ", " + queryPartCode(entry.value, variables) + ");");
  });
  pushLine(lines, indent + 2, target + " = " + requestExpression("mbsUrl") + ";");
  pushLine(lines, indent, "}");
}

function appendBlockCode(lines: string[], blocks: ProgramBlock[], indent: number, variables: VariableDef[], context?: CodeContext) {
  blocks.forEach((block) => {
    const values = block.values;
    switch (block.definitionId) {
      case "reset-display":
        pushLine(lines, indent, "minitel.resetDisplay();");
        break;
      case "clear-screen":
        pushLine(lines, indent, "minitel.clear();");
        break;
      case "draw-screen": {
        const screen = context?.screens?.find((item) => item.id === textValue(values.screen, "")) ?? context?.screens?.[0];
        if (screen) pushLine(lines, indent, screenFunctionName(screen) + "();");
        break;
      }
      case "home-cursor":
        pushLine(lines, indent, "minitel.home();");
        break;
      case "move-to":
        pushLine(lines, indent, "minitel.moveTo((uint8_t)(" + exprCode(values.column, num(1)) + "), (uint8_t)(" + exprCode(values.row, num(1)) + "));");
        break;
      case "cursor-toggle":
        pushLine(lines, indent, "minitel.cursor(" + (values.enabled === "on" ? "true" : "false") + ");");
        break;
      case "print-text":
        pushLine(lines, indent, "minitel.sendText(" + cppString(values.text) + ");");
        break;
      case "print-line":
        pushLine(lines, indent, "minitel.sendLine(" + cppString(values.text) + ");");
        break;
      case "print-at":
        pushLine(lines, indent, "minitel.printAt((uint8_t)(" + exprCode(values.column, num(2)) + "), (uint8_t)(" + exprCode(values.row, num(3)) + "), " + cppString(values.text) + ");");
        break;
      case "big-text-at":
        pushLine(lines, indent, "minitel.bigTextAt((uint8_t)(" + exprCode(values.column, num(2)) + "), (uint8_t)(" + exprCode(values.row, num(5)) + "), " + cppString(values.text) + ");");
        break;
      case "text-size":
        pushLine(lines, indent, "minitel.setTextSize(MinitelESP32::TextSize::" + textValue(values.size, "Normal") + ");");
        break;
      case "foreground":
        pushLine(lines, indent, "minitel.foreground(" + colorEnum(context?.colorEnabled === false ? "White" : values.color) + ");");
        break;
      case "background":
        pushLine(lines, indent, "minitel.background(" + colorEnum(context?.colorEnabled === false ? "Black" : values.color) + ");");
        break;
      case "set-colors":
        pushLine(lines, indent, "minitel.colors(" + colorEnum(context?.colorEnabled === false ? "White" : values.fg) + ", " + colorEnum(context?.colorEnabled === false ? "Black" : values.bg) + ");");
        break;
      case "beep":
        pushLine(lines, indent, "minitel.beep((uint8_t)(" + exprCode(values.times, num(1)) + "), (uint16_t)(" + exprCode(values.gap, num(80)) + "));");
        break;
      case "wait":
        pushLine(lines, indent, "delay((uint32_t)(" + exprCode(values.ms, num(250)) + "));");
        break;
      case "var-set":
        pushLine(lines, indent, sanitizeIdentifier(textValue(values.variable, "maVariable")) + " = (int)(" + exprCode(values.value, num(0)) + ");");
        break;
      case "var-change":
        pushLine(lines, indent, sanitizeIdentifier(textValue(values.variable, "maVariable")) + " += (int)(" + exprCode(values.delta, num(1)) + ");");
        break;
      case "var-set-text":
        pushLine(lines, indent, sanitizeIdentifier(textValue(values.variable, "texte")) + " = " + cppString(values.text) + ";");
        break;
      case "var-show":
        pushLine(lines, indent, "minitel.moveTo((uint8_t)(" + exprCode(values.column, num(2)) + "), (uint8_t)(" + exprCode(values.row, num(20)) + "));");
        pushLine(lines, indent, "minitel.print(" + sanitizeIdentifier(textValue(values.variable, "maVariable")) + ");");
        break;
      case "control-repeat": {
        const counter = "repeat_" + block.id.replace(/[^A-Za-z0-9_]/g, "_");
        pushLine(lines, indent, "for (int " + counter + " = 0; " + counter + " < (int)(" + exprCode(values.times, num(10)) + "); ++" + counter + ") {");
        appendBlockCode(lines, block.children ?? [], indent + 2, variables, context);
        pushLine(lines, indent, "}");
        break;
      }
      case "control-forever":
        pushLine(lines, indent, "while (true) {");
        appendBlockCode(lines, block.children ?? [], indent + 2, variables, context);
        pushLine(lines, indent + 2, "delay(1);");
        pushLine(lines, indent, "}");
        break;
      case "control-if":
        pushLine(lines, indent, "if (" + exprCode(values.condition, boolExpr(true)) + ") {");
        appendBlockCode(lines, block.children ?? [], indent + 2, variables, context);
        pushLine(lines, indent, "}");
        break;
      case "control-if-else":
        pushLine(lines, indent, "if (" + exprCode(values.condition, boolExpr(true)) + ") {");
        appendBlockCode(lines, block.children ?? [], indent + 2, variables, context);
        pushLine(lines, indent, "} else {");
        appendBlockCode(lines, block.elseChildren ?? [], indent + 2, variables, context);
        pushLine(lines, indent, "}");
        break;
      case "control-for": {
        const name = sanitizeIdentifier(textValue(values.variable, "compteur"));
        pushLine(lines, indent, "for (" + name + " = (int)(" + exprCode(values.from, num(1)) + "); " + name + " <= (int)(" + exprCode(values.to, num(5)) + "); " + name + " += (int)(" + exprCode(values.step, num(1)) + ")) {");
        appendBlockCode(lines, block.children ?? [], indent + 2, variables, context);
        pushLine(lines, indent, "}");
        break;
      }
      case "show-key": {
        const keyName = context?.keyVariable || "liveKey";
        pushLine(lines, indent, "minitel.moveTo((uint8_t)(" + exprCode(values.column, num(2)) + "), (uint8_t)(" + exprCode(values.row, num(22)) + "));");
        if (!context?.keyVariable) {
          pushLine(lines, indent, "MinitelESP32::Key liveKey = minitel.readKey();");
        }
        pushLine(lines, indent, "if (" + keyName + ".isCharacter()) {");
        pushLine(lines, indent + 2, "minitel.write(static_cast<uint8_t>(" + keyName + ".character));");
        pushLine(lines, indent, "}");
        break;
      }
      case "read-line":
        pushLine(lines, indent, "{");
        pushLine(lines, indent + 2, "char saisie[41];");
        pushLine(lines, indent + 2, "minitel.readLine(saisie, sizeof(saisie), (uint32_t)(" + exprCode(values.timeout, num(5000)) + "), true);");
        pushLine(lines, indent, "}");
        break;
      case "wifi-connect": {
        const ssid = textValue(values.ssid, "");
        if (!ssid) {
          pushLine(lines, indent, "// Connexion Wi-Fi ignorée : le SSID est vide.");
          break;
        }
        pushLine(lines, indent, "{");
        pushLine(lines, indent + 2, "WiFi.mode(WIFI_STA);");
        pushLine(lines, indent + 2, "WiFi.begin(" + cppString(ssid) + ", " + cppString(values.password) + ");");
        pushLine(lines, indent + 2, "const uint32_t wifiStartedAt = millis();");
        pushLine(lines, indent + 2, "while (WiFi.status() != WL_CONNECTED && millis() - wifiStartedAt < 15000UL) {");
        pushLine(lines, indent + 4, "delay(250);");
        pushLine(lines, indent + 2, "}");
        pushLine(lines, indent, "}");
        break;
      }
      case "mqtt-connect": {
        const host = textValue(values.host, "").trim();
        const clientId = textValue(values.clientId, "minitel-esp32").trim() || "minitel-esp32";
        const username = textValue(values.username, "");
        if (!host) {
          pushLine(lines, indent, "// Connexion MQTT ignorée : l'adresse du broker est vide.");
          break;
        }
        pushLine(lines, indent, "{");
        pushLine(lines, indent + 2, "mbsMqttClient.setServer(" + cppString(host) + ", (uint16_t)(" + exprCode(values.port, num(1883)) + "));");
        pushLine(lines, indent + 2, "mbsMqttClient.setKeepAlive(30);");
        pushLine(lines, indent + 2, "if (WiFi.status() == WL_CONNECTED) {");
        if (username) {
          pushLine(lines, indent + 4, "mbsMqttClient.connect(" + cppString(clientId) + ", " + cppString(username) + ", " + cppString(values.password) + ");");
        } else {
          pushLine(lines, indent + 4, "mbsMqttClient.connect(" + cppString(clientId) + ");");
        }
        pushLine(lines, indent + 2, "}");
        pushLine(lines, indent, "}");
        break;
      }
      case "mqtt-subscribe": {
        const topic = textValue(values.topic, "").trim();
        const qos = textValue(values.qos, "0") === "1" ? 1 : 0;
        if (!topic) {
          pushLine(lines, indent, "// Abonnement MQTT ignoré : le topic est vide.");
          break;
        }
        pushLine(lines, indent, "if (mbsMqttClient.connected()) {");
        pushLine(lines, indent + 2, "mbsMqttClient.subscribe(" + cppString(topic) + ", " + qos + ");");
        pushLine(lines, indent, "}");
        break;
      }
      case "http-get-json":
        appendHttpJsonRequestCode(lines, indent, values, variables, "GET");
        break;
      case "http-post-json":
        appendHttpJsonRequestCode(lines, indent, values, variables, "POST");
        break;
      case "http-put-json":
        appendHttpJsonRequestCode(lines, indent, values, variables, "PUT");
        break;
      case "http-patch-json":
        appendHttpJsonRequestCode(lines, indent, values, variables, "PATCH");
        break;
      case "http-delete-json":
        appendHttpJsonRequestCode(lines, indent, values, variables, "DELETE");
        break;
      case "json-read-text":
        pushLine(lines, indent, "mbsJsonReadText(" + sanitizeIdentifier(textValue(values.source, "reponseJson")) + ", " + cppString(values.path) + ", " + sanitizeIdentifier(textValue(values.target, "texte")) + ");");
        break;
      case "json-read-number":
        pushLine(lines, indent, "mbsJsonReadNumber(" + sanitizeIdentifier(textValue(values.source, "reponseJson")) + ", " + cppString(values.path) + ", " + sanitizeIdentifier(textValue(values.target, "maVariable")) + ");");
        break;
      case "json-if-has":
        pushLine(lines, indent, "if (mbsJsonHas(" + sanitizeIdentifier(textValue(values.source, "reponseJson")) + ", " + cppString(values.path) + ")) {");
        appendBlockCode(lines, block.children ?? [], indent + 2, variables, context);
        pushLine(lines, indent, "}");
        break;
      case "graphic-mode":
        pushLine(lines, indent, "minitel.graphicMode();");
        break;
      case "text-mode":
        pushLine(lines, indent, "minitel.textMode();");
        break;
      case "mosaic-cell":
        pushLine(lines, indent, "minitel.moveTo((uint8_t)(" + exprCode(values.column, num(10)) + "), (uint8_t)(" + exprCode(values.row, num(10)) + "));");
        pushLine(lines, indent, "minitel.graphicMode();");
        pushLine(lines, indent, "minitel.drawMosaicCell(" + (boolValue(values.topLeft, true) ? "true" : "false") + ", " + (boolValue(values.topRight, true) ? "true" : "false") + ", " + (boolValue(values.middleLeft, true) ? "true" : "false") + ", " + (boolValue(values.middleRight, false) ? "true" : "false") + ", " + (boolValue(values.bottomLeft, true) ? "true" : "false") + ", " + (boolValue(values.bottomRight, false) ? "true" : "false") + ");");
        pushLine(lines, indent, "minitel.textMode();");
        break;
      case "set-baud": {
        const baud = baudOptions.some((option) => option.value === textValue(values.baud, "1200")) ? textValue(values.baud, "1200") : "1200";
        pushLine(lines, indent, "minitel.setBaudRate(" + baud + ");");
        break;
      }
      case "detect-baud":
        pushLine(lines, indent, "{");
        pushLine(lines, indent + 2, "uint32_t detectedBaud = minitel.detectBaudRate(300, 3);");
        pushLine(lines, indent + 2, "if (detectedBaud == 0) {");
        pushLine(lines, indent + 4, "minitel.setBaudRate(1200);");
        pushLine(lines, indent + 2, "}");
        pushLine(lines, indent, "}");
        break;
      case "reset-protocol":
        pushLine(lines, indent, "minitel.sendByte(0x1B);");
        pushLine(lines, indent, "minitel.sendByte(0x39);");
        pushLine(lines, indent, "minitel.sendByte(0x7F);");
        break;
      default:
        break;
    }
  });
}

function screenFunctionName(screen: MinitelScene) {
  return "drawScreen_" + screen.id.replace(/[^A-Za-z0-9_]/g, "_");
}

function appendSceneCode(lines: string[], elements: SceneElement[], indent: number, colorEnabled: boolean) {
  if (elements.length === 0) return;
  pushLine(lines, indent, "// Composition créée dans le mode Écran");
  elements.forEach((element) => {
    const foreground = colorEnabled ? element.fg : "White";
    const background = colorEnabled && element.kind === "text" ? element.bg : "Black";
    if (element.kind === "text") {
      pushLine(lines, indent, "minitel.colors(MinitelESP32::Color::" + foreground + ", MinitelESP32::Color::" + background + ");");
      pushLine(lines, indent, "minitel.setTextSize(MinitelESP32::TextSize::" + element.size + ");");
      pushLine(lines, indent, "minitel.moveTo(" + element.x + ", " + element.y + ");");
      pushLine(lines, indent, "minitel.sendText(" + cppString(element.text) + ");");
      pushLine(lines, indent, "minitel.setTextSize(MinitelESP32::TextSize::Normal);");
      return;
    }

    pushLine(lines, indent, "minitel.foreground(MinitelESP32::Color::" + foreground + ");");
    pushLine(lines, indent, "minitel.graphicMode();");
    if (element.kind === "box") {
      const loopId = element.id.replace(/[^A-Za-z0-9_]/g, "_");
      pushLine(lines, indent, "for (uint8_t sceneY_" + loopId + " = 0; sceneY_" + loopId + " < " + element.height + "; ++sceneY_" + loopId + ") {");
      pushLine(lines, indent + 2, "for (uint8_t sceneX_" + loopId + " = 0; sceneX_" + loopId + " < " + element.width + "; ++sceneX_" + loopId + ") {");
      const edge = "sceneX_" + loopId + " == 0 || sceneY_" + loopId + " == 0 || sceneX_" + loopId + " == " + (element.width - 1) + " || sceneY_" + loopId + " == " + (element.height - 1);
      if (!element.filled) pushLine(lines, indent + 4, "if (!(" + edge + ")) continue;");
      pushLine(lines, indent + 4, "minitel.moveTo(" + element.x + " + sceneX_" + loopId + ", " + element.y + " + sceneY_" + loopId + ");");
      pushLine(lines, indent + 4, "minitel.drawMosaicCell(true, true, true, true, true, true);");
      pushLine(lines, indent + 2, "}");
      pushLine(lines, indent, "}");
    } else {
      const imageId = element.id.replace(/[^A-Za-z0-9_]/g, "_");
      const masks: number[] = [];
      for (let y = 0; y < element.height; y += 1) {
        for (let x = 0; x < element.width; x += 1) {
          const bits = mosaicBits(element, x, y);
          masks.push(bits.reduce((mask, bit, index) => bit ? mask | (1 << index) : mask, 0));
        }
      }
      pushLine(lines, indent, "static const uint8_t sceneImage_" + imageId + "[] = { " + masks.map((mask) => "0x" + mask.toString(16).padStart(2, "0")).join(", ") + " };");
      pushLine(lines, indent, "for (uint8_t sceneY_" + imageId + " = 0; sceneY_" + imageId + " < " + element.height + "; ++sceneY_" + imageId + ") {");
      pushLine(lines, indent + 2, "for (uint8_t sceneX_" + imageId + " = 0; sceneX_" + imageId + " < " + element.width + "; ++sceneX_" + imageId + ") {");
      pushLine(lines, indent + 4, "uint8_t sceneMask = sceneImage_" + imageId + "[sceneY_" + imageId + " * " + element.width + " + sceneX_" + imageId + "];");
      pushLine(lines, indent + 4, "if (sceneMask == 0) continue;");
      pushLine(lines, indent + 4, "minitel.moveTo(" + element.x + " + sceneX_" + imageId + ", " + element.y + " + sceneY_" + imageId + ");");
      pushLine(lines, indent + 4, "minitel.drawMosaicCell(sceneMask & 0x01, sceneMask & 0x02, sceneMask & 0x04, sceneMask & 0x08, sceneMask & 0x10, sceneMask & 0x20);");
      pushLine(lines, indent + 2, "}");
      pushLine(lines, indent, "}");
    }
    pushLine(lines, indent, "minitel.textMode();");
  });
}

function generateArduinoCode(stacks: ScriptStack[], variables: VariableDef[], screenConfig: MinitelScreenConfig, screens: MinitelScene[]) {
  const setupStacks = stacks.filter((stack) => stack.event.definitionId === "event-setup");
  const loopStacks = stacks.filter((stack) => stack.event.definitionId === "event-loop");
  const keyStacks = stacks.filter((stack) => stack.event.definitionId === "event-key-any" || stack.event.definitionId === "event-key-char");
  const variableTypes = collectVariableTypes(stacks, variables);
  const usesHttpPost = projectUsesBlock(stacks, "http-post-json");
  const usesHttpPut = projectUsesBlock(stacks, "http-put-json");
  const usesHttpPatch = projectUsesBlock(stacks, "http-patch-json");
  const usesHttpDelete = projectUsesBlock(stacks, "http-delete-json");
  const usesHttp = projectUsesBlock(stacks, "http-get-json") || usesHttpPost || usesHttpPut || usesHttpPatch || usesHttpDelete;
  const usesMqtt = projectUsesBlock(stacks, "mqtt-connect") || projectUsesBlock(stacks, "mqtt-subscribe");
  const usesJson = usesHttp || ["json-read-text", "json-read-number", "json-if-has"].some((definitionId) => projectUsesBlock(stacks, definitionId));
  const usesWifi = usesHttp || usesMqtt || projectUsesBlock(stacks, "wifi-connect");
  const lines: string[] = [
    "#include <Arduino.h>",
    ...(usesWifi ? ["#include <WiFi.h>"] : []),
    ...(usesHttp ? ["#include <HTTPClient.h>"] : []),
    ...(usesMqtt ? ['#include "PubSubClient.h"'] : []),
    ...(usesJson ? ['#include "cJSON.h"'] : []),
    "#include <MinitelESP32.h>",
    "",
    "// " + screenConfig.name + " : " + screenConfig.columns + " x " + screenConfig.rows,
    "MinitelESP32 minitel(Serial2, 16, 17, 1200);",
    ...(usesMqtt ? [
      "WiFiClient mbsMqttNetworkClient;",
      "PubSubClient mbsMqttClient(mbsMqttNetworkClient);",
    ] : []),
  ];

  lines.push(
    "",
    "long mbsRandomInclusive(long first, long second) {",
    "  long low = first < second ? first : second;",
    "  long high = first < second ? second : first;",
    "  return low == high ? low : random(low, high + 1);",
    "}",
  );

  if (usesJson) {
    lines.push(
      "",
      "cJSON *mbsJsonItemAtPath(cJSON *root, const String &path) {",
      "  if (root == nullptr) return nullptr;",
      "  if (path.length() == 0) return root;",
      "  cJSON *current = root;",
      "  int start = 0;",
      "  while (start <= (int)path.length()) {",
      "    const int separator = path.indexOf('.', start);",
      "    String segment = separator < 0 ? path.substring(start) : path.substring(start, separator);",
      "    segment.trim();",
      "    if (segment.length() == 0) return nullptr;",
      "    if (cJSON_IsArray(current)) {",
      "      char *end = nullptr;",
      "      const long index = strtol(segment.c_str(), &end, 10);",
      "      if (end == segment.c_str() || *end != '\\0' || index < 0) return nullptr;",
      "      current = cJSON_GetArrayItem(current, (int)index);",
      "    } else if (cJSON_IsObject(current)) {",
      "      current = cJSON_GetObjectItemCaseSensitive(current, segment.c_str());",
      "    } else {",
      "      return nullptr;",
      "    }",
      "    if (current == nullptr || separator < 0) return current;",
      "    start = separator + 1;",
      "  }",
      "  return current;",
      "}",
      "",
      "bool mbsJsonReadText(const String &json, const String &path, String &output) {",
      "  cJSON *document = cJSON_Parse(json.c_str());",
      "  output = String();",
      "  if (document == nullptr) return false;",
      "  cJSON *item = mbsJsonItemAtPath(document, path);",
      "  bool found = item != nullptr;",
      "  if (cJSON_IsString(item) && item->valuestring != nullptr) {",
      "    output = item->valuestring;",
      "  } else if (item != nullptr) {",
      "    char *encoded = cJSON_PrintUnformatted(item);",
      "    if (encoded != nullptr) {",
      "      output = encoded;",
      "      cJSON_free(encoded);",
      "    }",
      "  }",
      "  cJSON_Delete(document);",
      "  return found;",
      "}",
      "",
      "bool mbsJsonReadNumber(const String &json, const String &path, int &output) {",
      "  output = 0;",
      "  cJSON *document = cJSON_Parse(json.c_str());",
      "  if (document == nullptr) return false;",
      "  cJSON *item = mbsJsonItemAtPath(document, path);",
      "  bool found = false;",
      "  if (cJSON_IsNumber(item)) {",
      "    output = (int)item->valuedouble;",
      "    found = true;",
      "  } else if (cJSON_IsBool(item)) {",
      "    output = cJSON_IsTrue(item) ? 1 : 0;",
      "    found = true;",
      "  } else if (cJSON_IsString(item) && item->valuestring != nullptr) {",
      "    output = String(item->valuestring).toInt();",
      "    found = true;",
      "  }",
      "  cJSON_Delete(document);",
      "  return found;",
      "}",
      "",
      "bool mbsJsonHas(const String &json, const String &path) {",
      "  cJSON *document = cJSON_Parse(json.c_str());",
      "  if (document == nullptr) return false;",
      "  const bool found = mbsJsonItemAtPath(document, path) != nullptr;",
      "  cJSON_Delete(document);",
      "  return found;",
      "}",
    );
  }

  if (usesHttp) {
    lines.push(
      "",
      "String mbsUrlEncode(const String &value) {",
      "  static const char hex[] = \"0123456789ABCDEF\";",
      "  String encoded;",
      "  encoded.reserve(value.length() * 3);",
      "  for (size_t index = 0; index < value.length(); ++index) {",
      "    const uint8_t character = (uint8_t)value[index];",
      "    const bool plain = (character >= 'a' && character <= 'z') || (character >= 'A' && character <= 'Z') || (character >= '0' && character <= '9') || character == '-' || character == '_' || character == '.' || character == '~';",
      "    if (plain) encoded += (char)character;",
      "    else {",
      "      encoded += '%';",
      "      encoded += hex[(character >> 4) & 0x0F];",
      "      encoded += hex[character & 0x0F];",
      "    }",
      "  }",
      "  return encoded;",
      "}",
      "",
      "void mbsAppendQuery(String &url, const String &key, const String &value) {",
      "  if (key.length() == 0) return;",
      "  String fragment;",
      "  const int hashIndex = url.indexOf('#');",
      "  if (hashIndex >= 0) {",
      "    fragment = url.substring(hashIndex);",
      "    url.remove(hashIndex);",
      "  }",
      "  if (url.indexOf('?') < 0) url += '?';",
      "  else if (!url.endsWith(\"?\") && !url.endsWith(\"&\")) url += '&';",
      "  url += mbsUrlEncode(key);",
      "  url += '=';",
      "  url += mbsUrlEncode(value);",
      "  url += fragment;",
      "}",
      "",
      "String mbsHttpGetJson(const String &url) {",
      "  if (WiFi.status() != WL_CONNECTED || url.length() == 0) return String();",
      "  HTTPClient http;",
      "  http.setTimeout(10000);",
      "  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);",
      "  if (!http.begin(url)) return String();",
      "  http.addHeader(\"Accept\", \"application/json\");",
      "  const int status = http.GET();",
      "  String response = status >= 200 && status < 300 ? http.getString() : String();",
      "  http.end();",
      "  if (response.length() == 0) return String();",
      "  cJSON *document = cJSON_Parse(response.c_str());",
      "  if (document == nullptr) return String();",
      "  cJSON_Delete(document);",
      "  return response;",
      "}",
    );
  }

  if (usesHttpPost) {
    lines.push(
      "",
      "String mbsHttpPostJson(const String &url, const String &body) {",
      "  if (WiFi.status() != WL_CONNECTED || url.length() == 0) return String();",
      "  HTTPClient http;",
      "  http.setTimeout(10000);",
      "  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);",
      "  if (!http.begin(url)) return String();",
      "  http.addHeader(\"Accept\", \"application/json\");",
      "  http.addHeader(\"Content-Type\", \"application/json\");",
      "  const int status = http.POST(body);",
      "  String response = status >= 200 && status < 300 ? http.getString() : String();",
      "  http.end();",
      "  if (response.length() == 0) return String();",
      "  cJSON *document = cJSON_Parse(response.c_str());",
      "  if (document == nullptr) return String();",
      "  cJSON_Delete(document);",
      "  return response;",
      "}",
    );
  }

  if (usesHttpPut) {
    lines.push(
      "",
      "String mbsHttpPutJson(const String &url, const String &body) {",
      "  if (WiFi.status() != WL_CONNECTED || url.length() == 0) return String();",
      "  HTTPClient http;",
      "  http.setTimeout(10000);",
      "  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);",
      "  if (!http.begin(url)) return String();",
      "  http.addHeader(\"Accept\", \"application/json\");",
      "  http.addHeader(\"Content-Type\", \"application/json\");",
      "  const int status = http.PUT(body);",
      "  String response = status >= 200 && status < 300 ? http.getString() : String();",
      "  http.end();",
      "  if (response.length() == 0) return String();",
      "  cJSON *document = cJSON_Parse(response.c_str());",
      "  if (document == nullptr) return String();",
      "  cJSON_Delete(document);",
      "  return response;",
      "}",
    );
  }

  if (usesHttpPatch) {
    lines.push(
      "",
      "String mbsHttpPatchJson(const String &url, const String &body) {",
      "  if (WiFi.status() != WL_CONNECTED || url.length() == 0) return String();",
      "  HTTPClient http;",
      "  http.setTimeout(10000);",
      "  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);",
      "  if (!http.begin(url)) return String();",
      "  http.addHeader(\"Accept\", \"application/json\");",
      "  http.addHeader(\"Content-Type\", \"application/json\");",
      "  const int status = http.PATCH(body);",
      "  String response = status >= 200 && status < 300 ? http.getString() : String();",
      "  http.end();",
      "  if (response.length() == 0) return String();",
      "  cJSON *document = cJSON_Parse(response.c_str());",
      "  if (document == nullptr) return String();",
      "  cJSON_Delete(document);",
      "  return response;",
      "}",
    );
  }

  if (usesHttpDelete) {
    lines.push(
      "",
      "String mbsHttpDeleteJson(const String &url) {",
      "  if (WiFi.status() != WL_CONNECTED || url.length() == 0) return String();",
      "  HTTPClient http;",
      "  http.setTimeout(10000);",
      "  http.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);",
      "  if (!http.begin(url)) return String();",
      "  http.addHeader(\"Accept\", \"application/json\");",
      "  const int status = http.sendRequest(\"DELETE\");",
      "  String response = status >= 200 && status < 300 ? http.getString() : String();",
      "  http.end();",
      "  if (response.length() == 0) return String();",
      "  cJSON *document = cJSON_Parse(response.c_str());",
      "  if (document == nullptr) return String();",
      "  cJSON_Delete(document);",
      "  return response;",
      "}",
    );
  }

  if (variableTypes.length > 0) {
    lines.push("");
    variableTypes.forEach(([name, valueType]) => {
      const variable = variables.find((item) => item.name === name);
      if (valueType === "text") {
        lines.push("String " + sanitizeIdentifier(name) + " = " + exprCode(variable?.defaultValue, textExpr("")) + ";");
      } else {
        lines.push("int " + sanitizeIdentifier(name) + " = (int)(" + exprCode(variable?.defaultValue, num(0)) + ");");
      }
    });
  }

  screens.forEach((screen) => {
    lines.push("", "// Écran : " + screen.name.replace(/[\r\n]+/g, " "), "void " + screenFunctionName(screen) + "() {", "  minitel.resetDisplay();");
    appendSceneCode(lines, screen.elements, 2, screenConfig.colorEnabled);
    lines.push("}");
  });

  lines.push("", "void setup() {", "  minitel.begin();", "  minitel.resetDisplay();");
  setupStacks.forEach((stack) => appendBlockCode(lines, stack.blocks, 2, variables, { screens, colorEnabled: screenConfig.colorEnabled }));
  lines.push("}", "", "void loop() {");
  if (usesMqtt) lines.push("  mbsMqttClient.loop();");

  if (keyStacks.length > 0) {
    lines.push("  MinitelESP32::Key key = minitel.readKey();");
    keyStacks.forEach((stack) => {
      if (stack.event.definitionId === "event-key-any") {
        lines.push("  if (key.available()) {");
      } else {
        lines.push("  if (" + keyCondition(stack.event.values.key) + ") {");
      }
      appendBlockCode(lines, stack.blocks, 4, variables, { keyVariable: "key", screens, colorEnabled: screenConfig.colorEnabled });
      lines.push("  }");
    });
  }

  loopStacks.forEach((stack) => appendBlockCode(lines, stack.blocks, 2, variables, { screens, colorEnabled: screenConfig.colorEnabled }));
  lines.push("  delay(10);", "}");
  return lines.join("\n");
}

function emptyPreviewCells(columns: number, rows: number) {
  return Array.from({ length: columns * rows }, () => ({ char: " ", fg: previewColors.White, bg: previewColors.Black }));
}

function createPreviewState(variables: VariableDef[], screenConfig: MinitelScreenConfig): PreviewState {
  const values: Record<string, number | string> = {};
  variables.forEach((variable) => {
    values[variable.name] = variableValueType(variable) === "text"
      ? variable.defaultValue.kind === "literal" ? String(variable.defaultValue.value) : ""
      : exprPreviewNumber(variable.defaultValue, values, 0);
  });
  return { cells: emptyPreviewCells(screenConfig.columns, screenConfig.rows), columns: screenConfig.columns, rows: screenConfig.rows, cursorColumn: 1, cursorRow: 1, fg: previewColors.White, bg: previewColors.Black, textSize: "Normal", baudRate: 1200, messages: [], variables: values, colorEnabled: screenConfig.colorEnabled };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clearPreview(state: PreviewState) {
  state.cells = emptyPreviewCells(state.columns, state.rows);
  state.cursorColumn = 1;
  state.cursorRow = 1;
}

function setCursor(state: PreviewState, column: number, row: number) {
  state.cursorColumn = clamp(column, 1, state.columns);
  state.cursorRow = clamp(row, 1, state.rows);
}

function setPreviewCell(state: PreviewState, column: number, row: number, char: string) {
  const safeColumn = clamp(column, 1, state.columns);
  const safeRow = clamp(row, 1, state.rows);
  const index = (safeRow - 1) * state.columns + (safeColumn - 1);
  state.cells[index] = { char, fg: state.fg, bg: state.bg };
}

function writePreviewText(state: PreviewState, text: string) {
  for (const character of text) {
    if (character === "\n") {
      state.cursorColumn = 1;
      state.cursorRow = clamp(state.cursorRow + 1, 1, state.rows);
      continue;
    }
    setPreviewCell(state, state.cursorColumn, state.cursorRow, character);
    if (state.cursorColumn >= state.columns) {
      state.cursorColumn = 1;
      state.cursorRow = clamp(state.cursorRow + 1, 1, state.rows);
    } else {
      state.cursorColumn += 1;
    }
  }
}

function previewJsonPath(json: string, path: string): { found: boolean; value?: unknown } {
  try {
    let current: unknown = JSON.parse(json);
    const segments = path.replace(/\[(\d+)\]/g, ".$1").split(".").map((segment) => segment.trim()).filter(Boolean);
    for (const segment of segments) {
      if (Array.isArray(current)) {
        const index = Number(segment);
        if (!Number.isInteger(index) || index < 0 || index >= current.length) return { found: false };
        current = current[index];
      } else if (current !== null && typeof current === "object" && Object.prototype.hasOwnProperty.call(current, segment)) {
        current = (current as Record<string, unknown>)[segment];
      } else {
        return { found: false };
      }
    }
    return { found: true, value: current };
  } catch {
    return { found: false };
  }
}

function previewJsonText(value: unknown) {
  if (typeof value === "string") return value;
  if (value === undefined) return "";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

function compactPreviewVariable(value: number | string) {
  const text = String(value);
  return text.length > 56 ? text.slice(0, 53) + "..." : text;
}

function applyBlocksPreview(state: PreviewState, blocks: ProgramBlock[], previewKey: string, screens: MinitelScene[], httpResults: Record<string, SimulationHttpState>, depth = 0) {
  blocks.forEach((block) => {
    const values = block.values;
    switch (block.definitionId) {
      case "reset-display":
        state.textSize = "Normal";
        state.fg = previewColors.White;
        state.bg = previewColors.Black;
        clearPreview(state);
        state.messages.push("Écran préparé");
        break;
      case "clear-screen":
        clearPreview(state);
        state.messages.push("Écran effacé");
        break;
      case "draw-screen": {
        const screen = screens.find((item) => item.id === textValue(values.screen, "")) ?? screens[0];
        if (screen) {
          state.textSize = "Normal";
          state.fg = previewColors.White;
          state.bg = previewColors.Black;
          clearPreview(state);
          applyScenePreview(state, screen.elements);
          state.messages.push("Écran : " + screen.name);
        }
        break;
      }
      case "home-cursor":
        setCursor(state, 1, 1);
        break;
      case "move-to":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 1), exprPreviewNumber(values.row, state.variables, 1));
        break;
      case "cursor-toggle":
        state.messages.push(values.enabled === "on" ? "Curseur visible" : "Curseur caché");
        break;
      case "print-text":
        writePreviewText(state, textValue(values.text, ""));
        break;
      case "print-line":
        writePreviewText(state, textValue(values.text, "") + "\n");
        break;
      case "print-at":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 2), exprPreviewNumber(values.row, state.variables, 3));
        writePreviewText(state, textValue(values.text, ""));
        break;
      case "big-text-at":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 2), exprPreviewNumber(values.row, state.variables, 5));
        writePreviewText(state, textValue(values.text, "").toUpperCase());
        break;
      case "text-size":
        state.textSize = textValue(values.size, "Normal");
        state.messages.push("Taille: " + state.textSize);
        break;
      case "foreground":
        state.fg = state.colorEnabled ? previewColors[textValue(values.color, "White")] : previewColors.White;
        break;
      case "background":
        state.bg = state.colorEnabled ? previewColors[textValue(values.color, "Black")] : previewColors.Black;
        break;
      case "set-colors":
        state.fg = state.colorEnabled ? previewColors[textValue(values.fg, "White")] : previewColors.White;
        state.bg = state.colorEnabled ? previewColors[textValue(values.bg, "Black")] : previewColors.Black;
        break;
      case "beep":
        state.messages.push("Bip x" + clamp(exprPreviewNumber(values.times, state.variables, 1), 0, 99));
        break;
      case "wait":
        state.messages.push("Pause " + clamp(exprPreviewNumber(values.ms, state.variables, 250), 0, 100000) + " ms");
        break;
      case "var-set":
        state.variables[textValue(values.variable, "maVariable")] = exprPreviewNumber(values.value, state.variables, 0);
        state.messages.push(textValue(values.variable, "maVariable") + " = " + state.variables[textValue(values.variable, "maVariable")]);
        break;
      case "var-change": {
        const name = textValue(values.variable, "maVariable");
        state.variables[name] = Number(state.variables[name] ?? 0) + exprPreviewNumber(values.delta, state.variables, 1);
        state.messages.push(name + " = " + state.variables[name]);
        break;
      }
      case "var-set-text": {
        const name = textValue(values.variable, "texte");
        state.variables[name] = textValue(values.text, "");
        state.messages.push(name + " = « " + state.variables[name] + " »");
        break;
      }
      case "var-show":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 2), exprPreviewNumber(values.row, state.variables, 20));
        writePreviewText(state, String(state.variables[textValue(values.variable, "maVariable")] ?? 0));
        break;
      case "control-repeat": {
        const count = clamp(exprPreviewNumber(values.times, state.variables, 10), 0, 20);
        for (let index = 0; index < count; index += 1) {
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, httpResults, depth + 1);
        }
        break;
      }
      case "control-forever":
        state.messages.push("Toujours: aperçu 1 tour");
        applyBlocksPreview(state, block.children ?? [], previewKey, screens, httpResults, depth + 1);
        break;
      case "control-if":
        if (exprPreviewBoolean(values.condition, state.variables)) {
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, httpResults, depth + 1);
        }
        break;
      case "control-if-else":
        applyBlocksPreview(state, exprPreviewBoolean(values.condition, state.variables) ? block.children ?? [] : block.elseChildren ?? [], previewKey, screens, httpResults, depth + 1);
        break;
      case "control-for": {
        const name = textValue(values.variable, "compteur");
        const from = clamp(exprPreviewNumber(values.from, state.variables, 1), -999, 999);
        const to = clamp(exprPreviewNumber(values.to, state.variables, 5), -999, 999);
        const step = Math.max(1, Math.abs(clamp(exprPreviewNumber(values.step, state.variables, 1), -999, 999)));
        let guard = 0;
        for (let current = from; current <= to && guard < 20; current += step) {
          state.variables[name] = current;
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, httpResults, depth + 1);
          guard += 1;
        }
        break;
      }
      case "show-key":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 2), exprPreviewNumber(values.row, state.variables, 22));
        writePreviewText(state, minitelKeyScreenLabel(previewKey));
        break;
      case "read-line":
        state.messages.push("Lecture clavier simulée");
        break;
      case "wifi-connect": {
        const ssid = textValue(values.ssid, "");
        state.messages.push("Simulation : réseau du PC" + (ssid ? " · SSID ESP32 : " + ssid : ""));
        break;
      }
      case "mqtt-connect": {
        const host = textValue(values.host, "").trim();
        const port = clamp(Math.round(exprPreviewNumber(values.port, state.variables, 1883)), 1, 65535);
        state.messages.push(host ? "MQTT simulé · " + host + ":" + port : "MQTT : adresse du broker manquante");
        break;
      }
      case "mqtt-subscribe": {
        const topic = textValue(values.topic, "").trim();
        const qos = textValue(values.qos, "0") === "1" ? 1 : 0;
        state.messages.push(topic ? "Abonné à " + topic + " · QoS " + qos + " (simulation)" : "MQTT : topic manquant");
        break;
      }
      case "http-get-json": {
        const target = textValue(values.target, "reponseJson");
        const request = simulationHttpRequest("GET", values, state.variables);
        const result = httpResults[request.key];
        state.variables[target] = result?.body ?? "";
        if (!request.url) {
          state.messages.push("GET JSON : URL manquante");
        } else if (!result) {
          state.messages.push("GET JSON : lance la simulation");
        } else if (result.status === "loading") {
          state.messages.push(result.body ? "GET JSON : actualisation\u2026" : "GET JSON en cours\u2026");
        } else if (result.status === "error") {
          state.messages.push((result.body ? "Derni\u00e8re r\u00e9ponse conserv\u00e9e \u00b7 " : "GET impossible \u00b7 ") + (result.error || "Erreur r\u00e9seau"));
        } else {
          state.messages.push("GET " + (result.statusCode || 200) + " \u2192 " + target);
        }
        break;
      }
      case "http-post-json": {
        const target = textValue(values.target, "reponseJson");
        const request = simulationHttpRequest("POST", values, state.variables);
        const result = httpResults[request.key];
        state.variables[target] = result?.body ?? "";
        if (!request.url) {
          state.messages.push("POST JSON : URL manquante");
        } else if (!result) {
          state.messages.push("POST JSON : lance la simulation");
        } else if (result.status === "loading") {
          state.messages.push(result.body ? "POST JSON : actualisation\u2026" : "POST JSON en cours\u2026");
        } else if (result.status === "error") {
          state.messages.push((result.body ? "Derni\u00e8re r\u00e9ponse conserv\u00e9e \u00b7 " : "POST impossible \u00b7 ") + (result.error || "Erreur r\u00e9seau"));
        } else {
          state.messages.push("POST " + (result.statusCode || 200) + " \u2192 " + target);
        }
        break;
      }
      case "http-put-json": {
        const target = textValue(values.target, "reponseJson");
        const request = simulationHttpRequest("PUT", values, state.variables);
        const result = httpResults[request.key];
        state.variables[target] = result?.body ?? "";
        if (!request.url) {
          state.messages.push("PUT JSON : URL manquante");
        } else if (!result) {
          state.messages.push("PUT JSON : lance la simulation");
        } else if (result.status === "loading") {
          state.messages.push(result.body ? "PUT JSON : actualisation\u2026" : "PUT JSON en cours\u2026");
        } else if (result.status === "error") {
          state.messages.push((result.body ? "Derni\u00e8re r\u00e9ponse conserv\u00e9e \u00b7 " : "PUT impossible \u00b7 ") + (result.error || "Erreur r\u00e9seau"));
        } else {
          state.messages.push("PUT " + (result.statusCode || 200) + " \u2192 " + target);
        }
        break;
      }
      case "http-patch-json": {
        const target = textValue(values.target, "reponseJson");
        const request = simulationHttpRequest("PATCH", values, state.variables);
        const result = httpResults[request.key];
        state.variables[target] = result?.body ?? "";
        if (!request.url) {
          state.messages.push("PATCH JSON : URL manquante");
        } else if (!result) {
          state.messages.push("PATCH JSON : lance la simulation");
        } else if (result.status === "loading") {
          state.messages.push(result.body ? "PATCH JSON : actualisation\u2026" : "PATCH JSON en cours\u2026");
        } else if (result.status === "error") {
          state.messages.push((result.body ? "Derni\u00e8re r\u00e9ponse conserv\u00e9e \u00b7 " : "PATCH impossible \u00b7 ") + (result.error || "Erreur r\u00e9seau"));
        } else {
          state.messages.push("PATCH " + (result.statusCode || 200) + " \u2192 " + target);
        }
        break;
      }
      case "http-delete-json": {
        const target = textValue(values.target, "reponseJson");
        const request = simulationHttpRequest("DELETE", values, state.variables);
        const result = httpResults[request.key];
        state.variables[target] = result?.body ?? "";
        if (!request.url) {
          state.messages.push("DELETE JSON : URL manquante");
        } else if (!result) {
          state.messages.push("DELETE JSON : lance la simulation");
        } else if (result.status === "loading") {
          state.messages.push(result.body ? "DELETE JSON : actualisation\u2026" : "DELETE JSON en cours\u2026");
        } else if (result.status === "error") {
          state.messages.push((result.body ? "Derni\u00e8re r\u00e9ponse conserv\u00e9e \u00b7 " : "DELETE impossible \u00b7 ") + (result.error || "Erreur r\u00e9seau"));
        } else {
          state.messages.push("DELETE " + (result.statusCode || 200) + " \u2192 " + target);
        }
        break;
      }
      case "json-read-text": {
        const source = String(state.variables[textValue(values.source, "reponseJson")] ?? "");
        const result = previewJsonPath(source, textValue(values.path, ""));
        const target = textValue(values.target, "texte");
        state.variables[target] = result.found ? previewJsonText(result.value) : "";
        state.messages.push(result.found ? "JSON texte → " + target : "Clé JSON introuvable");
        break;
      }
      case "json-read-number": {
        const source = String(state.variables[textValue(values.source, "reponseJson")] ?? "");
        const result = previewJsonPath(source, textValue(values.path, ""));
        const target = textValue(values.target, "maVariable");
        const numericValue = Number(result.value);
        state.variables[target] = result.found && Number.isFinite(numericValue) ? Math.trunc(numericValue) : 0;
        state.messages.push(result.found && Number.isFinite(numericValue) ? "JSON nombre → " + target : "Nombre JSON introuvable");
        break;
      }
      case "json-if-has": {
        const source = String(state.variables[textValue(values.source, "reponseJson")] ?? "");
        if (previewJsonPath(source, textValue(values.path, "")).found) {
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, httpResults, depth + 1);
        }
        break;
      }
      case "graphic-mode":
        state.messages.push("Mode mosaïque");
        break;
      case "text-mode":
        state.messages.push("Mode texte");
        break;
      case "mosaic-cell":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 10), exprPreviewNumber(values.row, state.variables, 10));
        setPreviewCell(state, state.cursorColumn, state.cursorRow, "█");
        break;
      case "set-baud": {
        const baud = Number(textValue(values.baud, "1200"));
        state.baudRate = baudOptions.some((option) => Number(option.value) === baud) ? baud : 1200;
        state.messages.push("Débit : " + state.baudRate + " bauds");
        break;
      }
      case "detect-baud":
        state.baudRate = 1200;
        state.messages.push("Détection par ping : 1200 bauds (simulation)");
        break;
      case "reset-protocol":
        state.messages.push("Reset protocole envoyé");
        break;
      default:
        break;
    }
  });
}

function mosaicPreviewCharacter(element: SceneImageElement, cellX: number, cellY: number) {
  const bits = mosaicBits(element, cellX, cellY);
  const brailleMask = (bits[0] ? 1 : 0) | (bits[1] ? 8 : 0) | (bits[2] ? 2 : 0) | (bits[3] ? 16 : 0) | (bits[4] ? 4 : 0) | (bits[5] ? 32 : 0);
  return brailleMask === 0 ? " " : String.fromCharCode(0x2800 + brailleMask);
}

function applyScenePreview(state: PreviewState, elements: SceneElement[]) {
  elements.forEach((element) => {
    state.fg = state.colorEnabled ? previewColors[element.fg] : previewColors.White;
    if (element.kind === "text") {
      state.bg = state.colorEnabled ? previewColors[element.bg] : previewColors.Black;
      state.textSize = element.size;
      setCursor(state, element.x, element.y);
      writePreviewText(state, element.text);
      state.textSize = "Normal";
      return;
    }
    if (element.kind === "box") {
      for (let y = 0; y < element.height; y += 1) {
        for (let x = 0; x < element.width; x += 1) {
          const edge = x === 0 || y === 0 || x === element.width - 1 || y === element.height - 1;
          if (element.filled || edge) setPreviewCell(state, element.x + x, element.y + y, "█");
        }
      }
      return;
    }
    for (let y = 0; y < element.height; y += 1) {
      for (let x = 0; x < element.width; x += 1) {
        const character = mosaicPreviewCharacter(element, x, y);
        if (character !== " ") setPreviewCell(state, element.x + x, element.y + y, character);
      }
    }
  });
}

function simulatePreview(stacks: ScriptStack[], variables: VariableDef[], previewKey: string, simulationTick: number, simulatedKeys: string[], screenConfig: MinitelScreenConfig, screens: MinitelScene[], httpResults: Record<string, SimulationHttpState>) {
  const state = createPreviewState(variables, screenConfig);
  const setupStacks = stacks.filter((stack) => stack.event.definitionId === "event-setup");
  const loopStacks = stacks.filter((stack) => stack.event.definitionId === "event-loop");
  const keyStacks = stacks.filter((stack) => stack.event.definitionId === "event-key-any" || stack.event.definitionId === "event-key-char");
  const loopCount = Math.max(1, Math.min(12, simulationTick + 1));

  setupStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey, screens, httpResults));
  for (let turn = 0; turn < loopCount; turn += 1) {
    loopStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey, screens, httpResults));
  }

  simulatedKeys.slice(-12).forEach((key) => {
    state.messages.push("Touche " + minitelKeyLabel(key));
    keyStacks
      .filter((stack) => stack.event.definitionId === "event-key-any" || previewKeyMatches(stack.event.values.key, key))
      .forEach((stack) => applyBlocksPreview(state, stack.blocks, key, screens, httpResults));
  });

  state.messages.push("Tour " + loopCount);
  return state;
}

function findBlock(blocks: ProgramBlock[], blockId: string): ProgramBlock | undefined {
  for (const block of blocks) {
    if (block.id === blockId) return block;
    const child = findBlock(block.children ?? [], blockId) ?? findBlock(block.elseChildren ?? [], blockId);
    if (child) return child;
  }
  return undefined;
}

type BlockLocationInfo = {
  ownerId?: string;
  slot: DropLocation["slot"];
  index: number;
};

function findBlockLocation(blocks: ProgramBlock[], blockId: string, ownerId?: string, slot: DropLocation["slot"] = "root"): BlockLocationInfo | null {
  const directIndex = blocks.findIndex((block) => block.id === blockId);
  if (directIndex >= 0) return { ownerId, slot, index: directIndex };
  for (const block of blocks) {
    const child = findBlockLocation(block.children ?? [], blockId, block.id, "children");
    if (child) return child;
    const alternative = findBlockLocation(block.elseChildren ?? [], blockId, block.id, "elseChildren");
    if (alternative) return alternative;
  }
  return null;
}

function updateBlockTree(blocks: ProgramBlock[], blockId: string, updater: (block: ProgramBlock) => ProgramBlock): ProgramBlock[] {
  return blocks.map((block) => {
    if (block.id === blockId) {
      return updater(block);
    }
    return {
      ...block,
      children: block.children ? updateBlockTree(block.children, blockId, updater) : block.children,
      elseChildren: block.elseChildren ? updateBlockTree(block.elseChildren, blockId, updater) : block.elseChildren,
    };
  });
}

function removeBlockTree(blocks: ProgramBlock[], blockId: string): ProgramBlock[] {
  return blocks
    .filter((block) => block.id !== blockId)
    .map((block) => ({ ...block, children: block.children ? removeBlockTree(block.children, blockId) : block.children, elseChildren: block.elseChildren ? removeBlockTree(block.elseChildren, blockId) : block.elseChildren }));
}

function extractBranchFromList(blocks: ProgramBlock[], blockId: string): { blocks: ProgramBlock[]; branch: ProgramBlock[] | null } {
  const directIndex = blocks.findIndex((block) => block.id === blockId);
  if (directIndex >= 0) {
    return { blocks: blocks.slice(0, directIndex), branch: blocks.slice(directIndex) };
  }

  let found: ProgramBlock[] | null = null;
  const next = blocks.map((block) => {
    if (found) return block;
    if (block.children) {
      const extracted = extractBranchFromList(block.children, blockId);
      if (extracted.branch) {
        found = extracted.branch;
        return { ...block, children: extracted.blocks };
      }
    }
    if (block.elseChildren) {
      const extracted = extractBranchFromList(block.elseChildren, blockId);
      if (extracted.branch) {
        found = extracted.branch;
        return { ...block, elseChildren: extracted.blocks };
      }
    }
    return block;
  });
  return { blocks: next, branch: found };
}

function insertBranchInList(blocks: ProgramBlock[], location: DropLocation, branch: ProgramBlock[]): ProgramBlock[] {
  if (location.slot === "root" && !location.ownerId) {
    const index = clamp(location.index, 0, blocks.length);
    return [...blocks.slice(0, index), ...branch, ...blocks.slice(index)];
  }

  return blocks.map((block) => {
    if (block.id === location.ownerId) {
      const current = location.slot === "elseChildren" ? block.elseChildren ?? [] : block.children ?? [];
      const index = clamp(location.index, 0, current.length);
      const next = [...current.slice(0, index), ...branch, ...current.slice(index)];
      return location.slot === "elseChildren" ? { ...block, elseChildren: next } : { ...block, children: next };
    }
    return {
      ...block,
      children: block.children ? insertBranchInList(block.children, location, branch) : block.children,
      elseChildren: block.elseChildren ? insertBranchInList(block.elseChildren, location, branch) : block.elseChildren,
    };
  });
}

function readDragPayload(event: DragEvent) {
  const raw = event.dataTransfer.getData(DRAG_TYPE);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DragPayload;
  } catch {
    return null;
  }
}

function dropLocationKey(location: DropLocation) {
  return [location.stackId, location.ownerId ?? "root", location.slot, String(location.index)].join("|");
}

function expressionDropLocationKey(location: ExpressionDropLocation) {
  const ownerKey = location.owner === "block"
    ? ["block", location.stackId, location.blockId, location.inputKey]
    : location.owner === "event"
      ? ["event", location.stackId, location.inputKey]
      : ["variable", location.variableId];
  const targetKey = location.queryTarget
    ? ["query", location.queryTarget.index, location.queryTarget.field]
    : [location.path.join(".") || "root"];
  return [...ownerKey, location.accepts, ...targetKey].join("|");
}

function numberExpression(value: InputValue | undefined): Expr {
  if (isExpr(value) && value.valueType === "number") return value;
  const numericValue = typeof value === "number" || typeof value === "string" ? Number(value) : 0;
  return num(Number.isFinite(numericValue) ? numericValue : 0);
}

type BooleanExpression = LiteralExpr | CompareExpr | LogicalExpr | NotExpr;

function booleanExpression(value: InputValue | undefined, variables: VariableDef[]): BooleanExpression {
  if (isExpr(value) && value.valueType === "boolean") return value as BooleanExpression;
  const firstNumberVariable = variables.find((variable) => variableValueType(variable) === "number");
  return compareExpr(variableExpr(firstNumberVariable?.name ?? "maVariable"), ">", num(0)) as CompareExpr;
}

function replaceExprAtPath(root: Expr, path: ExpressionPathPart[], replacement: Expr): Expr {
  if (path.length === 0) return cloneValue(replacement);
  const [part, ...rest] = path;
  if (root.kind === "binary" || root.kind === "compare" || root.kind === "logical") {
    if (part === "left") return { ...root, left: replaceExprAtPath(root.left, rest, replacement) };
    if (part === "right") return { ...root, right: replaceExprAtPath(root.right, rest, replacement) };
    return root;
  }
  if (root.kind === "random") {
    if (part === "from") return { ...root, from: replaceExprAtPath(root.from, rest, replacement) };
    if (part === "to") return { ...root, to: replaceExprAtPath(root.to, rest, replacement) };
    return root;
  }
  if (root.kind === "not" && part === "operand") {
    return { ...root, operand: replaceExprAtPath(root.operand, rest, replacement) };
  }
  return root;
}

function setInvisibleDragImage(event: DragEvent<HTMLElement>) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  event.dataTransfer.setDragImage(canvas, 0, 0);
}

function dragShapeForDefinition(definition: BlockDefinition): DragPreviewState["shape"] {
  if (definition.kind === "event") return "event-hat";
  if (definition.kind === "control") return "c-block";
  if (definition.kind === "value") return definition.output?.valueType === "boolean" ? "condition-block" : "value-block";
  return "brick";
}

function duplicateBlockInList(blocks: ProgramBlock[], blockId: string): { blocks: ProgramBlock[]; done: boolean; duplicateIds: string[] } {
  const directIndex = blocks.findIndex((block) => block.id === blockId);
  if (directIndex >= 0) {
    const duplicate = cloneBlock(blocks[directIndex]);
    const next = [...blocks];
    next.splice(directIndex + 1, 0, duplicate);
    return { blocks: next, done: true, duplicateIds: collectBlockIds([duplicate]) };
  }

  let done = false;
  let duplicateIds: string[] = [];
  const next = blocks.map((block) => {
    if (done) return block;
    if (block.children) {
      const childResult = duplicateBlockInList(block.children, blockId);
      if (childResult.done) {
        done = true;
        duplicateIds = childResult.duplicateIds;
        return { ...block, children: childResult.blocks };
      }
    }
    if (block.elseChildren) {
      const elseResult = duplicateBlockInList(block.elseChildren, blockId);
      if (elseResult.done) {
        done = true;
        duplicateIds = elseResult.duplicateIds;
        return { ...block, elseChildren: elseResult.blocks };
      }
    }
    return block;
  });

  return { blocks: next, done, duplicateIds };
}

type NumberExpressionMode = "literal" | "variable" | "binary" | "random";

function ExpressionKindSwitch({
  mode,
  onChange,
}: {
  mode: NumberExpressionMode;
  onChange: (mode: NumberExpressionMode) => void;
}) {
  const labels: Record<NumberExpressionMode, string> = {
    literal: "Nombre",
    variable: "Variable",
    binary: "Calcul",
    random: "Aléatoire",
  };

  return (
    <span className={"expression-kind-switch is-" + mode} title={"Changer le type : " + labels[mode]}>
      <ChevronDown size={11} aria-hidden="true" />
      <select className="expression-kind-select" value={mode} aria-label="Type de valeur" onChange={(event) => onChange(event.target.value as NumberExpressionMode)}>
        <option value="literal">Nombre</option>
        <option value="variable">Variable</option>
        <option value="binary">Calcul</option>
        <option value="random">Aléatoire</option>
      </select>
    </span>
  );
}

function ExpressionOperatorSwitch({
  value,
  label,
  options,
  onChange,
}: {
  value: string;
  label: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}) {
  return (
    <span className="expression-operator-switch" title={label}>
      <strong className="expression-operator-symbol" aria-hidden="true">{expressionOperatorGlyph(value as BinaryExpr["op"] | CompareExpr["op"] | LogicalExpr["op"])}</strong>
      <ChevronDown size={10} aria-hidden="true" />
      <select value={value} aria-label={label} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      </select>
    </span>
  );
}

function NumberExpressionNode({
  value,
  variables,
  onChange,
  dropLocation,
}: {
  value: Expr;
  variables: VariableDef[];
  onChange: (value: Expr) => void;
  dropLocation?: ExpressionDropLocation;
}) {
  const expr = numberExpression(value);
  const numberVariables = variables.filter((variable) => variableValueType(variable) === "number");
  const mode: NumberExpressionMode = expr.kind === "binary"
    ? "binary"
    : expr.kind === "random"
      ? "random"
      : expr.kind === "variable"
        ? "variable"
        : "literal";
  const dropKey = dropLocation ? expressionDropLocationKey(dropLocation) : undefined;
  const childLocation = (part: ExpressionPathPart): ExpressionDropLocation | undefined => (
    dropLocation ? { ...dropLocation, path: [...dropLocation.path, part], accepts: "number" } : undefined
  );

  const changeMode = (nextMode: NumberExpressionMode) => {
    if (nextMode === "variable") {
      onChange(numberVariables.length > 0 ? variableExpr(numberVariables[0].name) : num(0));
    } else if (nextMode === "binary") {
      onChange(binaryExpr("+", cloneValue(expr), num(0)));
    } else if (nextMode === "random") {
      onChange(randomExpr(num(1), num(10)));
    } else {
      onChange(num(expr.kind === "literal" && expr.valueType === "number" ? Number(expr.value) || 0 : 0));
    }
  };

  return (
    <span
      className={"number-expression-node expression-" + mode}
      data-expression-drop={dropLocation ? JSON.stringify(dropLocation) : undefined}
      data-expression-drop-key={dropKey}
      data-expression-accepts={dropLocation?.accepts}
    >
      {mode === "binary" && expr.kind === "binary" ? (
        <>
          <span className="binary-expression-tree">
            <NumberExpressionNode value={expr.left} variables={variables} dropLocation={childLocation("left")} onChange={(next) => onChange({ ...expr, left: next })} />
            <ExpressionOperatorSwitch
              value={expr.op}
              label="Choisir l'opération"
              options={[
                { value: "+", label: "+" },
                { value: "-", label: "−" },
                { value: "*", label: "×" },
                { value: "/", label: "÷" },
                { value: "%", label: "%" },
              ]}
              onChange={(next) => onChange({ ...expr, op: next as BinaryExpr["op"] })}
            />
            <NumberExpressionNode value={expr.right} variables={variables} dropLocation={childLocation("right")} onChange={(next) => onChange({ ...expr, right: next })} />
          </span>
          <ExpressionKindSwitch mode={mode} onChange={changeMode} />
        </>
      ) : mode === "random" && expr.kind === "random" ? (
        <>
          <span className="random-expression-tree">
            <strong className="random-expression-label">aléatoire</strong>
            <NumberExpressionNode value={expr.from} variables={variables} dropLocation={childLocation("from")} onChange={(next) => onChange({ ...expr, from: next })} />
            <span className="random-expression-separator">à</span>
            <NumberExpressionNode value={expr.to} variables={variables} dropLocation={childLocation("to")} onChange={(next) => onChange({ ...expr, to: next })} />
          </span>
          <ExpressionKindSwitch mode={mode} onChange={changeMode} />
        </>
      ) : (
        <>
          {mode === "variable" && expr.kind === "variable" ? (
            <select className="expression-variable-select" value={numberVariables.some((variable) => variable.name === expr.name) ? expr.name : numberVariables[0]?.name ?? ""} aria-label="Variable Nombre" onChange={(event) => onChange({ ...expr, name: event.target.value })} disabled={numberVariables.length === 0}>
              {numberVariables.length === 0 ? <option value="">Aucune variable Nombre</option> : null}
              {numberVariables.map((variable) => <option value={variable.name} key={variable.id}>{variable.name}</option>)}
            </select>
          ) : null}

          {mode === "literal" ? (
            <input
              type="number"
              inputMode="decimal"
              aria-label="Nombre"
              value={String(expr.kind === "literal" && expr.valueType === "number" ? expr.value : 0)}
              onChange={(event) => onChange(num(Number(event.target.value)))}
            />
          ) : null}

          <ExpressionKindSwitch mode={mode} onChange={changeMode} />
        </>
      )}
    </span>
  );
}

function NumberExpressionEditor({
  value,
  variables,
  onChange,
  expressionOwner,
}: {
  value: InputValue | undefined;
  variables: VariableDef[];
  onChange: (value: Expr) => void;
  expressionOwner?: ExpressionDropOwner;
}) {
  const expr = numberExpression(value);
  const dropLocation: ExpressionDropLocation | undefined = expressionOwner
    ? { ...expressionOwner, path: [], accepts: "number" }
    : undefined;
  return (
    <span className="expression-pill number-expression">
      <NumberExpressionNode value={expr} variables={variables} onChange={onChange} dropLocation={dropLocation} />
    </span>
  );
}

function BooleanExpressionNode({
  value,
  variables,
  onChange,
  dropLocation,
}: {
  value: Expr;
  variables: VariableDef[];
  onChange: (value: Expr) => void;
  dropLocation?: ExpressionDropLocation;
}) {
  const expr = booleanExpression(value, variables);
  const dropKey = dropLocation ? expressionDropLocationKey(dropLocation) : undefined;
  const booleanLocation = (part: ExpressionPathPart): ExpressionDropLocation | undefined => (
    dropLocation ? { ...dropLocation, path: [...dropLocation.path, part], accepts: "boolean" } : undefined
  );
  const numberLocation = (part: ExpressionPathPart): ExpressionDropLocation | undefined => (
    dropLocation ? { ...dropLocation, path: [...dropLocation.path, part], accepts: "number" } : undefined
  );

  return (
    <span
      className={"condition-expression boolean-expression-node expression-" + expr.kind}
      data-expression-drop={dropLocation ? JSON.stringify(dropLocation) : undefined}
      data-expression-drop-key={dropKey}
      data-expression-accepts={dropLocation?.accepts}
    >
      {expr.kind === "compare" ? (
        <span className="comparison-expression-tree">
          <NumberExpressionNode value={expr.left} variables={variables} dropLocation={numberLocation("left")} onChange={(next) => onChange({ ...expr, left: next })} />
          <ExpressionOperatorSwitch
            value={expr.op}
            label="Choisir la comparaison"
            options={[
              { value: "==", label: "=" },
              { value: "!=", label: "≠" },
              { value: "<", label: "<" },
              { value: "<=", label: "≤" },
              { value: ">", label: ">" },
              { value: ">=", label: "≥" },
            ]}
            onChange={(next) => onChange({ ...expr, op: next as CompareExpr["op"] })}
          />
          <NumberExpressionNode value={expr.right} variables={variables} dropLocation={numberLocation("right")} onChange={(next) => onChange({ ...expr, right: next })} />
        </span>
      ) : expr.kind === "logical" ? (
        <span className="logical-expression-tree">
          <BooleanExpressionNode value={expr.left} variables={variables} dropLocation={booleanLocation("left")} onChange={(next) => onChange({ ...expr, left: next })} />
          <ExpressionOperatorSwitch
            value={expr.op}
            label="Choisir la logique"
            options={[
              { value: "&&", label: "et" },
              { value: "||", label: "ou" },
            ]}
            onChange={(next) => onChange({ ...expr, op: next as LogicalExpr["op"] })}
          />
          <BooleanExpressionNode value={expr.right} variables={variables} dropLocation={booleanLocation("right")} onChange={(next) => onChange({ ...expr, right: next })} />
        </span>
      ) : expr.kind === "not" ? (
        <span className="not-expression-tree">
          <strong className="condition-not-label">non</strong>
          <BooleanExpressionNode value={expr.operand} variables={variables} dropLocation={booleanLocation("operand")} onChange={(next) => onChange({ ...expr, operand: next })} />
        </span>
      ) : (
        <select className="condition-literal-select" value={Boolean(expr.value) ? "true" : "false"} aria-label="Valeur logique" onChange={(event) => onChange(boolExpr(event.target.value === "true"))}>
          <option value="true">vrai</option>
          <option value="false">faux</option>
        </select>
      )}
    </span>
  );
}

function BooleanExpressionEditor({
  value,
  variables,
  onChange,
  expressionOwner,
}: {
  value: InputValue | undefined;
  variables: VariableDef[];
  onChange: (value: Expr) => void;
  expressionOwner?: ExpressionDropOwner;
}) {
  const expr = booleanExpression(value, variables);
  const dropLocation: ExpressionDropLocation | undefined = expressionOwner
    ? { ...expressionOwner, path: [], accepts: "boolean" }
    : undefined;
  return (
    <span className="expression-pill boolean-expression">
      <BooleanExpressionNode value={expr} variables={variables} onChange={onChange} dropLocation={dropLocation} />
    </span>
  );
}

function SelectOptionList({ options }: { options: SelectOption[] }) {
  const ungroupedOptions = options.filter((option) => !option.group);
  const groups = options.reduce<Array<{ label: string; options: SelectOption[] }>>((result, option) => {
    if (!option.group) return result;
    const existingGroup = result.find((group) => group.label === option.group);
    if (existingGroup) existingGroup.options.push(option);
    else result.push({ label: option.group, options: [option] });
    return result;
  }, []);

  return (
    <>
      {ungroupedOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
      {groups.map((group) => (
        <optgroup label={group.label} key={group.label}>
          {group.options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}
        </optgroup>
      ))}
    </>
  );
}

type QueryParameterRow = QueryParameterEntry & {
  id: string;
};

function queryRowsFromValue(value: string): QueryParameterRow[] {
  const rows = queryEntriesFromValue(value).map((entry) => ({ ...entry, id: uid() }));
  return rows.length > 0 ? rows : [{ id: uid(), key: "", value: "" }];
}

function QueryParameterField({
  value,
  placeholder,
  ariaLabel,
  variables,
  dropLocation,
  onChange,
}: {
  value: string;
  placeholder: string;
  ariaLabel: string;
  variables: VariableDef[];
  dropLocation?: ExpressionDropLocation;
  onChange: (value: string) => void;
}) {
  const variableName = queryVariableName(value);
  const variable = variables.find((item) => item.name === variableName);
  const dropKey = dropLocation ? expressionDropLocationKey(dropLocation) : undefined;

  return (
    <div
      className={"query-parameter-field" + (variableName ? " has-variable" : "")}
      data-expression-drop={dropLocation ? JSON.stringify(dropLocation) : undefined}
      data-expression-drop-key={dropKey}
      data-expression-accepts={dropLocation?.accepts}
      title={variableName ? undefined : "Déposer une variable ici"}
    >
      {variableName ? (
        <span className={"query-variable-token is-" + (variable ? variableValueType(variable) : "text")} title={"Valeur de " + variableName}>
          <Variable size={13} aria-hidden="true" />
          <strong>{variableName}</strong>
          <button type="button" onClick={() => onChange("")} title="Retirer la variable" aria-label={"Retirer la variable " + variableName}>
            <X size={11} />
          </button>
        </span>
      ) : (
        <input type="text" value={value} placeholder={placeholder} aria-label={ariaLabel} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
      )}
    </div>
  );
}

function QueryParametersEditor({
  label,
  value,
  variables,
  expressionOwner,
  onChange,
}: {
  label: string;
  value: string;
  variables: VariableDef[];
  expressionOwner?: ExpressionDropOwner;
  onChange: (value: string) => void;
}) {
  const normalizedValue = normalizeQueryString(value);
  const [rows, setRows] = useState<QueryParameterRow[]>(() => queryRowsFromValue(normalizedValue));
  const lastEmittedValueRef = useRef(normalizedValue);

  useEffect(() => {
    if (normalizedValue === lastEmittedValueRef.current) return;
    lastEmittedValueRef.current = normalizedValue;
    setRows(queryRowsFromValue(normalizedValue));
  }, [normalizedValue]);

  const commit = (nextRows: QueryParameterRow[]) => {
    setRows(nextRows);
    const nextValue = queryValueFromEntries(nextRows);
    if (nextValue === lastEmittedValueRef.current) return;
    lastEmittedValueRef.current = nextValue;
    onChange(nextValue);
  };

  const updateRow = (rowId: string, field: "key" | "value", nextValue: string) => {
    commit(rows.map((row) => row.id === rowId ? { ...row, [field]: nextValue } : row));
  };

  const removeRow = (rowId: string) => {
    const nextRows = rows.filter((row) => row.id !== rowId);
    commit(nextRows.length > 0 ? nextRows : [{ id: uid(), key: "", value: "" }]);
  };

  const queryDropLocation = (index: number, field: "key" | "value"): ExpressionDropLocation | undefined => (
    expressionOwner
      ? { ...expressionOwner, path: [], accepts: "query", queryTarget: { index, field } }
      : undefined
  );

  return (
    <div className="query-parameters-control" onMouseDown={(event) => event.stopPropagation()} onPointerDown={(event) => event.stopPropagation()}>
      <div className="query-parameters-header">
        <span>{label}</span>
        <span className="query-variable-hint" title="Les clés et valeurs acceptent les variables">
          <Variable size={12} aria-hidden="true" />
        </span>
        <button type="button" onClick={() => setRows((current) => [...current, { id: uid(), key: "", value: "" }])} title="Ajouter un paramètre query" aria-label="Ajouter un paramètre query">
          <Plus size={14} />
        </button>
      </div>
      <div className="query-parameter-list">
        {rows.map((row, index) => (
          <div className="query-parameter-row" key={row.id}>
            <QueryParameterField
              value={row.key}
              placeholder="clé"
              ariaLabel={"Clé query " + (index + 1)}
              variables={variables}
              dropLocation={queryDropLocation(index, "key")}
              onChange={(nextValue) => updateRow(row.id, "key", nextValue)}
            />
            <span aria-hidden="true">=</span>
            <QueryParameterField
              value={row.value}
              placeholder="valeur"
              ariaLabel={"Valeur query " + (index + 1)}
              variables={variables}
              dropLocation={queryDropLocation(index, "value")}
              onChange={(nextValue) => updateRow(row.id, "value", nextValue)}
            />
            <button type="button" onClick={() => removeRow(row.id)} title="Supprimer ce paramètre query" aria-label={"Supprimer le paramètre query " + (index + 1)}>
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function InputControl({ input, value, variables, screens = [], expressionOwner, onChange }: { input: BlockInput; value: InputValue | undefined; variables: VariableDef[]; screens?: MinitelScene[]; expressionOwner?: ExpressionDropOwner; onChange: (value: InputValue) => void }) {
  const actualValue = value ?? input.defaultValue;
  const stopDrag = (event: MouseEvent) => event.stopPropagation();
  const options = input.options ?? [];

  if (input.type === "number") {
    return (
      <label className="block-control expression-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <NumberExpressionEditor value={actualValue} variables={variables} expressionOwner={expressionOwner} onChange={onChange} />
      </label>
    );
  }

  if (input.type === "condition") {
    return (
      <label className="block-control expression-control condition-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <BooleanExpressionEditor value={actualValue} variables={variables} expressionOwner={expressionOwner} onChange={onChange} />
      </label>
    );
  }

  if (input.type === "text") {
    return (
      <label className="block-control block-control-wide" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <input type={input.secret ? "password" : "text"} value={String(actualValue)} placeholder={input.placeholder} autoComplete="off" onChange={(event) => onChange(event.target.value)} />
      </label>
    );
  }

  if (input.type === "query") {
    return (
      <QueryParametersEditor
        label={input.label}
        value={String(actualValue)}
        variables={variables}
        expressionOwner={expressionOwner}
        onChange={onChange}
      />
    );
  }

  if (input.type === "boolean") {
    return (
      <label className="block-toggle" onMouseDown={stopDrag} title={input.label}>
        <input type="checkbox" checked={Boolean(actualValue)} onChange={(event) => onChange(event.target.checked)} />
        <span>{input.label}</span>
      </label>
    );
  }

  if (input.type === "variable") {
    const expectedType = input.variableType ?? "number";
    const compatibleVariables = expectedType === "any"
      ? variables
      : variables.filter((variable) => variableValueType(variable) === expectedType);
    const requestedName = String(actualValue);
    const selectedName = compatibleVariables.some((variable) => variable.name === requestedName)
      ? requestedName
      : compatibleVariables[0]?.name ?? "";
    const emptyLabel = expectedType === "text" ? "Crée une variable Texte" : "Crée une variable Nombre";
    return (
      <label className="block-control variable-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <select value={selectedName} onChange={(event) => onChange(event.target.value)} disabled={compatibleVariables.length === 0}>
          {compatibleVariables.length === 0 ? <option value="">{emptyLabel}</option> : null}
          {compatibleVariables.map((variable) => (
            <option value={variable.name} key={variable.id}>{variable.name}</option>
          ))}
        </select>
      </label>
    );
  }


  if (input.type === "screen") {
    const requestedId = String(actualValue);
    const selectedScreenId = screens.some((screen) => screen.id === requestedId) ? requestedId : screens[0]?.id ?? "";
    return (
      <label className="block-control screen-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <select value={selectedScreenId} onChange={(event) => onChange(event.target.value)}>
          {screens.map((screen) => (
            <option value={screen.id} key={screen.id}>{screen.name.trim() || "Écran sans nom"}</option>
          ))}
        </select>
      </label>
    );
  }

  if (input.type === "color") {
    const colorName = String(actualValue);
    return (
      <label className="block-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <span className="color-swatch" style={{ backgroundColor: previewColors[colorName] ?? "#ffffff" }} />
        <select value={colorName} onChange={(event) => onChange(event.target.value)}>
          {options.map((option) => (
            <option value={option.value} key={option.value}>{option.label}</option>
          ))}
        </select>
      </label>
    );
  }

  return (
    <label className="block-control" onMouseDown={stopDrag}>
      <span>{input.label}</span>
      <select value={String(actualValue)} onChange={(event) => onChange(event.target.value)}>
        <SelectOptionList options={options} />
      </select>
    </label>
  );
}

function PaletteExpressionPreview({ expression }: { expression: Expr }) {
  if (expression.kind === "binary" || expression.kind === "compare") {
    return (
      <span className={"palette-expression-preview " + (expression.kind === "compare" ? "is-condition" : "is-binary")} aria-hidden="true">
        <span className="palette-expression-operand">{expressionLabel(expression.left)}</span>
        <strong className="palette-expression-symbol">{expressionOperatorGlyph(expression.op)}</strong>
        <span className="palette-expression-operand">{expressionLabel(expression.right)}</span>
      </span>
    );
  }
  if (expression.kind === "random") {
    return (
      <span className="palette-expression-preview is-random" aria-hidden="true">
        <strong className="palette-expression-word">aléatoire</strong>
        <span className="palette-expression-operand">{expressionLabel(expression.from)}</span>
        <strong className="palette-expression-word">à</strong>
        <span className="palette-expression-operand">{expressionLabel(expression.to)}</span>
      </span>
    );
  }
  if (expression.kind === "logical") {
    return (
      <span className="palette-expression-preview is-condition is-logical" aria-hidden="true">
        <span className="palette-condition-operand" />
        <strong className="palette-expression-word">{expressionOperatorGlyph(expression.op)}</strong>
        <span className="palette-condition-operand" />
      </span>
    );
  }
  if (expression.kind === "not") {
    return (
      <span className="palette-expression-preview is-condition is-not" aria-hidden="true">
        <strong className="palette-expression-word">non</strong>
        <span className="palette-condition-operand" />
      </span>
    );
  }
  return <span className="palette-expression-preview">{expressionLabel(expression)}</span>;
}

function PaletteBlock({
  definition,
  isDragging,
  onQuickAdd,
  onPaletteDragStart,
  onPalettePointerDown,
  onDragMove,
  onDragEnd,
}: {
  definition: BlockDefinition;
  isDragging: boolean;
  onQuickAdd: (definition: BlockDefinition) => void;
  onPaletteDragStart: (definition: BlockDefinition, event: DragEvent<HTMLElement>) => void;
  onPalettePointerDown: (definition: BlockDefinition, event: PointerEvent<HTMLElement>) => void;
  onDragMove: (event: { clientX: number; clientY: number }) => void;
  onDragEnd: () => void;
}) {
  const style = { "--block-color": definition.color } as BlockStyle;
  const shape = definition.kind === "event"
    ? "event-hat"
    : definition.kind === "control"
      ? "palette-c-block"
      : definition.kind === "value"
        ? definition.output?.valueType === "boolean" ? "condition-value-block" : "value-block"
        : "brick";
  const expressionPreview = definition.output ?? null;
  return (
    <button
      className={"palette-block " + shape + (definition.inputs?.length ? " has-inputs" : "") + (isDragging ? " dragging" : "")}
      style={style}
      draggable={false}
      onPointerDown={(event) => onPalettePointerDown(definition, event)}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ source: "palette", definitionId: definition.id }));
        event.dataTransfer.effectAllowed = "copy";
        onPaletteDragStart(definition, event);
      }}
      onDrag={onDragMove}
      onDragEnd={onDragEnd}
      onClick={() => onQuickAdd(definition)}
      title={definition.help}
      aria-label={definition.title}
    >
      {expressionPreview ? <PaletteExpressionPreview expression={expressionPreview} /> : <span className="palette-block-title">{definition.title}</span>}
      {definition.inputs?.length ? (
        <span className="palette-block-inputs">
          {definition.inputs.slice(0, 2).map((input) => (
            <span className="palette-input-preview" key={input.key}>{input.type === "screen" ? "écran" : input.secret ? "••••••" : input.placeholder || expressionLabel(input.defaultValue)}</span>
          ))}
        </span>
      ) : null}
    </button>
  );
}

function DropTarget({
  location,
  isActive,
  onDropBranch,
  onActivateDrop,
  onDragMove,
}: {
  location: DropLocation;
  isActive: boolean;
  onDropBranch: (payload: DragPayload, location: DropLocation) => void;
  onActivateDrop: (location: DropLocation) => void;
  onDragMove: (event: { clientX: number; clientY: number }) => void;
}) {
  return (
    <div
      className={"drop-target" + (isActive ? " active" : "")}
      data-drop-location={JSON.stringify(location)}
      onDragEnter={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onActivateDrop(location);
      }}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        onDragMove(event);
        onActivateDrop(location);
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const payload = readDragPayload(event);
        if (payload) onDropBranch(payload, location);
      }}
    >
      <span />
    </div>
  );
}

function BlockListView({
  blocks,
  stackId,
  ownerId,
  slot,
  variables,
  screens,
  removingIds,
  motionIds,
  draggingBlockId,
  activeDropKey,
  onDropBranch,
  onValueChange,
  onDelete,
  onDuplicate,
  onMove,
  onDragStartBlock,
  onBlockPointerDown,
  onDragMove,
  onActivateDrop,
  onDragEndBlock,
}: {
  blocks: ProgramBlock[];
  stackId: string;
  ownerId?: string;
  slot: DropLocation["slot"];
  variables: VariableDef[];
  screens: MinitelScene[];
  removingIds: Set<string>;
  motionIds: Record<string, MotionKind>;
  draggingBlockId: string;
  activeDropKey: string;
  onDropBranch: (payload: DragPayload, location: DropLocation) => void;
  onValueChange: (stackId: string, blockId: string, key: string, value: InputValue) => void;
  onDelete: (stackId: string, blockId: string) => void;
  onDuplicate: (stackId: string, blockId: string) => void;
  onMove: (stackId: string, blockId: string, direction: -1 | 1) => void;
  onDragStartBlock: (block: ProgramBlock, definition: BlockDefinition, event: DragEvent<HTMLElement>) => void;
  onBlockPointerDown: (block: ProgramBlock, definition: BlockDefinition, event: PointerEvent<HTMLElement>) => void;
  onDragMove: (event: { clientX: number; clientY: number }) => void;
  onActivateDrop: (location: DropLocation) => void;
  onDragEndBlock: () => void;
}) {
  return (
    <div className={slot === "root" ? "stack-chain" : "inner-chain"}>
      {blocks.map((block, index) => (
        <div className="block-list-item" key={block.id}>
          <DropTarget location={{ stackId, ownerId, slot, index }} isActive={activeDropKey === dropLocationKey({ stackId, ownerId, slot, index })} onDropBranch={onDropBranch} onActivateDrop={onActivateDrop} onDragMove={onDragMove} />
          <ProgramBlockView
            block={block}
            stackId={stackId}
            ownerId={ownerId}
            slot={slot}
            index={index}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            variables={variables}
            screens={screens}
            removingIds={removingIds}
            motionIds={motionIds}
            draggingBlockId={draggingBlockId}
            activeDropKey={activeDropKey}
            onDropBranch={onDropBranch}
            onValueChange={onValueChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMove={onMove}
            onDragStartBlock={onDragStartBlock}
            onBlockPointerDown={onBlockPointerDown}
            onDragMove={onDragMove}
            onActivateDrop={onActivateDrop}
            onDragEndBlock={onDragEndBlock}
          />
        </div>
      ))}
      <DropTarget location={{ stackId, ownerId, slot, index: blocks.length }} isActive={activeDropKey === dropLocationKey({ stackId, ownerId, slot, index: blocks.length })} onDropBranch={onDropBranch} onActivateDrop={onActivateDrop} onDragMove={onDragMove} />
    </div>
  );
}

function ProgramBlockView({
  block,
  stackId,
  ownerId,
  slot,
  index,
  isFirst,
  isLast,
  variables,
  screens,
  removingIds,
  motionIds,
  draggingBlockId,
  activeDropKey,
  onDropBranch,
  onValueChange,
  onDelete,
  onDuplicate,
  onMove,
  onDragStartBlock,
  onBlockPointerDown,
  onDragMove,
  onActivateDrop,
  onDragEndBlock,
}: {
  block: ProgramBlock;
  stackId: string;
  ownerId?: string;
  slot: DropLocation["slot"];
  index: number;
  isFirst: boolean;
  isLast: boolean;
  variables: VariableDef[];
  screens: MinitelScene[];
  removingIds: Set<string>;
  motionIds: Record<string, MotionKind>;
  draggingBlockId: string;
  activeDropKey: string;
  onDropBranch: (payload: DragPayload, location: DropLocation) => void;
  onValueChange: (stackId: string, blockId: string, key: string, value: InputValue) => void;
  onDelete: (stackId: string, blockId: string) => void;
  onDuplicate: (stackId: string, blockId: string) => void;
  onMove: (stackId: string, blockId: string, direction: -1 | 1) => void;
  onDragStartBlock: (block: ProgramBlock, definition: BlockDefinition, event: DragEvent<HTMLElement>) => void;
  onBlockPointerDown: (block: ProgramBlock, definition: BlockDefinition, event: PointerEvent<HTMLElement>) => void;
  onDragMove: (event: { clientX: number; clientY: number }) => void;
  onActivateDrop: (location: DropLocation) => void;
  onDragEndBlock: () => void;
}) {
  const definition = blockById[block.definitionId];
  const style = { "--block-color": definition.color } as BlockStyle;
  const isControl = definition.kind === "control";
  const [dropHint, setDropHint] = useState<"before" | "after" | null>(null);
  const activeBeforeKey = dropLocationKey({ stackId, ownerId, slot, index });
  const activeAfterKey = dropLocationKey({ stackId, ownerId, slot, index: index + 1 });
  const activeHint = activeDropKey === activeBeforeKey ? "before" : activeDropKey === activeAfterKey ? "after" : null;
  const motionClass = motionIds[block.id] ? " " + motionIds[block.id] : "";
  const hintClass = (dropHint ?? activeHint) ? " drop-" + (dropHint ?? activeHint) : "";
  const className = "program-block " + (isControl ? "c-block" : "brick") + " stack-snap" + motionClass + hintClass + (draggingBlockId === block.id ? " dragging" : "") + (removingIds.has(block.id) ? " deleting" : "");

  function blockDropLocation(event: DragEvent<HTMLElement>): DropLocation {
    const rect = event.currentTarget.getBoundingClientRect();
    const position = event.clientY < rect.top + rect.height / 2 ? "before" : "after";
    return { stackId, ownerId, slot, index: index + (position === "after" ? 1 : 0) };
  }

  function updateBlockDropHint(event: DragEvent<HTMLElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    setDropHint(event.clientY < rect.top + rect.height / 2 ? "before" : "after");
  }

  return (
    <div
      className={className}
      style={style}
      draggable={false}
      data-block-drop="true"
      data-stack-id={stackId}
      data-owner-id={ownerId ?? ""}
      data-slot={slot}
      data-index={index}
      onPointerDown={(event) => onBlockPointerDown(block, definition, event)}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ source: "workspace", stackId, blockId: block.id }));
        event.dataTransfer.effectAllowed = "move";
        onDragStartBlock(block, definition, event);
      }}
      onDrag={(event) => onDragMove(event)}
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        onDragMove(event);
        updateBlockDropHint(event);
        onActivateDrop(blockDropLocation(event));
      }}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropHint(null);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        event.stopPropagation();
        const payload = readDragPayload(event);
        const location = blockDropLocation(event);
        setDropHint(null);
        if (payload) onDropBranch(payload, location);
      }}
      onDragEnd={() => {
        setDropHint(null);
        onDragEndBlock();
      }}
      title={definition.help}
    >
      <div className="block-face">
        <GripVertical className="drag-grip" size={18} aria-hidden="true" />
        <div className="program-block-main">
          <span className="block-title">{definition.title}</span>
          {definition.inputs && definition.inputs.length > 0 ? (
            <div className="block-inputs">
              {definition.inputs.map((input) => (
                <InputControl key={input.key} input={input} variables={variables} screens={screens} value={block.values[input.key]} expressionOwner={{ owner: "block", stackId, blockId: block.id, inputKey: input.key }} onChange={(value) => onValueChange(stackId, block.id, input.key, value)} />
              ))}
            </div>
          ) : null}
        </div>
        <div className="block-actions" onMouseDown={(event) => event.stopPropagation()}>
          <button type="button" onClick={() => onMove(stackId, block.id, -1)} disabled={isFirst} title="Monter">
            <ChevronUp size={15} />
          </button>
          <button type="button" onClick={() => onMove(stackId, block.id, 1)} disabled={isLast} title="Descendre">
            <ChevronDown size={15} />
          </button>
          <button type="button" onClick={() => onDuplicate(stackId, block.id)} title="Dupliquer">
            <Copy size={15} />
          </button>
          <button type="button" onClick={() => onDelete(stackId, block.id)} title="Supprimer">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {definition.slots?.map((slotDefinition) => (
        <div className="c-slot" key={slotDefinition.key}>
          <div className="slot-label">{slotDefinition.label}</div>
          <BlockListView
            blocks={(slotDefinition.key === "elseChildren" ? block.elseChildren : block.children) ?? []}
            stackId={stackId}
            ownerId={block.id}
            slot={slotDefinition.key}
            variables={variables}
            screens={screens}
            removingIds={removingIds}
            motionIds={motionIds}
            draggingBlockId={draggingBlockId}
            activeDropKey={activeDropKey}
            onDropBranch={onDropBranch}
            onValueChange={onValueChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMove={onMove}
            onDragStartBlock={onDragStartBlock}
            onBlockPointerDown={onBlockPointerDown}
            onDragMove={onDragMove}
            onActivateDrop={onActivateDrop}
            onDragEndBlock={onDragEndBlock}
          />
        </div>
      ))}
    </div>
  );
}

function EventHeader({ stack, variables, onEventValueChange, onDeleteStack, onStackPointerDown }: { stack: ScriptStack; variables: VariableDef[]; onEventValueChange: (stackId: string, key: string, value: InputValue) => void; onDeleteStack: (stackId: string) => void; onStackPointerDown: (stack: ScriptStack, event: PointerEvent<HTMLElement>) => void }) {
  const definition = blockById[stack.event.definitionId];
  const style = { "--block-color": definition.color } as BlockStyle;
  return (
    <div
      className="program-block event-hat event-header"
      style={style}
      title={definition.help}
      onPointerDown={(event) => onStackPointerDown(stack, event)}
      draggable={false}
      onDragStart={(event) => {
        event.stopPropagation();
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ source: "stack", stackId: stack.id }));
        event.dataTransfer.effectAllowed = "move";
      }}
    >
      <MousePointer2 size={18} aria-hidden="true" />
      <div className="program-block-main">
        <span className="block-title">{definition.title}</span>
        {definition.inputs && definition.inputs.length > 0 ? (
          <div className="block-inputs">
            {definition.inputs.map((input) => (
              <InputControl key={input.key} input={input} variables={variables} value={stack.event.values[input.key]} expressionOwner={{ owner: "event", stackId: stack.id, inputKey: input.key }} onChange={(value) => onEventValueChange(stack.id, input.key, value)} />
            ))}
          </div>
        ) : null}
      </div>
      <button type="button" className="delete-stack" onClick={() => onDeleteStack(stack.id)} title="Supprimer la pile">
        <Trash2 size={16} />
      </button>
    </div>
  );
}

function VariableManager({ variables, onAdd, onChange, onRemove }: { variables: VariableDef[]; onAdd: () => void; onChange: (id: string, patch: Partial<VariableDef>) => void; onRemove: (id: string) => void }) {
  return (
    <div className="variable-manager">
      <div className="variable-manager-head">
        <Variable size={16} />
        <span>Variables</span>
        <button type="button" onClick={onAdd} title="Ajouter une variable"><Plus size={15} /></button>
      </div>
      {variables.map((variable) => {
        const valueType = variableValueType(variable);
        const textDefault = variable.defaultValue.kind === "literal" ? String(variable.defaultValue.value ?? "") : "";
        return (
          <div className={"variable-card is-" + valueType} key={variable.id}>
            <div className="variable-card-heading">
              <input aria-label="Nom de la variable" value={variable.name} onChange={(event) => onChange(variable.id, { name: event.target.value })} />
              <select
                aria-label={"Type de " + variable.name}
                value={valueType}
                onChange={(event) => {
                  const nextType = event.target.value as VariableValueType;
                  onChange(variable.id, { valueType: nextType, defaultValue: nextType === "text" ? textExpr("") : num(0) });
                }}
              >
                <option value="number">Nombre</option>
                <option value="text">Texte</option>
              </select>
            </div>
            <div className="variable-default-value">
              <span className="variable-default-label">Départ</span>
              {valueType === "text" ? (
                <input className="variable-text-default" type="text" value={textDefault} placeholder="Texte vide" onChange={(event) => onChange(variable.id, { defaultValue: textExpr(event.target.value) })} />
              ) : (
                <NumberExpressionEditor value={variable.defaultValue} variables={variables} expressionOwner={{ owner: "variable", variableId: variable.id }} onChange={(value) => onChange(variable.id, { defaultValue: value })} />
              )}
            </div>
            <button type="button" onClick={() => onRemove(variable.id)} title="Supprimer"><Trash2 size={14} /></button>
          </div>
        );
      })}
    </div>
  );
}

type SettingsDialogProps = {
  open: boolean;
  theme: AppTheme;
  autoSaveEnabled: boolean;
  automaticUpdatesEnabled: boolean;
  testServer: TestServerStatus;
  onThemeChange: (theme: AppTheme) => void;
  onAutoSaveChange: (enabled: boolean) => void;
  onAutomaticUpdatesChange: (enabled: boolean) => void;
  onTestServerChange: (settings: { enabled: boolean; port: number }) => void;
  onClose: () => void;
};

function SettingsDialog({
  open,
  theme,
  autoSaveEnabled,
  automaticUpdatesEnabled,
  testServer,
  onThemeChange,
  onAutoSaveChange,
  onAutomaticUpdatesChange,
  onTestServerChange,
  onClose,
}: SettingsDialogProps) {
  const [portDraft, setPortDraft] = useState(String(testServer.port));

  useEffect(() => {
    if (open) setPortDraft(String(testServer.port));
  }, [open, testServer.port]);

  if (!open) return null;

  const commitPort = () => {
    const parsedPort = Math.trunc(Number(portDraft));
    const port = Number.isFinite(parsedPort) ? clamp(parsedPort, 1024, 65535) : testServer.port;
    setPortDraft(String(port));
    if (port !== testServer.port) onTestServerChange({ enabled: testServer.enabled, port });
  };
  const statusKind = !testServer.available
    ? "unavailable"
    : testServer.error
      ? "error"
      : testServer.running
        ? "online"
        : "idle";
  const statusTitle = !testServer.available
    ? "Application installée requise"
    : testServer.error
      ? "Impossible de démarrer"
      : testServer.running
        ? "En ligne"
        : testServer.enabled
          ? "Démarrage..."
          : "Arrêté";
  const statusDetail = testServer.error || (testServer.running ? testServer.baseUrl : "Port " + testServer.port);
  const copyUrl = (url: string) => {
    void navigator.clipboard?.writeText(url);
  };

  return (
    <div className="settings-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-labelledby="settings-title">
        <header className="settings-header">
          <div className="settings-icon"><Settings2 size={20} /></div>
          <div><span>Préférences</span><h2 id="settings-title">Paramètres</h2></div>
          <button type="button" className="settings-close" onClick={onClose} title="Fermer"><X size={18} /></button>
        </header>
        <div className="settings-body">
          <div className="settings-section-title"><Palette size={17} /><span>Apparence</span></div>
          <div className="settings-theme-control" role="group" aria-label="Thème de l'interface">
            <button type="button" className={theme === "light" ? "active" : ""} aria-pressed={theme === "light"} onClick={() => onThemeChange("light")}><Sun size={19} /><span>Clair</span></button>
            <button type="button" className={theme === "dark" ? "active" : ""} aria-pressed={theme === "dark"} onClick={() => onThemeChange("dark")}><Moon size={19} /><span>Sombre</span></button>
          </div>
          <div className="settings-section-title"><Save size={17} /><span>Sauvegarde</span></div>
          <button type="button" className="settings-toggle-row" role="switch" aria-checked={autoSaveEnabled} onClick={() => onAutoSaveChange(!autoSaveEnabled)}>
            <span className="settings-toggle-copy"><strong>Sauvegarde automatique</strong><small>{autoSaveEnabled ? "Activée" : "Désactivée"}</small></span>
            <span className={"settings-switch" + (autoSaveEnabled ? " active" : "")} aria-hidden="true"><i /></span>
          </button>
          <div className="settings-section-title"><RefreshCw size={17} /><span>Mises à jour</span></div>
          <button type="button" className="settings-toggle-row" role="switch" aria-checked={automaticUpdatesEnabled} onClick={() => onAutomaticUpdatesChange(!automaticUpdatesEnabled)}>
            <span className="settings-toggle-copy"><strong>Mises à jour automatiques</strong><small>{automaticUpdatesEnabled ? "Activées" : "Désactivées"}</small></span>
            <span className={"settings-switch" + (automaticUpdatesEnabled ? " active" : "")} aria-hidden="true"><i /></span>
          </button>
          <div className="settings-section-title"><Server size={17} /><span>Serveur de test</span></div>
          <button type="button" className="settings-toggle-row" role="switch" aria-checked={testServer.enabled} disabled={!testServer.available} onClick={() => onTestServerChange({ enabled: !testServer.enabled, port: testServer.port })}>
            <span className="settings-toggle-copy"><strong>Démarrer avec l'application</strong><small>{testServer.enabled ? "Activé" : "Désactivé"}</small></span>
            <span className={"settings-switch" + (testServer.enabled ? " active" : "")} aria-hidden="true"><i /></span>
          </button>
          <div className="settings-server-panel">
            <label className="settings-server-port" htmlFor="settings-test-server-port">
              <span>Port</span>
              <input
                id="settings-test-server-port"
                type="number"
                min={1024}
                max={65535}
                step={1}
                inputMode="numeric"
                value={portDraft}
                disabled={!testServer.available}
                onChange={(event) => setPortDraft(event.currentTarget.value.replace(/\D/g, "").slice(0, 5))}
                onBlur={commitPort}
                onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }}
              />
            </label>
            <div className={"settings-server-status " + statusKind}>
              <i aria-hidden="true" />
              <span><strong>{statusTitle}</strong><small>{statusDetail}</small></span>
              <button type="button" onClick={() => onTestServerChange({ enabled: true, port: testServer.port })} disabled={!testServer.available || !testServer.enabled || testServer.running} title="Réessayer le démarrage"><RefreshCw size={15} /></button>
            </div>
            <div className="settings-server-links" aria-label="Adresses du serveur de test">
              <div><span>GET</span><code>{testServer.endpoints.get}</code><button type="button" onClick={() => copyUrl(testServer.endpoints.get)} title="Copier l'adresse GET"><Copy size={14} /></button></div>
              <div><span>POST</span><code>{testServer.endpoints.post}</code><button type="button" onClick={() => copyUrl(testServer.endpoints.post)} title="Copier l'adresse POST"><Copy size={14} /></button></div>
              <div><span>PUT</span><code>{testServer.endpoints.put}</code><button type="button" onClick={() => copyUrl(testServer.endpoints.put)} title="Copier l'adresse PUT"><Copy size={14} /></button></div>
              <div><span>PATCH</span><code>{testServer.endpoints.patch}</code><button type="button" onClick={() => copyUrl(testServer.endpoints.patch)} title="Copier l'adresse PATCH"><Copy size={14} /></button></div>
              <div><span>DELETE</span><code>{testServer.endpoints.delete}</code><button type="button" onClick={() => copyUrl(testServer.endpoints.delete)} title="Copier l'adresse DELETE"><Copy size={14} /></button></div>
            </div>
          </div>
        </div>
        <footer className="settings-footer"><button type="button" onClick={onClose}>Terminé</button></footer>
      </section>
    </div>
  );
}

function App() {
  const initialProjectRef = useRef<ProjectSnapshot | null>(null);
  if (!initialProjectRef.current) initialProjectRef.current = createInitialProject();
  const initialProject = initialProjectRef.current;
  const [appView, setAppView] = useState<"projects" | "studio">("projects");
  const [theme, setTheme] = useState<AppTheme>(initialAppTheme);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(initialAutoSaveEnabled);
  const [automaticUpdatesEnabled, setAutomaticUpdatesEnabled] = useState(initialAutomaticUpdatesEnabled);
  const [testServer, setTestServer] = useState<TestServerStatus>(initialTestServerStatus);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [projects, setProjects] = useState<ManagedProjectSummary[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [currentProject, setCurrentProject] = useState<ManagedProjectSummary | null>(null);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [libraryBusy, setLibraryBusy] = useState(false);
  const [libraryMessage, setLibraryMessage] = useState("");
  const [saveState, setSaveState] = useState<"saved" | "dirty" | "saving" | "error">("saved");
  const lastSavedSignatureRef = useRef("");
  const saveInFlightRef = useRef<Promise<boolean> | null>(null);
  const [activeCategory, setActiveCategory] = useState("start");
  const [variables, setVariables] = useState<VariableDef[]>(() => initialProject.variables);
  const [stacks, setStacks] = useState<ScriptStack[]>(() => initialProject.stacks);
  const [screenConfig, setScreenConfig] = useState<MinitelScreenConfig>(() => initialProject.screenConfig);
  const [screens, setScreens] = useState<MinitelScene[]>(() => initialProject.screens);
  const [activeScreenId, setActiveScreenId] = useState(() => initialProject.activeScreenId);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>(() => initialProject.workspaceMode);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [selectedStackId, setSelectedStackId] = useState<string>("");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [previewKey, setPreviewKey] = useState("A");
  const [notice, setNotice] = useState("Programme exemple prêt");
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
  const [removingStacks, setRemovingStacks] = useState<Set<string>>(() => new Set());
  const [motionIds, setMotionIds] = useState<Record<string, MotionKind>>({});
  const [draggingBlockId, setDraggingBlockId] = useState("");
  const [draggingPaletteId, setDraggingPaletteId] = useState("");
  const [draggingStackId, setDraggingStackId] = useState("");
  const [activeDropKey, setActiveDropKey] = useState("");
  const [dragPreview, setDragPreview] = useState<DragPreviewState | null>(null);
  const [history, setHistory] = useState<HistoryState>(() => ({ past: [], future: [] }));
  const [simRunning, setSimRunning] = useState(false);
  const [simTick, setSimTick] = useState(0);
  const [simSpeed, setSimSpeed] = useState(550);
  const [simulatedKeys, setSimulatedKeys] = useState<string[]>([]);
  const [simulationHttpResults, setSimulationHttpResults] = useState<Record<string, SimulationHttpState>>({});
  const simulationHttpGenerationRef = useRef(0);
  const simulationHttpPendingRef = useRef<Map<string, number>>(new Map());
  const motionTimersRef = useRef<Record<string, number>>({});
  const deleteTimersRef = useRef<number[]>([]);
  const noticeTimerRef = useRef<number | null>(null);
  const pendingPointerDragRef = useRef<PendingPointerDrag | null>(null);
  const suppressPaletteClickRef = useRef(false);
  const dragPreviewElementRef = useRef<HTMLDivElement | null>(null);
  const activeDropKeyRef = useRef("");
  const activeExpressionDropElementRef = useRef<HTMLElement | null>(null);
  const [board, setBoard] = useState("esp32dev");
  const [uploadPort, setUploadPort] = useState("");
  const [serialPorts, setSerialPorts] = useState<SerialPortInfo[]>([]);
  const [portsLoading, setPortsLoading] = useState(false);
  const [engineReady, setEngineReady] = useState<boolean | null>(null);
  const [uploadStage, setUploadStage] = useState<UploadStage>("idle");
  const [uploadOutput, setUploadOutput] = useState("Branche ton ESP32 : le port sera détecté automatiquement.");
  const [uploading, setUploading] = useState(false);
  const [appUpdate, setAppUpdate] = useState<AppUpdateStatus | null>(null);

  const activeStackId = selectedStackId || stacks[0]?.id || "";
  const variableValueBlocks = useMemo<BlockDefinition[]>(() => variables
    .filter((variable) => variable.name.trim())
    .map((variable) => ({
      id: "variable-value-" + variable.id,
      title: variable.name,
      help: "Valeur de " + variable.name + ". Glisse ce bloc dans un emplacement compatible.",
      kind: "value",
      category: "variables",
      color: variableValueType(variable) === "text" ? "#e75669" : "#f25f5c",
      output: variableReferenceExpr(variable),
    })), [variables]);
  const paletteBlockDefinitions = useMemo(() => blockDefinitions.map((definition) => {
    const endpoint = definition.id === "http-get-json"
      ? testServer.endpoints.get
      : definition.id === "http-post-json"
        ? testServer.endpoints.post
        : definition.id === "http-put-json"
          ? testServer.endpoints.put
          : definition.id === "http-patch-json"
            ? testServer.endpoints.patch
            : definition.id === "http-delete-json"
              ? testServer.endpoints.delete
              : "";
    if (!endpoint) return definition;
    return {
      ...definition,
      inputs: definition.inputs?.map((input) => input.key === "url"
        ? { ...input, defaultValue: endpoint, placeholder: endpoint }
        : input),
    };
  }), [testServer.endpoints.get, testServer.endpoints.post, testServer.endpoints.put, testServer.endpoints.patch, testServer.endpoints.delete]);
  const paletteDefinitionById = useMemo(() => [...paletteBlockDefinitions, ...variableValueBlocks]
    .reduce<Record<string, BlockDefinition>>((definitions, definition) => {
      definitions[definition.id] = definition;
      return definitions;
    }, {}), [paletteBlockDefinitions, variableValueBlocks]);
  const categoryBlocks = paletteBlockDefinitions.filter((definition) => definition.category === activeCategory);
  const activeBlocks = activeCategory === "variables" ? [...variableValueBlocks, ...categoryBlocks] : categoryBlocks;
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) ?? screens[0];
  const sceneElements = activeScreen?.elements ?? [];
  const generatedCode = useMemo(() => generateArduinoCode(stacks, variables, screenConfig, screens), [screenConfig, screens, stacks, variables]);
  const preview = useMemo(() => simulatePreview(stacks, variables, previewKey, simTick, simulatedKeys, screenConfig, screens, simulationHttpResults), [screenConfig, screens, stacks, variables, previewKey, simTick, simulatedKeys, simulationHttpResults]);
  const currentMetadata = useMemo<ProjectMetadata>(() => ({
    name: currentProject?.name ?? "Projet Minitel",
    createdAt: currentProject?.createdAt ?? new Date(0).toISOString(),
  }), [currentProject?.createdAt, currentProject?.name]);
  const currentSignature = useMemo(() => currentProject ? projectSnapshotSignature({ stacks, variables, screenConfig, screens, activeScreenId, workspaceMode }, board, currentMetadata) : "", [activeScreenId, board, currentMetadata, currentProject, screenConfig, screens, stacks, variables, workspaceMode]);
  const projectDirty = Boolean(currentProject && currentSignature !== lastSavedSignatureRef.current);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    try {
      window.localStorage.setItem(APP_THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_AUTO_SAVE_STORAGE_KEY, autoSaveEnabled ? "true" : "false");
    } catch {}
  }, [autoSaveEnabled]);

  useEffect(() => {
    try {
      window.localStorage.setItem(APP_AUTO_UPDATE_STORAGE_KEY, automaticUpdatesEnabled ? "true" : "false");
    } catch {}
  }, [automaticUpdatesEnabled]);

  function moveDragPreview(event: { clientX: number; clientY: number }) {
    if (!event.clientX && !event.clientY) return;
    const previewElement = dragPreviewElementRef.current;
    if (previewElement) previewElement.style.transform = "translate3d(" + (event.clientX + 16) + "px, " + (event.clientY + 16) + "px, 0)";
  }

  function beginPaletteDrag(definition: BlockDefinition, event: DragEvent<HTMLElement>) {
    setInvisibleDragImage(event);
    setDraggingPaletteId(definition.id);
    setActiveDropKey("");
    setDragPreview({ title: definition.title, helper: definition.output ? "Déposer dans une valeur" : "Nouveau bloc", color: definition.color, shape: dragShapeForDefinition(definition), x: event.clientX, y: event.clientY });
  }

  function beginWorkspaceDrag(block: ProgramBlock, definition: BlockDefinition, event: DragEvent<HTMLElement>) {
    setInvisibleDragImage(event);
    setDraggingBlockId(block.id);
    setDraggingPaletteId("");
    setActiveDropKey("");
    setDragPreview({ title: definition.title, helper: "Déplacer", color: definition.color, shape: dragShapeForDefinition(definition), x: event.clientX, y: event.clientY });
  }

  function activateDropLocation(location: DropLocation) {
    const key = dropLocationKey(location);
    if (activeDropKeyRef.current === key) return;
    activeDropKeyRef.current = key;
    setActiveDropKey(key);
  }

  function finishDrag() {
    activeDropKeyRef.current = "";
    activeExpressionDropElementRef.current?.classList.remove("expression-drop-active");
    activeExpressionDropElementRef.current = null;
    setDraggingBlockId("");
    setDraggingPaletteId("");
    setDraggingStackId("");
    setActiveDropKey("");
    setDragPreview(null);
  }

  function preparePalettePointerDrag(definition: BlockDefinition, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0 || (definition.kind === "value" && !definition.output)) return;
    const sourceElement = event.currentTarget;
    sourceElement.setPointerCapture(event.pointerId);
    pendingPointerDragRef.current = {
      payload: { source: "palette", definitionId: definition.id },
      title: definition.title,
      helper: definition.output ? "Déposer dans une valeur" : "Nouveau bloc",
      color: definition.color,
      shape: dragShapeForDefinition(definition),
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      started: false,
      sourcePaletteId: definition.id,
      pointerId: event.pointerId,
      sourceElement,
    };
  }

  function prepareStackPointerDrag(stack: ScriptStack, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea")) return;
    const definition = blockById[stack.event.definitionId];
    const sourceElement = event.currentTarget;
    sourceElement.setPointerCapture(event.pointerId);
    pendingPointerDragRef.current = {
      payload: { source: "stack", stackId: stack.id },
      title: definition.title,
      helper: "Déplacer la pile",
      color: definition.color,
      shape: "event-hat",
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      started: false,
      sourceStackId: stack.id,
      pointerId: event.pointerId,
      sourceElement,
    };
  }

  function prepareWorkspacePointerDrag(block: ProgramBlock, definition: BlockDefinition, event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea")) return;
    const sourceStackId = stacks.find((stack) => findBlock(stack.blocks, block.id))?.id ?? activeStackId;
    const sourceElement = event.currentTarget;
    sourceElement.setPointerCapture(event.pointerId);
    pendingPointerDragRef.current = {
      payload: { source: "workspace", stackId: sourceStackId, blockId: block.id },
      title: definition.title,
      helper: "Déplacer",
      color: definition.color,
      shape: dragShapeForDefinition(definition),
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      started: false,
      sourceBlockId: block.id,
      pointerId: event.pointerId,
      sourceElement,
    };
  }

  function expressionOutputForPayload(payload: DragPayload): Expr | null {
    if (payload.source !== "palette") return null;
    const output = paletteDefinitionById[payload.definitionId]?.output;
    if (!output || !["number", "boolean", "text"].includes(output.valueType)) return null;
    return output;
  }

  function expressionDropTargetFromPoint(
    x: number,
    y: number,
    output: Expr,
  ): { element: HTMLElement; location: ExpressionDropLocation } | null {
    const elements = document.elementsFromPoint(x, y) as HTMLElement[];
    const visited = new Set<HTMLElement>();
    for (const element of elements) {
      const target = element.closest<HTMLElement>("[data-expression-drop]");
      if (!target || visited.has(target)) continue;
      visited.add(target);
      const raw = target.dataset.expressionDrop;
      if (!raw) continue;
      try {
        const location = JSON.parse(raw) as ExpressionDropLocation;
        const acceptsQueryVariable = location.accepts === "query"
          && output.kind === "variable"
          && (output.valueType === "number" || output.valueType === "text");
        if (acceptsQueryVariable || location.accepts === output.valueType) return { element: target, location };
      } catch {
        // Ignore an obsolete target left by a render in progress.
      }
    }
    return null;
  }

  function activateExpressionDropTarget(element: HTMLElement | null) {
    if (activeExpressionDropElementRef.current === element) return;
    activeExpressionDropElementRef.current?.classList.remove("expression-drop-active");
    activeExpressionDropElementRef.current = element;
    element?.classList.add("expression-drop-active");
  }

  function dropLocationFromPoint(x: number, y: number): DropLocation | null {
    const elements = document.elementsFromPoint(x, y) as HTMLElement[];
    const explicitDrop = elements.find((element) => element.dataset.dropLocation);
    if (explicitDrop?.dataset.dropLocation) {
      try {
        return JSON.parse(explicitDrop.dataset.dropLocation) as DropLocation;
      } catch {
        return null;
      }
    }

    const blockDrop = elements.find((element) => element.dataset.blockDrop === "true");
    if (blockDrop) {
      const rect = blockDrop.getBoundingClientRect();
      const position = y < rect.top + rect.height / 2 ? "before" : "after";
      const ownerId = blockDrop.dataset.ownerId || undefined;
      const slot = (blockDrop.dataset.slot || "root") as DropLocation["slot"];
      return { stackId: blockDrop.dataset.stackId || activeStackId, ownerId, slot, index: Number(blockDrop.dataset.index || 0) + (position === "after" ? 1 : 0) };
    }

    const overWorkspace = elements.some((element) => element.classList.contains("workspace-canvas") || element.classList.contains("workspace-panel") || element.classList.contains("script-stack"));
    if (overWorkspace) {
      const nearbyTargets = Array.from(document.querySelectorAll<HTMLElement>(".drop-target[data-drop-location]"))
        .map((target) => ({ target, rect: target.getBoundingClientRect() }))
        .filter(({ rect }) => rect.bottom >= 0 && rect.top <= window.innerHeight && x >= rect.left - 26 && x <= rect.right + 26)
        .map(({ target, rect }) => ({ target, distance: Math.abs(y - (rect.top + rect.height / 2)), width: rect.width }))
        .filter(({ distance }) => distance <= 30)
        .sort((left, right) => left.distance - right.distance || left.width - right.width);
      const nearestTarget = nearbyTargets[0]?.target;
      if (nearestTarget?.dataset.dropLocation) {
        try {
          return JSON.parse(nearestTarget.dataset.dropLocation) as DropLocation;
        } catch {
          // Continue with the end of the active stack.
        }
      }
      if (activeStackId) return { stackId: activeStackId, slot: "root", index: stacks.find((stack) => stack.id === activeStackId)?.blocks.length ?? 0 };
    }

    return null;
  }

  function updatePointerDropTarget(x: number, y: number) {
    const pending = pendingPointerDragRef.current;
    const output = pending ? expressionOutputForPayload(pending.payload) : null;
    if (output) {
      const target = expressionDropTargetFromPoint(x, y, output);
      activateExpressionDropTarget(target?.element ?? null);
      if (activeDropKeyRef.current) {
        activeDropKeyRef.current = "";
        setActiveDropKey("");
      }
      return;
    }

    activateExpressionDropTarget(null);
    const location = dropLocationFromPoint(x, y);
    const key = location ? dropLocationKey(location) : "";
    if (activeDropKeyRef.current === key) return;
    activeDropKeyRef.current = key;
    setActiveDropKey(key);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const pending = pendingPointerDragRef.current;
    if (!pending) return;
    pending.lastX = event.clientX;
    pending.lastY = event.clientY;
    const distance = Math.hypot(event.clientX - pending.startX, event.clientY - pending.startY);
    if (!pending.started && distance >= 5) {
      pending.started = true;
      suppressPaletteClickRef.current = true;
      setDraggingBlockId(pending.sourceBlockId ?? "");
      setDraggingPaletteId(pending.sourcePaletteId ?? "");
      setDraggingStackId(pending.sourceStackId ?? "");
      setDragPreview({ title: pending.title, helper: pending.helper, color: pending.color, shape: pending.shape, x: event.clientX, y: event.clientY });
      window.requestAnimationFrame(() => moveDragPreview(event));
    }
    if (pending.started) {
      event.preventDefault();
      moveDragPreview(event);
      updatePointerDropTarget(event.clientX, event.clientY);
    }
  }

  function handlePointerUp(event: PointerEvent<HTMLElement>) {
    const pending = pendingPointerDragRef.current;
    if (!pending) return;
    if (pending.sourceElement.hasPointerCapture(pending.pointerId)) pending.sourceElement.releasePointerCapture(pending.pointerId);
    pendingPointerDragRef.current = null;
    if (pending.started) {
      event.preventDefault();
      const output = expressionOutputForPayload(pending.payload);
      if (output) {
        const target = expressionDropTargetFromPoint(event.clientX, event.clientY, output)
          ?? expressionDropTargetFromPoint(pending.lastX, pending.lastY, output);
        if (target) handleDropExpression(pending.payload, target.location);
        else flashNotice("Dépose l'opération dans une valeur compatible");
      } else {
        const location = dropLocationFromPoint(event.clientX, event.clientY);
        if (location) handleDropBranch(pending.payload, location);
      }
      window.setTimeout(() => {
        suppressPaletteClickRef.current = false;
      }, 0);
    } else {
      suppressPaletteClickRef.current = false;
    }
    finishDrag();
  }

  function cancelPointerDrag() {
    const pending = pendingPointerDragRef.current;
    if (pending?.sourceElement.hasPointerCapture(pending.pointerId)) pending.sourceElement.releasePointerCapture(pending.pointerId);
    pendingPointerDragRef.current = null;
    suppressPaletteClickRef.current = false;
    finishDrag();
  }

  function flashNotice(message: string) {
    if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    setNotice(message);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      noticeTimerRef.current = null;
    }, 2200);
  }

  function pushHistory() {
    const snapshot = cloneProjectSnapshot({ stacks, variables, screenConfig, screens, activeScreenId, workspaceMode });
    setHistory((current) => {
      const last = current.past[current.past.length - 1];
      if (last && JSON.stringify(last) === JSON.stringify(snapshot)) {
        return current.future.length === 0 ? current : { ...current, future: [] };
      }
      return { past: [...current.past.slice(-HISTORY_LIMIT + 1), snapshot], future: [] };
    });
  }

  function clearPendingDeletes() {
    deleteTimersRef.current.forEach((timer) => window.clearTimeout(timer));
    deleteTimersRef.current = [];
    setRemovingIds(new Set());
    setRemovingStacks(new Set());
  }

  function scheduleDelete(callback: () => void) {
    const timer = window.setTimeout(() => {
      callback();
      deleteTimersRef.current = deleteTimersRef.current.filter((item) => item !== timer);
    }, DELETE_ANIMATION_MS);
    deleteTimersRef.current.push(timer);
  }

  function animateBlock(blockIds: string | string[], motion: MotionKind) {
    const ids = (Array.isArray(blockIds) ? blockIds : [blockIds]).filter(Boolean);
    if (ids.length === 0) return;

    ids.forEach((id) => {
      if (motionTimersRef.current[id]) window.clearTimeout(motionTimersRef.current[id]);
    });
    setMotionIds((current) => ({ ...current, ...Object.fromEntries(ids.map((id) => [id, motion])) } as Record<string, MotionKind>));
    ids.forEach((id) => {
      motionTimersRef.current[id] = window.setTimeout(() => {
        setMotionIds((current) => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        delete motionTimersRef.current[id];
      }, BLOCK_MOTION_MS);
    });
  }

  function restoreSnapshot(snapshot: ProjectSnapshot) {
    const next = cloneProjectSnapshot(snapshot);
    clearPendingDeletes();
    setStacks(next.stacks);
    setVariables(next.variables);
    setScreenConfig(next.screenConfig);
    setScreens(next.screens);
    setActiveScreenId(next.activeScreenId);
    setWorkspaceMode(next.workspaceMode);
    setSelectedStackId((current) => (next.stacks.some((stack) => stack.id === current) ? current : next.stacks[0]?.id || ""));
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
    window.setTimeout(() => animateBlock(collectBlockIds(next.stacks.flatMap((stack) => stack.blocks)).slice(0, 40), "history-flash"), 0);
  }

  function undo() {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const now = cloneProjectSnapshot({ stacks, variables, screenConfig, screens, activeScreenId, workspaceMode });
    setHistory({ past: history.past.slice(0, -1), future: [now, ...history.future].slice(0, HISTORY_LIMIT) });
    restoreSnapshot(previous);
    flashNotice("Retour en arrière");
  }

  function redo() {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const now = cloneProjectSnapshot({ stacks, variables, screenConfig, screens, activeScreenId, workspaceMode });
    setHistory({ past: [...history.past.slice(-HISTORY_LIMIT + 1), now], future: history.future.slice(1) });
    restoreSnapshot(next);
    flashNotice("Action rétablie");
  }

  function clearSimulationHttpResults() {
    simulationHttpGenerationRef.current += 1;
    simulationHttpPendingRef.current.clear();
    setSimulationHttpResults({});
  }

  function refreshSimulationHttpResults(eventDefinitionIds?: string[]) {
    const requests = collectSimulationHttpRequests(stacks, preview.variables, eventDefinitionIds);
    if (requests.length === 0) return;
    const generation = simulationHttpGenerationRef.current;
    const pending = simulationHttpPendingRef.current;
    const requestedRequests = requests.filter((request) => pending.get(request.key) !== generation);
    if (requestedRequests.length === 0) return;

    setSimulationHttpResults((current) => {
      const next = { ...current };
      requestedRequests.forEach((request) => {
        next[request.key] = { ...(current[request.key] ?? {}), status: "loading", error: undefined };
      });
      return next;
    });

    requestedRequests.forEach((request) => {
      pending.set(request.key, generation);
      void requestSimulationJson(request)
        .then((result) => {
          if (simulationHttpGenerationRef.current !== generation) return;
          setSimulationHttpResults((current) => ({
            ...current,
            [request.key]: result.ok && result.body !== undefined
              ? { status: "success", body: result.body, statusCode: result.status, resolvedUrl: result.url }
              : {
                ...(current[request.key] ?? {}),
                status: "error",
                statusCode: result.status,
                resolvedUrl: result.url,
                error: result.error || "La requ\u00eate " + request.method + " a \u00e9chou\u00e9.",
              },
          }));
        })
        .catch((error) => {
          if (simulationHttpGenerationRef.current !== generation) return;
          setSimulationHttpResults((current) => ({
            ...current,
            [request.key]: {
              ...(current[request.key] ?? {}),
              status: "error",
              error: error instanceof Error ? error.message : String(error),
            },
          }));
        })
        .finally(() => {
          if (pending.get(request.key) === generation) pending.delete(request.key);
        });
    });
  }

  function toggleSimulation() {
    if (!simRunning) void refreshSimulationHttpResults(["event-setup", "event-loop"]);
    setSimRunning(!simRunning);
  }

  function stepSimulation() {
    setSimTick((current) => current + 1);
    void refreshSimulationHttpResults(["event-setup", "event-loop"]);
  }

  function triggerSimulatedKey(key: string) {
    if (!keyOptions.some((option) => option.value === key)) return;
    setRightTab("preview");
    setPreviewKey(key);
    setSimulatedKeys((current) => [...current.slice(-11), key]);
    setSimTick((current) => current + 1);
    void refreshSimulationHttpResults(["event-setup", "event-loop", "event-key-any", "event-key-char"]);
    flashNotice("Touche " + minitelKeyLabel(key) + " simulée");
  }

  function resetSimulation() {
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
    clearSimulationHttpResults();
  }

  async function refreshSerialPorts(silent = false) {
    const bridge = window.minitelStudio;
    if (!bridge?.listSerialPorts) return;
    if (!silent) setPortsLoading(true);
    try {
      const result = await bridge.listSerialPorts();
      setSerialPorts(result.ports);
      setEngineReady(result.engineReady);
      setUploadPort((current) => {
        if (current && result.ports.some((port) => port.path === current)) return current;
        return result.ports[0]?.path || "";
      });
      if (!silent && result.ports.length === 0) {
        setUploadOutput("Aucun port détecté. Branche l'ESP32 avec un câble USB de données.");
      }
    } catch (error) {
      if (!silent) setUploadOutput("La recherche des ports a échoué : " + String(error));
    } finally {
      if (!silent) setPortsLoading(false);
    }
  }

  useEffect(() => {
    void refreshProjectLibrary();
  }, []);

  useEffect(() => {
    if (appView === "studio" && currentProject && saveState !== "saving" && saveState !== "error") setSaveState(projectDirty ? "dirty" : "saved");
  }, [appView, currentProject, projectDirty, saveState]);

  useEffect(() => {
    simulationHttpGenerationRef.current += 1;
    simulationHttpPendingRef.current.clear();
    setSimulationHttpResults({});
  }, [stacks, variables]);

  useEffect(() => {
    if (!simRunning) return undefined;
    const timer = window.setInterval(() => {
      setSimTick((current) => current + 1);
      refreshSimulationHttpResults(["event-loop"]);
    }, simSpeed);
    return () => window.clearInterval(timer);
  }, [simRunning, simSpeed, stacks, variables]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTyping = target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
      if (event.key === "Escape") {
        if (pendingPointerDragRef.current) {
          cancelPointerDrag();
          return;
        }
        if (examplesOpen) {
          setExamplesOpen(false);
          return;
        }
        if (settingsOpen) {
          setSettingsOpen(false);
          return;
        }
        if (appView === "studio" && rightTab === "preview") {
          event.preventDefault();
          triggerSimulatedKey("key:escape");
        }
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "s") {
          event.preventDefault();
          if (appView === "studio") void saveProject();
          return;
        }
        if (key === "o") {
          event.preventDefault();
          if (appView === "studio") void goToProjectLibrary();
          else if (selectedProjectId) void openManagedProject(selectedProjectId);
          return;
        }
        if (isTyping || appView !== "studio") return;
        if (key === "z") {
          event.preventDefault();
          if (event.shiftKey) redo();
          else undo();
        }
        if (key === "y") {
          event.preventDefault();
          redo();
        }
        return;
      }

      if (isTyping) return;

      const simulatedKey = browserMinitelKeyValues[event.key] ?? (event.key.length === 1 ? event.key : "");
      if (appView === "studio" && rightTab === "preview" && keyOptions.some((option) => option.value === simulatedKey)) {
        event.preventDefault();
        triggerSimulatedKey(simulatedKey);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeScreenId, appView, autoSaveEnabled, board, currentProject, examplesOpen, history, libraryBusy, projectDirty, projects, rightTab, screenConfig, screens, selectedProjectId, settingsOpen, stacks, variables, workspaceMode]);

  useEffect(() => {
    const handleDragOver = (event: globalThis.DragEvent) => moveDragPreview(event);
    window.addEventListener("dragover", handleDragOver);
    return () => window.removeEventListener("dragover", handleDragOver);
  }, []);

  useEffect(() => {
    if (rightTab !== "upload" || !window.minitelStudio?.listSerialPorts) return undefined;
    void refreshSerialPorts(false);
    const timer = window.setInterval(() => void refreshSerialPorts(true), 3000);
    return () => window.clearInterval(timer);
  }, [rightTab]);

  useEffect(() => {
    const unsubscribe = window.minitelStudio?.onUploadProgress?.((progress) => {
      setUploadStage(progress.stage);
      setUploadOutput((current) => {
        const base = current.startsWith("Préparation") ? "" : current.trim();
        return (base ? base + "\n" : "") + progress.message;
      });
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const bridge = window.minitelStudio;
    if (!bridge?.getUpdateStatus || !bridge.onUpdateStatus) return undefined;
    let active = true;
    const applyUpdateStatus = (status: AppUpdateStatus) => {
      if (!active) return;
      setAppUpdate(status);
      setAutomaticUpdatesEnabled(status.automaticUpdatesEnabled);
    };
    const unsubscribe = bridge.onUpdateStatus(applyUpdateStatus);
    void bridge.getUpdateStatus()
      .then(applyUpdateStatus)
      .catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const bridge = window.minitelStudio;
    if (!bridge?.getTestServerStatus || !bridge.onTestServerStatus) return undefined;
    let active = true;
    const applyStatus = (status: TestServerStatus) => {
      if (active) setTestServer(status);
    };
    const unsubscribe = bridge.onTestServerStatus(applyStatus);
    void bridge.getTestServerStatus()
      .then(applyStatus)
      .catch(() => undefined);
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    return () => {
      Object.values(motionTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      deleteTimersRef.current.forEach((timer) => window.clearTimeout(timer));
      if (noticeTimerRef.current !== null) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  function createStackFromEvent(eventDefinitionId: string) {
    const stack = makeStack(eventDefinitionId);
    pushHistory();
    setStacks((current) => [...current, stack]);
    setSelectedStackId(stack.id);
    window.setTimeout(() => animateBlock(collectBlockIds(stack.blocks), "moving-drop"), 0);
    flashNotice("Pile ajoutée");
  }

  function insertBranch(location: DropLocation, branch: ProgramBlock[]) {
    pushHistory();
    setStacks((current) => current.map((stack) => (stack.id === location.stackId ? { ...stack, blocks: insertBranchInList(stack.blocks, location, branch) } : stack)));
    setSelectedStackId(location.stackId);
  }


  function makeProjectBlock(definitionId: string) {
    const block = makeBlock(definitionId);
    if (definitionId === "draw-screen") block.values.screen = activeScreen?.id ?? screens[0]?.id ?? "";
    if (definitionId === "http-get-json") block.values.url = testServer.endpoints.get;
    if (definitionId === "http-post-json") block.values.url = testServer.endpoints.post;
    if (definitionId === "http-put-json") block.values.url = testServer.endpoints.put;
    if (definitionId === "http-patch-json") block.values.url = testServer.endpoints.patch;
    if (definitionId === "http-delete-json") block.values.url = testServer.endpoints.delete;
    blockById[definitionId]?.inputs?.forEach((input) => {
      if (input.type !== "variable") return;
      const compatibleVariables = input.variableType === "any"
        ? variables
        : variables.filter((variable) => variableValueType(variable) === (input.variableType ?? "number"));
      const requestedName = textValue(block.values[input.key], "");
      if (!compatibleVariables.some((variable) => variable.name === requestedName) && compatibleVariables[0]) {
        block.values[input.key] = compatibleVariables[0].name;
      }
    });
    return block;
  }

  function addBlockToStack(stackId: string, definitionId: string) {
    const block = makeProjectBlock(definitionId);
    insertBranch({ stackId, slot: "root", index: stacks.find((stack) => stack.id === stackId)?.blocks.length ?? 0 }, [block]);
    window.setTimeout(() => animateBlock(collectBlockIds([block]), "moving-drop"), 0);
    flashNotice("Bloc ajouté");
  }

  function quickAddDefinition(definition: BlockDefinition) {
    if (suppressPaletteClickRef.current) return;
    if (definition.kind === "value") {
      flashNotice("Fais glisser ce bloc dans une valeur compatible");
      return;
    }
    if (definition.kind === "event") {
      createStackFromEvent(definition.id);
      return;
    }
    if (!activeStackId) {
      const stack = makeStack("event-setup", [makeProjectBlock(definition.id)]);
      pushHistory();
      setStacks([stack]);
      setSelectedStackId(stack.id);
      window.setTimeout(() => animateBlock(collectBlockIds(stack.blocks), "moving-drop"), 0);
      return;
    }
    addBlockToStack(activeStackId, definition.id);
  }

  function pulseExpressionTarget(location: ExpressionDropLocation) {
    const key = expressionDropLocationKey(location);
    window.requestAnimationFrame(() => {
      const target = Array.from(document.querySelectorAll<HTMLElement>("[data-expression-drop-key]"))
        .find((element) => element.dataset.expressionDropKey === key);
      if (!target) return;
      target.classList.remove("expression-drop-pulse");
      void target.offsetWidth;
      target.classList.add("expression-drop-pulse");
      target.addEventListener("animationend", () => target.classList.remove("expression-drop-pulse"), { once: true });
    });
  }

  function handleDropExpression(payload: DragPayload, location: ExpressionDropLocation) {
    const output = expressionOutputForPayload(payload);
    if (!output) return;
    if (location.accepts === "query") {
      if (output.kind !== "variable" || !location.queryTarget || location.owner !== "block") return;
      const replacement = queryVariableToken(output.name);
      pushHistory();
      setStacks((current) => current.map((stack) => (
        stack.id === location.stackId
          ? {
              ...stack,
              blocks: updateBlockTree(stack.blocks, location.blockId, (block) => ({
                ...block,
                values: {
                  ...block.values,
                  [location.inputKey]: replaceQueryFieldValue(
                    block.values[location.inputKey],
                    location.queryTarget!.index,
                    location.queryTarget!.field,
                    replacement,
                  ),
                },
              })),
            }
          : stack
      )));
      pulseExpressionTarget(location);
      flashNotice("Variable " + output.name + " insérée");
      return;
    }
    if (output.valueType !== location.accepts) return;
    const replacement = cloneValue(output);
    const replaceValue = (value: InputValue | undefined): Expr => {
      const root = isExpr(value)
        ? value
        : location.accepts === "boolean"
          ? boolExpr(Boolean(value))
          : numberExpression(value);
      return replaceExprAtPath(root, location.path, replacement);
    };

    pushHistory();
    if (location.owner === "block") {
      setStacks((current) => current.map((stack) => (
        stack.id === location.stackId
          ? {
              ...stack,
              blocks: updateBlockTree(stack.blocks, location.blockId, (block) => ({
                ...block,
                values: { ...block.values, [location.inputKey]: replaceValue(block.values[location.inputKey]) },
              })),
            }
          : stack
      )));
    } else if (location.owner === "event") {
      setStacks((current) => current.map((stack) => (
        stack.id === location.stackId
          ? {
              ...stack,
              event: {
                ...stack.event,
                values: { ...stack.event.values, [location.inputKey]: replaceValue(stack.event.values[location.inputKey]) },
              },
            }
          : stack
      )));
    } else {
      setVariables((current) => current.map((variable) => (
        variable.id === location.variableId
          ? { ...variable, defaultValue: replaceValue(variable.defaultValue) }
          : variable
      )));
    }

    pulseExpressionTarget(location);
    flashNotice(output.valueType === "boolean" ? "Condition insérée" : "Opération imbriquée");
  }

  function handleDropBranch(payload: DragPayload, location: DropLocation) {
    setActiveDropKey("");
    if (payload.source === "palette") {
      const definition = paletteDefinitionById[payload.definitionId];
      if (!definition) return;
      if (definition.kind === "event") {
        createStackFromEvent(definition.id);
        return;
      }
      if (definition.kind === "value") {
        flashNotice("Fais glisser cette opération dans une valeur compatible");
        return;
      }
      const block = makeProjectBlock(payload.definitionId);
      insertBranch(location, [block]);
      window.setTimeout(() => animateBlock(collectBlockIds([block]), "moving-drop"), 0);
      flashNotice("Bloc accroché");
      return;
    }

    if (payload.source === "stack") {
      if (payload.stackId === location.stackId) return;
      pushHistory();
      setStacks((current) => {
        const moving = current.find((stack) => stack.id === payload.stackId);
        if (!moving) return current;
        const rest = current.filter((stack) => stack.id !== payload.stackId);
        const targetIndex = Math.max(0, rest.findIndex((stack) => stack.id === location.stackId));
        rest.splice(targetIndex + 1, 0, moving);
        return rest;
      });
      flashNotice("Pile déplacée");
      return;
    }

    const sourceStack = stacks.find((stack) => stack.id === payload.stackId);
    const previewBranch = sourceStack ? extractBranchFromList(sourceStack.blocks, payload.blockId).branch ?? [] : [];
    const movedIds = collectBlockIds(previewBranch);
    if (movedIds.length === 0) return;
    const sourceLocation = sourceStack ? findBlockLocation(sourceStack.blocks, payload.blockId) : null;
    if (location.ownerId && movedIds.includes(location.ownerId)) {
      flashNotice("Impossible de placer une suite dans elle-même");
      return;
    }
    if (
      sourceLocation &&
      payload.stackId === location.stackId &&
      sourceLocation.ownerId === location.ownerId &&
      sourceLocation.slot === location.slot &&
      location.index >= sourceLocation.index &&
      location.index <= sourceLocation.index + previewBranch.length
    ) {
      flashNotice("La suite est déjà à cet endroit");
      return;
    }
    pushHistory();
    setStacks((current) => {
      let movingBranch: ProgramBlock[] = [];
      const without = current.map((stack) => {
        if (stack.id !== payload.stackId) return stack;
        const extracted = extractBranchFromList(stack.blocks, payload.blockId);
        movingBranch = extracted.branch ?? [];
        return { ...stack, blocks: extracted.blocks };
      });
      if (movingBranch.length === 0) return current;
      return without.map((stack) => (stack.id === location.stackId ? { ...stack, blocks: insertBranchInList(stack.blocks, location, movingBranch) } : stack));
    });
    setSelectedStackId(location.stackId);
    window.setTimeout(() => animateBlock(movedIds, "moving-drop"), 0);
    flashNotice("Suite déplacée");
  }

  function handleWorkspaceDrop(event: DragEvent) {
    event.preventDefault();
    const payload = readDragPayload(event);
    if (!payload) return;
    if (payload.source === "palette") {
      const definition = paletteDefinitionById[payload.definitionId];
      if (!definition) return;
      if (definition.kind === "event") createStackFromEvent(definition.id);
      else if (activeStackId && definition.kind !== "value") addBlockToStack(activeStackId, definition.id);
    }
  }

  function updateBlockValue(stackId: string, blockId: string, key: string, value: InputValue) {
    pushHistory();
    setStacks((current) => current.map((stack) => (stack.id === stackId ? { ...stack, blocks: updateBlockTree(stack.blocks, blockId, (block) => ({ ...block, values: { ...block.values, [key]: value } })) } : stack)));
  }

  function updateEventValue(stackId: string, key: string, value: InputValue) {
    pushHistory();
    setStacks((current) => current.map((stack) => (stack.id === stackId ? { ...stack, event: { ...stack.event, values: { ...stack.event.values, [key]: value } } } : stack)));
  }

  function deleteBlock(stackId: string, blockId: string) {
    const stack = stacks.find((item) => item.id === stackId);
    if (!stack || !findBlock(stack.blocks, blockId)) return;
    pushHistory();
    setRemovingIds((current) => new Set(current).add(blockId));
    scheduleDelete(() => {
      setStacks((current) => current.map((item) => (item.id === stackId ? { ...item, blocks: removeBlockTree(item.blocks, blockId) } : item)));
      setRemovingIds((current) => {
        const next = new Set(current);
        next.delete(blockId);
        return next;
      });
    });
    flashNotice("Bloc supprimé");
  }

  function duplicateBlock(stackId: string, blockId: string) {
    const stack = stacks.find((item) => item.id === stackId);
    if (!stack || !findBlock(stack.blocks, blockId)) return;
    let duplicateIds: string[] = [];
    pushHistory();
    animateBlock(blockId, "duplicating");
    setStacks((current) => current.map((item) => {
      if (item.id !== stackId) return item;
      const result = duplicateBlockInList(item.blocks, blockId);
      if (result.done) duplicateIds = result.duplicateIds;
      return result.done ? { ...item, blocks: result.blocks } : item;
    }));
    window.setTimeout(() => animateBlock(duplicateIds, "duplicating"), 0);
    flashNotice("Bloc dupliqué");
  }

  function moveBlockInList(blocks: ProgramBlock[], blockId: string, direction: -1 | 1): ProgramBlock[] {
    const index = blocks.findIndex((block) => block.id === blockId);
    if (index >= 0) {
      const target = index + direction;
      if (target < 0 || target >= blocks.length) return blocks;
      const next = [...blocks];
      const [moving] = next.splice(index, 1);
      next.splice(target, 0, moving);
      return next;
    }
    return blocks.map((block) => ({ ...block, children: block.children ? moveBlockInList(block.children, blockId, direction) : block.children, elseChildren: block.elseChildren ? moveBlockInList(block.elseChildren, blockId, direction) : block.elseChildren }));
  }

  function moveBlock(stackId: string, blockId: string, direction: -1 | 1) {
    const stack = stacks.find((item) => item.id === stackId);
    const block = stack ? findBlock(stack.blocks, blockId) : undefined;
    if (!block) return;
    const ids = collectBlockIds([block]);
    pushHistory();
    setStacks((current) => current.map((item) => (item.id === stackId ? { ...item, blocks: moveBlockInList(item.blocks, blockId, direction) } : item)));
    window.setTimeout(() => animateBlock(ids, direction === -1 ? "moving-up" : "moving-down"), 0);
  }

  function deleteStack(stackId: string) {
    if (!stacks.some((stack) => stack.id === stackId)) return;
    pushHistory();
    setRemovingStacks((current) => new Set(current).add(stackId));
    scheduleDelete(() => {
      setStacks((current) => {
        const next = current.filter((stack) => stack.id !== stackId);
        if (activeStackId === stackId) setSelectedStackId(next[0]?.id || "");
        return next;
      });
      setRemovingStacks((current) => {
        const next = new Set(current);
        next.delete(stackId);
        return next;
      });
    });
  }

  function resetProgram() {
    const nextStacks = createBlankStacks();
    const nextScreen = createMinitelScene("Écran principal");
    clearPendingDeletes();
    pushHistory();
    setStacks(nextStacks);
    setVariables(createDefaultVariables());
    setScreenConfig(createDefaultScreenConfig());
    setScreens([nextScreen]);
    setActiveScreenId(nextScreen.id);
    setWorkspaceMode("blocks");
    setSelectedStackId(nextStacks[0].id);
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
    window.setTimeout(() => animateBlock(collectBlockIds(nextStacks.flatMap((stack) => stack.blocks)), "history-flash"), 0);
    flashNotice("Nouveau programme");
  }

  function loadExample(exampleId: string) {
    const example = projectExamples.find((item) => item.id === exampleId) ?? projectExamples[0];
    const next = example.create();
    clearPendingDeletes();
    pushHistory();
    setStacks(next.stacks);
    setVariables(next.variables);
    setScreenConfig(next.screenConfig);
    setScreens(next.screens);
    setActiveScreenId(next.activeScreenId);
    setWorkspaceMode(next.workspaceMode);
    setSelectedStackId(next.stacks[0]?.id ?? "");
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
    setExamplesOpen(false);
    window.setTimeout(() => animateBlock(collectBlockIds(next.stacks.flatMap((stack) => stack.blocks)), "history-flash"), 0);
    flashNotice(example.name + " chargé");
  }

  function changeScreenConfig(next: MinitelScreenConfig) {
    pushHistory();
    setScreenConfig(next);
    setScreens((current) => current.map((screen) => ({ ...screen, elements: fitElementsToScreen(screen.elements, next) })));
    setSimTick(0);
  }

  function changeScreens(next: MinitelScene[]) {
    if (next.length === 0) return;
    pushHistory();
    setScreens(next);
    setActiveScreenId((current) => next.some((screen) => screen.id === current) ? current : next[0].id);
    setStacks((current) => repairScreenReferencesInStacks(current, next));
    setSimTick(0);
  }

  function changeActiveScreen(screenId: string) {
    setActiveScreenId(screenId);
  }

  function addVariable() {
    pushHistory();
    setVariables((current) => [...current, { id: uid(), name: "variable" + (current.length + 1), valueType: "number", defaultValue: num(0) }]);
  }

  function changeVariable(id: string, patch: Partial<VariableDef>) {
    const currentVariable = variables.find((variable) => variable.id === id);
    if (!currentVariable) return;
    const previousType = variableValueType(currentVariable);
    const nextType = patch.valueType ?? previousType;
    if (nextType !== previousType && variables.filter((variable) => variableValueType(variable) === previousType).length <= 1) {
      flashNotice("Garde au moins une variable " + (previousType === "text" ? "Texte" : "Nombre"));
      return;
    }

    pushHistory();
    const nextVariables = variables.map((variable) => (variable.id === id ? { ...variable, ...patch } : variable));
    const nextName = nextVariables.find((variable) => variable.id === id)?.name ?? currentVariable.name;
    const nameChanged = nextName !== currentVariable.name;
    if (nextType !== previousType || nameChanged) {
      const renamedVariable = nextVariables.find((variable) => variable.id === id);
      const replacementVariable = renamedVariable && variableValueType(renamedVariable) === "number"
        ? renamedVariable
        : nextVariables.find((variable) => variableValueType(variable) === "number");
      const replacement = replacementVariable ? variableExpr(replacementVariable.name) : num(0);
      setVariables(nextVariables.map((variable) => ({
        ...variable,
        defaultValue: replaceNumberVariableReference(variable.defaultValue, currentVariable.name, replacement) as Expr,
      })));
      setStacks((current) => repairVariableReferencesInStacks(
        current,
        nextVariables,
        currentVariable.name,
        nameChanged ? nextName : currentVariable.name,
      ));
      return;
    }
    setVariables(nextVariables);
  }

  function removeVariable(id: string) {
    const removedVariable = variables.find((variable) => variable.id === id);
    if (!removedVariable) return;
    const removedType = variableValueType(removedVariable);
    if (variables.filter((variable) => variableValueType(variable) === removedType).length <= 1) {
      flashNotice("Garde au moins une variable " + (removedType === "text" ? "Texte" : "Nombre"));
      return;
    }
    pushHistory();
    const nextVariables = variables.filter((variable) => variable.id !== id);
    const replacementVariable = nextVariables.find((variable) => variableValueType(variable) === "number");
    const replacement = replacementVariable ? variableExpr(replacementVariable.name) : num(0);
    setVariables(nextVariables.map((variable) => ({
      ...variable,
      defaultValue: replaceNumberVariableReference(variable.defaultValue, removedVariable.name, replacement) as Expr,
    })));
    setStacks((current) => repairVariableReferencesInStacks(current, nextVariables, removedVariable.name));
  }


  function fallbackSaveProject(contents: string, suggestedName: string) {
    const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = suggestedName;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  function fallbackOpenProject(): Promise<string | null> {
    return new Promise((resolve, reject) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".mbs,application/json";
      input.style.display = "none";
      document.body.appendChild(input);
      let settled = false;
      const finish = (contents: string | null) => {
        if (settled) return;
        settled = true;
        input.remove();
        resolve(contents);
      };
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) {
          finish(null);
          return;
        }
        file.text().then(finish).catch((error) => {
          input.remove();
          reject(error);
        });
      }, { once: true });
      window.addEventListener("focus", () => window.setTimeout(() => {
        if (!input.files?.length) finish(null);
      }, 250), { once: true });
      input.click();
    });
  }

  function applyProjectToStudio(parsed: ParsedProjectFile, summary: ManagedProjectSummary) {
    const next = cloneProjectSnapshot(parsed.project);
    clearPendingDeletes();
    finishDrag();
    setStacks(next.stacks);
    setVariables(next.variables);
    setScreenConfig(next.screenConfig);
    setScreens(next.screens);
    setActiveScreenId(next.activeScreenId);
    setBoard(parsed.board);
    setCurrentProject(summary);
    setSelectedProjectId(summary.id);
    setSelectedStackId(next.stacks[0]?.id ?? "");
    setWorkspaceMode(next.workspaceMode);
    setRightTab("preview");
    setHistory({ past: [], future: [] });
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
    setExamplesOpen(false);
    lastSavedSignatureRef.current = projectSnapshotSignature(next, parsed.board, { name: summary.name, createdAt: summary.createdAt });
    setSaveState("saved");
    setNotice("Projet prêt");
    setAppView("studio");
  }

  async function refreshProjectLibrary() {
    setLibraryLoading(true);
    try {
      const nextProjects = await readManagedProjectLibrary();
      setProjects(nextProjects);
      setSelectedProjectId((current) => nextProjects.some((project) => project.id === current) ? current : nextProjects[0]?.id ?? "");
      setLibraryMessage(nextProjects.length === 0 ? "Crée ton premier projet pour commencer." : "");
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : "Impossible de lire les projets.");
    } finally {
      setLibraryLoading(false);
    }
  }

  async function openManagedProject(id: string) {
    if (!id || libraryBusy) return;
    setLibraryBusy(true);
    setLibraryMessage("Ouverture du projet...");
    try {
      const loaded = await loadManagedProjectRecord(id);
      const parsed = parseProjectFile(loaded.contents);
      await new Promise((resolve) => window.setTimeout(resolve, 180));
      applyProjectToStudio(parsed, loaded.project);
      setLibraryMessage("");
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : "Impossible d'ouvrir ce projet.");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function createManagedProject(settings: NewProjectSettings) {
    if (libraryBusy) return false;
    setLibraryBusy(true);
    setLibraryMessage("Création du projet...");
    try {
      const snapshot = createNewProjectSnapshot(settings);
      const metadata = { name: cleanProjectName(settings.name), createdAt: new Date().toISOString() };
      const contents = serializeProjectFile(snapshot, "esp32dev", metadata);
      const summary = await saveManagedProjectRecord(undefined, contents);
      setProjects((current) => [summary, ...current.filter((project) => project.id !== summary.id)]);
      applyProjectToStudio({ project: snapshot, board: "esp32dev", metadata }, summary);
      setLibraryMessage("");
      return true;
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : "Impossible de créer le projet.");
      return false;
    } finally {
      setLibraryBusy(false);
    }
  }

  async function deleteManagedProject(id: string) {
    if (!id || libraryBusy) return false;
    setLibraryBusy(true);
    try {
      await deleteManagedProjectRecord(id);
      await new Promise((resolve) => window.setTimeout(resolve, 220));
      setProjects((current) => {
        const next = current.filter((project) => project.id !== id);
        setSelectedProjectId((selected) => selected === id ? next[0]?.id ?? "" : selected);
        return next;
      });
      setLibraryMessage("Projet supprimé.");
      return true;
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : "Impossible de supprimer ce projet.");
      return false;
    } finally {
      setLibraryBusy(false);
    }
  }

  function saveProject({ quiet = false }: { quiet?: boolean } = {}): Promise<boolean> {
    if (!currentProject) return Promise.resolve(false);
    if (saveInFlightRef.current) return saveInFlightRef.current;
    const snapshot = { stacks, variables, screenConfig, screens, activeScreenId, workspaceMode };
    const metadata = { name: currentProject.name, createdAt: currentProject.createdAt };
    const operation = (async () => {
      setLibraryBusy(true);
      setSaveState("saving");
      try {
        const contents = serializeProjectFile(snapshot, board, metadata);
        const summary = await saveManagedProjectRecord(currentProject.id, contents);
        setProjects((current) => [summary, ...current.filter((project) => project.id !== summary.id)]
          .sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt)));
        setCurrentProject(summary);
        lastSavedSignatureRef.current = projectSnapshotSignature(snapshot, board, metadata);
        setSaveState("saved");
        if (!quiet) flashNotice("Projet sauvegardé");
        return true;
      } catch (error) {
        setSaveState("error");
        flashNotice(error instanceof Error ? error.message : "Impossible de sauvegarder le projet");
        return false;
      } finally {
        setLibraryBusy(false);
      }
    })();
    const tracked = operation.finally(() => {
      if (saveInFlightRef.current === tracked) saveInFlightRef.current = null;
    });
    saveInFlightRef.current = tracked;
    return tracked;
  }

  async function flushAutoSave() {
    const pending = saveInFlightRef.current;
    if (pending && !await pending) return false;
    if (!autoSaveEnabled || appView !== "studio" || !currentProject) return true;
    if (currentSignature === lastSavedSignatureRef.current) return true;
    return saveProject({ quiet: true });
  }

  async function exportProjectFile() {
    if (!currentProject) return;
    const suggestedName = cleanProjectName(currentProject.name).replace(/\s+/g, "-") + ".mbs";
    const contents = serializeProjectFile({ stacks, variables, screenConfig, screens, activeScreenId, workspaceMode }, board, currentMetadata);
    try {
      if (window.minitelStudio?.exportProject) {
        const result = await window.minitelStudio.exportProject({ suggestedName, contents });
        if (result.canceled) {
          flashNotice("Export annulé");
          return;
        }
        if (!result.ok) throw new Error(result.error || "L'export a échoué.");
      } else {
        fallbackSaveProject(contents, suggestedName);
      }
      flashNotice("Copie du projet exportée");
    } catch (error) {
      flashNotice(error instanceof Error ? error.message : "Impossible d'exporter le projet");
    }
  }

  async function importProjectToLibrary() {
    if (libraryBusy) return;
    setLibraryBusy(true);
    setLibraryMessage("Import du projet...");
    try {
      let contents: string | null = null;
      let filePath = "";
      if (window.minitelStudio?.importProject) {
        const result = await window.minitelStudio.importProject();
        if (result.canceled) {
          setLibraryMessage("Import annulé.");
          return;
        }
        if (!result.ok || !result.contents) throw new Error(result.error || "Impossible de lire ce projet.");
        contents = result.contents;
        filePath = result.filePath || "";
      } else {
        contents = await fallbackOpenProject();
      }
      if (!contents) return;
      const parsed = parseProjectFile(contents);
      const fileName = filePath.split(/[\\/]/).pop()?.replace(/\.[^.]+$/, "") || "";
      const metadata = {
        name: parsed.metadata.name === "Projet importé" && fileName ? cleanProjectName(fileName) : parsed.metadata.name,
        createdAt: parsed.metadata.createdAt,
      };
      const normalized = serializeProjectFile(parsed.project, parsed.board, metadata);
      const summary = await saveManagedProjectRecord(undefined, normalized);
      setProjects((current) => [summary, ...current.filter((project) => project.id !== summary.id)]);
      applyProjectToStudio({ ...parsed, metadata }, summary);
      setLibraryMessage("");
    } catch (error) {
      setLibraryMessage(error instanceof Error ? error.message : "Ce fichier de projet est invalide.");
    } finally {
      setLibraryBusy(false);
    }
  }

  async function goToProjectLibrary() {
    if (libraryBusy && !saveInFlightRef.current) return;
    const pending = saveInFlightRef.current;
    if (pending && !await pending) return;
    if (autoSaveEnabled && currentSignature !== lastSavedSignatureRef.current) {
      const saved = await saveProject({ quiet: true });
      if (!saved) return;
    }
    finishDrag();
    setSimRunning(false);
    setExamplesOpen(false);
    setAppView("projects");
    await refreshProjectLibrary();
  }

  async function copyCode() {
    await navigator.clipboard.writeText(generatedCode);
    flashNotice("Code copié");
  }

  function fallbackDownload() {
    const blob = new Blob([generatedCode], { type: "text/x-arduino;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "MinitelBlocks.ino";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  async function exportSketch() {
    if (window.minitelStudio?.exportArduinoProject) {
      const result = await window.minitelStudio.exportArduinoProject({ projectName: "MinitelBlocks", code: generatedCode });
      if (result.ok) {
        flashNotice("Projet Arduino complet exporté");
        return;
      }
      if (result.canceled) {
        flashNotice("Export annulé");
        return;
      }
    }
    fallbackDownload();
    flashNotice("Sketch téléchargé");
  }

  async function uploadSketch() {
    setRightTab("upload");
    if (!window.minitelStudio?.uploadToEsp32) {
      setUploadOutput("Le téléversement direct est disponible dans l'application installée.");
      return;
    }
    setUploading(true);
    setUploadStage("detect");
    setUploadOutput("Préparation du téléversement...");
    try {
      const result: UploadResult = await window.minitelStudio.uploadToEsp32({ code: generatedCode, board, port: uploadPort.trim() });
      if (result.port) setUploadPort(result.port);
      setUploadStage(result.ok ? "done" : "error");
      setUploadOutput(result.output || (result.ok ? "Téléversement terminé" : "Téléversement impossible"));
      flashNotice(result.ok ? "Téléversement terminé" : "Téléversement échoué");
      void refreshSerialPorts(true);
    } catch (error) {
      setUploadStage("error");
      setUploadOutput(String(error));
      flashNotice("Téléversement échoué");
    } finally {
      setUploading(false);
    }
  }

  async function changeAutomaticUpdates(enabled: boolean) {
    const previous = automaticUpdatesEnabled;
    setAutomaticUpdatesEnabled(enabled);
    const bridge = window.minitelStudio;
    if (!bridge?.setAutomaticUpdatesEnabled) return;
    try {
      const status = await bridge.setAutomaticUpdatesEnabled(enabled);
      setAppUpdate(status);
      setAutomaticUpdatesEnabled(status.automaticUpdatesEnabled);
    } catch {
      setAutomaticUpdatesEnabled(previous);
      flashNotice("Impossible d'enregistrer le réglage des mises à jour");
    }
  }

  async function changeTestServerSettings(settings: { enabled: boolean; port: number }) {
    const bridge = window.minitelStudio;
    if (!bridge?.setTestServerSettings) return;
    const previous = testServer;
    const port = clamp(Math.trunc(Number(settings.port)) || previous.port, 1024, 65535);
    setTestServer({
      ...previous,
      enabled: settings.enabled,
      port,
      running: settings.enabled && port === previous.port ? previous.running : false,
      error: undefined,
      baseUrl: "http://localhost:" + port,
      endpoints: {
        get: "http://localhost:" + port + "/test",
        post: "http://localhost:" + port + "/echo",
        put: "http://localhost:" + port + "/echo",
        patch: "http://localhost:" + port + "/echo",
        delete: "http://localhost:" + port + "/echo",
      },
    });
    try {
      setTestServer(await bridge.setTestServerSettings({ enabled: settings.enabled, port }));
    } catch {
      setTestServer(previous);
      flashNotice("Impossible d'enregistrer le serveur de test");
    }
  }

  async function handleAppUpdate() {
    const bridge = window.minitelStudio;
    if (!appUpdate || !bridge) return;
    try {
      const status = appUpdate.status === "ready"
        ? await bridge.installUpdate()
        : await bridge.checkForUpdates();
      setAppUpdate(status);
    } catch {
      setAppUpdate((current) => current ? { ...current, status: "error", message: "Impossible de vérifier la mise à jour." } : current);
    }
  }

  useEffect(() => {
    if (!autoSaveEnabled || appView !== "studio" || !currentProject || !projectDirty || libraryBusy || saveState === "saving" || saveState === "error") return undefined;
    const timer = window.setTimeout(() => void saveProject({ quiet: true }), AUTO_SAVE_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [appView, autoSaveEnabled, currentProject, currentSignature, libraryBusy, projectDirty, saveState]);

  useEffect(() => {
    const bridge = window.minitelStudio;
    if (bridge?.onAppSaveRequested && bridge.completeAppSaveRequest) {
      return bridge.onAppSaveRequested((request) => {
        void flushAutoSave()
          .then((ok) => bridge.completeAppSaveRequest({ id: request.id, ok }))
          .catch(() => bridge.completeAppSaveRequest({ id: request.id, ok: false }));
      });
    }
    const handleBeforeUnload = () => {
      if (!autoSaveEnabled || appView !== "studio" || !currentProject || !projectDirty) return;
      const contents = serializeProjectFile({ stacks, variables, screenConfig, screens, activeScreenId, workspaceMode }, board, currentMetadata);
      const records = readBrowserProjectRecords().filter((record) => record.id !== currentProject.id);
      records.push({ id: currentProject.id, contents, modifiedAt: new Date().toISOString() });
      writeBrowserProjectRecords(records);
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [activeScreenId, appView, autoSaveEnabled, board, currentMetadata, currentProject, currentSignature, projectDirty, screenConfig, screens, stacks, variables, workspaceMode]);

  const updateVisible = Boolean(appUpdate && !["idle", "disabled", "up-to-date"].includes(appUpdate.status));
  const updateCanAct = appUpdate?.status === "ready" || appUpdate?.status === "error";
  const updateLabel = !appUpdate ? "" :
    appUpdate.status === "checking" ? "Recherche..." :
    appUpdate.status === "available" ? "Nouvelle version" :
    appUpdate.status === "downloading" ? "Mise à jour " + Math.round(appUpdate.percent || 0) + " %" :
    appUpdate.status === "ready" ? "Redémarrer" :
    appUpdate.status === "installing" ? "Installation..." :
    appUpdate.status === "error" ? "Réessayer" :
    appUpdate.message;

  if (appView === "projects") {
    return (
      <>
        <ProjectHub
          projects={projects}
          selectedId={selectedProjectId}
          loading={libraryLoading}
          busy={libraryBusy}
          message={libraryMessage}
          onSelectedId={setSelectedProjectId}
          onRefresh={() => void refreshProjectLibrary()}
          onOpen={openManagedProject}
          onCreate={createManagedProject}
          onImport={importProjectToLibrary}
          onDelete={deleteManagedProject}
          onOpenSettings={() => setSettingsOpen(true)}
        />
        <SettingsDialog open={settingsOpen} theme={theme} autoSaveEnabled={autoSaveEnabled} automaticUpdatesEnabled={automaticUpdatesEnabled} testServer={testServer} onThemeChange={setTheme} onAutoSaveChange={setAutoSaveEnabled} onAutomaticUpdatesChange={(enabled) => void changeAutomaticUpdates(enabled)} onTestServerChange={(settings) => void changeTestServerSettings(settings)} onClose={() => setSettingsOpen(false)} />
      </>
    );
  }

  return (
    <div className={"app-shell" + (dragPreview ? " dragging-active" : "") + (paletteDefinitionById[draggingPaletteId]?.output?.valueType === "number" ? " expression-number-dragging" : paletteDefinitionById[draggingPaletteId]?.output?.valueType === "boolean" ? " expression-boolean-dragging" : paletteDefinitionById[draggingPaletteId]?.output?.valueType === "text" ? " expression-text-dragging" : "")} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={cancelPointerDrag}>
      <header className="topbar">
        <div className="brand-mark"><img src={appLogo} alt="" /></div>
        <div className="brand-copy">
          <h1>{currentProject?.name ?? "Projet Minitel"}</h1>
          <p>Minitel Blocks Studio · {screenConfig.columns} × {screenConfig.rows} · {screenConfig.colorEnabled ? "couleur" : "monochrome"} <span className={"project-save-state " + saveState}>{saveState === "saving" ? "Sauvegarde..." : saveState === "dirty" ? "Modifié" : saveState === "error" ? "Erreur de sauvegarde" : "Sauvegardé"}</span></p>
        </div>
        <div className="topbar-actions">
          {appUpdate && updateVisible ? (
            <button
              type="button"
              className={"update-indicator status-" + appUpdate.status}
              onClick={() => void handleAppUpdate()}
              disabled={!updateCanAct}
              title={appUpdate.message}
              aria-label={updateLabel}
              aria-live="polite"
            >
              {appUpdate.status === "ready" ? <RotateCcw size={17} /> :
                appUpdate.status === "available" || appUpdate.status === "downloading" ? <Download size={17} /> :
                <RefreshCw size={17} />}
              <span className="update-label">{updateLabel}</span>
              {appUpdate.status === "downloading" ? (
                <span className="update-progress" aria-hidden="true"><i style={{ width: Math.max(3, appUpdate.percent || 0) + "%" }} /></span>
              ) : null}
            </button>
          ) : null}
          <button type="button" className="tool-button icon-only" onClick={() => void goToProjectLibrary()} title="Retour aux projets (Ctrl+O)"><House size={18} /></button>
          <button type="button" className="tool-button icon-only" onClick={() => setSettingsOpen(true)} title="Ouvrir les paramètres"><Settings2 size={18} /></button>
          <div className="history-actions" aria-label="Historique">
            <button type="button" className="tool-button icon-only" onClick={undo} disabled={history.past.length === 0} title="Annuler (Ctrl+Z)"><Undo2 size={18} /></button>
            <button type="button" className="tool-button icon-only" onClick={redo} disabled={history.future.length === 0} title="Rétablir (Ctrl+Y)"><Redo2 size={18} /></button>
          </div>
          <button type="button" className={"tool-button save-state-" + saveState} onClick={() => void saveProject()} disabled={saveState === "saving"} title="Sauvegarder le projet (Ctrl+S)"><Save size={18} /><span>{saveState === "saving" ? "Sauvegarde..." : "Sauvegarder"}</span></button>
          <button type="button" className="tool-button" onClick={() => void exportProjectFile()} title="Exporter une copie .mbs"><FileDown size={18} /><span>Exporter</span></button>
          <button type="button" className="tool-button" onClick={() => setExamplesOpen(true)} title="Ouvrir les exemples"><Wand2 size={18} /><span>Exemples</span></button>
          <button type="button" className="tool-button" onClick={exportSketch} title="Exporter vers Arduino"><Download size={18} /><span>Arduino</span></button>
          <button type="button" className="tool-button primary" onClick={uploadSketch} title="Téléverser sur l'ESP32"><Upload size={18} /><span>Téléverser</span></button>
        </div>
      </header>

      <main className={"studio-grid " + workspaceMode + "-mode"}>
        {workspaceMode === "blocks" ? (
          <aside className="palette-panel" aria-label="Palette de blocs">
            <div className="section-title"><Plus size={18} /><span>Blocs</span></div>
            <div className="category-rail">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button type="button" key={category.id} className={"category-button " + (activeCategory === category.id ? "active" : "")} style={{ "--category-color": category.accent } as CategoryStyle} onClick={() => setActiveCategory(category.id)} title={category.label}>
                    <Icon size={18} />
                    <span>{category.label}</span>
                  </button>
                );
              })}
            </div>
            <div className="palette-list">
              {activeCategory === "variables" ? <VariableManager variables={variables} onAdd={addVariable} onChange={changeVariable} onRemove={removeVariable} /> : null}
              {activeCategory === "operators" ? <div className="operator-shelf"><Sigma size={18} /><span>Nombres, hasard et conditions</span></div> : null}
              {activeBlocks.map((definition) => <PaletteBlock definition={definition} isDragging={draggingPaletteId === definition.id} onQuickAdd={quickAddDefinition} onPaletteDragStart={beginPaletteDrag} onPalettePointerDown={preparePalettePointerDrag} onDragMove={moveDragPreview} onDragEnd={finishDrag} key={definition.id} />)}
            </div>
          </aside>
        ) : null}

        <section className="workspace-panel" aria-label="Espace de construction">
          <div className="workspace-header">
            <div className="workspace-heading">
              <div className="section-title"><Radio size={18} /><span>{workspaceMode === "blocks" ? "Programme" : "Éditeur d'écran"}</span></div>
              <p>{workspaceMode === "blocks" ? stacks.length + " pile" + (stacks.length > 1 ? "s" : "") + " active" + (stacks.length > 1 ? "s" : "") : screens.length + " écran" + (screens.length > 1 ? "s" : "") + " · " + sceneElements.length + " élément" + (sceneElements.length > 1 ? "s" : "")}</p>
            </div>
            <div className="workspace-mode-tabs" aria-label="Mode d'édition">
              <button type="button" className={workspaceMode === "blocks" ? "active" : ""} onClick={() => setWorkspaceMode("blocks")}><ListTree size={16} /><span>Blocs</span></button>
              <button type="button" className={workspaceMode === "designer" ? "active" : ""} onClick={() => setWorkspaceMode("designer")}><Monitor size={16} /><span>Écran</span></button>
            </div>
            <div className="workspace-chip"><Settings2 size={15} /><span>{screenConfig.columns} × {screenConfig.rows}</span></div>
          </div>

          {workspaceMode === "blocks" ? (
            <div className="workspace-canvas">
              {stacks.length === 0 ? <button type="button" className="empty-workspace" onClick={() => createStackFromEvent("event-setup")}><Plus size={22} /><span>Ajouter une pile</span></button> : null}
              {stacks.map((stack) => (
                <section className={"script-stack " + (activeStackId === stack.id ? "selected " : "") + (removingStacks.has(stack.id) ? "deleting " : "") + (draggingStackId === stack.id ? "dragging" : "")} key={stack.id} onClick={() => setSelectedStackId(stack.id)}>
                  <EventHeader stack={stack} variables={variables} onEventValueChange={updateEventValue} onDeleteStack={deleteStack} onStackPointerDown={prepareStackPointerDrag} />
                  <BlockListView blocks={stack.blocks} stackId={stack.id} slot="root" variables={variables} screens={screens} removingIds={removingIds} motionIds={motionIds} draggingBlockId={draggingBlockId} activeDropKey={activeDropKey} onDropBranch={handleDropBranch} onValueChange={updateBlockValue} onDelete={deleteBlock} onDuplicate={duplicateBlock} onMove={moveBlock} onDragStartBlock={beginWorkspaceDrag} onBlockPointerDown={prepareWorkspacePointerDrag} onDragMove={moveDragPreview} onActivateDrop={activateDropLocation} onDragEndBlock={finishDrag} />
                </section>
              ))}
            </div>
          ) : (
            <ScreenDesigner config={screenConfig} screens={screens} activeScreenId={activeScreen?.id ?? ""} onConfigChange={changeScreenConfig} onScreensChange={changeScreens} onActiveScreenChange={changeActiveScreen} onNotice={flashNotice} />
          )}
        </section>

        <aside className="inspector-panel" aria-label="Prévisualisation et code">
          <div className="segmented-tabs three-tabs">
            <button type="button" className={rightTab === "preview" ? "active" : ""} onClick={() => setRightTab("preview")}><Eye size={17} /><span>Simulation</span></button>
            <button type="button" className={rightTab === "code" ? "active" : ""} onClick={() => setRightTab("code")}><FileCode2 size={17} /><span>Code</span></button>
            <button type="button" className={rightTab === "upload" ? "active" : ""} onClick={() => setRightTab("upload")}><Usb size={17} /><span>ESP32</span></button>
          </div>

          {rightTab === "preview" ? (
            <div className="preview-panel">
              <div className="preview-toolbar">
                <div className="section-title compact"><Monitor size={17} /><span>{screenConfig.name}</span></div>
                <label className="preview-key"><Keyboard size={15} /><select value={previewKey} onChange={(event) => setPreviewKey(event.target.value)}><SelectOptionList options={keyOptions} /></select></label>
              </div>
              <div className="simulation-panel">
                <button type="button" className={"sim-button " + (simRunning ? "active" : "")} onClick={toggleSimulation} title={simRunning ? "Mettre en pause" : "Lancer la simulation"}>{simRunning ? <Pause size={16} /> : <Play size={16} />}<span>{simRunning ? "Pause" : "Lancer"}</span></button>
                <button type="button" className="sim-button" onClick={stepSimulation} title="Avancer d'un tour"><StepForward size={16} /><span>Pas</span></button>
                <button type="button" className="sim-button" onClick={resetSimulation} title="Remettre la simulation à zéro"><RotateCcw size={16} /><span>Reset</span></button>
                <button type="button" className="sim-button key-test" onClick={() => triggerSimulatedKey(previewKey)} title="Tester la touche sélectionnée"><Keyboard size={16} /><span>Tester {minitelKeyLabel(previewKey)}</span></button>
                <label className="speed-control"><span>{simSpeed} ms</span><input type="range" min="150" max="1200" step="50" value={simSpeed} onChange={(event) => setSimSpeed(Number(event.target.value))} /></label>
                <div className="sim-counter">Tour {Math.max(1, Math.min(12, simTick + 1))}</div>
              </div>
              <div className="minitel-frame">
                <div className="minitel-screen" style={{ gridTemplateColumns: "repeat(" + preview.columns + ", 1fr)", gridTemplateRows: "repeat(" + preview.rows + ", 1fr)", aspectRatio: (preview.columns * 4) + " / " + (preview.rows * 5), "--preview-columns": preview.columns } as CSSProperties}>
                  {preview.cells.map((cell, index) => {
                    const isCursor = index === (preview.cursorRow - 1) * preview.columns + (preview.cursorColumn - 1);
                    return <span className={"screen-cell" + (isCursor ? " cursor-cell" : "") + (cell.char !== " " ? " lit-cell" : "")} style={{ color: cell.fg, backgroundColor: cell.bg }} key={index}>{cell.char}</span>;
                  })}
                </div>
              </div>
              <div className="event-strip">{preview.messages.slice(-6).map((message, index) => <span key={message + index}>{message}</span>)}</div>
              <div className="sim-stats"><span className="baud-stat">Débit : {preview.baudRate} bauds</span>{Object.entries(preview.variables).map(([name, value]) => <span key={name} title={String(value)}>{name}: {compactPreviewVariable(value)}</span>)}</div>
            </div>
          ) : null}

          {rightTab === "code" ? (
            <div className="code-panel">
              <div className="code-toolbar">
                <div className="section-title compact"><FileCode2 size={17} /><span>Programme généré</span></div>
                <div className="code-actions"><button type="button" onClick={copyCode} title="Copier le code"><Copy size={16} /></button><button type="button" onClick={exportSketch} title="Exporter vers Arduino"><Download size={16} /></button></div>
              </div>
              <pre className="code-output">{generatedCode}</pre>
            </div>
          ) : null}

          {rightTab === "upload" ? (
            <div className="upload-panel">
              <div className="section-title compact"><Terminal size={17} /><span>Téléversement direct</span></div>
              <div className="upload-form">
                <label><Settings2 size={15} /><span>Carte</span><select value={board} onChange={(event) => setBoard(event.target.value)}><option value="esp32dev">ESP32 Dev Module</option><option value="nodemcu-32s">NodeMCU-32S</option><option value="esp32doit-devkit-v1">DOIT ESP32 DevKit V1</option></select></label>
                <div className="port-picker">
                  <div className="port-picker-label">
                    <span><Usb size={15} />Port détecté</span>
                    <button type="button" onClick={() => void refreshSerialPorts(false)} disabled={portsLoading} title="Actualiser les ports"><RefreshCw className={portsLoading ? "spinning" : ""} size={15} /></button>
                  </div>
                  <select value={uploadPort} onChange={(event) => setUploadPort(event.target.value)} aria-label="Port série">
                    {serialPorts.length === 0 ? <option value="">{portsLoading ? "Recherche..." : "Aucun port détecté"}</option> : null}
                    {serialPorts.map((port) => <option value={port.path} key={port.path}>{port.path + " · " + port.label}</option>)}
                  </select>
                  <div className={"port-status " + (engineReady === false ? "error" : serialPorts.length > 0 ? "connected" : "waiting")}>
                    <span aria-hidden="true" />
                    {engineReady === false ? "Moteur ESP32 indisponible" : serialPorts.length > 0 ? (serialPorts.find((port) => port.path === uploadPort)?.likelyEsp32 ? "ESP32 reconnu automatiquement" : "Port prêt") : "Branche un ESP32"}
                  </div>
                </div>
                <div className={"upload-steps stage-" + uploadStage} aria-label="Progression du téléversement">
                  <span className="step-detect"><i />Connexion</span>
                  <span className="step-compile"><i />Compilation</span>
                  <span className="step-upload"><i />Envoi</span>
                </div>
                <button type="button" className="upload-button" onClick={uploadSketch} disabled={uploading || engineReady === false}><Upload size={17} /><span>{uploading ? "Téléversement..." : "Envoyer à l'ESP32"}</span></button>
              </div>
              <pre className="terminal-output">{uploadOutput}</pre>
            </div>
          ) : null}
        </aside>
      </main>

      {dragPreview ? (
        <div ref={dragPreviewElementRef} className={"drag-preview " + dragPreview.shape} style={{ "--block-color": dragPreview.color, transform: "translate3d(" + (dragPreview.x + 16) + "px, " + (dragPreview.y + 16) + "px, 0)" } as DragPreviewStyle}>
          <span>{dragPreview.title}</span>
          <small>{dragPreview.helper}</small>
        </div>
      ) : null}

      {examplesOpen ? (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setExamplesOpen(false); }}>
          <section className="modal-card examples-modal" role="dialog" aria-modal="true" aria-labelledby="examples-title">
            <header className="modal-header">
              <div><span className="modal-kicker">Démarrer rapidement</span><h2 id="examples-title">Choisir un exemple</h2><p>Chaque exemple peut être modifié, simulé puis envoyé à l'ESP32.</p></div>
              <button type="button" className="icon-button" onClick={() => setExamplesOpen(false)} title="Fermer"><X size={18} /></button>
            </header>
            <div className="examples-list">
              {projectExamples.map((example, index) => (
                <button type="button" className="example-option" style={{ borderLeftColor: example.accent }} onClick={() => loadExample(example.id)} key={example.id}>
                  <span className="example-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="example-copy"><strong>{example.name}</strong><span>{example.description}</span></span>
                  <ChevronDown className="example-arrow" size={18} />
                </button>
              ))}
            </div>
          </section>
        </div>
      ) : null}

      <SettingsDialog open={settingsOpen} theme={theme} autoSaveEnabled={autoSaveEnabled} automaticUpdatesEnabled={automaticUpdatesEnabled} testServer={testServer} onThemeChange={setTheme} onAutoSaveChange={setAutoSaveEnabled} onAutomaticUpdatesChange={(enabled) => void changeAutomaticUpdates(enabled)} onTestServerChange={(settings) => void changeTestServerSettings(settings)} onClose={() => setSettingsOpen(false)} />
      <div className={"notice " + (notice ? "show" : "")}>{notice}</div>
    </div>
  );
}

export default App;
