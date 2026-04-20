import { useState, useRef, useEffect } from "react";
import { useToast } from "../Toast";
import "./PermissionsModal.css";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

interface CustomRole {
  id: string;
  name: string;
}

export default function PermissionsModal({ isOpen, onClose }: Props) {
  const [selectedRoleId, setSelectedRoleId] = useState("owner");
  const [activeTab, setActiveTab] = useState("dashboard");
  const { success } = useToast();
  const menuRef = useRef<HTMLDivElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [customRoles, setCustomRoles] = useState<CustomRole[]>([]);

  const [rolePermissions, setRolePermissions] = useState<Record<string, { enabled: boolean; create: boolean; delete: boolean; share: boolean }>>({
    owner: { enabled: true, create: true, delete: true, share: true },
    admin: { enabled: true, create: true, delete: true, share: true },
    editor: { enabled: false, create: false, delete: false, share: false },
    viewer: { enabled: false, create: false, delete: false, share: false },
  });

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
  const currentPermissions = rolePermissions[selectedRoleId] || { enabled: false, create: false, delete: false, share: false };

  const handleRoleChange = (roleId: string) => {
    setSelectedRoleId(roleId);
  };

  const updatePermission = (key: 'enabled' | 'create' | 'delete' | 'share', value: boolean) => {
    setRolePermissions(prev => ({
      ...prev,
      [selectedRoleId]: {
        ...prev[selectedRoleId],
        [key]: value,
      },
    }));
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
    setRolePermissions(prev => ({
      ...prev,
      [newId]: { enabled: false, create: false, delete: false, share: false },
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
              {activeTab === "dashboard" && (
                <div>
                  <div className="permission-section">
                    <div className="permission-section-title">开启权限</div>
                    <div className="permission-item">
                      <input 
                        type="checkbox" 
                        checked={currentPermissions.enabled}
                        disabled={isReadOnlyRole}
                        onChange={(e) => updatePermission('enabled', e.target.checked)}
                      />
                      <span>开启仪表盘权限设置</span>
                    </div>
                  </div>
                  {currentPermissions.enabled && (
                    <div className="permission-section">
                      <div className="permission-section-title">基础功能</div>
                      <div className="permission-item">
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.create}
                          disabled={isReadOnlyRole}
                          onChange={(e) => updatePermission('create', e.target.checked)}
                        />
                        <span>创建仪表盘</span>
                      </div>
                      <div className="permission-item">
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.delete}
                          disabled={isReadOnlyRole}
                          onChange={(e) => updatePermission('delete', e.target.checked)}
                        />
                        <span>删除自己创建的仪表盘</span>
                      </div>
                      <div className="permission-item">
                        <input 
                          type="checkbox" 
                          checked={currentPermissions.share}
                          disabled={isReadOnlyRole}
                          onChange={(e) => updatePermission('share', e.target.checked)}
                        />
                        <span>分享仪表盘</span>
                      </div>
                    </div>
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
