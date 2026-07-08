import { useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent, type MouseEvent } from "react";
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
import Redo2 from "lucide-react/dist/esm/icons/redo-2.js";
import Repeat from "lucide-react/dist/esm/icons/repeat.js";
import RotateCcw from "lucide-react/dist/esm/icons/rotate-ccw.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
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
import type { LucideIcon } from "lucide-react";

type BlockKind = "event" | "action" | "control" | "value";
type InputType = "text" | "number" | "select" | "color" | "boolean" | "variable" | "condition";
type ExprType = "number" | "boolean" | "text";
type RightTab = "preview" | "code" | "upload";

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

type PreviewCell = {
  char: string;
  fg: string;
  bg: string;
};

type PreviewState = {
  cells: PreviewCell[];
  cursorColumn: number;
  cursorRow: number;
  fg: string;
  bg: string;
  textSize: string;
  messages: string[];
  variables: Record<string, number>;
};

type UploadResult = {
  ok: boolean;
  output: string;
  projectPath?: string;
  exitCode?: number;
};

type BlockStyle = CSSProperties & {
  "--block-color": string;
};

type CategoryStyle = CSSProperties & {
  "--category-color": string;
};

type CodeContext = {
  keyVariable?: string;
};

const DRAG_TYPE = "application/minitel-block";
const SCREEN_COLUMNS = 40;
const SCREEN_ROWS = 24;
const DELETE_ANIMATION_MS = 260;
const BLOCK_MOTION_MS = 430;
const HISTORY_LIMIT = 80;

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

  { id: "detect-baud", title: "détecter la vitesse", help: "Teste 1200, 300, 4800 et 9600 bauds comme dans la librairie.", kind: "action", category: "advanced", color: "#5d6679" },
  { id: "reset-protocol", title: "reset protocole Minitel", help: "Envoie ESC PRO1 RESET au terminal.", kind: "action", category: "advanced", color: "#5d6679" },
];

const blockById = blockDefinitions.reduce<Record<string, BlockDefinition>>((accumulator, definition) => {
  accumulator[definition.id] = definition;
  return accumulator;
}, {});

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
      case "detect-baud":
        pushLine(lines, indent, "{");
        pushLine(lines, indent + 2, "uint32_t detectedBaud = minitel.detectBaudRate();");
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

function generateArduinoCode(stacks: ScriptStack[], variables: VariableDef[]) {
  const setupStacks = stacks.filter((stack) => stack.event.definitionId === "event-setup");
  const loopStacks = stacks.filter((stack) => stack.event.definitionId === "event-loop");
  const keyStacks = stacks.filter((stack) => stack.event.definitionId === "event-key-any" || stack.event.definitionId === "event-key-char");
  const variableNames = collectVariableNames(stacks, variables);
  const lines: string[] = ["#include <Arduino.h>", "#include <MinitelESP32.h>", "", "MinitelESP32 minitel(Serial2, 16, 17, 1200);"];

  if (variableNames.length > 0) {
    lines.push("");
    variableNames.forEach((name) => {
      const variable = variables.find((item) => item.name === name);
      lines.push("int " + sanitizeIdentifier(name) + " = (int)(" + exprCode(variable?.defaultValue, num(0)) + ");");
    });
  }

  lines.push("", "void setup() {", "  minitel.begin();", "  minitel.resetDisplay();");
  setupStacks.forEach((stack) => appendBlockCode(lines, stack.blocks, 2, variables));
  lines.push("}", "", "void loop() {");

  if (keyStacks.length > 0) {
    lines.push("  MinitelESP32::Key key = minitel.readKey();");
    keyStacks.forEach((stack) => {
      if (stack.event.definitionId === "event-key-any") {
        lines.push("  if (key.available()) {");
      } else {
        lines.push("  if (" + keyCondition(stack.event.values.key) + ") {");
      }
      appendBlockCode(lines, stack.blocks, 4, variables, { keyVariable: "key" });
      lines.push("  }");
    });
  }

  loopStacks.forEach((stack) => appendBlockCode(lines, stack.blocks, 2, variables));
  lines.push("  delay(10);", "}");
  return lines.join("\n");
}

