import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import ImagePlus from "lucide-react/dist/esm/icons/image-plus.js";
import Layers3 from "lucide-react/dist/esm/icons/layers-3.js";
import Maximize2 from "lucide-react/dist/esm/icons/maximize-2.js";
import Move from "lucide-react/dist/esm/icons/move.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import SlidersHorizontal from "lucide-react/dist/esm/icons/sliders-horizontal.js";
import Square from "lucide-react/dist/esm/icons/square.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Type from "lucide-react/dist/esm/icons/type.js";
import Upload from "lucide-react/dist/esm/icons/upload.js";
import X from "lucide-react/dist/esm/icons/x.js";

export type ScreenPresetId = "minitel-40" | "small-32" | "compact" | "custom";

export type MinitelScreenConfig = {
  preset: ScreenPresetId;
  name: string;
  columns: number;
  rows: number;
  colorEnabled: boolean;
};

export type SceneColor = "Black" | "Red" | "Green" | "Yellow" | "Blue" | "Magenta" | "Cyan" | "White";
export type SceneTextSize = "Normal" | "DoubleHeight" | "DoubleWidth" | "DoubleSize";

type SceneElementBase = {
  id: string;
  x: number;
  y: number;
  fg: SceneColor;
};

export type SceneTextElement = SceneElementBase & {
  kind: "text";
  text: string;
  bg: SceneColor;
  size: SceneTextSize;
};

export type SceneBoxElement = SceneElementBase & {
  kind: "box";
  width: number;
  height: number;
  filled: boolean;
};

export type SceneImageElement = SceneElementBase & {
  kind: "image";
  name: string;
  width: number;
  height: number;
  bitmap: string;
};

export type SceneElement = SceneTextElement | SceneBoxElement | SceneImageElement;

export type MinitelScene = {
  id: string;
  name: string;
  elements: SceneElement[];
};

export type ImageAlgorithm = "threshold" | "ordered" | "floyd";
type ImageFit = "contain" | "cover" | "stretch";

type ProcessedBitmap = {
  bitmap: string;
  width: number;
  height: number;
};

type ElementDrag = {
  id: string;
  mode: "move" | "resize";
  pointerId: number;
  target: HTMLElement;
  startClientX: number;
  startClientY: number;
  startX: number;
  startY: number;
  startWidth: number;
  startHeight: number;
  next: SceneElement;
};

type DesignerStyle = CSSProperties & {
  "--screen-columns"?: number;
  "--screen-rows"?: number;
  "--element-x"?: number;
  "--element-y"?: number;
  "--element-width"?: number;
  "--element-height"?: number;
  "--element-fg"?: string;
  "--element-bg"?: string;
};

const colorValues: Record<SceneColor, string> = {
  Black: "#0c1117",
  Red: "#ff616c",
  Green: "#58dc7c",
  Yellow: "#f7dc68",
  Blue: "#5594ff",
  Magenta: "#d77aff",
  Cyan: "#5de7df",
  White: "#f5f8ff",
};

const colorLabels: Record<SceneColor, string> = {
  Black: "Noir",
  Red: "Rouge",
  Green: "Vert",
  Yellow: "Jaune",
  Blue: "Bleu",
  Magenta: "Magenta",
  Cyan: "Cyan",
  White: "Blanc",
};

const sceneColors = Object.keys(colorValues) as SceneColor[];

export const screenPresets: Array<{ id: ScreenPresetId; label: string; name: string; columns: number; rows: number }> = [
  { id: "minitel-40", label: "Minitel classique", name: "Minitel 40 colonnes", columns: 40, rows: 24 },
  { id: "small-32", label: "Minitel compact", name: "Minitel compact", columns: 32, rows: 20 },
  { id: "compact", label: "Zone utile 40 × 20", name: "Minitel 40 × 20", columns: 40, rows: 20 },
  { id: "custom", label: "Format personnalisé", name: "Mon Minitel", columns: 40, rows: 24 },
];

const localUid = () => "scene-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(value)));

export function createDefaultScreenConfig(): MinitelScreenConfig {
  return { preset: "minitel-40", name: "Minitel 40 colonnes", columns: 40, rows: 24, colorEnabled: true };
}

