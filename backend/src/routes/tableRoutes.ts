import { Router, Request, Response } from "express";
import * as store from "../services/dataStore.js";
import { filterRecords } from "../services/filterEngine.js";
import { sortRecords } from "../services/sortEngine.js";
import { queryView } from "../services/viewEngine.js";
import { validateCellValue } from "../services/fieldValidator.js";
import { Field, ViewFilter, ViewSort } from "../types.js";

const router = Router();

// ═══════ Document API ═══════

// GET /api/documents/:docId
router.get("/documents/:docId", (req: Request, res: Response) => {
  const doc = store.getDocument(req.params.docId);
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json({ id: doc.id, name: doc.name });
});

// PUT /api/documents/:docId
router.put("/documents/:docId", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const doc = store.updateDocument(req.params.docId, { name });
  if (!doc) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.json({ id: doc.id, name: doc.name });
});

// GET /api/documents/:docId/tables
router.get("/documents/:docId/tables", (req: Request, res: Response) => {
  const tables = store.getDocumentTables(req.params.docId);
  res.json(tables);
});

// ═══════ Table CRUD ═══════

// GET /api/tables — list all tables
router.get("/", (_req: Request, res: Response) => {
  const tables = store.listTables();
  res.json(tables.map(t => ({
    id: t.id,
    name: t.name,
    fieldCount: t.fields.length,
    recordCount: t.records.length,
  })));
});

// POST /api/tables — create table
router.post("/", (req: Request, res: Response) => {
  const { name, documentId, language } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "表名不能为空" });
    return;
  }
  const table = store.createTable({ name, documentId, language });
  res.status(201).json({ id: table.id, name: table.name, order: 0 });
});

// PUT /api/tables/reorder
router.put("/reorder", (req: Request, res: Response) => {
  const { updates, documentId } = req.body;
  if (!updates || !Array.isArray(updates) || !documentId) {
    res.status(400).json({ error: "updates and documentId are required" });
    return;
  }
  store.reorderTables(updates, documentId);
  res.status(204).end();
});

// PUT /api/tables/:tableId — rename table
router.put("/:tableId", (req: Request, res: Response) => {
  const { name } = req.body;
  if (!name || typeof name !== "string") {
    res.status(400).json({ error: "name is required" });
    return;
  }
  const table = store.renameTable(req.params.tableId, name);
  if (!table) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json({ id: table.id, name: table.name });
});

// POST /api/tables/:tableId/reset
router.post("/:tableId/reset", (req: Request, res: Response) => {
  const { fields, language } = req.body;
  if (!fields || !Array.isArray(fields)) {
    res.status(400).json({ error: "fields is required" });
    return;
  }
  const result = store.resetTable(req.params.tableId, fields, language);
  if (!result) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json(result);
});

// DELETE /api/tables/:tableId
router.delete("/:tableId", (req: Request, res: Response) => {
  if (!store.deleteTable(req.params.tableId)) {
    res.status(404).json({ error: "Table not found" });
    return;
  }
  res.json({ ok: true });
});

// ═══════ Field CRUD ═══════

// GET /api/tables/:tableId/fields
router.get("/:tableId/fields", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }
  res.json(table.fields);
});

// POST /api/tables/:tableId/fields — create field
router.post("/:tableId/fields", (req: Request, res: Response) => {
  const { name, type, config } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: "字段名和类型不能为空" });
    return;
  }
  const field = store.createField(req.params.tableId, { name, type, config });
  if (!field) { res.status(404).json({ error: "Table not found" }); return; }
  res.status(201).json(field);
});

// PUT /api/tables/:tableId/fields/:fieldId — update field
router.put("/:tableId/fields/:fieldId", (req: Request, res: Response) => {
  const { name, config } = req.body;
  const field = store.updateField(req.params.tableId, req.params.fieldId, { name, config });
  if (!field) { res.status(404).json({ error: "Field not found" }); return; }
  res.json(field);
});