function emptyPreviewCells() {
  return Array.from({ length: SCREEN_COLUMNS * SCREEN_ROWS }, () => ({ char: " ", fg: previewColors.White, bg: previewColors.Black }));
}

function createPreviewState(variables: VariableDef[]): PreviewState {
  const values: Record<string, number> = {};
  variables.forEach((variable) => {
    values[variable.name] = exprPreviewNumber(variable.defaultValue, values, 0);
  });
  return { cells: emptyPreviewCells(), cursorColumn: 1, cursorRow: 1, fg: previewColors.White, bg: previewColors.Black, textSize: "Normal", messages: [], variables: values };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clearPreview(state: PreviewState) {
  state.cells = emptyPreviewCells();
  state.cursorColumn = 1;
  state.cursorRow = 1;
}

function setCursor(state: PreviewState, column: number, row: number) {
  state.cursorColumn = clamp(column, 1, SCREEN_COLUMNS);
  state.cursorRow = clamp(row, 1, SCREEN_ROWS);
}

function setPreviewCell(state: PreviewState, column: number, row: number, char: string) {
  const safeColumn = clamp(column, 1, SCREEN_COLUMNS);
  const safeRow = clamp(row, 1, SCREEN_ROWS);
  const index = (safeRow - 1) * SCREEN_COLUMNS + (safeColumn - 1);
  state.cells[index] = { char, fg: state.fg, bg: state.bg };
}

function writePreviewText(state: PreviewState, text: string) {
  for (const character of text) {
    if (character === "\n") {
      state.cursorColumn = 1;
      state.cursorRow = clamp(state.cursorRow + 1, 1, SCREEN_ROWS);
      continue;
    }
    setPreviewCell(state, state.cursorColumn, state.cursorRow, character);
    if (state.cursorColumn >= SCREEN_COLUMNS) {
      state.cursorColumn = 1;
      state.cursorRow = clamp(state.cursorRow + 1, 1, SCREEN_ROWS);
    } else {
      state.cursorColumn += 1;
    }
  }
}

function applyBlocksPreview(state: PreviewState, blocks: ProgramBlock[], previewKey: string, depth = 0) {
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
          applyBlocksPreview(state, block.children ?? [], previewKey, depth + 1);
        }
        break;
      }
      case "control-forever":
        state.messages.push("Toujours: aperçu 1 tour");
        applyBlocksPreview(state, block.children ?? [], previewKey, depth + 1);
        break;
      case "control-if":
        if (exprPreviewBoolean(values.condition, state.variables)) {
          applyBlocksPreview(state, block.children ?? [], previewKey, depth + 1);
        }
        break;
      case "control-if-else":
        applyBlocksPreview(state, exprPreviewBoolean(values.condition, state.variables) ? block.children ?? [] : block.elseChildren ?? [], previewKey, depth + 1);
        break;
      case "control-for": {
        const name = textValue(values.variable, "compteur");
        const from = clamp(exprPreviewNumber(values.from, state.variables, 1), -999, 999);
        const to = clamp(exprPreviewNumber(values.to, state.variables, 5), -999, 999);
        const step = Math.max(1, Math.abs(clamp(exprPreviewNumber(values.step, state.variables, 1), -999, 999)));
        let guard = 0;
        for (let current = from; current <= to && guard < 20; current += step) {
          state.variables[name] = current;
          applyBlocksPreview(state, block.children ?? [], previewKey, depth + 1);
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
      case "detect-baud":
        state.messages.push("Vitesse détectée");
        break;
      case "reset-protocol":
        state.messages.push("Reset protocole envoyé");
        break;
      default:
        break;
    }
  });
}

function simulatePreview(stacks: ScriptStack[], variables: VariableDef[], previewKey: string, simulationTick: number) {
  const state = createPreviewState(variables);
  const setupStacks = stacks.filter((stack) => stack.event.definitionId === "event-setup");
  const loopStacks = stacks.filter((stack) => stack.event.definitionId === "event-loop");
  const keyStacks = stacks.filter((stack) => stack.event.definitionId === "event-key-any" || (stack.event.definitionId === "event-key-char" && previewKeyMatches(stack.event.values.key, previewKey)));
  const loopCount = Math.max(1, Math.min(12, simulationTick + 1));

  setupStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey));
  for (let turn = 0; turn < loopCount; turn += 1) {
    keyStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey));
    loopStacks.forEach((stack) => applyBlocksPreview(state, stack.blocks, previewKey));
  }

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

