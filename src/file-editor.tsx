import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle.js";
import Braces from "lucide-react/dist/esm/icons/braces.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import Copy from "lucide-react/dist/esm/icons/copy.js";
import Download from "lucide-react/dist/esm/icons/download.js";
import File from "lucide-react/dist/esm/icons/file.js";
import FileAudio from "lucide-react/dist/esm/icons/file-audio.js";
import FileCode2 from "lucide-react/dist/esm/icons/file-code-2.js";
import FileImage from "lucide-react/dist/esm/icons/file-image.js";
import FileJson from "lucide-react/dist/esm/icons/file-json.js";
import FilePlus2 from "lucide-react/dist/esm/icons/file-plus-2.js";
import FileText from "lucide-react/dist/esm/icons/file-text.js";
import FileVideo from "lucide-react/dist/esm/icons/file-video.js";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Replace from "lucide-react/dist/esm/icons/replace.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Upload from "lucide-react/dist/esm/icons/upload.js";
import WrapText from "lucide-react/dist/esm/icons/wrap-text.js";
import X from "lucide-react/dist/esm/icons/x.js";
import type { LucideIcon } from "lucide-react";

export type ProjectAssetEncoding = "utf8" | "base64";

export type ProjectAsset = {
  id: string;
  name: string;
  mimeType: string;
  encoding: ProjectAssetEncoding;
  content: string;
  updatedAt: string;
};

export type ProjectAssetChangeOptions = {
  captureHistory?: boolean;
};

type NewFileKind = "text" | "json" | "html" | "css" | "javascript";

const textExtensions = new Set([
  "c", "cc", "conf", "cpp", "css", "csv", "env", "h", "hpp", "htm", "html", "ini", "ino",
  "java", "js", "json", "jsx", "log", "md", "mjs", "py", "sh", "sql", "svg", "text", "toml",
  "ts", "tsx", "txt", "xml", "yaml", "yml",
]);

const mimeByExtension: Record<string, string> = {
  bmp: "image/bmp",
  c: "text/x-c",
  cpp: "text/x-c++src",
  css: "text/css",
  csv: "text/csv",
  gif: "image/gif",
  h: "text/x-c",
  hpp: "text/x-c++hdr",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  ino: "text/x-arduino",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "text/javascript",
  json: "application/json",
  jsx: "text/jsx",
  md: "text/markdown",
  mp3: "audio/mpeg",
  mp4: "video/mp4",
  ogg: "audio/ogg",
  pdf: "application/pdf",
  png: "image/png",
  svg: "image/svg+xml",
  ts: "text/typescript",
  tsx: "text/tsx",
  txt: "text/plain",
  wav: "audio/wav",
  webm: "video/webm",
  webp: "image/webp",
  xml: "application/xml",
  yaml: "application/yaml",
  yml: "application/yaml",
};

const newFileTemplates: Record<NewFileKind, { extension: string; mimeType: string; content: string }> = {
  text: { extension: "txt", mimeType: "text/plain", content: "" },
  json: { extension: "json", mimeType: "application/json", content: "{\n  \"message\": \"Bonjour Minitel\"\n}\n" },
  html: { extension: "html", mimeType: "text/html", content: "<!doctype html>\n<html lang=\"fr\">\n  <head>\n    <meta charset=\"UTF-8\" />\n    <title>Minitel</title>\n  </head>\n  <body>\n\n  </body>\n</html>\n" },
  css: { extension: "css", mimeType: "text/css", content: "body {\n  margin: 0;\n}\n" },
  javascript: { extension: "js", mimeType: "text/javascript", content: "const message = \"Bonjour Minitel\";\n" },
};

const MAX_DESKTOP_FILE_BYTES = 16 * 1024 * 1024;
const MAX_DESKTOP_TOTAL_BYTES = 40 * 1024 * 1024;
const MAX_BROWSER_FILE_BYTES = 2 * 1024 * 1024;
const MAX_BROWSER_TOTAL_BYTES = 4 * 1024 * 1024;
const REMOVE_ANIMATION_MS = 220;