// DELETE /api/tables/:tableId/fields/:fieldId
router.delete("/:tableId/fields/:fieldId", (req: Request, res: Response) => {
  if (!store.deleteField(req.params.tableId, req.params.fieldId)) {
    res.status(400).json({ error: "无法删除字段（可能是主字段或不存在）" });
    return;
  }
  res.json({ ok: true });
});

// POST /api/tables/:tableId/fields/batch-delete
router.post("/:tableId/fields/batch-delete", (req: Request, res: Response) => {
  const { fieldIds } = req.body;
  if (!fieldIds || !Array.isArray(fieldIds)) {
    res.status(400).json({ error: "fieldIds is required and must be an array" });
    return;
  }
  const result = store.batchDeleteFields(req.params.tableId, fieldIds);
  res.json({ deleted: result.deleted, snapshot: result.snapshot });
});

// POST /api/tables/:tableId/fields/batch-restore
router.post("/:tableId/fields/batch-restore", (req: Request, res: Response) => {
  const { snapshot } = req.body;
  if (!snapshot) {
    res.status(400).json({ error: "snapshot is required" });
    return;
  }
  const ok = store.batchRestoreFields(req.params.tableId, snapshot);
  res.json({ ok });
});

// ═══════ Record CRUD ═══════

// GET /api/tables/:tableId/records
router.get("/:tableId/records", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }
  res.json(table.records);
});

// GET /api/tables/:tableId/records/:recordId
router.get("/:tableId/records/:recordId", (req: Request, res: Response) => {
  const record = store.getRecord(req.params.tableId, req.params.recordId);
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.json(record);
});

// POST /api/tables/:tableId/records — create record
router.post("/:tableId/records", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  const { cells } = req.body;
  if (!cells || typeof cells !== "object") {
    res.status(400).json({ error: "cells 不能为空" });
    return;
  }

  // Validate each cell value
  for (const [fieldId, value] of Object.entries(cells)) {
    const field = table.fields.find(f => f.id === fieldId);
    if (!field) continue;
    const result = validateCellValue(field, value as any);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
  }

  const record = store.createRecord(req.params.tableId, { cells });
  if (!record) { res.status(500).json({ error: "创建记录失败" }); return; }
  res.status(201).json(record);
});

// PUT /api/tables/:tableId/records/:recordId — update record
router.put("/:tableId/records/:recordId", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  const { cells } = req.body;
  if (!cells || typeof cells !== "object") {
    res.status(400).json({ error: "cells 不能为空" });
    return;
  }

  // Validate
  for (const [fieldId, value] of Object.entries(cells)) {
    const field = table.fields.find(f => f.id === fieldId);
    if (!field) continue;
    const result = validateCellValue(field, value as any);
    if (!result.valid) {
      res.status(400).json({ error: result.error });
      return;
    }
  }

  const record = store.updateRecord(req.params.tableId, req.params.recordId, { cells });
  if (!record) { res.status(404).json({ error: "Record not found" }); return; }
  res.json(record);
});

// DELETE /api/tables/:tableId/records/:recordId
router.delete("/:tableId/records/:recordId", (req: Request, res: Response) => {
  if (!store.deleteRecord(req.params.tableId, req.params.recordId)) {
    res.status(404).json({ error: "Record not found" });
    return;
  }
  res.json({ ok: true });
});

// POST /api/tables/:tableId/records/batch-delete
router.post("/:tableId/records/batch-delete", (req: Request, res: Response) => {
  const { recordIds } = req.body;
  if (!recordIds || !Array.isArray(recordIds)) {
    res.status(400).json({ error: "recordIds is required and must be an array" });
    return;
  }
  const deleted = store.batchDeleteRecords(req.params.tableId, recordIds);
  res.json({ deleted });
});

