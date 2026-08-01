import { useMemo, useState } from "react";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle.js";
import Check from "lucide-react/dist/esm/icons/check.js";
import FileCode2 from "lucide-react/dist/esm/icons/file-code-2.js";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open.js";
import Globe2 from "lucide-react/dist/esm/icons/globe-2.js";
import ImageIcon from "lucide-react/dist/esm/icons/image.js";
import Server from "lucide-react/dist/esm/icons/server.js";
import X from "lucide-react/dist/esm/icons/x.js";
import { projectAssetSize, type ProjectAsset } from "./file-editor";

export const DEFAULT_WEB_SERVER_PORT = 80;
export const DEFAULT_WEB_SERVER_NAME = "Serveur principal";

export function normalizeWebServerName(value: string) {
  return value.replace(/\s+/g, " ").trim().slice(0, 48);
}

export type WebServerAssetRoute = {
  fileId: string;
  path: string;
};

function routeRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

export function normalizeWebServerPath(value: string) {
  const withoutQuery = value.trim().replace(/\\/g, "/").replace(/[?#].*$/, "");
  if (!withoutQuery) return "/";
  const safe = withoutQuery
    .replace(/[^A-Za-z0-9._~!$&'()*+,;=:@/-]/g, "-")
    .replace(/\/{2,}/g, "/");
  return (safe.startsWith("/") ? safe : "/" + safe).slice(0, 240) || "/";
}

export function defaultWebServerPath(asset: Pick<ProjectAsset, "name">) {
  const path = normalizeWebServerPath("/" + asset.name);
  const parts = path.split("/");
  const leaf = parts.pop()?.toLocaleLowerCase("en") ?? "";
  if (leaf === "index.html" || leaf === "index.htm") {
    const directory = parts.join("/") || "/";
    return directory === "/" ? "/" : directory.replace(/\/+$/, "") + "/";
  }
  return path;
}

export function parseWebServerRoutes(value: unknown): WebServerAssetRoute[] {
  if (typeof value !== "string" || !value.trim()) return [];
  try {
    const decoded = JSON.parse(value);
    if (!Array.isArray(decoded)) return [];
    const seenFiles = new Set<string>();
    return decoded.flatMap((entry) => {
      const source = routeRecord(entry);
      const fileId = typeof source?.fileId === "string" ? source.fileId.trim().slice(0, 120) : "";
      const path = typeof source?.path === "string" ? normalizeWebServerPath(source.path) : "";
      if (!fileId || !path || seenFiles.has(fileId)) return [];
      seenFiles.add(fileId);
      return [{ fileId, path }];
    }).slice(0, 128);
  } catch {
    return [];
  }
}

export function serializeWebServerRoutes(routes: WebServerAssetRoute[]) {
  return JSON.stringify(routes.slice(0, 128).map((route) => ({
    fileId: route.fileId.slice(0, 120),
    path: normalizeWebServerPath(route.path),
  })));
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return bytes + " o";
  if (bytes < 1024 * 1024) return (bytes / 1024).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Ko";
  return (bytes / (1024 * 1024)).toLocaleString("fr-FR", { maximumFractionDigits: 1 }) + " Mo";
}

type RouteDraft = {
  enabled: boolean;
  path: string;
};

export function WebServerConfigDialog({
  files,
  initialName,
  initialPort,
  initialRoutes,
  onSave,
  onClose,
  onOpenFiles,
}: {
  files: ProjectAsset[];
  initialName: string;
  initialPort: number;
  initialRoutes: WebServerAssetRoute[];
  onSave: (name: string, port: number, routes: WebServerAssetRoute[]) => void;
  onClose: () => void;
  onOpenFiles: () => void;
}) {
  const initialByFile = useMemo(() => new Map(initialRoutes.map((route) => [route.fileId, route.path])), [initialRoutes]);
  const [name, setName] = useState(normalizeWebServerName(initialName) || DEFAULT_WEB_SERVER_NAME);
  const [port, setPort] = useState(String(initialPort || DEFAULT_WEB_SERVER_PORT));
  const [drafts, setDrafts] = useState<Record<string, RouteDraft>>(() => Object.fromEntries(files.map((asset) => {
    const configuredPath = initialByFile.get(asset.id);
    return [asset.id, { enabled: Boolean(configuredPath), path: configuredPath ?? defaultWebServerPath(asset) }];
  })));

  const selectedFiles = files.filter((asset) => drafts[asset.id]?.enabled);
  const normalizedPaths = selectedFiles.map((asset) => normalizeWebServerPath(drafts[asset.id]?.path ?? ""));
  const duplicatePaths = new Set(normalizedPaths.filter((path, index) => normalizedPaths.indexOf(path) !== index));
  const hasEmptyPath = selectedFiles.some((asset) => !(drafts[asset.id]?.path ?? "").trim());
  const normalizedName = normalizeWebServerName(name);
  const nameValid = normalizedName.length > 0;
  const parsedPort = Number(port);
  const portValid = Number.isInteger(parsedPort) && parsedPort >= 1 && parsedPort <= 65535;
  const totalBytes = selectedFiles.reduce((total, asset) => total + projectAssetSize(asset), 0);
  const canSave = nameValid && portValid && !hasEmptyPath && duplicatePaths.size === 0;

  function updateDraft(fileId: string, patch: Partial<RouteDraft>) {
    setDrafts((current) => ({
      ...current,
      [fileId]: { ...current[fileId], ...patch },
    }));
  }

  function selectAll(enabled: boolean) {
    setDrafts((current) => Object.fromEntries(files.map((asset) => [
      asset.id,
      {
        enabled,
        path: current[asset.id]?.path || defaultWebServerPath(asset),
      },
    ])));
  }

  function save() {
    if (!canSave) return;
    onSave(
      normalizedName,
      parsedPort,
      selectedFiles.map((asset) => ({
        fileId: asset.id,
        path: normalizeWebServerPath(drafts[asset.id].path),
      })),
    );
  }

  return (
    <div className="modal-backdrop web-server-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="modal-card web-server-modal" role="dialog" aria-modal="true" aria-labelledby="web-server-title">
        <header className="modal-header">
          <div>
            <span className="modal-kicker">Bloc réseau</span>
            <h2 id="web-server-title">Configurer le serveur web</h2>
            <p>Donne-lui un nom, choisis son port et les fichiers que l’ESP32 rendra accessibles.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose} title="Fermer"><X size={18} /></button>
        </header>

        <div className="web-server-modal-body">
          <section className="web-server-port-panel">
            <div className="web-server-section-icon"><Server size={20} /></div>
            <div className="web-server-port-copy">
              <strong>Serveur HTTP</strong>
              <span>Il démarre lorsque le programme atteint ce bloc.</span>
            </div>
            <label className={"web-server-name-field" + (!nameValid ? " invalid" : "")}>
              <span>Nom du serveur</span>
              <input
                type="text"
                maxLength={48}
                value={name}
                aria-invalid={!nameValid}
                onChange={(event) => setName(event.target.value)}
                onBlur={() => { if (normalizedName) setName(normalizedName); }}
                placeholder="Serveur principal"
              />
              {!nameValid ? <small>Le nom est obligatoire.</small> : null}
            </label>
            <label className={"web-server-port-field" + (!portValid ? " invalid" : "")}>
              <span>Port</span>
              <input type="number" min="1" max="65535" step="1" value={port} onChange={(event) => setPort(event.target.value)} />
            </label>
            <div className="web-server-address">
              <Globe2 size={15} />
              <code>{"http://adresse-esp32" + (parsedPort === 80 ? "" : ":" + (port || DEFAULT_WEB_SERVER_PORT)) + "/"}</code>
            </div>
          </section>

          <section className="web-server-files-panel">
            <div className="web-server-files-heading">
              <div>
                <strong>Fichiers publiés</strong>
                <span>{selectedFiles.length} sur {files.length} · {formatBytes(totalBytes)} embarqués</span>
              </div>
              {files.length > 0 ? (
                <div className="web-server-selection-actions">
                  <button type="button" onClick={() => selectAll(true)}>Tout sélectionner</button>
                  <button type="button" onClick={() => selectAll(false)}>Aucun</button>
                </div>
              ) : null}
            </div>

            {files.length === 0 ? (
              <div className="web-server-empty">
                <FolderOpen size={28} />
                <strong>Aucun fichier dans ce projet</strong>
                <span>Ajoute d’abord une page HTML, une feuille CSS, un script ou une image.</span>
                <button type="button" onClick={onOpenFiles}><FolderOpen size={16} />Ouvrir l’éditeur de fichiers</button>
              </div>
            ) : (
              <div className="web-server-file-list">
                {files.map((asset) => {
                  const draft = drafts[asset.id] ?? { enabled: false, path: defaultWebServerPath(asset) };
                  const normalizedPath = normalizeWebServerPath(draft.path);
                  const duplicate = draft.enabled && duplicatePaths.has(normalizedPath);
                  const Icon = asset.mimeType.startsWith("image/") ? ImageIcon : FileCode2;
                  return (
                    <div className={"web-server-file-row" + (draft.enabled ? " selected" : "") + (duplicate ? " invalid" : "")} key={asset.id}>
                      <label className="web-server-file-check">
                        <input type="checkbox" checked={draft.enabled} onChange={(event) => updateDraft(asset.id, { enabled: event.target.checked })} />
                        <span className="web-server-checkmark"><Check size={13} /></span>
                      </label>
                      <div className="web-server-file-icon"><Icon size={18} /></div>
                      <div className="web-server-file-copy">
                        <strong title={asset.name}>{asset.name}</strong>
                        <span>{asset.mimeType} · {formatBytes(projectAssetSize(asset))}</span>
                      </div>
                      <label className="web-server-route-field">
                        <span>Adresse publique</span>
                        <input
                          type="text"
                          value={draft.path}
                          disabled={!draft.enabled}
                          aria-invalid={duplicate || (!draft.path.trim() && draft.enabled)}
                          onChange={(event) => updateDraft(asset.id, { path: event.target.value })}
                          onBlur={() => { if (draft.path.trim()) updateDraft(asset.id, { path: normalizedPath }); }}
                          placeholder="/fichier.html"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            {duplicatePaths.size > 0 ? (
              <div className="web-server-error"><AlertCircle size={15} />Deux fichiers ne peuvent pas utiliser la même adresse publique.</div>
            ) : hasEmptyPath ? (
              <div className="web-server-error"><AlertCircle size={15} />Chaque fichier sélectionné doit avoir une adresse.</div>
            ) : totalBytes > 1024 * 1024 ? (
              <div className="web-server-warning"><AlertCircle size={15} />Ces fichiers occupent plus de 1 Mo dans la mémoire du programme.</div>
            ) : null}
          </section>
        </div>

        <footer className="web-server-modal-footer">
          <span>Les fichiers sont intégrés au programme au moment du téléversement.</span>
          <div>
            <button type="button" className="web-server-cancel" onClick={onClose}>Annuler</button>
            <button type="button" className="web-server-save" onClick={save} disabled={!canSave}><Check size={16} />Enregistrer</button>
          </div>
        </footer>
      </section>
    </div>
  );
}