export function createMinitelScene(name = "Écran principal", elements: SceneElement[] = []): MinitelScene {
  return { id: "screen-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16), name, elements };
}

export function makeSceneText(text: string, x: number, y: number, fg: SceneColor = "White", size: SceneTextSize = "Normal", bg: SceneColor = "Black"): SceneTextElement {
  return { id: localUid(), kind: "text", text, x, y, fg, bg, size };
}

export function makeSceneBox(x: number, y: number, width: number, height: number, fg: SceneColor = "Cyan", filled = false): SceneBoxElement {
  return { id: localUid(), kind: "box", x, y, width, height, fg, filled };
}

export function makeSceneImage(name: string, x: number, y: number, width: number, height: number, bitmap: string, fg: SceneColor = "White"): SceneImageElement {
  return { id: localUid(), kind: "image", name, x, y, width, height, bitmap, fg };
}

export function elementDimensions(element: SceneElement) {
  if (element.kind === "text") {
    const widthFactor = element.size === "DoubleWidth" || element.size === "DoubleSize" ? 2 : 1;
    const heightFactor = element.size === "DoubleHeight" || element.size === "DoubleSize" ? 2 : 1;
    return { width: Math.max(1, element.text.length * widthFactor), height: heightFactor };
  }
  return { width: element.width, height: element.height };
}

export function fitElementsToScreen(elements: SceneElement[], config: MinitelScreenConfig): SceneElement[] {
  return elements.map((element) => {
    const dimensions = elementDimensions(element);
    const width = clamp(dimensions.width, 1, config.columns);
    const height = clamp(dimensions.height, 1, config.rows);
    const x = clamp(element.x, 1, Math.max(1, config.columns - width + 1));
    const y = clamp(element.y, 1, Math.max(1, config.rows - height + 1));
    if (element.kind === "text") return { ...element, x, y };
    if (element.kind === "image" && (width !== element.width || height !== element.height)) {
      return { ...element, x, y, width, height, bitmap: resizeBitmap(element.bitmap, element.width, element.height, width, height) };
    }
    return { ...element, x, y, width, height };
  });
}

export function mosaicBits(element: SceneImageElement, cellX: number, cellY: number): [boolean, boolean, boolean, boolean, boolean, boolean] {
  const pixelWidth = element.width * 2;
  const bit = (subX: number, subY: number) => element.bitmap[(cellY * 3 + subY) * pixelWidth + cellX * 2 + subX] === "1";
  return [bit(0, 0), bit(1, 0), bit(0, 1), bit(1, 1), bit(0, 2), bit(1, 2)];
}

export function resizeBitmap(bitmap: string, oldWidth: number, oldHeight: number, newWidth: number, newHeight: number) {
  const oldPixelWidth = Math.max(1, oldWidth * 2);
  const oldPixelHeight = Math.max(1, oldHeight * 3);
  const newPixelWidth = Math.max(1, newWidth * 2);
  const newPixelHeight = Math.max(1, newHeight * 3);
  let result = "";
  for (let y = 0; y < newPixelHeight; y += 1) {
    const sourceY = clamp(Math.floor((y / newPixelHeight) * oldPixelHeight), 0, oldPixelHeight - 1);
    for (let x = 0; x < newPixelWidth; x += 1) {
      const sourceX = clamp(Math.floor((x / newPixelWidth) * oldPixelWidth), 0, oldPixelWidth - 1);
      result += bitmap[sourceY * oldPixelWidth + sourceX] === "1" ? "1" : "0";
    }
  }
  return result;
}

function processImage(image: HTMLImageElement, width: number, height: number, algorithm: ImageAlgorithm, threshold: number, brightness: number, contrast: number, invert: boolean, fit: ImageFit): ProcessedBitmap {
  const pixelWidth = Math.max(2, width * 2);
  const pixelHeight = Math.max(3, height * 3);
  const canvas = document.createElement("canvas");
  canvas.width = pixelWidth;
  canvas.height = pixelHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { bitmap: "0".repeat(pixelWidth * pixelHeight), width: pixelWidth, height: pixelHeight };

  context.imageSmoothingEnabled = true;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, pixelWidth, pixelHeight);
  if (fit === "stretch") {
    context.drawImage(image, 0, 0, pixelWidth, pixelHeight);
  } else {
    const scale = fit === "cover" ? Math.max(pixelWidth / image.width, pixelHeight / image.height) : Math.min(pixelWidth / image.width, pixelHeight / image.height);
    const drawWidth = image.width * scale;
    const drawHeight = image.height * scale;
    context.drawImage(image, (pixelWidth - drawWidth) / 2, (pixelHeight - drawHeight) / 2, drawWidth, drawHeight);
  }

  const rgba = context.getImageData(0, 0, pixelWidth, pixelHeight).data;
  const values = new Float32Array(pixelWidth * pixelHeight);
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let index = 0; index < values.length; index += 1) {
    const offset = index * 4;
    let gray = rgba[offset] * 0.299 + rgba[offset + 1] * 0.587 + rgba[offset + 2] * 0.114;
    gray = contrastFactor * (gray - 128) + 128 + brightness;
    values[index] = clamp(invert ? 255 - gray : gray, 0, 255);
  }

  const bits = new Array<string>(values.length).fill("0");
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  if (algorithm === "floyd") {
    for (let y = 0; y < pixelHeight; y += 1) {
      for (let x = 0; x < pixelWidth; x += 1) {
        const index = y * pixelWidth + x;
        const oldValue = values[index];
        const newValue = oldValue < threshold ? 0 : 255;
        bits[index] = newValue === 0 ? "1" : "0";
        const error = oldValue - newValue;
        if (x + 1 < pixelWidth) values[index + 1] += error * 7 / 16;
        if (y + 1 < pixelHeight && x > 0) values[index + pixelWidth - 1] += error * 3 / 16;
        if (y + 1 < pixelHeight) values[index + pixelWidth] += error * 5 / 16;
        if (y + 1 < pixelHeight && x + 1 < pixelWidth) values[index + pixelWidth + 1] += error / 16;
      }
    }
  } else {
    for (let y = 0; y < pixelHeight; y += 1) {
      for (let x = 0; x < pixelWidth; x += 1) {
        const index = y * pixelWidth + x;
        const localThreshold = algorithm === "ordered" ? threshold + (bayer[(y % 4) * 4 + (x % 4)] - 7.5) * 8 : threshold;
        bits[index] = values[index] < localThreshold ? "1" : "0";
      }
    }
  }
  return { bitmap: bits.join(""), width: pixelWidth, height: pixelHeight };
}

