import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent, type PointerEvent } from "react";
import appLogo from "../logo.png";
import Braces from "lucide-react/dist/esm/icons/braces.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import Cpu from "lucide-react/dist/esm/icons/cpu.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import Eraser from "lucide-react/dist/esm/icons/eraser.js";
import Eye from "lucide-react/dist/esm/icons/eye.js";
import FileCode2 from "lucide-react/dist/esm/icons/file-code-2.js";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open.js";
import GitBranch from "lucide-react/dist/esm/icons/git-branch.js";
import GripVertical from "lucide-react/dist/esm/icons/grip-vertical.js";
import Keyboard from "lucide-react/dist/esm/icons/keyboard.js";
import ListTree from "lucide-react/dist/esm/icons/list-tree.js";
import Monitor from "lucide-react/dist/esm/icons/monitor.js";
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
import Sigma from "lucide-react/dist/esm/icons/sigma.js";
import Sparkles from "lucide-react/dist/esm/icons/sparkles.js";
import StepForward from "lucide-react/dist/esm/icons/step-forward.js";
import Terminal from "lucide-react/dist/esm/icons/terminal.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Type from "lucide-react/dist/esm/icons/type.js";
import Undo2 from "lucide-react/dist/esm/icons/undo-2.js";
import Upload from "lucide-react/dist/esm/icons/upload.js";
import Usb from "lucide-react/dist/esm/icons/usb.js";
import Variable from "lucide-react/dist/esm/icons/variable.js";
import Volume2 from "lucide-react/dist/esm/icons/volume-2.js";
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

type BlockKind = "event" | "action" | "control" | "value";
type InputType = "text" | "number" | "select" | "color" | "boolean" | "variable" | "condition" | "screen";
type ExprType = "number" | "boolean" | "text";
type RightTab = "preview" | "code" | "upload";
type WorkspaceMode = "blocks" | "designer";

type SelectOption = {
  label: string;
  value: string;
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

type Expr = LiteralExpr | VariableExpr | BinaryExpr | CompareExpr;
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
  defaultValue: Expr;
};

type ProjectSnapshot = {
  stacks: ScriptStack[];
  variables: VariableDef[];
  screenConfig: MinitelScreenConfig;
  screens: MinitelScene[];
  activeScreenId: string;
};

type ProjectFile = {
  format: "minitel-blocks-studio";
  version: 2;
  savedAt: string;
  board: string;
  project: ProjectSnapshot;
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

type DragPayload =
  | { source: "palette"; definitionId: string }
  | { source: "workspace"; stackId: string; blockId: string }
  | { source: "stack"; stackId: string };

type DragPreviewState = {
  title: string;
  helper: string;
  color: string;
  shape: "brick" | "event-hat" | "c-block";
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
  variables: Record<string, number>;
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

const uid = () => "id-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
const num = (value: number): Expr => ({ kind: "literal", valueType: "number", value });
const boolExpr = (value: boolean): Expr => ({ kind: "literal", valueType: "boolean", value });
const variableExpr = (name: string): Expr => ({ kind: "variable", valueType: "number", name });
const addExpr = (left: Expr, right: Expr): Expr => ({ kind: "binary", valueType: "number", op: "+", left, right });
const compareExpr = (left: Expr, op: CompareExpr["op"], right: Expr): Expr => ({ kind: "compare", valueType: "boolean", op, left, right });

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

function keyCondition(value: InputValue | undefined) {
  const key = textValue(value, "A");
  if (key === "Enter") {
    return "key.type == MinitelESP32::KeyType::Enter";
  }
  if (key === "Backspace") {
    return "key.type == MinitelESP32::KeyType::Backspace";
  }
  return "key.isCharacter() && key.character == " + cppChar(key);
}

function previewKeyMatches(value: InputValue | undefined, previewKey: string) {
  return textValue(value, "A") === previewKey;
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

const keyOptions: SelectOption[] = [
  { label: "A", value: "A" },
  { label: "B", value: "B" },
  { label: "C", value: "C" },
  { label: "0", value: "0" },
  { label: "1", value: "1" },
  { label: "#", value: "#" },
  { label: "*", value: "*" },
  { label: "Entrée", value: "Enter" },
  { label: "Retour", value: "Backspace" },
];

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
    { key: "variable", label: "variable", type: "variable", defaultValue: "compteur" },
    { key: "from", label: "de", type: "number", defaultValue: num(1), compact: true },
    { key: "to", label: "à", type: "number", defaultValue: num(5), compact: true },
    { key: "step", label: "pas", type: "number", defaultValue: num(1), compact: true },
  ], slots: [{ key: "children", label: "faire" }] },

  { id: "var-set", title: "mettre variable à", help: "Initialise ou remplace la valeur d'une variable.", kind: "action", category: "variables", color: "#f25f5c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "maVariable" },
    { key: "value", label: "valeur", type: "number", defaultValue: num(1) },
  ] },
  { id: "var-change", title: "ajouter à variable", help: "Ajoute un nombre à une variable.", kind: "action", category: "variables", color: "#f25f5c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "maVariable" },
    { key: "delta", label: "valeur", type: "number", defaultValue: num(1) },
  ] },
  { id: "var-show", title: "afficher variable à", help: "Écrit la valeur d'une variable à l'écran.", kind: "action", category: "variables", color: "#f25f5c", inputs: [
    { key: "variable", label: "variable", type: "variable", defaultValue: "maVariable" },
    { key: "column", label: "col", type: "number", defaultValue: num(2), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(20), min: 1, max: 24, compact: true },
  ] },

  { id: "operator-note", title: "7 + 8", help: "Utilise le mode calcul dans un champ arrondi.", kind: "value", category: "operators", color: "#59b45f", inputs: [{ key: "demo", label: "résultat", type: "number", defaultValue: addExpr(num(7), num(8)) }] },
  { id: "operator-compare", title: "comparer", help: "Utilise une condition hexagonale dans les blocs si.", kind: "value", category: "operators", color: "#59b45f", inputs: [{ key: "demo", label: "test", type: "condition", defaultValue: compareExpr(variableExpr("maVariable"), ">", num(8)) }] },

  { id: "show-key", title: "afficher la touche reçue", help: "Écrit la touche lue par le Minitel, dans une pile de touche.", kind: "action", category: "input", color: "#e14d72", inputs: [
    { key: "column", label: "col", type: "number", defaultValue: num(2), min: 1, max: 40, compact: true },
    { key: "row", label: "ligne", type: "number", defaultValue: num(22), min: 1, max: 24, compact: true },
  ] },
  { id: "read-line", title: "demander un texte", help: "Lit une ligne saisie au clavier du Minitel.", kind: "action", category: "input", color: "#e14d72", inputs: [{ key: "timeout", label: "timeout ms", type: "number", defaultValue: num(5000), min: 0, max: 60000, step: 500 }] },

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
  return cloneValue(fallback);
}

