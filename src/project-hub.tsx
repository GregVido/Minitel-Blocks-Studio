import { useEffect, useMemo, useState, type CSSProperties, type FormEvent } from "react";
import appLogo from "../logo.png";
import Check from "lucide-react/dist/esm/icons/check.js";
import Clock3 from "lucide-react/dist/esm/icons/clock-3.js";
import FolderOpen from "lucide-react/dist/esm/icons/folder-open.js";
import FolderPlus from "lucide-react/dist/esm/icons/folder-plus.js";
import Grid2X2 from "lucide-react/dist/esm/icons/grid-2-x-2.js";
import Layers3 from "lucide-react/dist/esm/icons/layers-3.js";
import List from "lucide-react/dist/esm/icons/list.js";
import Monitor from "lucide-react/dist/esm/icons/monitor.js";
import Palette from "lucide-react/dist/esm/icons/palette.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw.js";
import Search from "lucide-react/dist/esm/icons/search.js";
import Settings2 from "lucide-react/dist/esm/icons/settings-2.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import Upload from "lucide-react/dist/esm/icons/upload.js";
import X from "lucide-react/dist/esm/icons/x.js";

export type NewProjectSettings = {
  name: string;
  colorEnabled: boolean;
  columns: number;
  rows: number;
};

type ProjectHubProps = {
  projects: ManagedProjectSummary[];
  selectedId: string;
  loading: boolean;
  busy: boolean;
  message: string;
  onSelectedId: (id: string) => void;
  onRefresh: () => void;
  onOpen: (id: string) => Promise<void>;
  onCreate: (settings: NewProjectSettings) => Promise<boolean>;
  onImport: () => Promise<void>;
  onDelete: (id: string) => Promise<boolean>;
  onOpenSettings: () => void;
};

type HubStyle = CSSProperties & {
  "--project-accent"?: string;
  "--project-index"?: number;
  "--preview-columns"?: number;
  "--preview-rows"?: number;
};

const accents = ["#42d6c5", "#ffcc4d", "#ff6b63", "#75a7ff", "#8ddd70", "#f18bd2"];

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.round(value || min)));
}

function projectAccent(id: string) {
  const hash = Array.from(id).reduce((value, character) => ((value << 5) - value + character.charCodeAt(0)) | 0, 0);
  return accents[Math.abs(hash) % accents.length];
}

function formatModified(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date inconnue";
  const elapsed = Date.now() - date.getTime();
  if (elapsed >= 0 && elapsed < 60_000) return "À l'instant";
  if (elapsed >= 0 && elapsed < 3_600_000) return "Il y a " + Math.max(1, Math.floor(elapsed / 60_000)) + " min";
  if (elapsed >= 0 && elapsed < 86_400_000) return "Il y a " + Math.max(1, Math.floor(elapsed / 3_600_000)) + " h";
  if (elapsed >= 0 && elapsed < 172_800_000) return "Hier";
  return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: date.getFullYear() === new Date().getFullYear() ? undefined : "numeric" });
}

function projectSubtitle(project: ManagedProjectSummary) {
  const mode = project.colorEnabled ? "Couleur" : "Monochrome";
  return project.columns + " × " + project.rows + " · " + mode;
}

function ProjectThumbnail({ project }: { project: ManagedProjectSummary }) {
  const lines = project.previewText.length > 0 ? project.previewText : [project.name, project.screenCount + " écran" + (project.screenCount > 1 ? "s" : ""), project.blockCount + " bloc" + (project.blockCount > 1 ? "s" : "")];
  const style = {
    "--preview-columns": project.columns,
    "--preview-rows": project.rows,
  } as HubStyle;

  return (
    <div className={"hub-project-preview " + (project.colorEnabled ? "color" : "monochrome")} style={style}>
      <div className="hub-preview-scanlines" aria-hidden="true" />
      <div className="hub-preview-content">
        <span className="hub-preview-label">MINITEL</span>
        {lines.slice(0, 3).map((line, index) => <span className={"hub-preview-line line-" + index} key={line + index}>{line}</span>)}
      </div>
      <div className="hub-preview-status"><i /><span>{project.columns} × {project.rows}</span></div>
    </div>
  );
}

