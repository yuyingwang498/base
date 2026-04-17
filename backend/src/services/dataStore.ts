import {
  Table, Field, TableRecord, View, CellValue,
  CreateTableDTO, CreateFieldDTO, UpdateFieldDTO,
  CreateRecordDTO, UpdateRecordDTO,
  CreateViewDTO, UpdateViewDTO,
  ViewFilter, FieldType,
} from "../types.js";

// Document store
interface Document {
  id: string;
  name: string;
  tables: Array<{ id: string; name: string; order: number }>;
}

let tables: Map<string, Table> = new Map();
let documents: Map<string, Document> = new Map();
let idCounter = 0;

function genId(prefix: string): string {
  return `${prefix}_${(++idCounter).toString(36).padStart(4, "0")}`;
}

// ─── Document ───

export function getDocument(docId: string): Document | undefined {
  return documents.get(docId);
}

export function updateDocument(docId: string, data: { name: string }): Document | null {
  const doc = documents.get(docId);
  if (!doc) return null;
  doc.name = data.name.slice(0, 100);
  return doc;
}

export function getDocumentTables(docId: string): Array<{ id: string; name: string; order: number }> {
  const doc = documents.get(docId);
  return doc ? doc.tables : [];
}

// ─── Table ───

export function listTables(): Table[] {
  return [...tables.values()];
}

export function getTable(id: string): Table | undefined {
  return tables.get(id);
}

export function createTable(dto: CreateTableDTO): Table {
  const id = genId("tbl");
  const table: Table = {
    id,
    name: sanitizeTableName(dto.name),
    fields: [],
    records: [],
    views: [{
      id: genId("viw"),
      tableId: id,
      name: "Grid",
      type: "grid",
      filter: { logic: "and", conditions: [] },
    }],
    autoNumberCounters: {},
  };
  tables.set(id, table);
  
  // Add to document if documentId is provided
  if (dto.documentId) {
    const doc = documents.get(dto.documentId);
    if (doc) {
      const order = doc.tables.length;
      doc.tables.push({ id, name: table.name, order });
    } else {
      // Create document if it doesn't exist
      const newDoc: Document = {
        id: dto.documentId,
        name: "Untitled Document",
        tables: [{ id, name: table.name, order: 0 }],
      };
      documents.set(dto.documentId, newDoc);
    }
  }
  
  return table;
}

export function deleteTable(id: string): boolean {
  const deleted = tables.delete(id);
  if (deleted) {
    // Remove from all documents
    for (const doc of documents.values()) {
      doc.tables = doc.tables.filter(t => t.id !== id);
      // Update orders
      doc.tables.forEach((t, i) => t.order = i);
    }
  }
  return deleted;
}

export function reorderTables(updates: Array<{ id: string; order: number }>, documentId: string): void {
  const doc = documents.get(documentId);
  if (!doc) return;
  
  for (const update of updates) {
    const table = doc.tables.find(t => t.id === update.id);
    if (table) table.order = update.order;
  }
  
  // Sort tables by order
  doc.tables.sort((a, b) => a.order - b.order);
  // Reassign orders to ensure they're sequential
  doc.tables.forEach((t, i) => t.order = i);
}

export function renameTable(tableId: string, name: string): Table | null {
  const table = tables.get(tableId);
  if (!table) return null;
  table.name = sanitizeTableName(name);
  
  // Update table name in all documents
  for (const doc of documents.values()) {
    const tableInDoc = doc.tables.find(t => t.id === tableId);
    if (tableInDoc) tableInDoc.name = table.name;
  }
  
  return table;
}

export function resetTable(tableId: string, fields: any[], language: "en" | "zh"): { fields: Field[]; records: TableRecord[]; views: View[] } | null {
  const table = tables.get(tableId);
  if (!table) return null;
  
  // Reset fields
  table.fields = [];
  table.autoNumberCounters = {};
  
  // Create new fields
  for (const fieldData of fields) {
    const field: Field = {
      id: genId("fld"),
      tableId,
      name: fieldData.name.slice(0, 100),
      type: fieldData.type as FieldType,
      isPrimary: table.fields.length === 0,
      config: fieldData.config ?? {},
    };
    table.fields.push(field);
    
    // Initialize auto number counter
    if (field.type === "AutoNumber") {
      table.autoNumberCounters[field.id] = 0;
    }
  }
  
  // Reset records
  table.records = [];
  
  // Reset views
  table.views = [{ id: genId("viw"), tableId, name: "Grid", type: "grid", filter: { logic: "and", conditions: [] } }];
  
  return {
    fields: table.fields,
    records: table.records,
    views: table.views,
  };
}