function normalizeImportedCondition(value: unknown, fallback: Expr): Expr {
  const record = importedRecord(value);
  if (record?.kind === "compare" && ["==", "!=", "<", "<=", ">", ">="].includes(String(record.op))) {
    return compareExpr(
      normalizeImportedNumberExpr(record.left),
      String(record.op) as CompareExpr["op"],
      normalizeImportedNumberExpr(record.right),
    );
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
    return [{ id: uid(), name, defaultValue: normalizeImportedNumberExpr(source.defaultValue) }];
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

function serializeProjectFile(snapshot: ProjectSnapshot, board: string) {
  const document: ProjectFile = {
    format: PROJECT_FILE_FORMAT,
    version: PROJECT_FILE_VERSION,
    savedAt: new Date().toISOString(),
    board: supportedProjectBoards.has(board) ? board : "esp32dev",
    project: cloneProjectSnapshot(snapshot),
  };
  return JSON.stringify(document, null, 2);
}

function parseProjectFile(contents: string): { project: ProjectSnapshot; board: string } {
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
  };
  const board = typeof document.board === "string" && supportedProjectBoards.has(document.board) ? document.board : "esp32dev";
  return { project, board };
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
    { id: uid(), name: "maVariable", defaultValue: num(2) },
    { id: uid(), name: "compteur", defaultValue: num(0) },
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

function createScreenState(name = "Écran principal", elements: SceneElement[] = []) {
  const screen = createMinitelScene(name, elements);
  return { screens: [screen], activeScreenId: screen.id };
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
    create: () => ({ stacks: createCounterStacks(), variables: [{ id: uid(), name: "compteur", defaultValue: num(0) }], screenConfig: createDefaultScreenConfig(), ...createScreenState() }),
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
      };
    },
  },
];

function createInitialProject() {
  return projectExamples[0].create();
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
    case "binary":
      return "(" + exprCode(expr.left) + " " + expr.op + " " + exprCode(expr.right) + ")";
    case "compare":
      return "(" + exprCode(expr.left) + " " + expr.op + " " + exprCode(expr.right) + ")";
  }
}

function exprPreviewNumber(value: InputValue | undefined, variables: Record<string, number>, fallback = 0): number {
  const expr = isExpr(value) ? value : typeof value === "number" ? num(value) : num(fallback);
  switch (expr.kind) {
    case "literal":
      return Number(expr.value) || 0;
    case "variable":
      return variables[expr.name] ?? 0;
    case "binary": {
      const left = exprPreviewNumber(expr.left, variables, fallback);
      const right = exprPreviewNumber(expr.right, variables, fallback);
      if (expr.op === "+") return left + right;
      if (expr.op === "-") return left - right;
      if (expr.op === "*") return left * right;
      if (expr.op === "/") return right === 0 ? 0 : left / right;
      return right === 0 ? 0 : left % right;
    }
    case "compare":
      return exprPreviewBoolean(expr, variables) ? 1 : 0;
  }
}

function exprPreviewBoolean(value: InputValue | undefined, variables: Record<string, number>): boolean {
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
  if (value.kind === "binary") {
    return expressionLabel(value.left) + " " + value.op + " " + expressionLabel(value.right);
  }
  return expressionLabel(value.left) + " " + value.op + " " + expressionLabel(value.right);
}

