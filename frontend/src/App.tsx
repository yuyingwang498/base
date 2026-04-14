import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import ViewTabs from "./components/ViewTabs";
import Toolbar from "./components/Toolbar";
import TableView, { TableViewHandle } from "./components/TableView/index";
import FilterPanel from "./components/FilterPanel/index";
import FieldConfigPanel from "./components/FieldConfigPanel/index";
import "./App.css";
import { Field, TableRecord, View, ViewFilter } from "./types";
import { fetchFields, fetchRecords, fetchViews, updateViewFilter, updateView, deleteField, deleteRecords, batchCreateRecords } from "./api";
import { useToast } from "./components/Toast/index";
import ConfirmDialog from "./components/ConfirmDialog/index";
import { filterRecords } from "./services/filterEngine";

const TABLE_ID = "tbl_requirements";

export default function App() {
  const [fields, setFields] = useState<Field[]>([]);
  const [allRecords, setAllRecords] = useState<TableRecord[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState("view_all");
  const [filter, setFilter] = useState<ViewFilter>({ logic: "and", conditions: [] });
  const [savedFilter, setSavedFilter] = useState<ViewFilter>({ logic: "and", conditions: [] });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [fieldConfigOpen, setFieldConfigOpen] = useState(false);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const customizeFieldBtnRef = useRef<HTMLButtonElement>(null);
  const tableViewRef = useRef<TableViewHandle>(null);

  // Delete protection & undo
  const [deleteProtection, setDeleteProtection] = useState(true);
  const [confirmDialog, setConfirmDialog] = useState<{ open: boolean; recordIds: string[] }>({ open: false, recordIds: [] });
  const undoCacheRef = useRef<{ records: TableRecord[]; indices: number[] } | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const toast = useToast();

  // View-level field order & visibility
  const [viewFieldOrder, setViewFieldOrder] = useState<string[]>([]);
  const [viewHiddenFields, setViewHiddenFields] = useState<string[]>([]);

  // Close filter panel on outside click
  useEffect(() => {
    if (!filterPanelOpen) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        filterPanelRef.current &&
        !filterPanelRef.current.contains(target) &&
        filterBtnRef.current &&
        !filterBtnRef.current.contains(target)
      ) {
        setFilterPanelOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [filterPanelOpen]);

  // Load initial data: fields, all records, views
  useEffect(() => {
    Promise.all([
      fetchFields(TABLE_ID),
      fetchRecords(TABLE_ID),
      fetchViews(TABLE_ID),
    ]).then(([f, r, v]) => {
      setFields(f);
      setAllRecords(r);
      setViews(v);
      // Store the initial saved filter from the active view
      const activeView = v.find(view => view.id === "view_all");
      if (activeView) {
        const viewFilter = activeView.filter ?? { logic: "and", conditions: [] };
        setSavedFilter(viewFilter);
        setFilter(viewFilter);
        // Initialize field order & hidden fields from view
        initFieldOrderFromView(activeView, f);
      }
    });
  }, []);

  // Initialize fieldOrder & hiddenFields from a view
  const initFieldOrderFromView = useCallback((view: View, fieldList: Field[]) => {
    const allFieldIds = fieldList.map(f => f.id);
    if (view.fieldOrder && view.fieldOrder.length > 0) {
      // Use view's fieldOrder, but sync: remove stale, append new
      const validIds = new Set(allFieldIds);
      const seen = new Set<string>();
      const cleaned = view.fieldOrder.filter(id => {
        if (!validIds.has(id) || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
      const newIds = allFieldIds.filter(id => !seen.has(id));
      setViewFieldOrder([...cleaned, ...newIds]);
    } else {
      setViewFieldOrder(allFieldIds);
    }
    setViewHiddenFields(view.hiddenFields ?? []);
  }, []);

  // When fields change (add/delete), sync fieldOrder
  useEffect(() => {
    if (fields.length === 0 || viewFieldOrder.length === 0) return;
    const allFieldIds = new Set(fields.map(f => f.id));
    const seen = new Set<string>();
    const cleaned = viewFieldOrder.filter(id => {
      if (!allFieldIds.has(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
    const newIds = fields.filter(f => !seen.has(f.id)).map(f => f.id);
    const updated = [...cleaned, ...newIds];
    if (JSON.stringify(updated) !== JSON.stringify(viewFieldOrder)) {
      setViewFieldOrder(updated);
    }
    // Also clean hiddenFields
    const cleanedHidden = viewHiddenFields.filter(id => allFieldIds.has(id));
    if (JSON.stringify(cleanedHidden) !== JSON.stringify(viewHiddenFields)) {
      setViewHiddenFields(cleanedHidden);
    }
  }, [fields]);

  // Compute ordered fields lists
  const fieldMap = useMemo(() => {
    const m = new Map<string, Field>();
    for (const f of fields) m.set(f.id, f);
    return m;
  }, [fields]);

  // All fields in view order (including hidden)
  const allOrderedFields = useMemo(() => {
    return viewFieldOrder.map(id => fieldMap.get(id)).filter(Boolean) as Field[];
  }, [viewFieldOrder, fieldMap]);

  // Visible fields only (excluding hidden), in order
  const visibleOrderedFields = useMemo(() => {
    const hiddenSet = new Set(viewHiddenFields);
    return allOrderedFields.filter(f => !hiddenSet.has(f.id));
  }, [allOrderedFields, viewHiddenFields]);

  // Persist fieldOrder to backend
  const persistFieldOrder = useCallback(async (newOrder: string[]) => {
    try {
      await updateView(activeViewId, { fieldOrder: newOrder });
    } catch (err) {
      console.error("Failed to save field order:", err);
    }
  }, [activeViewId]);

  // Persist hiddenFields to backend
  const persistHiddenFields = useCallback(async (newHidden: string[]) => {
    try {
      await updateView(activeViewId, { hiddenFields: newHidden });
    } catch (err) {
      console.error("Failed to save hidden fields:", err);
    }
  }, [activeViewId]);

  // Handler: reorder fields (from FieldConfigPanel or TableView drag)
  const handleFieldOrderChange = useCallback((newOrder: string[]) => {
    setViewFieldOrder(newOrder);
    persistFieldOrder(newOrder);
  }, [persistFieldOrder]);

  // Handler: toggle a single field's visibility
  const handleToggleFieldVisibility = useCallback((fieldId: string) => {
    setViewHiddenFields(prev => {
      const next = prev.includes(fieldId)
        ? prev.filter(id => id !== fieldId)
        : [...prev, fieldId];
      persistHiddenFields(next);
      return next;
    });
  }, [persistHiddenFields]);

  // Handler: hide a field (from TableView context menu)
  const handleHideField = useCallback((fieldId: string) => {
    setViewHiddenFields(prev => {
      if (prev.includes(fieldId)) return prev;
      const next = [...prev, fieldId];
      persistHiddenFields(next);
      return next;
    });
  }, [persistHiddenFields]);

  // Handler: select and scroll to a field from FieldConfigPanel
  const handleSelectField = useCallback((fieldId: string) => {
    tableViewRef.current?.selectAndScrollToField(fieldId);
  }, []);

  // Pure client-side filtering — each user's filter is local, no server calls
  const displayRecords = useMemo(() => {
    if (filter.conditions.length === 0) return allRecords;
    return filterRecords(allRecords, filter, fields);
  }, [allRecords, filter, fields]);

  const handleFilterChange = useCallback((newFilter: ViewFilter) => {
    setFilter(newFilter);
  }, []);

  const handleClearFilter = useCallback(() => {
    setFilter(savedFilter);
  }, [savedFilter]);

  const handleSaveView = useCallback(async () => {
    try {
      await updateViewFilter(activeViewId, filter);
      setSavedFilter(filter);
    } catch (err) {
      console.error("Failed to save view:", err);
    }
  }, [activeViewId, filter]);

  const handleCellChange = useCallback((recordId: string, fieldId: string, value: string | number | boolean | string[] | null) => {
    setAllRecords((prev) =>
      prev.map((r) =>
        r.id === recordId ? { ...r, cells: { ...r.cells, [fieldId]: value } } : r
      )
    );
  }, []);

  const handleDeleteField = useCallback(async (fieldId: string) => {
    try {
      await deleteField(TABLE_ID, fieldId);
      setFields((prev) => prev.filter((f) => f.id !== fieldId));
      // Also remove from filter conditions if present
      setFilter((prev) => ({
        ...prev,
        conditions: prev.conditions.filter((c) => c.fieldId !== fieldId),
      }));
      setSavedFilter((prev) => ({
        ...prev,
        conditions: prev.conditions.filter((c) => c.fieldId !== fieldId),
      }));
    } catch (err) {
      console.error("Failed to delete field:", err);
      alert((err as Error).message);
    }
  }, []);

  // ── Undo helper ──
  const performUndo = useCallback(() => {
    const cache = undoCacheRef.current;
    if (!cache) return;
    // Restore at original positions
    setAllRecords(prev => {
      const arr = [...prev];
      cache.indices.forEach((idx, i) => {
        arr.splice(Math.min(idx, arr.length), 0, cache.records[i]);
      });
      return arr;
    });
    // API restore (silent — UI already restored)
    batchCreateRecords(TABLE_ID, cache.records.map(r => ({
      id: r.id,
      cells: r.cells as Record<string, any>,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    }))).catch(err => console.warn("Failed to restore records:", err));
    undoCacheRef.current = null;
    setCanUndo(false);
  }, []);

  // ── Delete records ──
  const executeDelete = useCallback((recordIds: string[]) => {
    // Snapshot records and their indices for undo
    const idSet = new Set(recordIds);
    const snapRecords: TableRecord[] = [];
    const snapIndices: number[] = [];
    allRecords.forEach((r, i) => {
      if (idSet.has(r.id)) {
        snapRecords.push(r);
        snapIndices.push(i);
      }
    });
    undoCacheRef.current = { records: snapRecords, indices: snapIndices };
    setCanUndo(true);

    // Optimistic removal
    setAllRecords(prev => prev.filter(r => !idSet.has(r.id)));

    // API call
    deleteRecords(TABLE_ID, recordIds).catch(() => {
      // Revert on failure
      setAllRecords(prev => {
        const arr = [...prev];
        snapIndices.forEach((idx, i) => arr.splice(idx, 0, snapRecords[i]));
        return arr;
      });
      toast.error("Failed to delete records");
      undoCacheRef.current = null;
      setCanUndo(false);
    });

    // Toast with undo
    toast.success(
      `Deleted ${recordIds.length} record${recordIds.length > 1 ? "s" : ""}`,
      {
        duration: 5000,
        action: {
          label: "Undo",
          onClick: () => performUndo(),
        },
      }
    );
  }, [allRecords, toast, performUndo]);

  const handleDeleteRecords = useCallback((recordIds: string[]) => {
    if (deleteProtection) {
      setConfirmDialog({ open: true, recordIds });
    } else {
      executeDelete(recordIds);
    }
  }, [deleteProtection, executeDelete]);

  const handleConfirmDelete = useCallback(() => {
    const ids = confirmDialog.recordIds;
    setConfirmDialog({ open: false, recordIds: [] });
    executeDelete(ids);
  }, [confirmDialog.recordIds, executeDelete]);

  const isFiltered = filter.conditions.length > 0;

  // Dirty = local filter differs from the saved (backend) filter
  const isFilterDirty = useMemo(() => {
    return JSON.stringify(filter) !== JSON.stringify(savedFilter);
  }, [filter, savedFilter]);

  return (
    <div className="app">
      <TopBar
        tableName="需求管理表"
        deleteProtection={deleteProtection}
        onDeleteProtectionChange={setDeleteProtection}
      />
      <div className="app-body">
        <Sidebar />
        <div className="app-main">
          <ViewTabs
            views={views}
            activeViewId={activeViewId}
            onSelect={setActiveViewId}
            isFiltered={isFiltered}
            isFilterDirty={isFilterDirty}
            onSaveView={handleSaveView}
            onClearFilter={handleClearFilter}
          />
          <Toolbar
            isFiltered={isFiltered}
            filterConditionCount={filter.conditions.length}
            filterPanelOpen={filterPanelOpen}
            onFilterClick={() => setFilterPanelOpen((o) => !o)}
            onClearFilter={handleClearFilter}
            filterBtnRef={filterBtnRef}
            fieldConfigOpen={fieldConfigOpen}
            onCustomizeFieldClick={() => setFieldConfigOpen((o) => !o)}
            customizeFieldBtnRef={customizeFieldBtnRef}
            canUndo={canUndo}
            onUndo={performUndo}
          />
          <div className="app-content">
            <TableView
              ref={tableViewRef}
              fields={visibleOrderedFields}
              records={displayRecords}
              onCellChange={handleCellChange}
              onDeleteField={handleDeleteField}
              onFieldOrderChange={handleFieldOrderChange}
              onHideField={handleHideField}
              fieldOrder={viewFieldOrder}
              onDeleteRecords={handleDeleteRecords}
            />
            {filterPanelOpen && (
              <FilterPanel
                ref={filterPanelRef}
                tableId={TABLE_ID}
                fields={visibleOrderedFields}
                filter={filter}
                onFilterChange={handleFilterChange}
                onClose={() => setFilterPanelOpen(false)}
                anchorRef={filterBtnRef}
              />
            )}
            {fieldConfigOpen && (
              <FieldConfigPanel
                fields={allOrderedFields}
                hiddenFields={viewHiddenFields}
                onFieldOrderChange={handleFieldOrderChange}
                onToggleVisibility={handleToggleFieldVisibility}
                onSelectField={handleSelectField}
                onClose={() => setFieldConfigOpen(false)}
                anchorRef={customizeFieldBtnRef}
              />
            )}
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDialog.open}
        title="Delete Records"
        message={`Are you sure you want to delete ${confirmDialog.recordIds.length} record${confirmDialog.recordIds.length > 1 ? "s" : ""}? This action can be undone.`}
        confirmLabel="Delete"
        cancelLabel="Cancel"
        variant="danger"
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ open: false, recordIds: [] })}
      />
    </div>
  );
}