// POST /api/tables/:tableId/records/batch-create
router.post("/:tableId/records/batch-create", (req: Request, res: Response) => {
  const { records } = req.body;
  if (!records || !Array.isArray(records)) {
    res.status(400).json({ error: "records is required and must be an array" });
    return;
  }
  const created = store.batchCreateRecords(req.params.tableId, records);
  res.json({ created });
});

// POST /api/tables/records/restore - restore deleted records
router.post("/records/restore", (req: Request, res: Response) => {
  const { recordIds } = req.body;
  if (!recordIds || !Array.isArray(recordIds)) {
    res.status(400).json({ error: "recordIds is required and must be an array" });
    return;
  }
  const restored = store.restoreRecords(recordIds);
  res.json({ ok: true, restored });
});

// POST /api/tables/:tableId/records/query — filter/sort records
router.post("/:tableId/records/query", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  const filter: ViewFilter = req.body.filter ?? { logic: "and", conditions: [] };
  const sort: ViewSort | undefined = req.body.sort;
  const fieldMap = new Map<string, Field>(table.fields.map(f => [f.id, f]));

  let records = filterRecords(table.records, filter, fieldMap);
  if (sort && sort.rules.length > 0) {
    records = sortRecords(records, sort, fieldMap);
  }

  res.json({ records, total: records.length });
});

// ═══════ View CRUD ═══════

// GET /api/tables/:tableId/views
router.get("/:tableId/views", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }
  res.json(table.views);
});

// POST /api/tables/:tableId/views — create view
router.post("/:tableId/views", (req: Request, res: Response) => {
  const { name, type, filter, sort, group, kanbanFieldId } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: "视图名和类型不能为空" });
    return;
  }
  if (type !== "grid" && type !== "kanban") {
    res.status(400).json({ error: "仅支持表格视图(grid)和看板视图(kanban)" });
    return;
  }
  const view = store.createView(req.params.tableId, { name, type, filter, sort, group, kanbanFieldId });
  if (!view) { res.status(400).json({ error: "创建视图失败" }); return; }
  res.status(201).json(view);
});

// GET /api/tables/views/:viewId
router.get("/views/:viewId", (req: Request, res: Response) => {
  const view = store.getView(req.params.viewId);
  if (!view) { res.status(404).json({ error: "View not found" }); return; }
  res.json(view);
});

// PUT /api/tables/views/:viewId — update view
router.put("/views/:viewId", (req: Request, res: Response) => {
  const { name, filter, sort, group, kanbanFieldId, fieldOrder, hiddenFields } = req.body;
  const view = store.updateView(req.params.viewId, { name, filter, sort, group, kanbanFieldId, fieldOrder, hiddenFields });
  if (!view) { res.status(400).json({ error: "更新视图失败" }); return; }
  res.json(view);
});

// PUT /api/tables/views/:viewId/filter — update view filter (backward compat)
router.put("/views/:viewId/filter", (req: Request, res: Response) => {
  const view = store.updateView(req.params.viewId, { filter: req.body });
  if (!view) { res.status(404).json({ error: "View not found" }); return; }
  res.json(view);
});

// DELETE /api/tables/:tableId/views/:viewId
router.delete("/:tableId/views/:viewId", (req: Request, res: Response) => {
  if (!store.deleteView(req.params.tableId, req.params.viewId)) {
    res.status(400).json({ error: "无法删除视图（至少保留一个视图）" });
    return;
  }
  res.json({ ok: true });
});

// POST /api/tables/:tableId/views/:viewId/query — query through view
router.post("/:tableId/views/:viewId/query", (req: Request, res: Response) => {
  const table = store.getTable(req.params.tableId);
  if (!table) { res.status(404).json({ error: "Table not found" }); return; }

  const view = store.getView(req.params.viewId);
  if (!view) { res.status(404).json({ error: "View not found" }); return; }

  const fieldMap = new Map<string, Field>(table.fields.map(f => [f.id, f]));
  const result = queryView(table.records, view, fieldMap);
  res.json(result);
});

export default router;