function collectExprVariables(value: InputValue | undefined, target: Set<string>) {
  if (!isExpr(value)) {
    return;
  }
  if (value.kind === "variable") {
    target.add(value.name);
    return;
  }
  if (value.kind === "binary" || value.kind === "compare") {
    collectExprVariables(value.left, target);
    collectExprVariables(value.right, target);
  }
}

function walkBlocks(blocks: ProgramBlock[], visit: (block: ProgramBlock) => void) {
  blocks.forEach((block) => {
    visit(block);
    walkBlocks(block.children ?? [], visit);
    walkBlocks(block.elseChildren ?? [], visit);
  });
}

function collectVariableNames(stacks: ScriptStack[], variables: VariableDef[]) {
  const names = new Set<string>();
  variables.forEach((variable) => names.add(variable.name));
  stacks.forEach((stack) => {
    Object.values(stack.event.values).forEach((value) => collectExprVariables(value, names));
    walkBlocks(stack.blocks, (block) => {
      Object.entries(block.values).forEach(([key, value]) => {
        if (key === "variable" && typeof value === "string") {
          names.add(value);
        }
        collectExprVariables(value, names);
      });
    });
  });
  return Array.from(names).filter(Boolean);
}

function pushLine(lines: string[], indent: number, line: string) {
  lines.push(" ".repeat(indent) + line);
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
        pushLine(lines, indent, "minitel.foreground(" + colorEnum(values.color) + ");");
        break;
      case "background":
        pushLine(lines, indent, "minitel.background(" + colorEnum(values.color) + ");");
        break;
      case "set-colors":
        pushLine(lines, indent, "minitel.colors(" + colorEnum(values.fg) + ", " + colorEnum(values.bg) + ");");
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

function appendSceneCode(lines: string[], elements: SceneElement[], indent: number) {
  if (elements.length === 0) return;
  pushLine(lines, indent, "// Composition créée dans le mode Écran");
  elements.forEach((element) => {
    if (element.kind === "text") {
      pushLine(lines, indent, "minitel.colors(MinitelESP32::Color::" + element.fg + ", MinitelESP32::Color::" + element.bg + ");");
      pushLine(lines, indent, "minitel.setTextSize(MinitelESP32::TextSize::" + element.size + ");");
      pushLine(lines, indent, "minitel.moveTo(" + element.x + ", " + element.y + ");");
      pushLine(lines, indent, "minitel.sendText(" + cppString(element.text) + ");");
      pushLine(lines, indent, "minitel.setTextSize(MinitelESP32::TextSize::Normal);");
      return;
    }

    pushLine(lines, indent, "minitel.foreground(MinitelESP32::Color::" + element.fg + ");");
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
  const variableNames = collectVariableNames(stacks, variables);
  const lines: string[] = ["#include <Arduino.h>", "#include <MinitelESP32.h>", "", "// " + screenConfig.name + " : " + screenConfig.columns + " x " + screenConfig.rows, "MinitelESP32 minitel(Serial2, 16, 17, 1200);"];

  if (variableNames.length > 0) {
    lines.push("");
    variableNames.forEach((name) => {
      const variable = variables.find((item) => item.name === name);
      lines.push("int " + sanitizeIdentifier(name) + " = (int)(" + exprCode(variable?.defaultValue, num(0)) + ");");
    });
  }

  screens.forEach((screen) => {
    lines.push("", "// Écran : " + screen.name.replace(/[\r\n]+/g, " "), "void " + screenFunctionName(screen) + "() {", "  minitel.resetDisplay();");
    appendSceneCode(lines, screen.elements, 2);
    lines.push("}");
  });

  lines.push("", "void setup() {", "  minitel.begin();", "  minitel.resetDisplay();");
  setupStacks.forEach((stack) => appendBlockCode(lines, stack.blocks, 2, variables, { screens }));
  lines.push("}", "", "void loop() {");

  if (keyStacks.length > 0) {
    lines.push("  MinitelESP32::Key key = minitel.readKey();");
    keyStacks.forEach((stack) => {
      if (stack.event.definitionId === "event-key-any") {
        lines.push("  if (key.available()) {");
      } else {
        lines.push("  if (" + keyCondition(stack.event.values.key) + ") {");
      }
      appendBlockCode(lines, stack.blocks, 4, variables, { keyVariable: "key", screens });
      lines.push("  }");
    });
  }

  loopStacks.forEach((stack) => appendBlockCode(lines, stack.blocks, 2, variables, { screens }));
  lines.push("  delay(10);", "}");
  return lines.join("\n");
}

function emptyPreviewCells(columns: number, rows: number) {
  return Array.from({ length: columns * rows }, () => ({ char: " ", fg: previewColors.White, bg: previewColors.Black }));
}

function createPreviewState(variables: VariableDef[], screenConfig: MinitelScreenConfig): PreviewState {
  const values: Record<string, number> = {};
  variables.forEach((variable) => {
    values[variable.name] = exprPreviewNumber(variable.defaultValue, values, 0);
  });
  return { cells: emptyPreviewCells(screenConfig.columns, screenConfig.rows), columns: screenConfig.columns, rows: screenConfig.rows, cursorColumn: 1, cursorRow: 1, fg: previewColors.White, bg: previewColors.Black, textSize: "Normal", baudRate: 1200, messages: [], variables: values };
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

function applyBlocksPreview(state: PreviewState, blocks: ProgramBlock[], previewKey: string, screens: MinitelScene[], depth = 0) {
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
        state.fg = previewColors[textValue(values.color, "White")];
        break;
      case "background":
        state.bg = previewColors[textValue(values.color, "Black")];
        break;
      case "set-colors":
        state.fg = previewColors[textValue(values.fg, "White")];
        state.bg = previewColors[textValue(values.bg, "Black")];
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
        state.variables[name] = (state.variables[name] ?? 0) + exprPreviewNumber(values.delta, state.variables, 1);
        state.messages.push(name + " = " + state.variables[name]);
        break;
      }
      case "var-show":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 2), exprPreviewNumber(values.row, state.variables, 20));
        writePreviewText(state, String(state.variables[textValue(values.variable, "maVariable")] ?? 0));
        break;
      case "control-repeat": {
        const count = clamp(exprPreviewNumber(values.times, state.variables, 10), 0, 20);
        for (let index = 0; index < count; index += 1) {
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, depth + 1);
        }
        break;
      }
      case "control-forever":
        state.messages.push("Toujours: aperçu 1 tour");
        applyBlocksPreview(state, block.children ?? [], previewKey, screens, depth + 1);
        break;
      case "control-if":
        if (exprPreviewBoolean(values.condition, state.variables)) {
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, depth + 1);
        }
        break;
      case "control-if-else":
        applyBlocksPreview(state, exprPreviewBoolean(values.condition, state.variables) ? block.children ?? [] : block.elseChildren ?? [], previewKey, screens, depth + 1);
        break;
      case "control-for": {
        const name = textValue(values.variable, "compteur");
        const from = clamp(exprPreviewNumber(values.from, state.variables, 1), -999, 999);
        const to = clamp(exprPreviewNumber(values.to, state.variables, 5), -999, 999);
        const step = Math.max(1, Math.abs(clamp(exprPreviewNumber(values.step, state.variables, 1), -999, 999)));
        let guard = 0;
        for (let current = from; current <= to && guard < 20; current += step) {
          state.variables[name] = current;
          applyBlocksPreview(state, block.children ?? [], previewKey, screens, depth + 1);
          guard += 1;
        }
        break;
      }
      case "show-key":
        setCursor(state, exprPreviewNumber(values.column, state.variables, 2), exprPreviewNumber(values.row, state.variables, 22));
        writePreviewText(state, previewKey === "Enter" ? "ENTREE" : previewKey === "Backspace" ? "RETOUR" : previewKey);
        break;
      case "read-line":
        state.messages.push("Lecture clavier simulée");
        break;
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
    state.fg = previewColors[element.fg];
    if (element.kind === "text") {
      state.bg = previewColors[element.bg];
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

function simulatePreview(stacks: ScriptStack[], variables: VariableDef[], previewKey: string, simulationTick: number, simulatedKeys: string[], screenConfig: MinitelScreenConfig, screens: MinitelScene[]) {
  const state = createPreviewState(variables, screenConfig);
  const setupStacks = stacks.filter((stack) => stack.event.definitionId === "event-setup");
  const loopStacks = stacks.filter((stack) => stack.event.definitionId === "event-loop");
  const keyStacks = stacks.filter((stack) => stack.event.definitionId === "event-key-any" || stack.event.definitionId === "event-key-char");
  const loopCount = Math.max(1, Math.min(12, simulationTick + 1));

  setupStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey, screens));
  for (let turn = 0; turn < loopCount; turn += 1) {
    loopStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey, screens));
  }

  simulatedKeys.slice(-12).forEach((key) => {
    state.messages.push("Touche " + (key === "Enter" ? "Entrée" : key === "Backspace" ? "Retour" : key));
    keyStacks
      .filter((stack) => stack.event.definitionId === "event-key-any" || previewKeyMatches(stack.event.values.key, key))
      .forEach((stack) => applyBlocksPreview(state, stack.blocks, key, screens));
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

function setInvisibleDragImage(event: DragEvent<HTMLElement>) {
  const canvas = document.createElement("canvas");
  canvas.width = 1;
  canvas.height = 1;
  event.dataTransfer.setDragImage(canvas, 0, 0);
}

function dragShapeForDefinition(definition: BlockDefinition): DragPreviewState["shape"] {
  if (definition.kind === "event") return "event-hat";
  if (definition.kind === "control") return "c-block";
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

function OperandEditor({ value, variables, onChange }: { value: Expr; variables: VariableDef[]; onChange: (value: Expr) => void }) {
  const mode = value.kind === "variable" ? "variable" : "literal";
  return (
    <span className="operand-editor">
      <select value={mode} onChange={(event) => onChange(event.target.value === "variable" ? variableExpr(variables[0]?.name ?? "maVariable") : num(0))}>
        <option value="literal">nombre</option>
        <option value="variable">variable</option>
      </select>
      {value.kind === "variable" ? (
        <select value={value.name} onChange={(event) => onChange({ ...value, name: event.target.value })}>
          {variables.map((variable) => (
            <option value={variable.name} key={variable.id}>{variable.name}</option>
          ))}
        </select>
      ) : (
        <input type="number" value={String(value.kind === "literal" ? value.value : 0)} onChange={(event) => onChange(num(Number(event.target.value)))} />
      )}
    </span>
  );
}

function NumberExpressionEditor({ value, variables, onChange }: { value: InputValue | undefined; variables: VariableDef[]; onChange: (value: Expr) => void }) {
  const expr = isExpr(value) ? value : num(Number(value) || 0);
  const mode = expr.kind === "binary" ? "binary" : expr.kind === "variable" ? "variable" : "literal";
  return (
    <span className="expression-pill number-expression">
      <select value={mode} onChange={(event) => {
        if (event.target.value === "variable") onChange(variableExpr(variables[0]?.name ?? "maVariable"));
        else if (event.target.value === "binary") onChange(addExpr(num(7), num(8)));
        else onChange(num(0));
      }}>
        <option value="literal">nombre</option>
        <option value="variable">variable</option>
        <option value="binary">calcul</option>
      </select>
      {mode === "variable" && expr.kind === "variable" ? (
        <select value={expr.name} onChange={(event) => onChange({ ...expr, name: event.target.value })}>
          {variables.map((variable) => (
            <option value={variable.name} key={variable.id}>{variable.name}</option>
          ))}
        </select>
      ) : null}
      {mode === "literal" ? (
        <input type="number" value={String(expr.kind === "literal" ? expr.value : 0)} onChange={(event) => onChange(num(Number(event.target.value)))} />
      ) : null}
      {mode === "binary" && expr.kind === "binary" ? (
        <span className="binary-row">
          <OperandEditor value={expr.left} variables={variables} onChange={(next) => onChange({ ...expr, left: next })} />
          <select className="operator-select" value={expr.op} onChange={(event) => onChange({ ...expr, op: event.target.value as BinaryExpr["op"] })}>
            <option value="+">+</option>
            <option value="-">-</option>
            <option value="*">×</option>
            <option value="/">÷</option>
            <option value="%">%</option>
          </select>
          <OperandEditor value={expr.right} variables={variables} onChange={(next) => onChange({ ...expr, right: next })} />
        </span>
      ) : null}
    </span>
  );
}

function BooleanExpressionEditor({ value, variables, onChange }: { value: InputValue | undefined; variables: VariableDef[]; onChange: (value: Expr) => void }) {
  const expr = (isExpr(value) && value.kind === "compare" ? value : compareExpr(variableExpr(variables[0]?.name ?? "maVariable"), ">", num(0))) as CompareExpr;
  return (
    <span className="expression-pill condition-expression">
      <OperandEditor value={expr.left} variables={variables} onChange={(next) => onChange({ ...expr, left: next })} />
      <select className="operator-select" value={expr.op} onChange={(event) => onChange({ ...expr, op: event.target.value as CompareExpr["op"] })}>
        <option value="==">=</option>
        <option value="!=">≠</option>
        <option value="<">&lt;</option>
        <option value="<=">≤</option>
        <option value=">">&gt;</option>
        <option value=">=">≥</option>
      </select>
      <OperandEditor value={expr.right} variables={variables} onChange={(next) => onChange({ ...expr, right: next })} />
    </span>
  );
}

function InputControl({ input, value, variables, screens = [], onChange }: { input: BlockInput; value: InputValue | undefined; variables: VariableDef[]; screens?: MinitelScene[]; onChange: (value: InputValue) => void }) {
  const actualValue = value ?? input.defaultValue;
  const stopDrag = (event: MouseEvent) => event.stopPropagation();
  const options = input.options ?? [];

  if (input.type === "number") {
    return (
      <label className="block-control expression-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <NumberExpressionEditor value={actualValue} variables={variables} onChange={onChange} />
      </label>
    );
  }

  if (input.type === "condition") {
    return (
      <label className="block-control expression-control condition-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <BooleanExpressionEditor value={actualValue} variables={variables} onChange={onChange} />
      </label>
    );
  }

  if (input.type === "text") {
    return (
      <label className="block-control block-control-wide" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <input type="text" value={String(actualValue)} onChange={(event) => onChange(event.target.value)} />
      </label>
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
    return (
      <label className="block-control variable-control" onMouseDown={stopDrag}>
        <span>{input.label}</span>
        <select value={String(actualValue)} onChange={(event) => onChange(event.target.value)}>
          {variables.map((variable) => (
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
        {options.map((option) => (
          <option value={option.value} key={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
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
  const shape = definition.kind === "event" ? "event-hat" : definition.kind === "control" ? "palette-c-block" : definition.kind === "value" ? "value-block" : "brick";
  return (
    <button
      className={"palette-block " + shape + (isDragging ? " dragging" : "")}
      style={style}
      draggable={false}
      onPointerDown={(event) => onPalettePointerDown(definition, event)}
      onDragStart={(event) => {
        if (definition.kind === "value") return;
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ source: "palette", definitionId: definition.id }));
        event.dataTransfer.effectAllowed = "copy";
        onPaletteDragStart(definition, event);
      }}
      onDrag={onDragMove}
      onDragEnd={onDragEnd}
      onClick={() => onQuickAdd(definition)}
      title={definition.help}
    >
      <span>{definition.title}</span>
      {definition.inputs?.slice(0, 2).map((input) => (
        <span className="palette-input-preview" key={input.key}>{input.type === "screen" ? "écran" : expressionLabel(input.defaultValue)}</span>
      ))}
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
                <InputControl key={input.key} input={input} variables={variables} screens={screens} value={block.values[input.key]} onChange={(value) => onValueChange(stackId, block.id, input.key, value)} />
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
              <InputControl key={input.key} input={input} variables={variables} value={stack.event.values[input.key]} onChange={(value) => onEventValueChange(stack.id, input.key, value)} />
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
      {variables.map((variable) => (
        <div className="variable-card" key={variable.id}>
          <input value={variable.name} onChange={(event) => onChange(variable.id, { name: event.target.value })} />
          <NumberExpressionEditor value={variable.defaultValue} variables={variables} onChange={(value) => onChange(variable.id, { defaultValue: value })} />
          <button type="button" onClick={() => onRemove(variable.id)} title="Supprimer"><Trash2 size={14} /></button>
        </div>
      ))}
    </div>
  );
}

function App() {
  const initialProjectRef = useRef<ProjectSnapshot | null>(null);
  if (!initialProjectRef.current) initialProjectRef.current = createInitialProject();
  const initialProject = initialProjectRef.current;
  const [activeCategory, setActiveCategory] = useState("start");
  const [variables, setVariables] = useState<VariableDef[]>(() => initialProject.variables);
  const [stacks, setStacks] = useState<ScriptStack[]>(() => initialProject.stacks);
  const [screenConfig, setScreenConfig] = useState<MinitelScreenConfig>(() => initialProject.screenConfig);
  const [screens, setScreens] = useState<MinitelScene[]>(() => initialProject.screens);
  const [activeScreenId, setActiveScreenId] = useState(() => initialProject.activeScreenId);
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("blocks");
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
  const motionTimersRef = useRef<Record<string, number>>({});
  const deleteTimersRef = useRef<number[]>([]);
  const noticeTimerRef = useRef<number | null>(null);
  const pendingPointerDragRef = useRef<PendingPointerDrag | null>(null);
  const suppressPaletteClickRef = useRef(false);
  const dragPreviewElementRef = useRef<HTMLDivElement | null>(null);
  const activeDropKeyRef = useRef("");
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
  const activeBlocks = blockDefinitions.filter((definition) => definition.category === activeCategory);
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) ?? screens[0];
  const sceneElements = activeScreen?.elements ?? [];
  const generatedCode = useMemo(() => generateArduinoCode(stacks, variables, screenConfig, screens), [screenConfig, screens, stacks, variables]);
  const preview = useMemo(() => simulatePreview(stacks, variables, previewKey, simTick, simulatedKeys, screenConfig, screens), [screenConfig, screens, stacks, variables, previewKey, simTick, simulatedKeys]);

  function moveDragPreview(event: { clientX: number; clientY: number }) {
    if (!event.clientX && !event.clientY) return;
    const previewElement = dragPreviewElementRef.current;
    if (previewElement) previewElement.style.transform = "translate3d(" + (event.clientX + 16) + "px, " + (event.clientY + 16) + "px, 0)";
  }

  function beginPaletteDrag(definition: BlockDefinition, event: DragEvent<HTMLElement>) {
    setInvisibleDragImage(event);
    setDraggingPaletteId(definition.id);
    setActiveDropKey("");
    setDragPreview({ title: definition.title, helper: "Nouveau bloc", color: definition.color, shape: dragShapeForDefinition(definition), x: event.clientX, y: event.clientY });
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
    setDraggingBlockId("");
    setDraggingPaletteId("");
    setDraggingStackId("");
    setActiveDropKey("");
    setDragPreview(null);
  }

  function preparePalettePointerDrag(definition: BlockDefinition, event: PointerEvent<HTMLElement>) {
    if (definition.kind === "value" || event.button !== 0) return;
    const sourceElement = event.currentTarget;
    sourceElement.setPointerCapture(event.pointerId);
    pendingPointerDragRef.current = {
      payload: { source: "palette", definitionId: definition.id },
      title: definition.title,
      helper: "Nouveau bloc",
      color: definition.color,
      shape: dragShapeForDefinition(definition),
      startX: event.clientX,
      startY: event.clientY,
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
      started: false,
      sourceBlockId: block.id,
      pointerId: event.pointerId,
      sourceElement,
    };
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
    const location = dropLocationFromPoint(x, y);
    const key = location ? dropLocationKey(location) : "";
    if (activeDropKeyRef.current === key) return;
    activeDropKeyRef.current = key;
    setActiveDropKey(key);
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    const pending = pendingPointerDragRef.current;
    if (!pending) return;
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
      const location = dropLocationFromPoint(event.clientX, event.clientY);
      if (location) handleDropBranch(pending.payload, location);
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
    const snapshot = cloneProjectSnapshot({ stacks, variables, screenConfig, screens, activeScreenId });
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
    setSelectedStackId((current) => (next.stacks.some((stack) => stack.id === current) ? current : next.stacks[0]?.id || ""));
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
    window.setTimeout(() => animateBlock(collectBlockIds(next.stacks.flatMap((stack) => stack.blocks)).slice(0, 40), "history-flash"), 0);
  }

  function undo() {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const now = cloneProjectSnapshot({ stacks, variables, screenConfig, screens, activeScreenId });
    setHistory({ past: history.past.slice(0, -1), future: [now, ...history.future].slice(0, HISTORY_LIMIT) });
    restoreSnapshot(previous);
    flashNotice("Retour en arrière");
  }

  function redo() {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const now = cloneProjectSnapshot({ stacks, variables, screenConfig, screens, activeScreenId });
    setHistory({ past: [...history.past.slice(-HISTORY_LIMIT + 1), now], future: history.future.slice(1) });
    restoreSnapshot(next);
    flashNotice("Action rétablie");
  }

  function triggerSimulatedKey(key: string) {
    const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
    if (!keyOptions.some((option) => option.value === normalizedKey)) return;
    setRightTab("preview");
    setPreviewKey(normalizedKey);
    setSimulatedKeys((current) => [...current.slice(-11), normalizedKey]);
    setSimTick((current) => current + 1);
    flashNotice("Touche " + (normalizedKey === "Enter" ? "Entrée" : normalizedKey === "Backspace" ? "Retour" : normalizedKey) + " simulée");
  }

  function resetSimulation() {
    setSimRunning(false);
    setSimTick(0);
    setSimulatedKeys([]);
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
    if (!simRunning) return undefined;
    const timer = window.setInterval(() => setSimTick((current) => current + 1), simSpeed);
    return () => window.clearInterval(timer);
  }, [simRunning, simSpeed]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tagName = target?.tagName;
      const isTyping = target?.isContentEditable || tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT";
      if (event.key === "Escape") {
        if (pendingPointerDragRef.current) cancelPointerDrag();
        if (examplesOpen) setExamplesOpen(false);
        return;
      }
      if (event.ctrlKey || event.metaKey) {
        const key = event.key.toLowerCase();
        if (key === "s") {
          event.preventDefault();
          void saveProject();
          return;
        }
        if (key === "o") {
          event.preventDefault();
          void openProject();
          return;
        }
        if (isTyping) return;
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

      const simulatedKey = event.key === "Enter" || event.key === "Backspace" ? event.key : event.key.length === 1 ? event.key.toUpperCase() : "";
      if (rightTab === "preview" && keyOptions.some((option) => option.value === simulatedKey)) {
        event.preventDefault();
        triggerSimulatedKey(simulatedKey);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeScreenId, board, examplesOpen, history, rightTab, screenConfig, screens, stacks, variables]);

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
    const unsubscribe = bridge.onUpdateStatus((status) => {
      if (active) setAppUpdate(status);
    });
    void bridge.getUpdateStatus()
      .then((status) => {
        if (active) setAppUpdate(status);
      })
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
      flashNotice("Choisis calcul dans un champ arrondi");
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

  function handleDropBranch(payload: DragPayload, location: DropLocation) {
    setActiveDropKey("");
    if (payload.source === "palette") {
      const definition = blockById[payload.definitionId];
      if (definition.kind === "event") {
        createStackFromEvent(definition.id);
        return;
      }
      if (definition.kind === "value") {
        flashNotice("Cette valeur se glisse dans les champs");
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
      const definition = blockById[payload.definitionId];
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
    setWorkspaceMode(next.screens.some((screen) => screen.elements.length > 0) ? "designer" : "blocks");
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
    setVariables((current) => [...current, { id: uid(), name: "variable" + (current.length + 1), defaultValue: num(0) }]);
  }

  function changeVariable(id: string, patch: Partial<VariableDef>) {
    pushHistory();
    setVariables((current) => current.map((variable) => (variable.id === id ? { ...variable, ...patch } : variable)));
  }

  function removeVariable(id: string) {
    if (variables.length <= 1) {
      flashNotice("Garde au moins une variable");
      return;
    }
    pushHistory();
    setVariables((current) => current.filter((variable) => variable.id !== id));
  }


  function fallbackSaveProject(contents: string) {
    const blob = new Blob([contents], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "Mon-projet-Minitel.mbs";
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

  async function saveProject() {
    const contents = serializeProjectFile({ stacks, variables, screenConfig, screens, activeScreenId }, board);
    try {
      if (window.minitelStudio?.exportProject) {
        const result = await window.minitelStudio.exportProject({ suggestedName: "Mon-projet-Minitel.mbs", contents });
        if (result.canceled) {
          flashNotice("Sauvegarde annulée");
          return;
        }
        if (!result.ok) throw new Error(result.error || "La sauvegarde a échoué.");
      } else {
        fallbackSaveProject(contents);
      }
      flashNotice("Projet sauvegardé");
    } catch (error) {
      flashNotice(error instanceof Error ? error.message : "Impossible de sauvegarder le projet");
    }
  }

  async function openProject() {
    try {
      let contents: string | null = null;
      if (window.minitelStudio?.importProject) {
        const result = await window.minitelStudio.importProject();
        if (result.canceled) {
          flashNotice("Ouverture annulée");
          return;
        }
        if (!result.ok || !result.contents) throw new Error(result.error || "Impossible de lire ce projet.");
        contents = result.contents;
      } else {
        contents = await fallbackOpenProject();
      }
      if (!contents) return;
      const imported = parseProjectFile(contents);
      pushHistory();
      restoreSnapshot(imported.project);
      setBoard(imported.board);
      setWorkspaceMode(imported.project.screens.some((screen) => screen.elements.length > 0) ? "designer" : "blocks");
      setRightTab("preview");
      flashNotice("Projet restauré");
    } catch (error) {
      flashNotice(error instanceof Error ? error.message : "Ce fichier de projet est invalide");
    }
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

  return (
    <div className={"app-shell" + (dragPreview ? " dragging-active" : "")} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={cancelPointerDrag}>
      <header className="topbar">
        <div className="brand-mark"><img src={appLogo} alt="" /></div>
        <div className="brand-copy">
          <h1>Minitel Blocks Studio</h1>
          <p>{screenConfig.name} · {screenConfig.columns} × {screenConfig.rows}</p>
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
          <div className="history-actions" aria-label="Historique">
            <button type="button" className="tool-button icon-only" onClick={undo} disabled={history.past.length === 0} title="Annuler (Ctrl+Z)"><Undo2 size={18} /></button>
            <button type="button" className="tool-button icon-only" onClick={redo} disabled={history.future.length === 0} title="Rétablir (Ctrl+Y)"><Redo2 size={18} /></button>
          </div>
          <button type="button" className="tool-button" onClick={resetProgram} title="Nouveau programme"><Eraser size={18} /><span>Nouveau</span></button>
          <button type="button" className="tool-button" onClick={() => void openProject()} title="Ouvrir un projet (Ctrl+O)"><FolderOpen size={18} /><span>Ouvrir</span></button>
          <button type="button" className="tool-button" onClick={() => void saveProject()} title="Sauvegarder le projet (Ctrl+S)"><Save size={18} /><span>Sauvegarder</span></button>
          <button type="button" className="tool-button" onClick={() => setExamplesOpen(true)} title="Ouvrir les exemples"><Wand2 size={18} /><span>Exemples</span></button>
          <button type="button" className={"tool-button " + (workspaceMode === "designer" ? "active" : "")} onClick={() => setWorkspaceMode("designer")} title="Composer l'écran"><Monitor size={18} /><span>Écran</span></button>
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
              {activeCategory === "operators" ? <div className="operator-shelf"><Sigma size={18} /><span>Nombres, variables, calculs</span></div> : null}
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
                <label className="preview-key"><Keyboard size={15} /><select value={previewKey} onChange={(event) => setPreviewKey(event.target.value)}>{keyOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              </div>
              <div className="simulation-panel">
                <button type="button" className={"sim-button " + (simRunning ? "active" : "")} onClick={() => setSimRunning((current) => !current)} title={simRunning ? "Mettre en pause" : "Lancer la simulation"}>{simRunning ? <Pause size={16} /> : <Play size={16} />}<span>{simRunning ? "Pause" : "Lancer"}</span></button>
                <button type="button" className="sim-button" onClick={() => setSimTick((current) => current + 1)} title="Avancer d'un tour"><StepForward size={16} /><span>Pas</span></button>
                <button type="button" className="sim-button" onClick={resetSimulation} title="Remettre la simulation à zéro"><RotateCcw size={16} /><span>Reset</span></button>
                <button type="button" className="sim-button key-test" onClick={() => triggerSimulatedKey(previewKey)} title="Tester la touche sélectionnée"><Keyboard size={16} /><span>Tester {previewKey === "Enter" ? "Entrée" : previewKey === "Backspace" ? "Retour" : previewKey}</span></button>
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
              <div className="sim-stats"><span className="baud-stat">Débit : {preview.baudRate} bauds</span>{Object.entries(preview.variables).map(([name, value]) => <span key={name}>{name}: {value}</span>)}</div>
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

      <div className={"notice " + (notice ? "show" : "")}>{notice}</div>
    </div>
  );
}

export default App;