function PixelPreview({ bitmap, width, height, color }: ProcessedBitmap & { color: SceneColor }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return;
    canvas.width = width;
    canvas.height = height;
    context.fillStyle = "#0c1117";
    context.fillRect(0, 0, width, height);
    context.fillStyle = colorValues[color];
    for (let index = 0; index < bitmap.length; index += 1) {
      if (bitmap[index] === "1") context.fillRect(index % width, Math.floor(index / width), 1, 1);
    }
  }, [bitmap, color, height, width]);
  return <canvas ref={canvasRef} className="image-pixel-canvas" aria-label="Aperçu de l'image convertie" />;
}

function ImageImportModal({ sourceDataUrl, sourceName, config, onClose, onImport }: { sourceDataUrl: string; sourceName: string; config: MinitelScreenConfig; onClose: () => void; onImport: (element: SceneImageElement) => void }) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [width, setWidth] = useState(Math.min(18, config.columns));
  const [height, setHeight] = useState(Math.min(12, config.rows));
  const [algorithm, setAlgorithm] = useState<ImageAlgorithm>("floyd");
  const [threshold, setThreshold] = useState(136);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(18);
  const [invert, setInvert] = useState(false);
  const [fit, setFit] = useState<ImageFit>("contain");
  const [color, setColor] = useState<SceneColor>(config.colorEnabled ? "Cyan" : "White");
  const effectiveColor: SceneColor = config.colorEnabled ? color : "White";

  useEffect(() => {
    const nextImage = new Image();
    nextImage.onload = () => setImage(nextImage);
    nextImage.src = sourceDataUrl;
  }, [sourceDataUrl]);

  const processed = useMemo(() => image ? processImage(image, width, height, algorithm, threshold, brightness, contrast, invert, fit) : { bitmap: "", width: width * 2, height: height * 3 }, [algorithm, brightness, contrast, fit, height, image, invert, threshold, width]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card image-import-modal" role="dialog" aria-modal="true" aria-labelledby="image-import-title">
        <header className="modal-header">
          <div><span className="modal-kicker">Conversion Minitel</span><h2 id="image-import-title">Transformer l'image en mosaïque</h2></div>
          <button type="button" className="icon-button" onClick={onClose} title="Fermer"><X size={18} /></button>
        </header>
        <div className="image-import-layout">
          <div className="image-preview-stage">
            {processed.bitmap ? <PixelPreview {...processed} color={effectiveColor} /> : <div className="image-loading">Préparation de l'image...</div>}
            <div className="image-preview-meta"><span>{width} × {height} cellules</span><span>{processed.width} × {processed.height} pixels mosaïque</span></div>
          </div>
          <div className="image-algorithm-panel">
            <div className="setting-group">
              <label><SlidersHorizontal size={15} /><span>Algorithme</span></label>
              <div className="choice-grid three">
                <button type="button" className={algorithm === "threshold" ? "active" : ""} onClick={() => setAlgorithm("threshold")}>Seuil</button>
                <button type="button" className={algorithm === "ordered" ? "active" : ""} onClick={() => setAlgorithm("ordered")}>Trame</button>
                <button type="button" className={algorithm === "floyd" ? "active" : ""} onClick={() => setAlgorithm("floyd")}>Diffusion</button>
              </div>
            </div>
            <div className="setting-row two-columns">
              <label><span>Largeur</span><input type="number" min="1" max={config.columns} value={width} onChange={(event) => setWidth(clamp(Number(event.target.value), 1, config.columns))} /></label>
              <label><span>Hauteur</span><input type="number" min="1" max={config.rows} value={height} onChange={(event) => setHeight(clamp(Number(event.target.value), 1, config.rows))} /></label>
            </div>
            <label className="slider-setting"><span>Seuil <strong>{threshold}</strong></span><input type="range" min="20" max="235" value={threshold} onChange={(event) => setThreshold(Number(event.target.value))} /></label>
            <label className="slider-setting"><span>Luminosité <strong>{brightness}</strong></span><input type="range" min="-100" max="100" value={brightness} onChange={(event) => setBrightness(Number(event.target.value))} /></label>
            <label className="slider-setting"><span>Contraste <strong>{contrast}</strong></span><input type="range" min="-100" max="100" value={contrast} onChange={(event) => setContrast(Number(event.target.value))} /></label>
            <div className="setting-row two-columns">
              <label><span>Cadrage</span><select value={fit} onChange={(event) => setFit(event.target.value as ImageFit)}><option value="contain">Image entière</option><option value="cover">Remplir</option><option value="stretch">Étirer</option></select></label>
              <label><span>Couleur</span><select value={effectiveColor} disabled={!config.colorEnabled} onChange={(event) => setColor(event.target.value as SceneColor)}>{sceneColors.filter((item) => item !== "Black").map((item) => <option value={item} key={item}>{colorLabels[item]}</option>)}</select></label>
            </div>
            <label className="toggle-setting"><input type="checkbox" checked={invert} onChange={(event) => setInvert(event.target.checked)} /><span>Inverser les pixels</span></label>
          </div>
        </div>
        <footer className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Annuler</button>
          <button type="button" className="primary-button" disabled={!processed.bitmap} onClick={() => onImport(makeSceneImage(sourceName.replace(/\.[^.]+$/, "") || "Image", 1, 1, width, height, processed.bitmap, effectiveColor))}><Upload size={17} /><span>Ajouter à l'écran</span></button>
        </footer>
      </section>
    </div>
  );
}