// ─── Field ───

export function getFields(tableId: string): Field[] {
  const t = tables.get(tableId);
  return t ? t.fields : [];
}

export function getField(tableId: string, fieldId: string): Field | undefined {
  const t = tables.get(tableId);
  return t?.fields.find(f => f.id === fieldId);
}

export function createField(tableId: string, dto: CreateFieldDTO): Field | null {
  const t = tables.get(tableId);
  if (!t) return null;

  const field: Field = {
    id: genId("fld"),
    tableId,
    name: dto.name.slice(0, 100),
    type: dto.type,
    isPrimary: t.fields.length === 0,
    config: dto.config ?? {},
  };

  // Initialize auto number counter
  if (dto.type === "AutoNumber") {
    t.autoNumberCounters[field.id] = 0;
  }

  t.fields.push(field);

  // Initialize cells for existing records
  for (const rec of t.records) {
    rec.cells[field.id] = getDefaultCellValue(field, t, rec);
  }

  return field;
}

export function updateField(tableId: string, fieldId: string, dto: UpdateFieldDTO): Field | null {
  const t = tables.get(tableId);
  if (!t) return null;
  const field = t.fields.find(f => f.id === fieldId);
  if (!field) return null;

  if (dto.name !== undefined) field.name = dto.name.slice(0, 100);
  if (dto.config !== undefined) field.config = { ...field.config, ...dto.config };

  return field;
}

export function deleteField(tableId: string, fieldId: string): boolean {
  const t = tables.get(tableId);
  if (!t) return false;

  const idx = t.fields.findIndex(f => f.id === fieldId);
  if (idx === -1) return false;
  if (t.fields[idx].isPrimary) return false; // cannot delete primary

  t.fields.splice(idx, 1);

  // Remove from records
  for (const rec of t.records) {
    delete rec.cells[fieldId];
  }

  // Remove from view filters/sorts/groups
  for (const view of t.views) {
    view.filter.conditions = view.filter.conditions.filter(c => c.fieldId !== fieldId);
    if (view.sort) {
      view.sort.rules = view.sort.rules.filter(r => r.fieldId !== fieldId);
    }
    if (view.group) {
      view.group.rules = view.group.rules.filter(r => r.fieldId !== fieldId);
    }
  }

  delete t.autoNumberCounters[fieldId];
  return true;
}

export function batchDeleteFields(tableId: string, fieldIds: string[]): { deleted: number; snapshot: any } {
  const t = tables.get(tableId);
  if (!t) return { deleted: 0, snapshot: null };
  
  let deleted = 0;
  const snapshot = {
    fields: t.fields.filter(f => fieldIds.includes(f.id)),
    records: t.records.map(r => ({
      id: r.id,
      cells: Object.fromEntries(
        Object.entries(r.cells).filter(([k]) => fieldIds.includes(k))
      )
    }))
  };
  
  for (const fieldId of fieldIds) {
    if (deleteField(tableId, fieldId)) {
      deleted++;
    }
  }
  
  return { deleted, snapshot };
}

export function batchRestoreFields(tableId: string, snapshot: any): boolean {
  const t = tables.get(tableId);
  if (!t || !snapshot) return false;
  
  // Restore fields
  if (snapshot.fields) {
    for (const fieldData of snapshot.fields) {
      const existingField = t.fields.find(f => f.id === fieldData.id);
      if (!existingField) {
        const field: Field = {
          id: fieldData.id,
          tableId,
          name: fieldData.name,
          type: fieldData.type,
          isPrimary: fieldData.isPrimary,
          config: fieldData.config,
        };
        t.fields.push(field);
      }
    }
  }
  
  // Restore cells
  if (snapshot.records) {
    for (const recordData of snapshot.records) {
      const record = t.records.find(r => r.id === recordData.id);
      if (record && recordData.cells) {
        for (const [fieldId, value] of Object.entries(recordData.cells)) {
          record.cells[fieldId] = value;
        }
      }
    }
  }
  
  return true;
}

// ─── Record ───

