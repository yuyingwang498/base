import { useState, useRef, useEffect } from "react";
import { useToast } from "../Toast";
import "./PermissionsModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  selectedPlan?: string;
}

interface CustomRole {
  id: string;
  name: string;
}

export default function PermissionsModal({ isOpen, onClose, selectedPlan = '方案1' }: Props) {
  const [selectedRoleId, setSelectedRoleId] = useState("owner");
  const [activeTab, setActiveTab] = useState("data");
  const { success } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showEditTooltip, setShowEditTooltip] = useState(false);
  const [showDeleteTooltip, setShowDeleteTooltip] = useState(false);
  const [showCreateTooltip, setShowCreateTooltip] = useState(false);
  const [showPlan3Tooltip, setShowPlan3Tooltip] = useState(false);
  const [showManageTooltip, setShowManageTooltip] = useState(false);
  
  // 方案3相关状态
  const [visibleDashboardOption, setVisibleDashboardOption] = useState<'all' | 'specific'>('all');
  const [selectedDashboards, setSelectedDashboards] = useState<Set<string>>(new Set([
    'dashboard-1', 'dashboard-2', 'dashboard-3', 'dashboard-4', 'dashboard-5'
  ]));

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);
  
  interface DashboardNode {
    id: string;
    name: string;
    type: 'dashboard' | 'folder';
    children?: DashboardNode[];
  }
  
  const [dashboardTree] = useState<DashboardNode[]>([
    {
      id: 'dashboard-1',
      name: 'Dashboard 1',
      type: 'dashboard'
    },
    {
      id: 'folder-1',
      name: '文件夹',
      type: 'folder',
      children: [
        {
          id: 'dashboard-2',
          name: 'Dashboard 2',
          type: 'dashboard'
        }
      ]
    },
    {
      id: 'folder-2',
      name: '文件夹 1',
      type: 'folder',
      children: [
        {
          id: 'dashboard-3',
          name: 'Dashboard 3',
          type: 'dashboard'
        },
        {
          id: 'folder-3',
          name: '文件夹 2',
          type: 'folder',
          children: [
            {
              id: 'dashboard-4',
              name: 'Dashboard 4',
              type: 'dashboard'
            },
            {
              id: 'dashboard-5',
              name: 'Dashboard 5',
              type: 'dashboard'
            }
          ]
        }
      ]
    }
  ]);
  
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set([
    'folder-1', 'folder-2', 'folder-3'
  ]));
  
  const [selectedDashboard, setSelectedDashboard] = useState('Dashboard 1');

  const [rolePermissions, setRolePermissions] = useState<Record<string, { 
    create: boolean; 
    edit: boolean;
    editMode: 'own' | 'manage';
    delete: boolean; 
    deleteOwnOnly: boolean;
    dashboardPermissions: Record<string, 'manage' | 'edit' | 'read' | 'none'>;
    dataTablePermissions: Record<string, 'manage' | 'edit' | 'read' | 'none'>;
  }>>({
    owner: { 
      create: true, 
      edit: true, 
      editMode: 'manage',
      delete: true, 
      deleteOwnOnly: false,
      dashboardPermissions: {
        'dashboard-1': 'edit',
        'dashboard-2': 'edit',
        'dashboard-3': 'edit',
        'dashboard-4': 'edit',
        'dashboard-5': 'edit'
      },
      dataTablePermissions: {
        'data-table': 'manage',
        'budget-table': 'manage'
      }
    },
    admin: { 
      create: true, 
      edit: true, 
      editMode: 'manage',
      delete: true, 
      deleteOwnOnly: false,
      dashboardPermissions: {
        'dashboard-1': 'edit',
        'dashboard-2': 'edit',
        'dashboard-3': 'edit',
        'dashboard-4': 'edit',
        'dashboard-5': 'edit'
      },
      dataTablePermissions: {
        'data-table': 'manage',
        'budget-table': 'manage'
      }
    },
    editor: { 
      create: false, 
      edit: false, 
      editMode: 'own',
      delete: false, 
      deleteOwnOnly: false,
      dashboardPermissions: {
        'dashboard-1': 'none',
        'dashboard-2': 'none',
        'dashboard-3': 'none',
        'dashboard-4': 'none',
        'dashboard-5': 'none'
      },
      dataTablePermissions: {
        'data-table': 'edit',
        'budget-table': 'edit'
      }
    },
    viewer: { 
      create: false, 
      edit: false, 
      editMode: 'own',
      delete: false, 
      deleteOwnOnly: false,
      dashboardPermissions: {
        'dashboard-1': 'none',
        'dashboard-2': 'none',
        'dashboard-3': 'none',
        'dashboard-4': 'none',
        'dashboard-5': 'none'
      },
      dataTablePermissions: {
        'data-table': 'read',
        'budget-table': 'read'
      }
    },
  });

  // 数据权限相关状态
  const [selectedDataTable, setSelectedDataTable] = useState('data-table');

  const [renamingRoleId, setRenamingRoleId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState("");

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isOpen) return null;

  const systemRoles = [
    { id: "owner", name: "所有者" },
    { id: "admin", name: "管理员" },
    { id: "editor", name: "编辑者" },
    { id: "viewer", name: "阅读者" },
  ];

  const allRoles = [...systemRoles, ...customRoles];
  const selectedRole = allRoles.find(r => r.id === selectedRoleId);
  const isReadOnlyRole = selectedRoleId === "owner" || selectedRoleId === "admin";
  const isCustomRole = customRoles.some(r => r.id === selectedRoleId);
  const currentPermissions = rolePermissions[selectedRoleId] || { 
    create: false, 
    edit: false,
    editMode: 'own',
    delete: false, 
    deleteOwnOnly: false,
    dashboardPermissions: {},
    dataTablePermissions: {}
  };

  const getDashboardPermission = (dashboardId: string) => {
    return currentPermissions.dashboardPermissions[dashboardId] || 'none';
  };
  
  const toggleFolder = (folderId: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpandedFolders(newExpanded);
  };
  
  const flattenDashboards = (nodes: DashboardNode[]): string[] => {
    let result: string[] = [];
    for (const node of nodes) {
      if (node.type === 'dashboard') {
        result.push(node.id);
      } else if (node.children) {
        result = result.concat(flattenDashboards(node.children));
      }
    }
    return result;
  };

  // 方案3辅助函数：获取所有仪表盘名称
  const getDashboardName = (dashboardId: string): string => {
    const findNode = (nodes: DashboardNode[]): string | null => {
      for (const node of nodes) {
        if (node.id === dashboardId) {
          return node.name;
        }
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findNode(dashboardTree) || dashboardId;
  };

  // 方案3辅助函数：切换仪表盘选中状态
  const toggleDashboardSelection = (dashboardId: string) => {
    setSelectedDashboards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(dashboardId)) {
        newSet.delete(dashboardId);
      } else {
        newSet.add(dashboardId);
      }
      return newSet;
    });
  };

  // 方案3辅助函数：全选/取消全选
  const toggleSelectAllDashboards = () => {
    const allDashboards = flattenDashboards(dashboardTree);
    const isAllSelected = allDashboards.every(id => selectedDashboards.has(id));
    if (isAllSelected) {
      setSelectedDashboards(new Set());
    } else {
      setSelectedDashboards(new Set(allDashboards));
    }
  };

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const updatePermission = (key: 'create' | 'edit' | 'delete', value: boolean) => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || { 
        create: false, 
        edit: false,
        delete: false, 
        deleteOwnOnly: false,
        dashboardPermissions: {}
      };
      
      let newPermissions = { ...current, [key]: value };
      
      // 勾选创建仪表盘时，默认勾选编辑仪表盘
      if (key === 'create' && value === true) {
        newPermissions.edit = true;
      }
      
      return {
        ...prev,
        [selectedRoleId]: newPermissions,
      };
    });
  };

  const updateDashboardPermission = (dashboard: string, permission: 'manage' | 'edit' | 'read' | 'none') => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || { 
        create: false, 
        edit: false,
        delete: false, 
        deleteOwnOnly: false,
        dashboardPermissions: {}
      };
      
      return {
        ...prev,
        [selectedRoleId]: {
          ...current,
          dashboardPermissions: {
            ...current.dashboardPermissions,
            [dashboard]: permission
          }
        }
      };
    });
  };

  const toggleAllDashboardsWithPermission = (permission: 'manage' | 'edit' | 'read' | 'none') => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || { 
        create: false, 
        edit: false,
        delete: false, 
        deleteOwnOnly: false,
        dashboardPermissions: {}
      };
      
      const newDashboardPermissions: Record<string, 'manage' | 'edit' | 'read' | 'none'> = {};
      const allDashboards = flattenDashboards(dashboardTree);
      allDashboards.forEach(dashboardId => {
        newDashboardPermissions[dashboardId] = permission;
      });
      
      return {
        ...prev,
        [selectedRoleId]: {
          ...current,
          dashboardPermissions: newDashboardPermissions
        }
      };
    });
  };

  // 更新数据表权限
  const updateDataTablePermission = (tableId: string, permission: 'manage' | 'edit' | 'read' | 'none') => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || { 
        create: false, 
        edit: false,
        delete: false, 
        deleteOwnOnly: false,
        dashboardPermissions: {},
        dataTablePermissions: {}
      };
      
      return {
        ...prev,
        [selectedRoleId]: {
          ...current,
          dataTablePermissions: {
            ...current.dataTablePermissions,
            [tableId]: permission
          }
        }
      };
    });
  };

  // 获取数据表权限
  const getDataTablePermission = (tableId: string) => {
    return currentPermissions.dataTablePermissions?.[tableId] || 'read';
  };

  // 数据表列表
  const dataTables = [
    { id: 'data-table', name: '数据表', icon: 'table' },
    { id: 'budget-table', name: '预算表', icon: 'budget' }
  ];
  
  const renderDashboardNode = (node: DashboardNode, level: number = 0, selectedPlan?: string) => {
    const isExpanded = expandedFolders.has(node.id);
    const indentWidth = 20; // 每层缩进宽度
    const paddingLeft = level * indentWidth;
    
    const elements: JSX.Element[] = [];
    
    // 添加当前节点
    if (node.type === 'dashboard') {
      elements.push(
        <div key={`name-${node.id}`} style={{ 
          padding: '8px 0', 
          paddingLeft: `${paddingLeft}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          {/* 占位空间，与展开按钮对齐 */}
          <div style={{ width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}></div>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="1.5" style={{ flexShrink: 0 }}>
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <span style={{ flex: 1 }}>{node.name}</span>
        </div>
      );
      if (selectedPlan === '方案3') {
        elements.push(
          <div key={`manage-${node.id}`} style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
            <input 
              type="radio" 
              name={`permission-${node.id}`}
              checked={getDashboardPermission(node.id) === 'manage'}
              disabled={isReadOnlyRole}
              onChange={() => updateDashboardPermission(node.id, 'manage')}
            />
          </div>
        );
      }
      elements.push(
        <div key={`edit-${node.id}`} style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
          <input 
            type="radio" 
            name={`permission-${node.id}`}
            checked={getDashboardPermission(node.id) === 'edit'}
            disabled={isReadOnlyRole}
            onChange={() => updateDashboardPermission(node.id, 'edit')}
          />
        </div>
      );
      elements.push(
        <div key={`read-${node.id}`} style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
          <input 
            type="radio" 
            name={`permission-${node.id}`}
            checked={getDashboardPermission(node.id) === 'read'}
            disabled={isReadOnlyRole}
            onChange={() => updateDashboardPermission(node.id, 'read')}
          />
        </div>
      );
      elements.push(
        <div key={`none-${node.id}`} style={{ padding: '8px 0', display: 'flex', justifyContent: 'center' }}>
          <input 
            type="radio" 
            name={`permission-${node.id}`}
            checked={getDashboardPermission(node.id) === 'none'}
            disabled={isReadOnlyRole}
            onChange={() => updateDashboardPermission(node.id, 'none')}
          />
        </div>
      );
    } else {
      // 文件夹节点
      elements.push(
        <div key={`name-${node.id}`} style={{ 
          padding: '8px 0', 
          paddingLeft: `${paddingLeft}px`,
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <button
            onClick={() => toggleFolder(node.id)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '20px',
              height: '20px',
              flexShrink: 0
            }}
          >
            {isExpanded ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="2">
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="2">
                <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            )}
          </button>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="#FCD34D" stroke="#D97706" strokeWidth="1" style={{ flexShrink: 0 }}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
          </svg>
          <span style={{ flex: 1 }}>{node.name}</span>
        </div>
      );
      if (selectedPlan === '方案3') {
        elements.push(<div key={`manage-${node.id}`} style={{ padding: '8px 0' }}></div>);
      }
      elements.push(<div key={`edit-${node.id}`} style={{ padding: '8px 0' }}></div>);
      elements.push(<div key={`read-${node.id}`} style={{ padding: '8px 0' }}></div>);
      elements.push(<div key={`none-${node.id}`} style={{ padding: '8px 0' }}></div>);
      
      // 如果文件夹展开且有子节点，递归添加
      if (isExpanded && node.children) {
        node.children.forEach(child => {
          elements.push(...renderDashboardNode(child, level + 1, selectedPlan));
        });
      }
    }
    
    return elements;
  };

  const updateDeleteOwnOnly = (value: boolean) => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || { 
        create: false, 
        edit: false,
        editMode: 'own',
        delete: false, 
        deleteOwnOnly: false,
        dashboardPermissions: {}
      };
      
      return {
        ...prev,
        [selectedRoleId]: {
          ...current,
          deleteOwnOnly: value
        }
      };
    });
  };

  const updateEditMode = (mode: 'own' | 'manage') => {
    setRolePermissions(prev => {
      const current = prev[selectedRoleId] || { 
        create: false, 
        edit: false,
        editMode: 'own',
        delete: false, 
        deleteOwnOnly: false,
        dashboardPermissions: {}
      };
      
      return {
        ...prev,
        [selectedRoleId]: {
          ...current,
          editMode: mode
        }
      };
    });
  };

  const handleSave = () => {
    console.log('保存权限设置:', { customRoles, rolePermissions });
    success('高级权限配置已保存');
    onClose();
  };

  const generateId = () => {
    return `role_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  };

  const handleAddRole = () => {
    const newId = generateId();
    const newRole: CustomRole = {
      id: newId,
      name: "新角色",
    };
    setCustomRoles(prev => [...prev, newRole]);
    
    // 为新角色初始化所有dashboard的权限
    const initialDashboardPermissions: Record<string, 'manage' | 'edit' | 'read' | 'none'> = {};
    const allDashboards = flattenDashboards(dashboardTree);
    allDashboards.forEach(dashboardId => {
      initialDashboardPermissions[dashboardId] = 'none';
    });
    
    // 为新角色初始化数据表权限（默认仅可阅读）
    const initialDataTablePermissions: Record<string, 'manage' | 'edit' | 'read' | 'none'> = {
      'data-table': 'read',
      'budget-table': 'read'
    };
    
    setRolePermissions(prev => ({
      ...prev,
      [newId]: { create: false, edit: false, editMode: 'own', delete: false, deleteOwnOnly: false, dashboardPermissions: initialDashboardPermissions, dataTablePermissions: initialDataTablePermissions },
    }));
    setSelectedRoleId(newId);
    setRenamingRoleId(newId);
    setRenameInput("新角色");
  };

  const toggleMenu = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenMenuId(openMenuId === roleId ? null : roleId);
  };

  const startRename = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const role = customRoles.find(r => r.id === roleId);
    if (role) {
      setRenamingRoleId(roleId);
      setRenameInput(role.name);
      setOpenMenuId(null);
    }
  };

  const finishRename = () => {
    if (renamingRoleId && renameInput.trim()) {
      setCustomRoles(prev => prev.map(r => 
        r.id === renamingRoleId ? { ...r, name: renameInput.trim() } : r
      ));
    }
    setRenamingRoleId(null);
    setRenameInput("");
  };

  const copyRole = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const role = customRoles.find(r => r.id === roleId);
    if (role) {
      const newId = generateId();
      const newRole: CustomRole = {
        id: newId,
        name: `${role.name} 副本`,
      };
      setCustomRoles(prev => [...prev, newRole]);
      setRolePermissions(prev => ({
        ...prev,
        [newId]: { ...prev[roleId] },
      }));
      setOpenMenuId(null);
    }
  };

  const deleteRole = (roleId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCustomRoles(prev => prev.filter(r => r.id !== roleId));
    setRolePermissions(prev => {
      const newPermissions = { ...prev };
      delete newPermissions[roleId];
      return newPermissions;
    });
    if (selectedRoleId === roleId) {
      setSelectedRoleId("owner");
    }
    setOpenMenuId(null);
  };

  return (
    <div className="permissions-modal-overlay" onClick={onClose}>
      <div className="permissions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="permissions-modal-header">
          <div className="permissions-modal-title-area">
            <h2 className="permissions-modal-title">高级权限</h2>
            <div className="permissions-share-toggle">
              <div className="toggle-switch active">
                <div className="toggle-switch-handle"></div>
              </div>
              <span className="toggle-label">允许通过分享授权</span>
            </div>
          </div>
          <div className="permissions-modal-actions">
            <button className="permissions-modal-btn" onClick={onClose}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <path d="M5 5L15 15M15 5L5 15" stroke="#8F959E" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="permissions-modal-body">
          <div className="permissions-sidebar">
            <div className="permissions-sidebar-list">
              <div className="permissions-role-section-title">系统角色</div>
              {systemRoles.map((role) => (
                <button
                  key={role.id}
                  className={`permissions-role-item ${selectedRoleId === role.id ? "active" : ""}`}
                  onClick={() => handleRoleChange(role.id)}
                >
                  <span className="role-icon">
                    {role.id === "owner" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="currentColor" strokeWidth="1.5" fill={selectedRoleId === "owner" ? "currentColor" : "none"}/>
                      </svg>
                    )}
                    {role.id === "admin" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {role.id === "editor" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                    {role.id === "viewer" && (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5"/>
                      </svg>
                    )}
                  </span>
                  <span className="role-name">{role.name}</span>
                </button>
              ))}

              <div className="permissions-role-divider"></div>
              <div className="permissions-role-section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                自定义角色
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M12 16v-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <path d="M12 8h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              {customRoles.map((role) => (
                <div key={role.id} className="custom-role-item-wrapper">
                  <button
                    className={`permissions-role-item ${selectedRoleId === role.id ? "active" : ""}`}
                    onClick={() => handleRoleChange(role.id)}
                  >
                    <span className="role-icon">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </span>
                    {renamingRoleId === role.id ? (
                      <input
                        type="text"
                        className="role-rename-input"
                        value={renameInput}
                        onChange={(e) => setRenameInput(e.target.value)}
                        onBlur={finishRename}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") finishRename();
                          if (e.key === "Escape") {
                            setRenamingRoleId(null);
                            setRenameInput("");
                          }
                        }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className="role-name">{role.name}</span>
                    )}
                    <button
                      className={`role-menu-btn ${openMenuId === role.id ? "active" : ""}`}
                      onClick={(e) => toggleMenu(role.id, e)}
                    >
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                        <circle cx="12" cy="6" r="2" fill="#8F959E"/>
                        <circle cx="12" cy="12" r="2" fill="#8F959E"/>
                        <circle cx="12" cy="18" r="2" fill="#8F959E"/>
                      </svg>
                    </button>
                  </button>
                  {openMenuId === role.id && (
                    <div ref={menuRef} className="role-menu">
                      <button className="role-menu-item" onClick={(e) => startRename(role.id, e)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25z" stroke="#1F2329" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" stroke="#1F2329" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        重命名
                      </button>
                      <button className="role-menu-item" onClick={(e) => copyRole(role.id, e)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1z" stroke="#1F2329" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M8 7h12c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V9c0-1.1.9-2 2-2z" stroke="#1F2329" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        复制角色
                      </button>
                      <div className="role-menu-divider"></div>
                      <button className="role-menu-item danger" onClick={(e) => deleteRole(role.id, e)}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18" stroke="#F54A45" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M8 6V4c0-1.1.9-2 2-2h4c1.1 0 2 .9 2 2v2" stroke="#F54A45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M19 6v14c0 1.1-.9 2-2 2H7c-1.1 0-2-.9-2-2V6" stroke="#F54A45" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M10 11v6" stroke="#F54A45" strokeWidth="2" strokeLinecap="round"/>
                          <path d="M14 11v6" stroke="#F54A45" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <button className="add-role-btn" onClick={handleAddRole}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="#1456F0" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                添加角色
              </button>
            </div>
          </div>

          <div className="permissions-content">
            <div className="permissions-role-header">
              <div className="role-header-left">
                <h3>{selectedRole?.name}</h3>
              </div>
            </div>

            <div className="permissions-tabs">
              <button
                className={`permissions-tab ${activeTab === "data" ? "active" : ""}`}
                onClick={() => setActiveTab("data")}
              >
                数据权限
              </button>
              <button
                className={`permissions-tab ${activeTab === "dashboard" ? "active" : ""}`}
                onClick={() => setActiveTab("dashboard")}
              >
                仪表盘权限
              </button>
              <button
                className={`permissions-tab ${activeTab === "automation" ? "active" : ""}`}
                onClick={() => setActiveTab("automation")}
              >
                自动化权限
              </button>
              <button
                className={`permissions-tab ${activeTab === "other" ? "active" : ""}`}
                onClick={() => setActiveTab("other")}
              >
                其他功能权限
              </button>
            </div>

            <div className="permissions-tab-content">
              {activeTab === "data" && (
                <div style={{ display: 'flex', gap: '16px' }}>
                  {/* 左侧：数据表列表 */}
                  <div style={{ width: '280px', borderRight: '1px solid #E5E6EB', paddingRight: '16px' }}>
                    <div style={{ marginBottom: '12px', padding: '8px 12px', backgroundColor: '#F5F7FA', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8F959E" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/>
                        <path d="M21 21l-4.35-4.35"/>
                      </svg>
                      <input 
                        type="text" 
                        placeholder="搜索数据表或仪表盘" 
                        style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', width: '100%', fontSize: '14px' }}
                      />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {dataTables.map(table => (
                        <div 
                          key={table.id}
                          onClick={() => setSelectedDataTable(table.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            backgroundColor: selectedDataTable === table.id ? '#E6F0FF' : 'transparent'
                          }}
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M3 9h18M9 21V9M15 21V9"/>
                          </svg>
                          <span style={{ flex: 1, fontSize: '14px' }}>{table.name}</span>
                          <span style={{ 
                            fontSize: '12px', 
                            color: '#8F959E',
                            backgroundColor: '#F5F7FA',
                            padding: '2px 8px',
                            borderRadius: '4px'
                          }}>
                            {getDataTablePermission(table.id) === 'manage' ? '可管理' : 
                             getDataTablePermission(table.id) === 'edit' ? '可编辑' : 
                             getDataTablePermission(table.id) === 'read' ? '仅可阅读' : '无权限'}
                          </span>
                        </div>
                      ))}
                      {/* 占位的文件夹 */}
                      <div style={{ padding: '10px 12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#8F959E' }}>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="#FCD34D">
                          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                        </svg>
                        <span style={{ flex: 1, fontSize: '14px' }}>归档</span>
                      </div>
                    </div>
                  </div>

                  {/* 右侧：权限设置 */}
                  <div style={{ flex: 1 }}>
                    <div style={{
                      border: '1px solid #E5E6EB',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: '#F9FAFB'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="1.5">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <path d="M3 9h18M9 21V9M15 21V9"/>
                          </svg>
                          <span style={{ fontWeight: 500, fontSize: '15px' }}>
                            {dataTables.find(t => t.id === selectedDataTable)?.name}权限
                          </span>
                        </div>
                      </div>

                      {/* 权限选项 */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="radio" 
                            name="data-table-permission"
                            checked={getDataTablePermission(selectedDataTable) === 'manage'}
                            disabled={isReadOnlyRole}
                            onChange={() => updateDataTablePermission(selectedDataTable, 'manage')}
                          />
                          <span style={{ fontSize: '14px' }}>可管理</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="radio" 
                            name="data-table-permission"
                            checked={getDataTablePermission(selectedDataTable) === 'edit'}
                            disabled={isReadOnlyRole}
                            onChange={() => updateDataTablePermission(selectedDataTable, 'edit')}
                          />
                          <span style={{ fontSize: '14px' }}>可编辑</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="radio" 
                            name="data-table-permission"
                            checked={getDataTablePermission(selectedDataTable) === 'read'}
                            disabled={isReadOnlyRole}
                            onChange={() => updateDataTablePermission(selectedDataTable, 'read')}
                          />
                          <span style={{ fontSize: '14px' }}>仅可阅读</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <input 
                            type="radio" 
                            name="data-table-permission"
                            checked={getDataTablePermission(selectedDataTable) === 'none'}
                            disabled={isReadOnlyRole}
                            onChange={() => updateDataTablePermission(selectedDataTable, 'none')}
                          />
                          <span style={{ fontSize: '14px' }}>无权限</span>
                        </div>
                      </div>
                    </div>

                    {/* 详细权限 - 仅在选择可管理、可编辑、仅可阅读时显示 */}
                    {getDataTablePermission(selectedDataTable) !== 'none' && (
                      <div style={{ marginTop: '24px' }}>
                        <div style={{ fontWeight: 500, fontSize: '15px', marginBottom: '16px' }}>详细权限</div>
                        
                        {/* 记录权限 */}
                        <div style={{
                          border: '1px solid #E5E6EB',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <path d="M3 9h18M9 3v18"/>
                            </svg>
                            <span>记录权限</span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#8F959E' }}>
                            {getDataTablePermission(selectedDataTable) === 'read' ? '全部可阅读' : '全部可编辑'}
                          </span>
                        </div>

                        {/* 字段权限 */}
                        <div style={{
                          border: '1px solid #E5E6EB',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          marginBottom: '12px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="1.5">
                              <rect x="3" y="3" width="18" height="18" rx="2"/>
                              <path d="M12 3v18M3 12h18"/>
                            </svg>
                            <span>字段权限</span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#8F959E' }}>
                            {getDataTablePermission(selectedDataTable) === 'read' ? '全部可阅读' : '部分可编辑'}
                          </span>
                        </div>

                        {/* 视图权限 */}
                        <div style={{
                          border: '1px solid #E5E6EB',
                          borderRadius: '6px',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1F2329" strokeWidth="1.5">
                              <path d="M1 21h22L12 2 1 21z"/>
                              <path d="M12 9v4"/>
                              <path d="M12 17h.01"/>
                            </svg>
                            <span>视图权限</span>
                          </div>
                          <span style={{ fontSize: '13px', color: '#8F959E' }}>
                            {getDataTablePermission(selectedDataTable) === 'read' ? '全部可阅读' : '可编辑，全部可阅读'}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {activeTab === "dashboard" && (
                <div>
                  {selectedPlan === '方案1' ? (
                    <>
                      {/* 方案1：合并可创建和可删除为一个选项 */}
                      <div className="permission-item" style={{ marginBottom: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.create || currentPermissions.delete}
                          disabled={isReadOnlyRole}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRolePermissions(prev => {
                              const current = prev[selectedRoleId] || { 
                                create: false, 
                                edit: false,
                                delete: false, 
                                deleteOwnOnly: true,
                                dashboardPermissions: {}
                              };
                              return {
                                ...prev,
                                [selectedRoleId]: {
                                  ...current,
                                  create: checked,
                                  delete: checked,
                                  deleteOwnOnly: checked, // 勾选时默认勾选仅可删除自己创建的
                                  edit: checked ? true : current.edit
                                }
                              };
                            });
                          }}
                        />
                        <span>可新增、删除仪表盘</span>
                      </div>
                      {/* 固定展示仅可删除自己创建的选项 */}
                      <div className="permission-scope-container" style={{ paddingLeft: '24px', marginBottom: '16px' }}>
                        <div className="permission-scope-option" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                          <input 
                            type="checkbox" 
                            checked={currentPermissions.deleteOwnOnly}
                            disabled={isReadOnlyRole}
                            onChange={(e) => updateDeleteOwnOnly(e.target.checked)}
                          />
                          <span>仅可删除自己创建的仪表盘</span>
                        </div>
                      </div>
                    </>
                  ) : selectedPlan === '方案2' ? (
                    <>
                      {/* 方案2：只有可创建仪表盘，带问号提示 */}
                      <div className="permission-item" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.create}
                          disabled={isReadOnlyRole}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setRolePermissions(prev => {
                              const current = prev[selectedRoleId] || { 
                                create: false, 
                                edit: false,
                                delete: false, 
                                deleteOwnOnly: false,
                                dashboardPermissions: {}
                              };
                              return {
                                ...prev,
                                [selectedRoleId]: {
                                  ...current,
                                  create: checked,
                                  edit: checked ? true : current.edit
                                }
                              };
                            });
                          }}
                        />
                        <span>可创建仪表盘</span>
                        <div className="tooltip-container" style={{ position: 'relative', display: 'inline-flex' }}
                             onMouseEnter={() => setShowCreateTooltip(true)}
                             onMouseLeave={() => setShowCreateTooltip(false)}>
                          <span style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#E5E6EB',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#8F959E',
                            cursor: 'help',
                            fontWeight: '600'
                          }}>?</span>
                          <div className="tooltip-content" style={{
                            position: 'absolute',
                            top: '50%',
                            left: '100%',
                            transform: 'translateY(-50%)',
                            marginLeft: '8px',
                            padding: '8px 12px',
                            backgroundColor: '#1D2129',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            zIndex: 1000,
                            display: showCreateTooltip ? 'block' : 'none'
                          }}>
                            创建者可编辑和删除自己创建的仪表盘
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              right: '100%',
                              transform: 'translateY(-50%)',
                              border: '5px solid transparent',
                              borderRightColor: '#1D2129'
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : selectedPlan === '方案3' ? (
                    <>
                      {/* 方案3：在方案2的基础上增加可管理列 */}
                      <div className="permission-item" style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.create}
                          disabled={isReadOnlyRole}
                          onChange={(e) => updatePermission('create', e.target.checked)}
                        />
                        <span>可创建仪表盘</span>
                        <div className="tooltip-container" style={{ position: 'relative', display: 'inline-flex' }}
                             onMouseEnter={() => setShowCreateTooltip(true)}
                             onMouseLeave={() => setShowCreateTooltip(false)}>
                          <span style={{
                            width: '16px',
                            height: '16px',
                            borderRadius: '50%',
                            backgroundColor: '#E5E6EB',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            color: '#8F959E',
                            cursor: 'help',
                            fontWeight: '600'
                          }}>?</span>
                          <div className="tooltip-content" style={{
                            position: 'absolute',
                            top: '50%',
                            left: '100%',
                            transform: 'translateY(-50%)',
                            marginLeft: '8px',
                            padding: '8px 12px',
                            backgroundColor: '#1D2129',
                            color: '#FFFFFF',
                            fontSize: '12px',
                            borderRadius: '4px',
                            whiteSpace: 'nowrap',
                            zIndex: 1000,
                            display: showCreateTooltip ? 'block' : 'none'
                          }}>
                            创建者可编辑和删除自己创建的仪表盘
                            <div style={{
                              position: 'absolute',
                              top: '50%',
                              right: '100%',
                              transform: 'translateY(-50%)',
                              border: '5px solid transparent',
                              borderRightColor: '#1D2129'
                            }}></div>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      {/* 其他方案：保持原样 */}
                      <div className="permission-item" style={{ marginBottom: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.create}
                          disabled={isReadOnlyRole}
                          onChange={(e) => updatePermission('create', e.target.checked)}
                        />
                        <span>可创建</span>
                      </div>
                      <div className="permission-item" style={{ marginBottom: '8px' }}>
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.delete}
                          disabled={isReadOnlyRole}
                          onChange={(e) => updatePermission('delete', e.target.checked)}
                        />
                        <span>可删除</span>
                      </div>
                      {currentPermissions.delete && (
                        <div className="permission-scope-container" style={{ paddingLeft: '24px', marginBottom: '16px' }}>
                          <div className="permission-scope-option" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                            <input 
                              type="checkbox" 
                              checked={currentPermissions.deleteOwnOnly}
                              disabled={isReadOnlyRole}
                              onChange={(e) => updateDeleteOwnOnly(e.target.checked)}
                            />
                            <span>仅可删除自己创建的</span>
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {true && (
                    <>

                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: selectedPlan === '方案3' ? '1fr 1fr 1fr 1fr 1fr' : '1fr 1fr 1fr 1fr', 
                        gap: '8px',
                        border: '1px solid #e5e6eb',
                        borderRadius: '6px',
                        padding: '12px',
                        backgroundColor: '#f9fafb'
                      }}>
                        <div style={{ fontWeight: 500 }}>仪表盘名称</div>
                        {selectedPlan === '方案3' && (
                          <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={flattenDashboards(dashboardTree).every(d => getDashboardPermission(d) === 'manage')}
                              disabled={isReadOnlyRole}
                              onChange={(e) => e.target.checked && toggleAllDashboardsWithPermission('manage')}
                            />
                            <span>可管理</span>
                            <div className="tooltip-container" style={{ position: 'relative', display: 'inline-flex' }}
                                 onMouseEnter={() => setShowManageTooltip(true)}
                                 onMouseLeave={() => setShowManageTooltip(false)}>
                              <span style={{
                                width: '16px',
                                height: '16px',
                                borderRadius: '50%',
                                backgroundColor: '#E5E6EB',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '11px',
                                color: '#8F959E',
                                cursor: 'help',
                                fontWeight: '600'
                              }}>?</span>
                              <div className="tooltip-content" style={{
                                position: 'absolute',
                                top: '100%',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                marginTop: '4px',
                                padding: '6px 10px',
                                backgroundColor: '#1D2129',
                                color: '#FFFFFF',
                                fontSize: '12px',
                                borderRadius: '4px',
                                whiteSpace: 'nowrap',
                                zIndex: 1000,
                                display: showManageTooltip ? 'block' : 'none'
                              }}>
                                可编辑 + 可删除
                                <div style={{
                                  position: 'absolute',
                                  bottom: '100%',
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  border: '5px solid transparent',
                                  borderBottomColor: '#1D2129'
                                }}></div>
                              </div>
                            </div>
                          </div>
                        )}
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={flattenDashboards(dashboardTree).every(d => getDashboardPermission(d) === 'edit')}
                            disabled={isReadOnlyRole}
                            onChange={(e) => e.target.checked && toggleAllDashboardsWithPermission('edit')}
                          />
                          可编辑
                        </div>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={flattenDashboards(dashboardTree).every(d => getDashboardPermission(d) === 'read')}
                            disabled={isReadOnlyRole}
                            onChange={(e) => e.target.checked && toggleAllDashboardsWithPermission('read')}
                          />
                          可阅读
                        </div>
                        <div style={{ fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                          <input 
                            type="checkbox" 
                            checked={flattenDashboards(dashboardTree).every(d => getDashboardPermission(d) === 'none')}
                            disabled={isReadOnlyRole}
                            onChange={(e) => e.target.checked && toggleAllDashboardsWithPermission('none')}
                          />
                          无权限
                        </div>
                        {dashboardTree.flatMap(node => renderDashboardNode(node, 0, selectedPlan))}
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab !== "dashboard" && (
                <div style={{ color: "#8F959E", padding: "40px 0", textAlign: "center" }}>
                  功能开发中...
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="permissions-modal-footer">
          <button className="permissions-footer-btn secondary">保存并预览</button>
          <button className="permissions-footer-btn primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