const assetUid = () => "asset-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);

function importedRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function extensionOf(name: string) {
  const leaf = name.split("/").pop() ?? "";
  const index = leaf.lastIndexOf(".");
  return index > 0 ? leaf.slice(index + 1).toLocaleLowerCase("en") : "";
}

function inferMimeType(name: string, supplied = "") {
  const safeSupplied = supplied.trim().toLocaleLowerCase("en");
  if (safeSupplied && safeSupplied !== "application/octet-stream") return safeSupplied.slice(0, 120);
  return mimeByExtension[extensionOf(name)] ?? "application/octet-stream";
}

export function cleanProjectAssetName(value: unknown, fallback = "nouveau-fichier.txt") {
  if (typeof value !== "string") return fallback;
  const parts = value
    .replace(/\\/g, "/")
    .split("/")
    .map((part) => part.replace(/[<>:\"|?*\u0000-\u001f]/g, "-").replace(/\s+/g, " ").trim())
    .filter((part) => part && part !== "." && part !== "..");
  const cleaned = parts.join("/").slice(0, 220);
  return cleaned || fallback;
}

export function isTextProjectAsset(asset: Pick<ProjectAsset, "name" | "mimeType" | "encoding">) {
  if (asset.encoding === "utf8") return true;
  const mimeType = asset.mimeType.toLocaleLowerCase("en");
  return mimeType.startsWith("text/")
    || mimeType.includes("json")
    || mimeType.includes("javascript")
    || mimeType.includes("xml")
    || mimeType.includes("yaml")
    || textExtensions.has(extensionOf(asset.name));
}

function validUpdatedAt(value: unknown) {
  if (typeof value === "string" && Number.isFinite(Date.parse(value))) return new Date(value).toISOString();
  return new Date().toISOString();
}

export function normalizeProjectAssets(value: unknown): ProjectAsset[] {
  if (!Array.isArray(value)) return [];
  const usedIds = new Set<string>();
  const usedNames = new Set<string>();
  return value.flatMap((entry) => {
    const source = importedRecord(entry);
    if (!source || typeof source.content !== "string") return [];
    const encoding: ProjectAssetEncoding = source.encoding === "base64" ? "base64" : "utf8";
    const baseName = cleanProjectAssetName(source.name, "fichier.txt");
    const name = uniqueAssetName(baseName, usedNames);
    usedNames.add(name.toLocaleLowerCase("fr"));
    const requestedId = typeof source.id === "string" && source.id.trim() ? source.id.trim().slice(0, 120) : assetUid();
    const id = usedIds.has(requestedId) ? assetUid() : requestedId;
    usedIds.add(id);
    return [{
      id,
      name,
      mimeType: inferMimeType(name, typeof source.mimeType === "string" ? source.mimeType : ""),
      encoding,
      content: source.content,
      updatedAt: validUpdatedAt(source.updatedAt),
    }];
  });
}

export function createProjectAsset(name = "nouveau-fichier.txt", content = "", mimeType = "text/plain"): ProjectAsset {
  const safeName = cleanProjectAssetName(name);
  return {
    id: assetUid(),
    name: safeName,
    mimeType: inferMimeType(safeName, mimeType),
    encoding: "utf8",
    content,
    updatedAt: new Date().toISOString(),
  };
}

export function projectAssetSize(asset: ProjectAsset) {
  if (asset.encoding === "utf8") return new TextEncoder().encode(asset.content).byteLength;
  const padding = asset.content.endsWith("==") ? 2 : asset.content.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor(asset.content.length * 3 / 4) - padding);
}

export function projectAssetsSize(assets: ProjectAsset[]) {
  return assets.reduce((total, asset) => total + projectAssetSize(asset), 0);
}

function uniqueAssetName(baseName: string, usedNames: Set<string>) {
  const normalizedBase = cleanProjectAssetName(baseName);
  if (!usedNames.has(normalizedBase.toLocaleLowerCase("fr"))) return normalizedBase;
  const slashIndex = normalizedBase.lastIndexOf("/");
  const directory = slashIndex >= 0 ? normalizedBase.slice(0, slashIndex + 1) : "";
  const leaf = slashIndex >= 0 ? normalizedBase.slice(slashIndex + 1) : normalizedBase;
  const dotIndex = leaf.lastIndexOf(".");
  const stem = dotIndex > 0 ? leaf.slice(0, dotIndex) : leaf;
  const extension = dotIndex > 0 ? leaf.slice(dotIndex) : "";
  let suffix = 2;
  while (usedNames.has((directory + stem + " (" + suffix + ")" + extension).toLocaleLowerCase("fr"))) suffix += 1;
  return directory + stem + " (" + suffix + ")" + extension;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Ko";
  return (bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";
}

function fileIcon(asset: ProjectAsset): LucideIcon {
  const mimeType = asset.mimeType.toLocaleLowerCase("en");
  if (mimeType.includes("json")) return FileJson;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.startsWith("audio/")) return FileAudio;
  if (mimeType.startsWith("video/")) return FileVideo;
  if (isTextProjectAsset(asset)) return textExtensions.has(extensionOf(asset.name)) && extensionOf(asset.name) !== "txt" ? FileCode2 : FileText;
  return File;
}

function languageLabel(asset: ProjectAsset) {
  const extension = extensionOf(asset.name);
  const labels: Record<string, string> = {
    c: "C", cpp: "C++", css: "CSS", h: "C / C++", hpp: "C++", html: "HTML", ino: "Arduino",
    js: "JavaScript", json: "JSON", jsx: "React JSX", md: "Markdown", py: "Python", svg: "SVG",
    ts: "TypeScript", tsx: "React TSX", txt: "Texte", xml: "XML", yaml: "YAML", yml: "YAML",
  };
  return labels[extension] ?? (asset.mimeType.startsWith("text/") ? "Texte" : "Fichier");
}

function dataUrlForAsset(asset: ProjectAsset) {
  if (asset.encoding === "base64") return "data:" + asset.mimeType + ";base64," + asset.content;
  return "data:" + asset.mimeType + ";charset=utf-8," + encodeURIComponent(asset.content);
}

function blobForAsset(asset: ProjectAsset) {
  if (asset.encoding === "utf8") return new Blob([asset.content], { type: asset.mimeType + ";charset=utf-8" });
  const binary = window.atob(asset.content);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: asset.mimeType });
}