function InputControl({ input, value, variables, onChange }: { input: BlockInput; value: InputValue | undefined; variables: VariableDef[]; onChange: (value: InputValue) => void }) {
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

function PaletteBlock({ definition, onQuickAdd }: { definition: BlockDefinition; onQuickAdd: (definition: BlockDefinition) => void }) {
  const style = { "--block-color": definition.color } as BlockStyle;
  const shape = definition.kind === "event" ? "event-hat" : definition.kind === "control" ? "palette-c-block" : definition.kind === "value" ? "value-block" : "brick";
  return (
    <button
      className={"palette-block " + shape}
      style={style}
      draggable={definition.kind !== "value"}
      onDragStart={(event) => {
        if (definition.kind === "value") return;
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ source: "palette", definitionId: definition.id }));
        event.dataTransfer.effectAllowed = "copy";
      }}
      onClick={() => onQuickAdd(definition)}
      title={definition.help}
    >
      <span>{definition.title}</span>
      {definition.inputs?.slice(0, 2).map((input) => (
        <span className="palette-input-preview" key={input.key}>{expressionLabel(input.defaultValue)}</span>
      ))}
    </button>
  );
}

function DropTarget({ location, onDropBranch }: { location: DropLocation; onDropBranch: (payload: DragPayload, location: DropLocation) => void }) {
  return (
    <div
      className="drop-target"
      onDragOver={(event) => {
        event.preventDefault();
        event.stopPropagation();
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
  removingIds,
  motionIds,
  draggingBlockId,
  onDropBranch,
  onValueChange,
  onDelete,
  onDuplicate,
  onMove,
  onDragStartBlock,
  onDragEndBlock,
}: {
  blocks: ProgramBlock[];
  stackId: string;
  ownerId?: string;
  slot: DropLocation["slot"];
  variables: VariableDef[];
  removingIds: Set<string>;
  motionIds: Record<string, MotionKind>;
  draggingBlockId: string;
  onDropBranch: (payload: DragPayload, location: DropLocation) => void;
  onValueChange: (stackId: string, blockId: string, key: string, value: InputValue) => void;
  onDelete: (stackId: string, blockId: string) => void;
  onDuplicate: (stackId: string, blockId: string) => void;
  onMove: (stackId: string, blockId: string, direction: -1 | 1) => void;
  onDragStartBlock: (blockId: string) => void;
  onDragEndBlock: () => void;
}) {
  return (
    <div className={slot === "root" ? "stack-chain" : "inner-chain"}>
      {blocks.map((block, index) => (
        <div className="block-list-item" key={block.id}>
          <DropTarget location={{ stackId, ownerId, slot, index }} onDropBranch={onDropBranch} />
          <ProgramBlockView
            block={block}
            stackId={stackId}
            index={index}
            isFirst={index === 0}
            isLast={index === blocks.length - 1}
            variables={variables}
            removingIds={removingIds}
            motionIds={motionIds}
            draggingBlockId={draggingBlockId}
            onDropBranch={onDropBranch}
            onValueChange={onValueChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMove={onMove}
            onDragStartBlock={onDragStartBlock}
            onDragEndBlock={onDragEndBlock}
          />
        </div>
      ))}
      <DropTarget location={{ stackId, ownerId, slot, index: blocks.length }} onDropBranch={onDropBranch} />
    </div>
  );
}

function ProgramBlockView({
  block,
  stackId,
  index,
  isFirst,
  isLast,
  variables,
  removingIds,
  motionIds,
  draggingBlockId,
  onDropBranch,
  onValueChange,
  onDelete,
  onDuplicate,
  onMove,
  onDragStartBlock,
  onDragEndBlock,
}: {
  block: ProgramBlock;
  stackId: string;
  index: number;
  isFirst: boolean;
  isLast: boolean;
  variables: VariableDef[];
  removingIds: Set<string>;
  motionIds: Record<string, MotionKind>;
  draggingBlockId: string;
  onDropBranch: (payload: DragPayload, location: DropLocation) => void;
  onValueChange: (stackId: string, blockId: string, key: string, value: InputValue) => void;
  onDelete: (stackId: string, blockId: string) => void;
  onDuplicate: (stackId: string, blockId: string) => void;
  onMove: (stackId: string, blockId: string, direction: -1 | 1) => void;
  onDragStartBlock: (blockId: string) => void;
  onDragEndBlock: () => void;
}) {
  const definition = blockById[block.definitionId];
  const style = { "--block-color": definition.color } as BlockStyle;
  const isControl = definition.kind === "control";
  const motionClass = motionIds[block.id] ? " " + motionIds[block.id] : "";
  const className = "program-block " + (isControl ? "c-block" : "brick") + " stack-snap" + motionClass + (draggingBlockId === block.id ? " dragging" : "") + (removingIds.has(block.id) ? " deleting" : "");

  return (
    <div
      className={className}
      style={style}
      draggable
      onDragStart={(event) => {
        event.stopPropagation();
        onDragStartBlock(block.id);
        event.dataTransfer.setData(DRAG_TYPE, JSON.stringify({ source: "workspace", stackId, blockId: block.id }));
        event.dataTransfer.effectAllowed = "move";
      }}
      onDragEnd={onDragEndBlock}
      title={definition.help}
    >
      <div className="block-face">
        <GripVertical className="drag-grip" size={18} aria-hidden="true" />
        <div className="program-block-main">
          <span className="block-title">{definition.title}</span>
          {definition.inputs && definition.inputs.length > 0 ? (
            <div className="block-inputs">
              {definition.inputs.map((input) => (
                <InputControl key={input.key} input={input} variables={variables} value={block.values[input.key]} onChange={(value) => onValueChange(stackId, block.id, input.key, value)} />
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
            removingIds={removingIds}
            motionIds={motionIds}
            draggingBlockId={draggingBlockId}
            onDropBranch={onDropBranch}
            onValueChange={onValueChange}
            onDelete={onDelete}
            onDuplicate={onDuplicate}
            onMove={onMove}
            onDragStartBlock={onDragStartBlock}
            onDragEndBlock={onDragEndBlock}
          />
        </div>
      ))}
    </div>
  );
}

function EventHeader({ stack, variables, onEventValueChange, onDeleteStack }: { stack: ScriptStack; variables: VariableDef[]; onEventValueChange: (stackId: string, key: string, value: InputValue) => void; onDeleteStack: (stackId: string) => void }) {
  const definition = blockById[stack.event.definitionId];
  const style = { "--block-color": definition.color } as BlockStyle;
  return (
    <div
      className="program-block event-hat event-header"
      style={style}
      title={definition.help}
      draggable
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
  const [activeCategory, setActiveCategory] = useState("start");
  const [variables, setVariables] = useState<VariableDef[]>(() => createDefaultVariables());
  const [stacks, setStacks] = useState<ScriptStack[]>(() => createExampleStacks());
  const [selectedStackId, setSelectedStackId] = useState<string>("");
  const [rightTab, setRightTab] = useState<RightTab>("preview");
  const [previewKey, setPreviewKey] = useState("A");
  const [notice, setNotice] = useState("Programme exemple prêt");
  const [removingIds, setRemovingIds] = useState<Set<string>>(() => new Set());
  const [removingStacks, setRemovingStacks] = useState<Set<string>>(() => new Set());
  const [motionIds, setMotionIds] = useState<Record<string, MotionKind>>({});
  const [draggingBlockId, setDraggingBlockId] = useState("");
  const [history, setHistory] = useState<HistoryState>(() => ({ past: [], future: [] }));
  const [simRunning, setSimRunning] = useState(false);
  const [simTick, setSimTick] = useState(0);
  const [simSpeed, setSimSpeed] = useState(550);
  const motionTimersRef = useRef<Record<string, number>>({});
  const deleteTimersRef = useRef<number[]>([]);
  const [board, setBoard] = useState("esp32dev");
  const [uploadPort, setUploadPort] = useState("");
  const [uploadOutput, setUploadOutput] = useState("Prêt pour PlatformIO");
  const [uploading, setUploading] = useState(false);

  const activeStackId = selectedStackId || stacks[0]?.id || "";
  const activeBlocks = blockDefinitions.filter((definition) => definition.category === activeCategory);
  const generatedCode = useMemo(() => generateArduinoCode(stacks, variables), [stacks, variables]);
  const preview = useMemo(() => simulatePreview(stacks, variables, previewKey, simTick), [stacks, variables, previewKey, simTick]);

  function flashNotice(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 2200);
  }

  function pushHistory() {
    const snapshot = cloneProjectSnapshot({ stacks, variables });
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
    setSelectedStackId((current) => (next.stacks.some((stack) => stack.id === current) ? current : next.stacks[0]?.id || ""));
    setSimRunning(false);
    setSimTick(0);
    window.setTimeout(() => animateBlock(collectBlockIds(next.stacks.flatMap((stack) => stack.blocks)).slice(0, 40), "history-flash"), 0);
  }

  function undo() {
    if (history.past.length === 0) return;
    const previous = history.past[history.past.length - 1];
    const now = cloneProjectSnapshot({ stacks, variables });
    setHistory({ past: history.past.slice(0, -1), future: [now, ...history.future].slice(0, HISTORY_LIMIT) });
    restoreSnapshot(previous);
    flashNotice("Retour en arrière");
  }

  function redo() {
    if (history.future.length === 0) return;
    const next = history.future[0];
    const now = cloneProjectSnapshot({ stacks, variables });
    setHistory({ past: [...history.past.slice(-HISTORY_LIMIT + 1), now], future: history.future.slice(1) });
    restoreSnapshot(next);
    flashNotice("Action rétablie");
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
      if (isTyping || !(event.ctrlKey || event.metaKey)) return;

      const key = event.key.toLowerCase();
      if (key === "z") {
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
      if (key === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [history, stacks, variables]);

  useEffect(() => {
    return () => {
      Object.values(motionTimersRef.current).forEach((timer) => window.clearTimeout(timer));
      deleteTimersRef.current.forEach((timer) => window.clearTimeout(timer));
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

  function addBlockToStack(stackId: string, definitionId: string) {
    const block = makeBlock(definitionId);
    insertBranch({ stackId, slot: "root", index: stacks.find((stack) => stack.id === stackId)?.blocks.length ?? 0 }, [block]);
    window.setTimeout(() => animateBlock(collectBlockIds([block]), "moving-drop"), 0);
    flashNotice("Bloc ajouté");
  }

  function quickAddDefinition(definition: BlockDefinition) {
    if (definition.kind === "value") {
      flashNotice("Choisis calcul dans un champ arrondi");
      return;
    }
    if (definition.kind === "event") {
      createStackFromEvent(definition.id);
      return;
    }
    if (!activeStackId) {
      const stack = makeStack("event-setup", [makeBlock(definition.id)]);
      pushHistory();
      setStacks([stack]);
      setSelectedStackId(stack.id);
      window.setTimeout(() => animateBlock(collectBlockIds(stack.blocks), "moving-drop"), 0);
      return;
    }
    addBlockToStack(activeStackId, definition.id);
  }

  function handleDropBranch(payload: DragPayload, location: DropLocation) {
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
      const block = makeBlock(payload.definitionId);
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
    const next = createBlankStacks();
    clearPendingDeletes();
    pushHistory();
    setStacks(next);
    setVariables(createDefaultVariables());
    setSelectedStackId(next[0].id);
    setSimRunning(false);
    setSimTick(0);
    window.setTimeout(() => animateBlock(collectBlockIds(next.flatMap((stack) => stack.blocks)), "history-flash"), 0);
    flashNotice("Nouveau programme");
  }

  function loadExample() {
    const next = createExampleStacks();
    clearPendingDeletes();
    pushHistory();
    setStacks(next);
    setVariables(createDefaultVariables());
    setSelectedStackId(next[0].id);
    setSimRunning(false);
    setSimTick(0);
    window.setTimeout(() => animateBlock(collectBlockIds(next.flatMap((stack) => stack.blocks)), "history-flash"), 0);
    flashNotice("Exemple chargé");
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
    if (window.minitelStudio?.saveArduinoSketch) {
      const result = await window.minitelStudio.saveArduinoSketch("MinitelBlocks.ino", generatedCode);
      if (result.ok) {
        flashNotice("Sketch exporté");
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
      setUploadOutput("Le téléversement direct est disponible dans Electron.");
      return;
    }
    setUploading(true);
    setUploadOutput("Préparation du projet PlatformIO...\n");
    try {
      const result: UploadResult = await window.minitelStudio.uploadToEsp32({ code: generatedCode, board, port: uploadPort.trim() });
      setUploadOutput(result.output || (result.ok ? "Téléversement terminé" : "Téléversement impossible"));
      flashNotice(result.ok ? "Téléversement terminé" : "Téléversement échoué");
    } catch (error) {
      setUploadOutput(String(error));
      flashNotice("Téléversement échoué");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-mark"><img src={appLogo} alt="" /></div>
        <div className="brand-copy">
          <h1>Minitel Blocks Studio</h1>
          <p>ESP32 + Minitel en blocs visuels</p>
        </div>
        <div className="topbar-actions">
          <div className="history-actions" aria-label="Historique">
            <button type="button" className="tool-button icon-only" onClick={undo} disabled={history.past.length === 0} title="Annuler (Ctrl+Z)"><Undo2 size={18} /></button>
            <button type="button" className="tool-button icon-only" onClick={redo} disabled={history.future.length === 0} title="Rétablir (Ctrl+Y)"><Redo2 size={18} /></button>
          </div>
          <button type="button" className="tool-button" onClick={resetProgram} title="Nouveau programme"><Eraser size={18} /><span>Nouveau</span></button>
          <button type="button" className="tool-button" onClick={loadExample} title="Charger un exemple"><Wand2 size={18} /><span>Exemple</span></button>
          <button type="button" className="tool-button" onClick={exportSketch} title="Exporter le sketch Arduino"><Download size={18} /><span>Exporter</span></button>
          <button type="button" className="tool-button primary" onClick={uploadSketch} title="Téléverser sur l'ESP32"><Upload size={18} /><span>Téléverser</span></button>
        </div>
      </header>

      <main className="studio-grid">
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
            {activeCategory === "operators" ? (
              <div className="operator-shelf">
                <Sigma size={18} />
                <span>Nombres, variables, calculs</span>
              </div>
            ) : null}
            {activeBlocks.map((definition) => <PaletteBlock definition={definition} onQuickAdd={quickAddDefinition} key={definition.id} />)}
          </div>
        </aside>

        <section className="workspace-panel" onDragOver={(event) => event.preventDefault()} onDrop={handleWorkspaceDrop} aria-label="Espace de construction">
          <div className="workspace-header">
            <div>
              <div className="section-title"><Radio size={18} /><span>Programme</span></div>
              <p>{stacks.length} pile{stacks.length > 1 ? "s" : ""} active{stacks.length > 1 ? "s" : ""}</p>
            </div>
            <div className="workspace-chip"><ListTree size={16} /><span>{simRunning ? "Simulation active" : "Blocs imbriqués"}</span></div>
          </div>
          <div className="workspace-canvas">
            {stacks.length === 0 ? (
              <button type="button" className="empty-workspace" onClick={() => createStackFromEvent("event-setup")}><Plus size={22} /><span>Ajouter une pile</span></button>
            ) : null}
            {stacks.map((stack) => (
              <section className={"script-stack " + (activeStackId === stack.id ? "selected " : "") + (removingStacks.has(stack.id) ? "deleting" : "")} key={stack.id} onClick={() => setSelectedStackId(stack.id)} onDragOver={(event) => event.preventDefault()}>
                <EventHeader stack={stack} variables={variables} onEventValueChange={updateEventValue} onDeleteStack={deleteStack} />
                <BlockListView blocks={stack.blocks} stackId={stack.id} slot="root" variables={variables} removingIds={removingIds} motionIds={motionIds} draggingBlockId={draggingBlockId} onDropBranch={handleDropBranch} onValueChange={updateBlockValue} onDelete={deleteBlock} onDuplicate={duplicateBlock} onMove={moveBlock} onDragStartBlock={setDraggingBlockId} onDragEndBlock={() => setDraggingBlockId("")} />
              </section>
            ))}
          </div>
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
                <div className="section-title compact"><Monitor size={17} /><span>Minitel simulé</span></div>
                <label className="preview-key"><Keyboard size={15} /><select value={previewKey} onChange={(event) => setPreviewKey(event.target.value)}>{keyOptions.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>
              </div>
              <div className="simulation-panel">
                <button type="button" className={"sim-button " + (simRunning ? "active" : "")} onClick={() => setSimRunning((current) => !current)} title={simRunning ? "Mettre en pause" : "Lancer la simulation"}>{simRunning ? <Pause size={16} /> : <Play size={16} />}<span>{simRunning ? "Pause" : "Lancer"}</span></button>
                <button type="button" className="sim-button" onClick={() => setSimTick((current) => current + 1)} title="Avancer d'un tour"><StepForward size={16} /><span>Pas</span></button>
                <button type="button" className="sim-button" onClick={() => { setSimRunning(false); setSimTick(0); }} title="Remettre la simulation à zéro"><RotateCcw size={16} /><span>Reset</span></button>
                <label className="speed-control"><span>{simSpeed} ms</span><input type="range" min="150" max="1200" step="50" value={simSpeed} onChange={(event) => setSimSpeed(Number(event.target.value))} /></label>
                <div className="sim-counter">Tour {Math.max(1, Math.min(12, simTick + 1))}</div>
              </div>
              <div className="minitel-frame">
                <div className="minitel-screen" style={{ gridTemplateColumns: "repeat(" + SCREEN_COLUMNS + ", 1fr)" }}>
                  {preview.cells.map((cell, index) => {
                    const isCursor = index === (preview.cursorRow - 1) * SCREEN_COLUMNS + (preview.cursorColumn - 1);
                    return <span className={"screen-cell" + (isCursor ? " cursor-cell" : "") + (cell.char !== " " ? " lit-cell" : "")} style={{ color: cell.fg, backgroundColor: cell.bg }} key={index}>{cell.char}</span>;
                  })}
                </div>
              </div>
              <div className="event-strip">{preview.messages.slice(-6).map((message, index) => <span key={message + index}>{message}</span>)}</div>
              <div className="sim-stats">{Object.entries(preview.variables).map(([name, value]) => <span key={name}>{name}: {value}</span>)}</div>
            </div>
          ) : null}

          {rightTab === "code" ? (
            <div className="code-panel">
              <div className="code-toolbar">
                <div className="section-title compact"><FileCode2 size={17} /><span>Sketch Arduino</span></div>
                <div className="code-actions"><button type="button" onClick={copyCode} title="Copier le code"><Copy size={16} /></button><button type="button" onClick={exportSketch} title="Exporter le sketch"><Download size={16} /></button></div>
              </div>
              <pre className="code-output">{generatedCode}</pre>
            </div>
          ) : null}

          {rightTab === "upload" ? (
            <div className="upload-panel">
              <div className="section-title compact"><Terminal size={17} /><span>Téléversement direct</span></div>
              <div className="upload-form">
                <label><Settings2 size={15} /><span>Carte</span><select value={board} onChange={(event) => setBoard(event.target.value)}><option value="esp32dev">ESP32 Dev Module</option><option value="nodemcu-32s">NodeMCU-32S</option><option value="esp32doit-devkit-v1">DOIT ESP32 DevKit V1</option></select></label>
                <label><Usb size={15} /><span>Port</span><input value={uploadPort} onChange={(event) => setUploadPort(event.target.value)} placeholder="auto" /></label>
                <button type="button" className="upload-button" onClick={uploadSketch} disabled={uploading}><Upload size={17} /><span>{uploading ? "Téléversement..." : "Envoyer à l'ESP32"}</span></button>
              </div>
              <pre className="terminal-output">{uploadOutput}</pre>
            </div>
          ) : null}
        </aside>
      </main>

      <div className={"notice " + (notice ? "show" : "")}>{notice}</div>
    </div>
  );
}

export default App;