export function getRecords(tableId: string): TableRecord[] {
  const t = tables.get(tableId);
  return t ? t.records : [];
}

export function getRecord(tableId: string, recordId: string): TableRecord | undefined {
  const t = tables.get(tableId);
  return t?.records.find(r => r.id === recordId);
}

export function createRecord(tableId: string, dto: CreateRecordDTO, userId?: string): TableRecord | null {
  const t = tables.get(tableId);
  if (!t) return null;

  const now = Date.now();
  const record: TableRecord = {
    id: genId("rec"),
    tableId,
    cells: {},
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    modifiedBy: userId,
  };

  // Fill cells with provided values or defaults
  for (const field of t.fields) {
    if (dto.cells[field.id] !== undefined) {
      record.cells[field.id] = dto.cells[field.id];
    } else {
      record.cells[field.id] = getDefaultCellValue(field, t, record);
    }
  }

  t.records.push(record);
  return record;
}

export function updateRecord(tableId: string, recordId: string, dto: UpdateRecordDTO, userId?: string): TableRecord | null {
  const t = tables.get(tableId);
  if (!t) return null;
  const record = t.records.find(r => r.id === recordId);
  if (!record) return null;

  const now = Date.now();
  for (const [fieldId, value] of Object.entries(dto.cells)) {
    const field = t.fields.find(f => f.id === fieldId);
    if (!field) continue;

    // Skip read-only fields
    if (isReadOnly(field.type)) continue;

    record.cells[fieldId] = value;
  }

  record.updatedAt = now;
  record.modifiedBy = userId;

  // Update ModifiedTime / ModifiedUser fields
  for (const field of t.fields) {
    if (field.type === "ModifiedTime") {
      record.cells[field.id] = now;
    }
    if (field.type === "ModifiedUser") {
      record.cells[field.id] = userId ?? null;
    }
  }

  return record;
}

export function deleteRecord(tableId: string, recordId: string): boolean {
  const t = tables.get(tableId);
  if (!t) return false;
  const idx = t.records.findIndex(r => r.id === recordId);
  if (idx === -1) return false;
  t.records.splice(idx, 1);
  return true;
}

export function batchDeleteRecords(tableId: string, recordIds: string[]): number {
  const t = tables.get(tableId);
  if (!t) return 0;
  const idSet = new Set(recordIds);
  const before = t.records.length;
  t.records = t.records.filter(r => !idSet.has(r.id));
  return before - t.records.length;
}

export function batchCreateRecords(tableId: string, records: Array<{ id: string; cells: Record<string, any>; createdAt: number; updatedAt: number }>): number {
  const t = tables.get(tableId);
  if (!t) return 0;
  
  let created = 0;
  for (const recordData of records) {
    const record: TableRecord = {
      id: recordData.id || genId("rec"),
      tableId,
      cells: recordData.cells,
      createdAt: recordData.createdAt || Date.now(),
      updatedAt: recordData.updatedAt || Date.now(),
      createdBy: "system",
      modifiedBy: "system",
    };
    t.records.push(record);
    created++;
  }
  
  return created;
}

// For restore functionality, we'll just return 0 since we don't have a trash can in memory store
export function restoreRecords(recordIds: string[]): number {
  return 0;
}

// ─── View ───

export function getViews(tableId: string): View[] {
  const t = tables.get(tableId);
  return t ? t.views : [];
}

export function getView(viewId: string): View | undefined {
  for (const t of tables.values()) {
    const v = t.views.find(v => v.id === viewId);
    if (v) return v;
  }
  return undefined;
}

export function createView(tableId: string, dto: CreateViewDTO): View | null {
  const t = tables.get(tableId);
  if (!t) return null;

  const name = sanitizeViewName(dto.name);
  if (name.length < 1 || name.length > 100) return null;

  // Only grid and kanban allowed
  if (dto.type !== "grid" && dto.type !== "kanban") return null;

  // Validate group rules max 3
  if (dto.group && dto.group.rules.length > 3) return null;

  const view: View = {
    id: genId("viw"),
    tableId,
    name,
    type: dto.type,
    filter: dto.filter ?? { logic: "and", conditions: [] },
    sort: dto.sort,
    group: dto.group,
    kanbanFieldId: dto.kanbanFieldId,
  };
  t.views.push(view);
  return view;
}