function readFileAsBase64(file: globalThis.File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Impossible de lire le fichier."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.slice(result.indexOf(",") + 1) : result);
    };
    reader.readAsDataURL(file);
  });
}

async function assetFromBrowserFile(file: globalThis.File): Promise<ProjectAsset> {
  const name = cleanProjectAssetName(file.webkitRelativePath || file.name, "fichier");
  const mimeType = inferMimeType(name, file.type);
  const textAsset = isTextProjectAsset({ name, mimeType, encoding: "base64" });
  return {
    id: assetUid(),
    name,
    mimeType,
    encoding: textAsset ? "utf8" : "base64",
    content: textAsset ? await file.text() : await readFileAsBase64(file),
    updatedAt: new Date().toISOString(),
  };
}

function NewFileDialog({ open, files, onClose, onCreate }: { open: boolean; files: ProjectAsset[]; onClose: () => void; onCreate: (asset: ProjectAsset) => void }) {
  const [kind, setKind] = useState<NewFileKind>("text");
  const [name, setName] = useState("nouveau-fichier.txt");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setKind("text");
    setName("nouveau-fichier.txt");
    window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  }, [open]);

  if (!open) return null;
  const create = () => {
    const template = newFileTemplates[kind];
    const rawName = cleanProjectAssetName(name, "nouveau-fichier." + template.extension);
    const withExtension = extensionOf(rawName) ? rawName : rawName + "." + template.extension;
    const used = new Set(files.map((asset) => asset.name.toLocaleLowerCase("fr")));
    onCreate(createProjectAsset(uniqueAssetName(withExtension, used), template.content, template.mimeType));
  };

  return (
    <div className="modal-backdrop file-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card file-modal" role="dialog" aria-modal="true" aria-labelledby="new-file-title">
        <header className="modal-header">
          <div><span className="modal-kicker">Fichiers du projet</span><h2 id="new-file-title">Nouveau fichier</h2></div>
          <button type="button" className="icon-button" onClick={onClose} title="Fermer"><X size={18} /></button>
        </header>
        <div className="file-modal-body">
          <label><span>Type</span><select value={kind} onChange={(event) => {
            const nextKind = event.target.value as NewFileKind;
            const previousExtension = newFileTemplates[kind].extension;
            const nextExtension = newFileTemplates[nextKind].extension;
            setKind(nextKind);
            setName((current) => current.endsWith("." + previousExtension) ? current.slice(0, -previousExtension.length) + nextExtension : current);
          }}><option value="text">Texte</option><option value="json">JSON</option><option value="html">HTML</option><option value="css">CSS</option><option value="javascript">JavaScript</option></select></label>
          <label><span>Nom ou chemin</span><input ref={inputRef} type="text" maxLength={220} value={name} onChange={(event) => setName(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") create(); }} placeholder="dossier/fichier.txt" /></label>
        </div>
        <footer className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Annuler</button>
          <button type="button" className="primary-button" onClick={create}><Plus size={17} /><span>Créer</span></button>
        </footer>
      </section>
    </div>
  );
}

function DeleteFileDialog({ asset, onClose, onConfirm }: { asset: ProjectAsset | null; onClose: () => void; onConfirm: () => void }) {
  if (!asset) return null;
  return (
    <div className="modal-backdrop file-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card file-modal file-delete-modal" role="dialog" aria-modal="true" aria-labelledby="delete-file-title">
        <header className="modal-header">
          <div><span className="modal-kicker danger">Suppression</span><h2 id="delete-file-title">Supprimer ce fichier ?</h2></div>
          <button type="button" className="icon-button" onClick={onClose} title="Fermer"><X size={18} /></button>
        </header>
        <div className="delete-file-summary"><FileText size={21} /><span>{asset.name}</span></div>
        <footer className="modal-footer">
          <button type="button" className="secondary-button" onClick={onClose}>Annuler</button>
          <button type="button" className="danger-button" onClick={onConfirm}><Trash2 size={17} /><span>Supprimer</span></button>
        </footer>
      </section>
    </div>
  );
}

export function FileEditor({
  files,
  activeFileId,
  onFilesChange,
  onActiveFileChange,
  onNotice,
}: {
  files: ProjectAsset[];
  activeFileId: string;
  onFilesChange: (next: ProjectAsset[], options?: ProjectAssetChangeOptions) => void;
  onActiveFileChange: (fileId: string) => void;
  onNotice: (message: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [newFileOpen, setNewFileOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ProjectAsset | null>(null);
  const [removingId, setRemovingId] = useState("");
  const [nameDraft, setNameDraft] = useState("");
  const [wrapLines, setWrapLines] = useState(false);
  const importInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const lineNumbersRef = useRef<HTMLPreElement>(null);
  const editSessionRef = useRef("");
  const deleteTimerRef = useRef<number | null>(null);

  const activeFile = files.find((asset) => asset.id === activeFileId) ?? files[0] ?? null;
  const filteredFiles = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return [...files]
      .filter((asset) => !query || asset.name.toLocaleLowerCase("fr").includes(query) || asset.mimeType.includes(query))
      .sort((left, right) => left.name.localeCompare(right.name, "fr", { numeric: true, sensitivity: "base" }));
  }, [files, search]);
  const totalBytes = useMemo(() => projectAssetsSize(files), [files]);
  const isText = activeFile ? isTextProjectAsset(activeFile) : false;
  const lineCount = activeFile && isText ? Math.max(1, activeFile.content.split("\n").length) : 0;
  const lineNumbers = useMemo(() => Array.from({ length: lineCount }, (_, index) => String(index + 1)).join("\n"), [lineCount]);
  const jsonStatus = useMemo(() => {
    if (!activeFile || !isText || extensionOf(activeFile.name) !== "json") return null;
    try {
      JSON.parse(activeFile.content);
      return { valid: true, label: "JSON valide" };
    } catch (error) {
      return { valid: false, label: error instanceof Error ? error.message.replace(/^JSON\.parse:\s*/i, "") : "JSON invalide" };
    }
  }, [activeFile, isText]);

  useEffect(() => {
    if (!activeFile && files.length > 0) onActiveFileChange(files[0].id);
  }, [activeFile, files, onActiveFileChange]);

  useEffect(() => {
    setNameDraft(activeFile?.name ?? "");
    editSessionRef.current = "";
  }, [activeFile?.id, activeFile?.name]);

  useEffect(() => () => {
    if (deleteTimerRef.current !== null) window.clearTimeout(deleteTimerRef.current);
  }, []);

  function fileLimits() {
    return window.minitelStudio
      ? { single: MAX_DESKTOP_FILE_BYTES, total: MAX_DESKTOP_TOTAL_BYTES }
      : { single: MAX_BROWSER_FILE_BYTES, total: MAX_BROWSER_TOTAL_BYTES };
  }

  async function importBrowserFiles(browserFiles: globalThis.File[], replacing?: ProjectAsset) {
    if (browserFiles.length === 0) return;
    const limits = fileLimits();
    const accepted: ProjectAsset[] = [];
    let nextTotal = totalBytes - (replacing ? projectAssetSize(replacing) : 0);
    let skipped = 0;
    for (const browserFile of browserFiles) {
      if (browserFile.size > limits.single || nextTotal + browserFile.size > limits.total) {
        skipped += 1;
        continue;
      }
      try {
        const asset = await assetFromBrowserFile(browserFile);
        accepted.push(asset);
        nextTotal += projectAssetSize(asset);
      } catch {
        skipped += 1;
      }
      if (replacing) break;
    }
    if (accepted.length === 0) {
      onNotice("Fichier trop volumineux ou illisible");
      return;
    }

    if (replacing) {
      const imported = accepted[0];
      const next = files.map((asset) => asset.id === replacing.id ? {
        ...imported,
        id: replacing.id,
        name: replacing.name,
        updatedAt: new Date().toISOString(),
      } : asset);
      onFilesChange(next);
      onNotice("Fichier remplacé");
    } else {
      const used = new Set(files.map((asset) => asset.name.toLocaleLowerCase("fr")));
      const additions = accepted.map((asset) => {
        const name = uniqueAssetName(asset.name, used);
        used.add(name.toLocaleLowerCase("fr"));
        return { ...asset, name };
      });
      onFilesChange([...files, ...additions]);
      onActiveFileChange(additions[0].id);
      onNotice(additions.length + " fichier" + (additions.length > 1 ? "s importés" : " importé") + (skipped ? " · " + skipped + " ignoré" + (skipped > 1 ? "s" : "") : ""));
    }
  }

  function createFile(asset: ProjectAsset) {
    onFilesChange([...files, asset]);
    onActiveFileChange(asset.id);
    setNewFileOpen(false);
    onNotice("Fichier créé");
  }

  function commitName() {
    if (!activeFile) return;
    const used = new Set(files.filter((asset) => asset.id !== activeFile.id).map((asset) => asset.name.toLocaleLowerCase("fr")));
    const nextName = uniqueAssetName(cleanProjectAssetName(nameDraft, activeFile.name), used);
    setNameDraft(nextName);
    if (nextName === activeFile.name) return;
    onFilesChange(files.map((asset) => asset.id === activeFile.id ? {
      ...asset,
      name: nextName,
      mimeType: inferMimeType(nextName, extensionOf(nextName) === extensionOf(asset.name) ? asset.mimeType : ""),
      updatedAt: new Date().toISOString(),
    } : asset));
    onNotice("Fichier renommé");
  }

  function updateTextContent(content: string) {
    if (!activeFile) return;
    const sessionKey = "content:" + activeFile.id;
    const captureHistory = editSessionRef.current !== sessionKey;
    editSessionRef.current = sessionKey;
    onFilesChange(files.map((asset) => asset.id === activeFile.id ? { ...asset, content, updatedAt: new Date().toISOString() } : asset), { captureHistory });
  }

  function handleEditorKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Tab") return;
    event.preventDefault();
    const target = event.currentTarget;
    const start = target.selectionStart;
    const end = target.selectionEnd;
    const nextContent = target.value.slice(0, start) + "  " + target.value.slice(end);
    updateTextContent(nextContent);
    window.requestAnimationFrame(() => {
      editorRef.current?.setSelectionRange(start + 2, start + 2);
    });
  }

  function duplicateActiveFile() {
    if (!activeFile) return;
    const used = new Set(files.map((asset) => asset.name.toLocaleLowerCase("fr")));
    const duplicate = { ...activeFile, id: assetUid(), name: uniqueAssetName(activeFile.name, used), updatedAt: new Date().toISOString() };
    onFilesChange([...files, duplicate]);
    onActiveFileChange(duplicate.id);
    onNotice("Fichier dupliqué");
  }

  function downloadActiveFile() {
    if (!activeFile) return;
    const url = URL.createObjectURL(blobForAsset(activeFile));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = activeFile.name.split("/").pop() || "fichier";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    onNotice("Fichier téléchargé");
  }

  function confirmDelete() {
    if (!deleteTarget || removingId) return;
    const target = deleteTarget;
    setDeleteTarget(null);
    setRemovingId(target.id);
    deleteTimerRef.current = window.setTimeout(() => {
      const index = files.findIndex((asset) => asset.id === target.id);
      const next = files.filter((asset) => asset.id !== target.id);
      onFilesChange(next);
      if (activeFileId === target.id) onActiveFileChange(next[Math.min(index, Math.max(0, next.length - 1))]?.id ?? "");
      setRemovingId("");
      deleteTimerRef.current = null;
      onNotice("Fichier supprimé");
    }, REMOVE_ANIMATION_MS);
  }

  function formatJson() {
    if (!activeFile || !jsonStatus?.valid) return;
    const formatted = JSON.stringify(JSON.parse(activeFile.content), null, 2) + "\n";
    editSessionRef.current = "";
    updateTextContent(formatted);
    onNotice("JSON formaté");
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragActive(false);
    void importBrowserFiles(Array.from(event.dataTransfer.files));
  }

  const ActiveIcon = activeFile ? fileIcon(activeFile) : FolderOpen;
  const previewUrl = activeFile && !isText ? dataUrlForAsset(activeFile) : "";

  return (
    <div
      className={"file-editor" + (dragActive ? " drag-active" : "")}
      onDragEnter={(event) => { event.preventDefault(); setDragActive(true); }}
      onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; setDragActive(true); }}
      onDragLeave={(event) => { const nextTarget = event.relatedTarget; if (!(nextTarget instanceof Node) || !event.currentTarget.contains(nextTarget)) setDragActive(false); }}
      onDrop={handleDrop}
    >
      <aside className="file-library" aria-label="Fichiers du projet">
        <div className="file-library-head">
          <div className="file-library-title"><FolderOpen size={17} /><span>Mes fichiers</span><small>{files.length}</small></div>
          <div className="file-library-actions">
            <button type="button" onClick={() => setNewFileOpen(true)} title="Créer un fichier"><FilePlus2 size={16} /></button>
            <button type="button" className="primary" onClick={() => importInputRef.current?.click()} title="Importer des fichiers"><Upload size={16} /></button>
          </div>
          <input ref={importInputRef} className="visually-hidden" type="file" multiple tabIndex={-1} aria-hidden="true" onChange={(event) => {
            void importBrowserFiles(Array.from(event.currentTarget.files ?? []));
            event.currentTarget.value = "";
          }} />
          <input ref={replaceInputRef} className="visually-hidden" type="file" tabIndex={-1} aria-hidden="true" onChange={(event) => {
            if (activeFile) void importBrowserFiles(Array.from(event.currentTarget.files ?? []), activeFile);
            event.currentTarget.value = "";
          }} />
        </div>
        <label className="file-search"><Search size={15} /><input type="search" aria-label="Rechercher un fichier" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher" /><span>{filteredFiles.length}</span></label>
        <div className="file-list" role="tablist" aria-label="Liste des fichiers">
          {filteredFiles.map((asset) => {
            const Icon = fileIcon(asset);
            return (
              <button
                type="button"
                role="tab"
                aria-selected={asset.id === activeFile?.id}
                className={"file-list-item" + (asset.id === activeFile?.id ? " active" : "") + (asset.id === removingId ? " removing" : "")}
                onClick={() => onActiveFileChange(asset.id)}
                key={asset.id}
              >
                <span className={"file-type-icon type-" + extensionOf(asset.name)}><Icon size={17} /></span>
                <span className="file-list-copy"><strong>{asset.name.split("/").pop()}</strong><small>{asset.name.includes("/") ? asset.name.slice(0, asset.name.lastIndexOf("/")) + " · " : ""}{formatBytes(projectAssetSize(asset))}</small></span>
              </button>
            );
          })}
          {files.length === 0 ? (
            <div className="file-list-empty"><FolderOpen size={24} /><strong>Aucun fichier</strong><button type="button" onClick={() => importInputRef.current?.click()}><Upload size={15} /><span>Importer</span></button></div>
          ) : filteredFiles.length === 0 ? (
            <div className="file-list-empty compact"><Search size={20} /><strong>Aucun résultat</strong></div>
          ) : null}
        </div>
        <div className="file-library-footer"><span>{formatBytes(totalBytes)}</span><span>{files.length} fichier{files.length > 1 ? "s" : ""}</span></div>
      </aside>

      <section className="file-workbench" aria-label="Éditeur de fichier">
        {activeFile ? (
          <>
            <header className="file-workbench-head">
              <span className="active-file-icon"><ActiveIcon size={19} /></span>
              <label className="active-file-name"><span>Nom</span><input type="text" value={nameDraft} maxLength={220} onChange={(event) => setNameDraft(event.target.value)} onBlur={commitName} onKeyDown={(event) => {
                if (event.key === "Enter") event.currentTarget.blur();
                if (event.key === "Escape") {
                  setNameDraft(activeFile.name);
                  event.currentTarget.blur();
                }
              }} /></label>
              <span className="active-file-size">{formatBytes(projectAssetSize(activeFile))}</span>
              <div className="file-workbench-actions">
                <button type="button" onClick={duplicateActiveFile} title="Dupliquer"><Copy size={16} /></button>
                <button type="button" onClick={() => replaceInputRef.current?.click()} title="Remplacer le contenu"><Replace size={16} /></button>
                <button type="button" onClick={downloadActiveFile} title="Télécharger"><Download size={16} /></button>
                <button type="button" className="danger" onClick={() => setDeleteTarget(activeFile)} title="Supprimer"><Trash2 size={16} /></button>
              </div>
            </header>

            {isText ? (
              <div className="text-file-editor">
                <div className="text-editor-status">
                  <span className="file-language"><FileCode2 size={14} />{languageLabel(activeFile)}</span>
                  <span>{lineCount} ligne{lineCount > 1 ? "s" : ""}</span>
                  {jsonStatus ? <span className={"json-status " + (jsonStatus.valid ? "valid" : "invalid")} title={jsonStatus.label}>{jsonStatus.valid ? <Check size={14} /> : <AlertCircle size={14} />}{jsonStatus.valid ? "Valide" : "Invalide"}</span> : null}
                  <div className="text-editor-actions">
                    {jsonStatus ? <button type="button" onClick={formatJson} disabled={!jsonStatus.valid} title="Formater le JSON"><Braces size={15} /><span>Formater</span></button> : null}
                    <button type="button" className={wrapLines ? "active" : ""} onClick={() => setWrapLines((current) => !current)} title="Retour à la ligne"><WrapText size={15} /><span>Renvoyer</span></button>
                  </div>
                </div>
                <div className={"code-editor-surface" + (wrapLines ? " wrapped" : "")}>
                  {!wrapLines ? <pre ref={lineNumbersRef} className="code-line-numbers" aria-hidden="true">{lineNumbers}</pre> : null}
                  <textarea
                    ref={editorRef}
                    value={activeFile.content}
                    spellCheck={false}
                    wrap={wrapLines ? "soft" : "off"}
                    aria-label={"Contenu de " + activeFile.name}
                    onChange={(event) => updateTextContent(event.target.value)}
                    onBlur={() => { editSessionRef.current = ""; }}
                    onKeyDown={handleEditorKeyDown}
                    onScroll={(event) => {
                      if (lineNumbersRef.current) lineNumbersRef.current.scrollTop = event.currentTarget.scrollTop;
                    }}
                  />
                </div>
              </div>
            ) : (
              <div className="binary-file-preview">
                {activeFile.mimeType.startsWith("image/") ? <img src={previewUrl} alt={activeFile.name} /> : null}
                {activeFile.mimeType.startsWith("audio/") ? <audio src={previewUrl} controls /> : null}
                {activeFile.mimeType.startsWith("video/") ? <video src={previewUrl} controls /> : null}
                {activeFile.mimeType === "application/pdf" ? <iframe src={previewUrl} title={activeFile.name} /> : null}
                {!activeFile.mimeType.startsWith("image/") && !activeFile.mimeType.startsWith("audio/") && !activeFile.mimeType.startsWith("video/") && activeFile.mimeType !== "application/pdf" ? (
                  <div className="binary-file-placeholder"><ActiveIcon size={42} /><strong>{activeFile.name.split("/").pop()}</strong><span>{activeFile.mimeType} · {formatBytes(projectAssetSize(activeFile))}</span><button type="button" onClick={downloadActiveFile}><Download size={16} /><span>Télécharger</span></button></div>
                ) : null}
              </div>
            )}
          </>
        ) : (
          <div className="file-workbench-empty">
            <span><FolderOpen size={34} /></span>
            <strong>Fichiers du projet</strong>
            <div><button type="button" onClick={() => setNewFileOpen(true)}><Plus size={16} /><span>Nouveau</span></button><button type="button" className="primary" onClick={() => importInputRef.current?.click()}><Upload size={16} /><span>Importer</span></button></div>
          </div>
        )}
      </section>

      {dragActive ? <div className="file-drop-overlay"><Upload size={28} /><strong>Déposer les fichiers</strong></div> : null}
      <NewFileDialog open={newFileOpen} files={files} onClose={() => setNewFileOpen(false)} onCreate={createFile} />
      <DeleteFileDialog asset={deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={confirmDelete} />
    </div>
  );
}