function NewProjectDialog({ open, busy, onClose, onCreate }: { open: boolean; busy: boolean; onClose: () => void; onCreate: (settings: NewProjectSettings) => Promise<boolean> }) {
  const [name, setName] = useState("Mon projet Minitel");
  const [colorEnabled, setColorEnabled] = useState(true);
  const [columns, setColumns] = useState(40);
  const [rows, setRows] = useState(24);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName("Mon projet Minitel");
    setColorEnabled(true);
    setColumns(40);
    setRows(24);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const previewColumns = clamp(columns || 40, 20, 80);
  const previewRows = clamp(rows || 24, 12, 40);

  const chooseSize = (nextColumns: number, nextRows: number) => {
    setColumns(nextColumns);
    setRows(nextRows);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const safeName = name.replace(/\s+/g, " ").trim();
    if (!safeName || submitting || busy) return;
    setSubmitting(true);
    const created = await onCreate({ name: safeName, colorEnabled, columns: previewColumns, rows: previewRows });
    setSubmitting(false);
    if (created) onClose();
  };

  return (
    <div className="hub-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}>
      <form className="hub-new-project" onSubmit={submit} role="dialog" aria-modal="true" aria-labelledby="new-project-title">
        <header>
          <div className="hub-modal-icon"><FolderPlus size={21} /></div>
          <div><span>Nouveau projet</span><h2 id="new-project-title">Configurer le Minitel</h2></div>
          <button type="button" className="hub-icon-button" onClick={onClose} disabled={submitting} title="Fermer"><X size={18} /></button>
        </header>
        <div className="hub-new-project-body">
          <div className="hub-project-form">
            <label className="hub-field hub-field-wide"><span>Nom du projet</span><input autoFocus maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="Mon projet Minitel" /></label>
            <fieldset className="hub-fieldset">
              <legend>Affichage</legend>
              <div className="hub-choice-control">
                <button type="button" className={colorEnabled ? "active" : ""} onClick={() => setColorEnabled(true)}><Palette size={17} /><span>Couleur</span>{colorEnabled ? <Check size={15} /> : null}</button>
                <button type="button" className={!colorEnabled ? "active" : ""} onClick={() => setColorEnabled(false)}><Monitor size={17} /><span>Monochrome</span>{!colorEnabled ? <Check size={15} /> : null}</button>
              </div>
            </fieldset>
            <fieldset className="hub-fieldset">
              <legend>Taille de l'écran</legend>
              <div className="hub-size-presets">
                {[{ label: "Classique", columns: 40, rows: 24 }, { label: "Zone utile", columns: 40, rows: 20 }, { label: "Compact", columns: 32, rows: 20 }].map((preset) => (
                  <button type="button" className={columns === preset.columns && rows === preset.rows ? "active" : ""} onClick={() => chooseSize(preset.columns, preset.rows)} key={preset.label}><strong>{preset.columns} × {preset.rows}</strong><span>{preset.label}</span></button>
                ))}
              </div>
            </fieldset>
            <div className="hub-dimension-fields">
              <label className="hub-field"><span>Colonnes</span><input type="number" min="20" max="80" value={columns || ""} onChange={(event) => setColumns(event.target.value === "" ? 0 : Number(event.target.value))} onBlur={(event) => setColumns(clamp(Number(event.currentTarget.value) || 40, 20, 80))} /></label>
              <label className="hub-field"><span>Lignes</span><input type="number" min="12" max="40" value={rows || ""} onChange={(event) => setRows(event.target.value === "" ? 0 : Number(event.target.value))} onBlur={(event) => setRows(clamp(Number(event.currentTarget.value) || 24, 12, 40))} /></label>
            </div>
          </div>
          <div className={"hub-create-preview " + (colorEnabled ? "color" : "monochrome")}>
            <div className="hub-create-screen" style={{ "--preview-columns": previewColumns, "--preview-rows": previewRows } as HubStyle}>
              <span>MINITEL</span>
              <strong>{name.trim() || "Nouveau projet"}</strong>
              <small>{previewColumns} COL · {previewRows} LIG</small>
              <i aria-hidden="true" />
            </div>
            <div className="hub-create-meta"><Monitor size={15} /><span>{colorEnabled ? "Minitel couleur" : "Minitel monochrome"}</span></div>
          </div>
        </div>
        <footer>
          <button type="button" className="hub-secondary-button" onClick={onClose} disabled={submitting}>Annuler</button>
          <button type="submit" className="hub-primary-button" disabled={!name.trim() || submitting || busy}><Plus size={17} /><span>{submitting ? "Création..." : "Créer le projet"}</span></button>
        </footer>
      </form>
    </div>
  );
}