function ColorSelect({ value, onChange, label, enabled = true, monochromeValue = "White" }: { value: SceneColor; onChange: (color: SceneColor) => void; label: string; enabled?: boolean; monochromeValue?: SceneColor }) {
  const displayedValue = enabled ? value : monochromeValue;
  return (
    <label className="property-field color-property"><span>{label}</span><span className="property-color-dot" style={{ background: colorValues[displayedValue] }} /><select value={displayedValue} disabled={!enabled} onChange={(event) => onChange(event.target.value as SceneColor)}>{sceneColors.map((color) => <option value={color} key={color}>{colorLabels[color]}</option>)}</select></label>
  );
}

function ElementInspector({ element, config, onChange, onDelete }: { element: SceneElement | null; config: MinitelScreenConfig; onChange: (next: SceneElement) => void; onDelete: () => void }) {
  if (!element) {
    return <div className="empty-inspector"><Move size={22} /><strong>Sélectionne un élément</strong><span>Déplace-le directement sur l'écran, puis ajuste ses propriétés ici.</span></div>;
  }
  const dimensions = elementDimensions(element);
  const patchPosition = (patch: { x?: number; y?: number }) => onChange({ ...element, ...patch } as SceneElement);
  const changeSize = (width: number, height: number) => {
    if (element.kind === "text") return;
    const safeWidth = clamp(width, 1, config.columns);
    const safeHeight = clamp(height, 1, config.rows);
    if (element.kind === "image") onChange({ ...element, width: safeWidth, height: safeHeight, bitmap: resizeBitmap(element.bitmap, element.width, element.height, safeWidth, safeHeight) });
    else onChange({ ...element, width: safeWidth, height: safeHeight });
  };

  return (
    <div className="element-inspector">
      <div className="inspector-heading"><div className="element-kind-icon">{element.kind === "text" ? <Type size={17} /> : element.kind === "image" ? <ImagePlus size={17} /> : <Square size={17} />}</div><div><strong>{element.kind === "text" ? "Texte" : element.kind === "image" ? element.name : "Cadre"}</strong><span>{dimensions.width} × {dimensions.height} cellules</span></div><button type="button" className="icon-button danger" onClick={onDelete} title="Supprimer"><Trash2 size={16} /></button></div>
      {element.kind === "text" ? <label className="property-field property-wide"><span>Contenu</span><input type="text" value={element.text} onChange={(event) => onChange({ ...element, text: event.target.value })} /></label> : null}
      <div className="property-grid">
        <label className="property-field"><span>Colonne</span><input type="number" min="1" max={config.columns} value={element.x} onChange={(event) => patchPosition({ x: clamp(Number(event.target.value), 1, config.columns) })} /></label>
        <label className="property-field"><span>Ligne</span><input type="number" min="1" max={config.rows} value={element.y} onChange={(event) => patchPosition({ y: clamp(Number(event.target.value), 1, config.rows) })} /></label>
        {element.kind !== "text" ? <label className="property-field"><span>Largeur</span><input type="number" min="1" max={config.columns} value={element.width} onChange={(event) => changeSize(Number(event.target.value), element.height)} /></label> : null}
        {element.kind !== "text" ? <label className="property-field"><span>Hauteur</span><input type="number" min="1" max={config.rows} value={element.height} onChange={(event) => changeSize(element.width, Number(event.target.value))} /></label> : null}
      </div>
      <ColorSelect label="Couleur" value={element.fg} enabled={config.colorEnabled} onChange={(fg) => onChange({ ...element, fg } as SceneElement)} />
      {element.kind === "text" ? <ColorSelect label="Fond" value={element.bg} enabled={config.colorEnabled} monochromeValue="Black" onChange={(bg) => onChange({ ...element, bg })} /> : null}
      {element.kind === "text" ? <label className="property-field property-wide"><span>Taille</span><select value={element.size} onChange={(event) => onChange({ ...element, size: event.target.value as SceneTextSize })}><option value="Normal">Normale</option><option value="DoubleWidth">Double largeur</option><option value="DoubleHeight">Double hauteur</option><option value="DoubleSize">Double taille</option></select></label> : null}
      {element.kind === "box" ? <label className="toggle-setting"><input type="checkbox" checked={element.filled} onChange={(event) => onChange({ ...element, filled: event.target.checked })} /><span>Cadre rempli</span></label> : null}
    </div>
  );
}

