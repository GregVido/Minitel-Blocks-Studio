import { useEffect, useMemo, useState, type FormEvent, type MouseEvent } from "react";
import Braces from "lucide-react/dist/esm/icons/braces.js";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down.js";
import ChevronUp from "lucide-react/dist/esm/icons/chevron-up.js";
import Database from "lucide-react/dist/esm/icons/database.js";
import Pencil from "lucide-react/dist/esm/icons/pencil.js";
import Plus from "lucide-react/dist/esm/icons/plus.js";
import Trash2 from "lucide-react/dist/esm/icons/trash-2.js";
import X from "lucide-react/dist/esm/icons/x.js";

export type DataStructureFieldType = "text" | "number" | "boolean" | "json";

export type DataStructureField = {
  id: string;
  key: string;
  valueType: DataStructureFieldType;
};

export type DataStructureDef = {
  id: string;
  name: string;
  fields: DataStructureField[];
};

const fieldTypes: Array<{ value: DataStructureFieldType; label: string }> = [
  { value: "text", label: "Texte" },
  { value: "number", label: "Nombre" },
  { value: "boolean", label: "Vrai / faux" },
  { value: "json", label: "Objet JSON" },
];

const supportedFieldTypes = new Set<DataStructureFieldType>(fieldTypes.map((item) => item.value));

