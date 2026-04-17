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
import { fetchFields, fetchRecords, fetchViews, updateViewFilter, updateView, deleteField, batchDeleteRecords, restoreRecords } from "./api";
import { filterRecords } from "./services/filterEngine";
import { useToast } from "./components/Toast/index";

type CellValue = string | number | boolean | string[] | null;

const TABLE_ID = "tbl_requirements";

export default function App() {
  const toast = useToast();
  const [fields, setFields] = useState<Field[]>([]);
  const [allRecords, setAllRecords] = useState<TableRecord[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [activeViewId, setActiveViewId] = useState("view_all");
  const [filter, setFilter] = useState<ViewFilter>({ logic: "and", conditions: [] });
  const [savedFilter, setSavedFilter] = useState<ViewFilter>({ logic: "and", conditions: [] });
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [fieldConfigOpen, setFieldConfigOpen] = useState(false);
  const [deletedRecords, setDeletedRecords] = useState<Array<{ record: TableRecord; index: number }>>([]);
  const [clearedCells, setClearedCells] = useState<Array<{ recordId: string; fieldId: string; oldValue: CellValue }>>([]);
  const filterBtnRef = useRef<HTMLButtonElement>(null);
  const filterPanelRef = useRef<HTMLDivElement>(null);
  const customizeFieldBtnRef = useRef<HTMLButtonElement>(null);
  const tableViewRef = useRef<TableViewHandle>(null);
  const handleUndoDeleteRef = useRef<(() => Promise<void>) | null>(null);
  const handleUndoClearCellsRef = useRef<(() => void) | null>(null);

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

  const handleUndoDelete = useCallback(async () => {
    if (deletedRecords.length === 0) return;

    const recordIdsToRestore = deletedRecords.map(item => item.record.id);
    
    try {
      // 先调用后端恢复记录
      await restoreRecords(recordIdsToRestore);
      
      // 按索引倒序处理，确保插入顺序正确
      const recordsToRestore = [...deletedRecords].sort((a, b) => b.index - a.index);
      
      // 恢复记录到原来的位置
      setAllRecords((prev) => {
        let newRecords = [...prev];
        for (const { record, index } of recordsToRestore) {
          newRecords.splice(index, 0, record);
        }
        return newRecords;
      });
      
      // 清空删除记录
      setDeletedRecords([]);
    } catch (err) {
      console.error("Failed to restore records:", err);
      alert((err as Error).message);
    }
  }, [deletedRecords]);

  // 撤销单元格清空
  const handleUndoClearCells = useCallback(() => {
    if (clearedCells.length === 0) return;
    
    // 恢复每个单元格的值
    clearedCells.forEach(({ recordId, fieldId, oldValue }) => {
      setAllRecords((prev) =>
        prev.map((r) =>
          r.id === recordId ? { ...r, cells: { ...r.cells, [fieldId]: oldValue } } : r
        )
      );
    });
    
    // 清空历史记录
    setClearedCells([]);
  }, [clearedCells]);

  // 使用 ref 保存最新的 handleUndoDelete，避免闭包问题
  useEffect(() => {
    handleUndoDeleteRef.current = handleUndoDelete;
  }, [handleUndoDelete]);

  // 使用 ref 保存最新的 handleUndoClearCells，避免闭包问题
  useEffect(() => {
    handleUndoClearCellsRef.current = handleUndoClearCells;
  }, [handleUndoClearCells]);

  // 处理单元格清空
  const handleClearCells = useCallback((cleared: Array<{ recordId: string; fieldId: string; oldValue: CellValue }>) => {
    setClearedCells(cleared);
    // 显示 Toast 提示
    toast.info(`已清空${cleared.length}个单元格，按Cmd+Z可恢复`, {
      duration: 5000,
      action: {
        label: "undo",
        onClick: () => {
          if (handleUndoClearCellsRef.current) {
            handleUndoClearCellsRef.current();
          }
        }
      }
    });
  }, [toast]);

  const handleDeleteRecords = useCallback(async (recordIds: string[]) => {
    try {
      // 先保存要删除的记录及其索引，以便撤销
      const recordsToDelete = recordIds.map((recordId) => {
        const index = allRecords.findIndex((r) => r.id === recordId);
        const record = allRecords.find((r) => r.id === recordId);
        return { record, index };
      }).filter((item): item is { record: TableRecord; index: number } => item.record !== undefined);

      // 更新状态，立即从视图中移除记录
      setAllRecords((prev) => prev.filter((r) => !recordIds.includes(r.id)));
      
      // 保存删除的记录
      setDeletedRecords(recordsToDelete);
      
      // 调用 API 从后端删除
      await batchDeleteRecords(TABLE_ID, recordIds);
      
      // 显示 Toast 提示
      toast.info(`已删除${recordIds.length}条记录，点击undo可恢复`, {
        duration: 5000,
        action: {
          label: "undo",
          onClick: () => {
            if (handleUndoDeleteRef.current) {
              handleUndoDeleteRef.current();
            }
          }
        }
      });
    } catch (err) {
      console.error("Failed to delete records:", err);
      alert((err as Error).message);
      // 如果失败，重新加载记录
      fetchRecords(TABLE_ID).then(setAllRecords);
    }
  }, [allRecords, toast, handleUndoDelete]);

  // Command+Z 快捷键处理
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        // 优先处理单元格清空的 undo
        if (clearedCells.length > 0) {
          if (handleUndoClearCellsRef.current) {
            handleUndoClearCellsRef.current();
          }
        } else if (deletedRecords.length > 0) {
          if (handleUndoDeleteRef.current) {
            handleUndoDeleteRef.current();
          }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [clearedCells, deletedRecords]);

  const isFiltered = filter.conditions.length > 0;

  // Dirty = local filter differs from the saved (backend) filter
  const isFilterDirty = useMemo(() => {
    return JSON.stringify(filter) !== JSON.stringify(savedFilter);
  }, [filter, savedFilter]);

  return (
    <div className="app">
      <TopBar 
        tableName="需求管理表" 
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
              onClearCells={handleClearCells}
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
    </div>
  );
}