export function updateView(viewId: string, dto: UpdateViewDTO): View | null {
  const view = getView(viewId);
  if (!view) return null;

  if (dto.name !== undefined) {
    const name = sanitizeViewName(dto.name);
    if (name.length < 1 || name.length > 100) return null;
    view.name = name;
  }
  if (dto.filter !== undefined) view.filter = dto.filter;
  if (dto.sort !== undefined) view.sort = dto.sort;
  if (dto.group !== undefined) {
    if (dto.group.rules.length > 3) return null;
    view.group = dto.group;
  }
  if (dto.kanbanFieldId !== undefined) view.kanbanFieldId = dto.kanbanFieldId;

  return view;
}

export function deleteView(tableId: string, viewId: string): boolean {
  const t = tables.get(tableId);
  if (!t) return false;
  if (t.views.length <= 1) return false; // must keep at least 1 view
  const idx = t.views.findIndex(v => v.id === viewId);
  if (idx === -1) return false;
  t.views.splice(idx, 1);
  return true;
}

// ─── Initialization ───

export function loadTable(table: Table): void {
  tables.set(table.id, table);
  // Ensure idCounter stays ahead
  const allIds = [
    table.id,
    ...table.fields.map(f => f.id),
    ...table.records.map(r => r.id),
    ...table.views.map(v => v.id),
  ];
  for (const id of allIds) {
    const parts = id.split("_");
    const numPart = parts[parts.length - 1];
    const num = parseInt(numPart, 36);
    if (!isNaN(num) && num > idCounter) idCounter = num;
  }
}

export function clearAll(): void {
  tables.clear();
  idCounter = 0;
}

// ─── Helpers ───

function sanitizeTableName(name: string): string {
  return name.replace(/\[\*/g, "").replace(/\*\]/g, "").slice(0, 100);
}

function sanitizeViewName(name: string): string {
  return name.replace(/\[\*/g, "").replace(/\*\]/g, "").slice(0, 100);
}

function isReadOnly(type: FieldType): boolean {
  return ["AutoNumber", "CreatedUser", "ModifiedUser", "CreatedTime", "ModifiedTime", "Formula", "Lookup"].includes(type);
}

function getDefaultCellValue(field: Field, table: Table, record: TableRecord): CellValue {
  switch (field.type) {
    case "AutoNumber": {
      const counter = (table.autoNumberCounters[field.id] ?? 0) + 1;
      table.autoNumberCounters[field.id] = counter;
      if (field.config.autoNumberMode === "custom" && field.config.autoNumberRules) {
        return formatAutoNumber(counter, field.config.autoNumberRules);
      }
      return counter;
    }
    case "CreatedTime":
      return record.createdAt;
    case "ModifiedTime":
      return record.updatedAt;
    case "CreatedUser":
      return record.createdBy ?? null;
    case "ModifiedUser":
      return record.modifiedBy ?? null;
    case "Checkbox":
      return false;
    default:
      return null;
  }
}

function formatAutoNumber(counter: number, rules: import("../types.js").AutoNumberRule[]): string {
  const now = new Date();
  return rules.map(rule => {
    switch (rule.type) {
      case "increment":
        return String(counter);
      case "fixed":
        return rule.value;
      case "date": {
        const y = String(now.getFullYear());
        const m = String(now.getMonth() + 1).padStart(2, "0");
        const d = String(now.getDate()).padStart(2, "0");
        const fmtMap: Record<string, string> = {
          yyyyMMdd: `${y}${m}${d}`,
          yyyyMM: `${y}${m}`,
          yyMM: `${y.slice(2)}${m}`,
          MMdd: `${m}${d}`,
          MM: m,
          dd: d,
        };
        return fmtMap[rule.format] ?? "";
      }
    }
  }).join("");
}

// ─── AI Tool functions ───

export interface TableBriefInfo {
  tableId: string;
  tableName: string;
  recordCount: number;
  fields: {
    id: string;
    name: string;
    type: string;
    isPrimary: boolean;
    options?: string[];
  }[];
}

export function getTableBriefInfo(tableId: string): TableBriefInfo | null {
  const t = tables.get(tableId);
  if (!t) return null;

  return {
    tableId: t.id,
    tableName: t.name,
    recordCount: t.records.length,
    fields: t.fields.map((f) => ({
      id: f.id,
      name: f.name,
      type: f.type,
      isPrimary: f.isPrimary,
      options: f.config.options?.map((o) => o.name),
    })),
  };
}