function structureUid(prefix: "structure" | "field") {
  return prefix + "-" + Math.random().toString(16).slice(2) + "-" + Date.now().toString(16);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function cleanName(value: unknown, fallback: string, maxLength: number) {
  if (typeof value !== "string") return fallback;
  return value.replace(/[\u0000-\u001f]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength) || fallback;
}

function uniqueId(rawValue: unknown, prefix: "structure" | "field", usedIds: Set<string>) {
  const candidate = typeof rawValue === "string" && /^[A-Za-z0-9_-]{1,160}$/.test(rawValue) ? rawValue : structureUid(prefix);
  let id = candidate;
  let suffix = 2;
  while (usedIds.has(id)) {
    id = candidate.slice(0, 150) + "-" + suffix;
    suffix += 1;
  }
  usedIds.add(id);
  return id;
}

export function dataStructureFieldTypeLabel(valueType: DataStructureFieldType) {
  return fieldTypes.find((item) => item.value === valueType)?.label ?? "Texte";
}

export function normalizeDataStructures(value: unknown): DataStructureDef[] {
  const usedStructureIds = new Set<string>();
  const usedNames = new Set<string>();
  return (Array.isArray(value) ? value : []).flatMap((item, structureIndex): DataStructureDef[] => {
    const source = asRecord(item);
    if (!source) return [];
    const id = uniqueId(source.id, "structure", usedStructureIds);
    const baseName = cleanName(source.name, "Structure " + (structureIndex + 1), 60);
    let name = baseName;
    let nameSuffix = 2;
    while (usedNames.has(name.toLocaleLowerCase("fr"))) {
      name = baseName.slice(0, 54) + " " + nameSuffix;
      nameSuffix += 1;
    }
    usedNames.add(name.toLocaleLowerCase("fr"));

    const usedFieldIds = new Set<string>();
    const usedKeys = new Set<string>();
    const fields = (Array.isArray(source.fields) ? source.fields : []).flatMap((fieldItem, fieldIndex): DataStructureField[] => {
      const field = asRecord(fieldItem);
      if (!field) return [];
      const fieldId = uniqueId(field.id, "field", usedFieldIds);
      const baseKey = cleanName(field.key, "champ" + (fieldIndex + 1), 64);
      let key = baseKey;
      let keySuffix = 2;
      while (usedKeys.has(key.toLocaleLowerCase("fr"))) {
        key = baseKey.slice(0, 58) + "_" + keySuffix;
        keySuffix += 1;
      }
      usedKeys.add(key.toLocaleLowerCase("fr"));
      const valueType = typeof field.valueType === "string" && supportedFieldTypes.has(field.valueType as DataStructureFieldType)
        ? field.valueType as DataStructureFieldType
        : "text";
      return [{ id: fieldId, key, valueType }];
    });

    return [{ id, name, fields }];
  });
}

function createField(index: number): DataStructureField {
  return {
    id: structureUid("field"),
    key: index === 0 ? "message" : "champ" + (index + 1),
    valueType: index === 0 ? "text" : "number",
  };
}

type DataStructureManagerProps = {
  structures: DataStructureDef[];
  onSave: (structure: DataStructureDef) => void;
  onRemove: (id: string) => void;
};

export function DataStructureManager({ structures, onSave, onRemove }: DataStructureManagerProps) {
  const [draft, setDraft] = useState<DataStructureDef | null>(null);
  const [error, setError] = useState("");

  const editingExisting = useMemo(() => Boolean(draft && structures.some((structure) => structure.id === draft.id)), [draft, structures]);

  useEffect(() => {
    if (!draft) return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDraft(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [draft]);

  function openCreate() {
    setError("");
    setDraft({ id: structureUid("structure"), name: "Nouvelle structure", fields: [createField(0)] });
  }

  function openEdit(structure: DataStructureDef) {
    setError("");
    setDraft(JSON.parse(JSON.stringify(structure)) as DataStructureDef);
  }

  function updateField(fieldId: string, patch: Partial<DataStructureField>) {
    setDraft((current) => current ? {
      ...current,
      fields: current.fields.map((field) => field.id === fieldId ? { ...field, ...patch } : field),
    } : current);
    setError("");
  }

  function moveField(fieldId: string, direction: -1 | 1) {
    setDraft((current) => {
      if (!current) return current;
      const index = current.fields.findIndex((field) => field.id === fieldId);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.fields.length) return current;
      const fields = [...current.fields];
      const [field] = fields.splice(index, 1);
      fields.splice(target, 0, field);
      return { ...current, fields };
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft) return;
    const name = draft.name.replace(/\s+/g, " ").trim().slice(0, 60);
    if (!name) {
      setError("Donne un nom à la structure.");
      return;
    }
    if (structures.some((structure) => structure.id !== draft.id && structure.name.toLocaleLowerCase("fr") === name.toLocaleLowerCase("fr"))) {
      setError("Ce nom de structure existe déjà.");
      return;
    }
    if (draft.fields.length === 0) {
      setError("Ajoute au moins un champ.");
      return;
    }
    const fields = draft.fields.map((field) => ({ ...field, key: field.key.trim().slice(0, 64) }));
    if (fields.some((field) => !field.key)) {
      setError("Chaque champ doit avoir une clé.");
      return;
    }
    const normalizedKeys = fields.map((field) => field.key.toLocaleLowerCase("fr"));
    if (new Set(normalizedKeys).size !== normalizedKeys.length) {
      setError("Chaque clé doit être unique.");
      return;
    }
    onSave({ ...draft, name, fields });
    setDraft(null);
  }

  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) setDraft(null);
  }

  return (
    <>
      <section className="data-structure-manager" aria-label="Structures de données">
        <div className="data-structure-manager-head">
          <Database size={16} />
          <span>Structures de données</span>
          <button type="button" onClick={openCreate} title="Créer une structure"><Plus size={15} /></button>
        </div>
        {structures.length === 0 ? (
          <div className="data-structure-empty"><Braces size={17} /><span>Aucune structure</span></div>
        ) : structures.map((structure) => (
          <article className="data-structure-card" key={structure.id}>
            <button type="button" className="data-structure-card-main" onClick={() => openEdit(structure)} title={"Modifier " + structure.name}>
              <span className="data-structure-card-title"><Braces size={15} /><strong>{structure.name}</strong></span>
              <small>{structure.fields.length} champ{structure.fields.length > 1 ? "s" : ""}</small>
            </button>
            <div className="data-structure-card-actions">
              <button type="button" onClick={() => openEdit(structure)} title="Modifier"><Pencil size={14} /></button>
              <button type="button" onClick={() => onRemove(structure.id)} title="Supprimer"><Trash2 size={14} /></button>
            </div>
            <div className="data-structure-schema">
              {structure.fields.slice(0, 4).map((field) => <span key={field.id}>{field.key}<i>{dataStructureFieldTypeLabel(field.valueType)}</i></span>)}
              {structure.fields.length > 4 ? <span>+{structure.fields.length - 4}</span> : null}
            </div>
          </article>
        ))}
      </section>

      {draft ? (
        <div className="data-structure-backdrop" onMouseDown={closeFromBackdrop}>
          <form className="data-structure-dialog" role="dialog" aria-modal="true" aria-labelledby="data-structure-dialog-title" onSubmit={submit}>
            <header>
              <span className="data-structure-dialog-icon"><Braces size={20} /></span>
              <div><small>{editingExisting ? "Modifier" : "Créer"}</small><h2 id="data-structure-dialog-title">Structure de données</h2></div>
              <button type="button" className="data-structure-dialog-close" onClick={() => setDraft(null)} title="Fermer"><X size={18} /></button>
            </header>
            <div className="data-structure-dialog-body">
              <label className="data-structure-name-field">
                <span>Nom</span>
                <input autoFocus value={draft.name} maxLength={60} aria-label="Nom de la structure" onChange={(event) => { setDraft({ ...draft, name: event.target.value }); setError(""); }} />
              </label>
              <div className="data-structure-fields-head"><span>Clé JSON</span><span>Type attendu</span><span>Actions</span></div>
              <div className="data-structure-fields">
                {draft.fields.map((field, index) => (
                  <div className="data-structure-field-row" key={field.id}>
                    <input value={field.key} maxLength={64} aria-label={"Clé " + (index + 1)} placeholder="nom" onChange={(event) => updateField(field.id, { key: event.target.value })} />
                    <select value={field.valueType} aria-label={"Type de " + (field.key || "champ " + (index + 1))} onChange={(event) => updateField(field.id, { valueType: event.target.value as DataStructureFieldType })}>
                      {fieldTypes.map((type) => <option value={type.value} key={type.value}>{type.label}</option>)}
                    </select>
                    <div className="data-structure-field-actions">
                      <button type="button" onClick={() => moveField(field.id, -1)} disabled={index === 0} title="Monter"><ChevronUp size={15} /></button>
                      <button type="button" onClick={() => moveField(field.id, 1)} disabled={index === draft.fields.length - 1} title="Descendre"><ChevronDown size={15} /></button>
                      <button type="button" onClick={() => setDraft({ ...draft, fields: draft.fields.filter((item) => item.id !== field.id) })} disabled={draft.fields.length === 1} title="Supprimer le champ"><Trash2 size={15} /></button>
                    </div>
                  </div>
                ))}
              </div>
              <button type="button" className="data-structure-add-field" onClick={() => setDraft({ ...draft, fields: [...draft.fields, createField(draft.fields.length)] })} disabled={draft.fields.length >= 24}><Plus size={16} /><span>Ajouter un champ</span></button>
              {error ? <div className="data-structure-error" role="alert">{error}</div> : null}
            </div>
            <footer>
              <button type="button" onClick={() => setDraft(null)}>Annuler</button>
              <button type="submit" className="primary">{editingExisting ? "Enregistrer" : "Créer la structure"}</button>
            </footer>
          </form>
        </div>
      ) : null}
    </>
  );
}