export function ScreenDesigner({ config, screens, activeScreenId, onConfigChange, onScreensChange, onActiveScreenChange, onNotice }: { config: MinitelScreenConfig; screens: MinitelScene[]; activeScreenId: string; onConfigChange: (next: MinitelScreenConfig) => void; onScreensChange: (next: MinitelScene[]) => void; onActiveScreenChange: (screenId: string) => void; onNotice: (message: string) => void }) {
  const activeScreen = screens.find((screen) => screen.id === activeScreenId) ?? screens[0];
  const elements = activeScreen?.elements ?? [];
  const [selectedId, setSelectedId] = useState(elements[0]?.id ?? "");
  const [dragPreview, setDragPreview] = useState<SceneElement | null>(null);
  const [imageSource, setImageSource] = useState<{ dataUrl: string; name: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const screenRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<ElementDrag | null>(null);
  const selected = elements.find((element) => element.id === selectedId) ?? null;

  useEffect(() => {
    setSelectedId(elements[0]?.id ?? "");
    setDragPreview(null);
    dragRef.current = null;
  }, [activeScreen?.id]);

  useEffect(() => {
    if (selectedId && !elements.some((element) => element.id === selectedId)) setSelectedId(elements[0]?.id ?? "");
  }, [elements, selectedId]);

  function updateActiveElements(next: SceneElement[]) {
    if (!activeScreen) return;
    onScreensChange(screens.map((screen) => screen.id === activeScreen.id ? { ...screen, elements: next } : screen));
  }

  function addElement(element: SceneElement) {
    const fitted = fitElementsToScreen([element], config)[0];
    updateActiveElements([...elements, fitted]);
    setSelectedId(fitted.id);
  }

  function updateElement(next: SceneElement) {
    const fitted = fitElementsToScreen([next], config)[0];
    updateActiveElements(elements.map((element) => element.id === fitted.id ? fitted : element));
  }

  function deleteSelected() {
    if (!selected) return;
    updateActiveElements(elements.filter((element) => element.id !== selected.id));
    setSelectedId("");
    onNotice("Élément supprimé");
  }

  function beginElementDrag(event: ReactPointerEvent<HTMLElement>, element: SceneElement, mode: "move" | "resize") {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    target.setPointerCapture(event.pointerId);
    const dimensions = elementDimensions(element);
    dragRef.current = { id: element.id, mode, pointerId: event.pointerId, target, startClientX: event.clientX, startClientY: event.clientY, startX: element.x, startY: element.y, startWidth: dimensions.width, startHeight: dimensions.height, next: element };
    setSelectedId(element.id);
    setDragPreview(element);
  }

  function moveElement(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const screen = screenRef.current;
    if (!drag || !screen) return;
    const original = elements.find((element) => element.id === drag.id);
    if (!original) return;
    const rect = screen.getBoundingClientRect();
    const deltaX = Math.round((event.clientX - drag.startClientX) / rect.width * config.columns);
    const deltaY = Math.round((event.clientY - drag.startClientY) / rect.height * config.rows);
    let next: SceneElement;
    if (drag.mode === "move") {
      const dimensions = elementDimensions(original);
      next = { ...original, x: clamp(drag.startX + deltaX, 1, Math.max(1, config.columns - dimensions.width + 1)), y: clamp(drag.startY + deltaY, 1, Math.max(1, config.rows - dimensions.height + 1)) } as SceneElement;
    } else if (original.kind === "image") {
      const width = clamp(drag.startWidth + deltaX, 1, config.columns - original.x + 1);
      const height = clamp(drag.startHeight + deltaY, 1, config.rows - original.y + 1);
      next = { ...original, width, height, bitmap: resizeBitmap(original.bitmap, original.width, original.height, width, height) };
    } else if (original.kind === "box") {
      next = { ...original, width: clamp(drag.startWidth + deltaX, 1, config.columns - original.x + 1), height: clamp(drag.startHeight + deltaY, 1, config.rows - original.y + 1) };
    } else {
      next = original;
    }
    drag.next = next;
    setDragPreview(next);
  }

  function finishElementDrag(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag) return;
    if (drag.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId);
    dragRef.current = null;
    setDragPreview(null);
    const original = elements.find((element) => element.id === drag.id);
    if (original && JSON.stringify(original) !== JSON.stringify(drag.next)) updateActiveElements(elements.map((element) => element.id === drag.id ? drag.next : element));
    event.stopPropagation();
  }

  function handleFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) {
      onNotice("Choisis un fichier image");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setImageSource({ dataUrl: String(reader.result), name: file.name });
    reader.readAsDataURL(file);
  }

  function changePreset(presetId: ScreenPresetId) {
    const preset = screenPresets.find((item) => item.id === presetId) ?? screenPresets[0];
    onConfigChange({ ...config, preset: preset.id, name: preset.name, columns: preset.columns, rows: preset.rows });
  }

  function uniqueScreenName(base: string) {
    const used = new Set(screens.map((screen) => screen.name.trim().toLocaleLowerCase("fr")));
    if (!used.has(base.toLocaleLowerCase("fr"))) return base;
    let suffix = 2;
    while (used.has((base + " " + suffix).toLocaleLowerCase("fr"))) suffix += 1;
    return base + " " + suffix;
  }

  function addScreen() {
    const screen = createMinitelScene(uniqueScreenName("Écran " + (screens.length + 1)));
    onScreensChange([...screens, screen]);
    onActiveScreenChange(screen.id);
    setSelectedId("");
    onNotice("Nouvel écran ajouté");
  }

  function duplicateScreen() {
    if (!activeScreen) return;
    const baseName = (activeScreen.name.trim() || "Écran") + " copie";
    const screen = createMinitelScene(uniqueScreenName(baseName), activeScreen.elements.map((element) => ({ ...element, id: localUid() } as SceneElement)));
    onScreensChange([...screens, screen]);
    onActiveScreenChange(screen.id);
    setSelectedId(screen.elements[0]?.id ?? "");
    onNotice("Écran dupliqué");
  }

  function deleteScreen() {
    if (!activeScreen || screens.length <= 1) return;
    const index = screens.findIndex((screen) => screen.id === activeScreen.id);
    const nextScreens = screens.filter((screen) => screen.id !== activeScreen.id);
    const nextActive = nextScreens[Math.min(index, nextScreens.length - 1)];
    onScreensChange(nextScreens);
    onActiveScreenChange(nextActive.id);
    setSelectedId(nextActive.elements[0]?.id ?? "");
    onNotice("Écran supprimé");
  }

  const displayedElements = elements.map((element) => dragPreview?.id === element.id ? dragPreview : element);
  const screenStyle = { "--screen-columns": config.columns, "--screen-rows": config.rows, aspectRatio: (config.columns * 4) + " / " + (config.rows * 5) } as DesignerStyle;

  return (
    <div className="screen-designer">
      <div className="screen-library">
        <div className="screen-library-head">
          <div className="screen-library-title"><Layers3 size={17} /><span>Mes écrans</span><small>{screens.length}</small></div>
          <label className="screen-name-field"><span>Nom</span><input type="text" maxLength={60} value={activeScreen?.name ?? ""} onChange={(event) => activeScreen && onScreensChange(screens.map((screen) => screen.id === activeScreen.id ? { ...screen, name: event.target.value } : screen))} onBlur={() => activeScreen && !activeScreen.name.trim() && onScreensChange(screens.map((screen) => screen.id === activeScreen.id ? { ...screen, name: "Écran sans nom" } : screen))} /></label>
          <div className="screen-library-actions">
            <button type="button" onClick={duplicateScreen} title="Dupliquer l'écran" aria-label="Dupliquer l'écran"><Copy size={16} /></button>
            <button type="button" onClick={deleteScreen} disabled={screens.length <= 1} title="Supprimer l'écran" aria-label="Supprimer l'écran"><Trash2 size={16} /></button>
            <button type="button" className="primary" onClick={addScreen} title="Ajouter un écran" aria-label="Ajouter un écran"><Plus size={17} /></button>
          </div>
        </div>
        <div className="screen-tabs-list" role="tablist" aria-label="Écrans du projet">
          {screens.map((screen, index) => (
            <button type="button" role="tab" aria-selected={screen.id === activeScreen?.id} className={"screen-tab" + (screen.id === activeScreen?.id ? " active" : "")} onClick={() => { onActiveScreenChange(screen.id); setSelectedId(screen.elements[0]?.id ?? ""); }} key={screen.id}>
              <span className="screen-tab-index">{index + 1}</span>
              <span className="screen-tab-copy"><strong>{screen.name.trim() || "Écran sans nom"}</strong><small>{screen.elements.length} élément{screen.elements.length > 1 ? "s" : ""}</small></span>
            </button>
          ))}
        </div>
      </div>

      <div className="designer-content">
        <div className="designer-main">
          <div className="designer-toolbar">
            <div className="designer-tools">
              <button type="button" onClick={() => addElement(makeSceneText("Nouveau texte", 2, 2, "White"))}><Type size={16} /><span>Texte</span></button>
              <button type="button" onClick={() => addElement(makeSceneBox(2, 4, Math.min(18, config.columns - 1), Math.min(8, config.rows - 3), config.colorEnabled ? "Cyan" : "White"))}><Square size={16} /><span>Cadre</span></button>
              <button type="button" onClick={() => fileInputRef.current?.click()}><ImagePlus size={16} /><span>Image</span></button>
              <input ref={fileInputRef} className="visually-hidden" type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/bmp" onChange={(event) => { handleFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
            </div>
            <div className="designer-size-badge"><Maximize2 size={15} /><span>{config.columns} × {config.rows}</span></div>
          </div>
          <div className="designer-stage">
            <div className={"designer-screen" + (config.colorEnabled ? "" : " monochrome")} ref={screenRef} style={screenStyle} onPointerMove={moveElement} onPointerUp={finishElementDrag} onPointerCancel={finishElementDrag} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(""); }}>
              <div className="designer-safe-area" />
              {displayedElements.map((element) => {
                const dimensions = elementDimensions(element);
                const elementStyle = {
                  "--element-x": element.x - 1,
                  "--element-y": element.y - 1,
                  "--element-width": dimensions.width,
                  "--element-height": dimensions.height,
                  "--element-fg": colorValues[config.colorEnabled ? element.fg : "White"],
                  "--element-bg": element.kind === "text" ? colorValues[config.colorEnabled ? element.bg : "Black"] : "transparent",
                } as DesignerStyle;
                return (
                  <div className={"scene-element " + element.kind + (selectedId === element.id ? " selected" : "") + (dragPreview?.id === element.id ? " dragging" : "")} style={elementStyle} key={element.id} onPointerDown={(event) => beginElementDrag(event, element, "move")} title="Déplacer l'élément">
                    {element.kind === "text" ? <span className={"scene-text " + element.size}>{element.text || "Texte"}</span> : null}
                    {element.kind === "box" ? <span className={"scene-box " + (element.filled ? "filled" : "")} /> : null}
                    {element.kind === "image" ? <PixelPreview bitmap={element.bitmap} width={element.width * 2} height={element.height * 3} color={config.colorEnabled ? element.fg : "White"} /> : null}
                    {element.kind !== "text" && selectedId === element.id ? <button type="button" className="scene-resize-handle" onPointerDown={(event) => beginElementDrag(event, element, "resize")} title="Redimensionner"><Maximize2 size={12} /></button> : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <aside className="designer-inspector">
          <div className="designer-settings">
            <div className="inspector-title"><Settings2 size={16} /><span>Format du Minitel</span></div>
            <label className="toggle-setting"><input type="checkbox" checked={config.colorEnabled} onChange={(event) => onConfigChange({ ...config, colorEnabled: event.target.checked })} /><span>Affichage couleur</span></label>
            <label className="property-field property-wide"><span>Modèle</span><select value={config.preset} onChange={(event) => changePreset(event.target.value as ScreenPresetId)}>{screenPresets.map((preset) => <option value={preset.id} key={preset.id}>{preset.label}</option>)}</select></label>
            <label className="property-field property-wide"><span>Nom du modèle</span><input value={config.name} onChange={(event) => onConfigChange({ ...config, name: event.target.value, preset: config.preset === "custom" ? "custom" : config.preset })} /></label>
            <div className="property-grid">
              <label className="property-field"><span>Colonnes</span><input type="number" min="20" max="80" value={config.columns} onChange={(event) => onConfigChange({ ...config, preset: "custom", columns: clamp(Number(event.target.value), 20, 80) })} /></label>
              <label className="property-field"><span>Lignes</span><input type="number" min="12" max="40" value={config.rows} onChange={(event) => onConfigChange({ ...config, preset: "custom", rows: clamp(Number(event.target.value), 12, 40) })} /></label>
            </div>
          </div>
          <div className="designer-properties">
            <div className="inspector-title"><Palette size={16} /><span>Élément sélectionné</span></div>
            <ElementInspector element={selected} config={config} onChange={updateElement} onDelete={deleteSelected} />
          </div>
        </aside>
      </div>
      {imageSource ? <ImageImportModal sourceDataUrl={imageSource.dataUrl} sourceName={imageSource.name} config={config} onClose={() => setImageSource(null)} onImport={(element) => { addElement(element); setImageSource(null); onNotice("Image ajoutée à l'écran"); }} /> : null}
    </div>
  );
}