export interface SearchRecordResult {
  fieldId: string;
  fieldName: string;
  fieldType: string;
  matches: {
    recordId: string;
    value: CellValue;
    displayValue: string;
  }[];
}

export function searchRecord(
  tableId: string,
  keyword: string,
  fieldId?: string,
  maxResults = 20
): SearchRecordResult[] {
  const t = tables.get(tableId);
  if (!t) return [];

  const lowerKeyword = keyword.toLowerCase();
  const results: SearchRecordResult[] = [];

  const fieldsToSearch = fieldId
    ? t.fields.filter((f) => f.id === fieldId)
    : t.fields;

  for (const field of fieldsToSearch) {
    const matches: SearchRecordResult["matches"] = [];

    for (const record of t.records) {
      const cellValue = record.cells[field.id];
      if (cellValue == null) continue;

      const displayValue = cellValueToString(cellValue, field, t);
      if (displayValue.toLowerCase().includes(lowerKeyword)) {
        // Deduplicate by display value
        if (!matches.some((m) => m.displayValue === displayValue)) {
          matches.push({
            recordId: record.id,
            value: cellValue,
            displayValue,
          });
        }
        if (matches.length >= maxResults) break;
      }
    }

    if (matches.length > 0) {
      results.push({
        fieldId: field.id,
        fieldName: field.name,
        fieldType: field.type,
        matches,
      });
    }
  }

  return results;
}

function cellValueToString(value: CellValue, field: Field, table: Table): string {
  if (value == null) return "";
  // User field (single value stored as string ID) — must check before generic string
  if (typeof value === "string" && (field.type === "User" || field.type === "CreatedUser" || field.type === "ModifiedUser")) {
    const users = field.config.users;
    if (users) {
      const user = users.find((u) => u.id === value);
      if (user) return `${user.name}(${user.id})`;
    }
    return value;
  }
  if (typeof value === "string") return value;
  if (typeof value === "number") {
    // DateTime fields: format as date string
    if (field.type === "DateTime" || field.type === "CreatedTime" || field.type === "ModifiedTime") {
      return new Date(value).toISOString().slice(0, 10);
    }
    return String(value);
  }
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) {
    return value
      .map((v) => {
        if (typeof v === "string") return v;
        if (typeof v === "object" && v !== null && "id" in v) {
          // User type: resolve name from config
          const userId = (v as { id: string }).id;
          const users = field.config.users;
          if (users) {
            const user = users.find((u) => u.id === userId);
            if (user) return `${user.name}(${user.id})`;
          }
          return userId;
        }
        return JSON.stringify(v);
      })
      .join(", ");
  }
  return String(value);
}

// ─── AI Field Suggestions ───

export interface FieldSuggestion {
  name: string;
  type: string;
}

export function suggestFields(tableId: string, opts?: { title?: string; excludeNames?: string[]; forceRefresh?: boolean }): { suggestions: FieldSuggestion[]; hasMore: boolean } {
  const t = tables.get(tableId);
  if (!t) return { suggestions: [], hasMore: false };
  
  // Mock field suggestions
  const mockSuggestions: FieldSuggestion[] = [
    { name: "Name", type: "Text" },
    { name: "Email", type: "Email" },
    { name: "Phone", type: "Phone" },
    { name: "Age", type: "Number" },
    { name: "Status", type: "Select" },
    { name: "Created At", type: "DateTime" },
  ];
  
  // Filter out excluded names
  let filtered = mockSuggestions;
  if (opts?.excludeNames?.length) {
    filtered = mockSuggestions.filter(s => !opts.excludeNames!.includes(s.name));
  }
  
  return {
    suggestions: filtered,
    hasMore: false,
  };
}

// ─── AI Table Structure Generation ───

export function generateTableStructure(tableName: string): { fields: Array<{ name: string; type: string; isPrimary?: boolean; config?: Record<string, any> }> } {
  // Mock table structure generation
  const mockFields = [
    { name: "ID", type: "AutoNumber", isPrimary: true },
    { name: "Name", type: "Text" },
    { name: "Description", type: "LongText" },
    { name: "Status", type: "Select", config: { options: [{ name: "Active" }, { name: "Inactive" }] } },
    { name: "Created At", type: "DateTime" },
  ];
  
  return { fields: mockFields };
}