export default function ProjectHub({ projects, selectedId, loading, busy, message, onSelectedId, onRefresh, onOpen, onCreate, onImport, onDelete, onOpenSettings }: ProjectHubProps) {
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"grid" | "list">("grid");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ManagedProjectSummary | null>(null);
  const [openingId, setOpeningId] = useState("");
  const [deletingId, setDeletingId] = useState("");

  const visibleProjects = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("fr");
    return [...projects]
      .sort((left, right) => Date.parse(right.modifiedAt) - Date.parse(left.modifiedAt))
      .filter((project) => !query || project.name.toLocaleLowerCase("fr").includes(query));
  }, [projects, search]);

  useEffect(() => {
    if (selectedId && visibleProjects.some((project) => project.id === selectedId)) return;
    onSelectedId(visibleProjects[0]?.id || "");
  }, [onSelectedId, selectedId, visibleProjects]);

  const openProject = async (id: string) => {
    if (!id || busy || openingId) return;
    setOpeningId(id);
    await onOpen(id);
    setOpeningId("");
  };
  const deleteProject = async () => {
    if (!deleteTarget || deletingId) return;
    setDeletingId(deleteTarget.id);
    const deleted = await onDelete(deleteTarget.id);
    setDeletingId("");
    if (deleted) setDeleteTarget(null);
  };

  return (
    <div className="project-hub">
      <header className="hub-titlebar">
        <div className="hub-app-identity"><img src={appLogo} alt="" /><div><strong>Minitel Blocks Studio</strong><span>Bibliothèque locale</span></div></div>
        <div className="hub-location"><span className="active"><Monitor size={16} />Mes projets</span></div>
        <div className="hub-titlebar-status"><i /><span>Prêt</span><button type="button" className="hub-icon-button" onClick={onOpenSettings} title="Ouvrir les paramètres"><Settings2 size={17} /></button></div>
      </header>

      <div className="hub-toolbar">
        <div className="hub-heading"><h1>Projets</h1><span>{projects.length}</span></div>
        <label className="hub-search"><Search size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher un projet" aria-label="Rechercher un projet" />{search ? <button type="button" onClick={() => setSearch("")} title="Effacer"><X size={15} /></button> : null}</label>
        <div className="hub-toolbar-actions">
          <span className="hub-sort"><Clock3 size={15} />Modifiés récemment</span>
          <button type="button" className="hub-icon-button" onClick={onRefresh} disabled={loading} title="Actualiser"><RefreshCw className={loading ? "spinning" : ""} size={17} /></button>
          <div className="hub-view-control" aria-label="Affichage">
            <button type="button" className={view === "grid" ? "active" : ""} onClick={() => setView("grid")} title="Grille"><Grid2X2 size={17} /></button>
            <button type="button" className={view === "list" ? "active" : ""} onClick={() => setView("list")} title="Liste"><List size={18} /></button>
          </div>
        </div>
      </div>

      <main className="hub-library">
        {loading ? <div className={"hub-projects " + view}>{Array.from({ length: 6 }, (_, index) => <div className="hub-project-card skeleton" key={index}><div /><span /><small /></div>)}</div> : null}
        {!loading && visibleProjects.length > 0 ? (
          <div className={"hub-projects " + view} role="listbox" aria-label="Projets">
            {visibleProjects.map((project, index) => {
              const selected = project.id === selectedId;
              const style = { "--project-accent": projectAccent(project.id), "--project-index": index } as HubStyle;
              return (
                <article className={"hub-project-card" + (selected ? " selected" : "") + (openingId === project.id ? " opening" : "") + (deletingId === project.id ? " removing" : "")} style={style} role="option" aria-selected={selected} tabIndex={0} onClick={() => onSelectedId(project.id)} onDoubleClick={() => void openProject(project.id)} onKeyDown={(event) => { if (event.key === "Enter") void openProject(project.id); }} key={project.id}>
                  <ProjectThumbnail project={project} />
                  <div className="hub-project-copy"><strong>{project.name}</strong><span>{projectSubtitle(project)}</span><small><Clock3 size={13} />{formatModified(project.modifiedAt)}</small></div>
                  {selected ? <span className="hub-selected-mark"><Check size={15} /></span> : null}
                  <button type="button" className="hub-delete-project" onClick={(event) => { event.stopPropagation(); onSelectedId(project.id); setDeleteTarget(project); }} title="Supprimer le projet"><Trash2 size={16} /></button>
                </article>
              );
            })}
          </div>
        ) : null}
        {!loading && visibleProjects.length === 0 ? (
          <div className="hub-empty-state">
            <div className="hub-empty-symbol"><Layers3 size={28} /></div>
            <h2>{projects.length === 0 ? "Aucun projet" : "Aucun résultat"}</h2>
            <p>{projects.length === 0 ? "Crée ton premier projet Minitel." : "Modifie ta recherche pour retrouver un projet."}</p>
            {projects.length === 0 ? <button type="button" className="hub-primary-button" onClick={() => setCreateOpen(true)}><Plus size={17} /><span>Nouveau projet</span></button> : null}
          </div>
        ) : null}
      </main>

      <footer className="hub-footer">
        <div className="hub-footer-left">
          <button type="button" className="hub-secondary-button" onClick={() => void onImport()} disabled={busy}><Upload size={17} /><span>Importer</span></button>
          {message ? <span className="hub-message" aria-live="polite">{message}</span> : null}
        </div>
        <div className="hub-footer-actions">
          <button type="button" className="hub-secondary-button" onClick={() => setCreateOpen(true)} disabled={busy}><FolderPlus size={17} /><span>Nouveau projet</span></button>
          <button type="button" className="hub-primary-button" onClick={() => void openProject(selectedId)} disabled={!selectedId || busy}><FolderOpen size={17} /><span>{openingId ? "Ouverture..." : "Ouvrir"}</span></button>
        </div>
      </footer>

      <NewProjectDialog open={createOpen} busy={busy} onClose={() => setCreateOpen(false)} onCreate={onCreate} />

      {deleteTarget ? (
        <div className="hub-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deletingId) setDeleteTarget(null); }}>
          <section className="hub-delete-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-project-title">
            <div className="hub-delete-icon"><Trash2 size={20} /></div>
            <div><span>Supprimer le projet</span><h2 id="delete-project-title">{deleteTarget.name}</h2><p>Cette action est définitive.</p></div>
            <footer><button type="button" className="hub-secondary-button" onClick={() => setDeleteTarget(null)} disabled={Boolean(deletingId)}>Annuler</button><button type="button" className="hub-danger-button" onClick={() => void deleteProject()} disabled={Boolean(deletingId)}><Trash2 size={16} /><span>{deletingId ? "Suppression..." : "Supprimer"}</span></button></footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
