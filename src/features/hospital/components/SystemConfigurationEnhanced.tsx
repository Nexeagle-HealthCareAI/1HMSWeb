import React, { useState } from 'react';
import { 
  Building2,
  Users,
  FileText,
  Settings,
  Plus,
  Edit,
  Trash2,
  Upload,
  Download,
  Eye,
  Save,
  RotateCcw,
  User,
  Phone,
  Mail,
  MapPin,
  Globe,
  Palette,
  Image,
  UserPlus,
  BarChart3,
  Calendar,
  Stethoscope,
  X,
  Check,
  Shield,
  Copy,
  UserCheck,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  History,
  Info,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Zap,
  FileCheck,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Checkbox } from './ui/checkbox';
import { useToast } from '@/hooks/use-toast';

interface Permission {
  view: boolean;
  create: boolean;
  edit: boolean;
  delete: boolean;
  approve: boolean;
}

interface RolePermissions {
  id: string;
  name: string;
  description: string;
  permissions: {
    [moduleName: string]: Permission;
  };
  createdAt?: Date;
  modifiedAt?: Date;
  modifiedBy?: string;
  isCustom?: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department: string;
  isActive: boolean;
}

interface AuditLog {
  id: string;
  roleId: string;
  roleName: string;
  action: 'created' | 'modified' | 'deleted';
  changes: string;
  modifiedBy: string;
  timestamp: Date;
}

interface UserActivity {
  userId: string;
  lastLogin: Date;
  modulesAccessed: string[];
  roleHistory: { role: string; assignedAt: Date; assignedBy: string }[];
}

const systemModules = [
  { key: 'patientProfile', name: 'Patient Profile', category: 'clinical' },
  { key: 'appointments', name: 'Appointments', category: 'clinical' },
  { key: 'billing', name: 'Billing', category: 'financial' },
  { key: 'prescriptions', name: 'Prescriptions', category: 'clinical' },
  { key: 'labReports', name: 'Lab Reports', category: 'clinical' },
  { key: 'pharmacy', name: 'Pharmacy', category: 'financial' },
  { key: 'userManagement', name: 'User Management', category: 'admin' },
  { key: 'systemConfig', name: 'System Configuration', category: 'admin' }
];

const moduleCategories = [
  { key: 'clinical', name: 'Clinical', color: 'bg-blue-100 text-blue-800' },
  { key: 'financial', name: 'Financial', color: 'bg-green-100 text-green-800' },
  { key: 'admin', name: 'Administration', color: 'bg-purple-100 text-purple-800' }
];

const permissionIcons = {
  view: Eye,
  create: Plus,
  edit: Edit,
  delete: Trash2,
  approve: CheckCircle2
};

const permissionColors = {
  view: 'text-blue-600',
  create: 'text-green-600', 
  edit: 'text-orange-600',
  delete: 'text-red-600',
  approve: 'text-purple-600'
};

const defaultPermission: Permission = {
  view: false,
  create: false,
  edit: false,
  delete: false,
  approve: false
};

// Enhanced Role & Permissions Manager Component
export const EnhancedRoleManager: React.FC = () => {
  const [roles, setRoles] = useState<RolePermissions[]>([
    {
      id: 'doctor',
      name: 'Doctor',
      description: 'Medical practitioners with patient care permissions',
      permissions: {
        patientProfile: { view: true, create: false, edit: true, delete: false, approve: false },
        appointments: { view: true, create: true, edit: true, delete: true, approve: false },
        billing: { view: false, create: false, edit: false, delete: false, approve: false },
        prescriptions: { view: true, create: true, edit: true, delete: false, approve: true },
        labReports: { view: true, create: false, edit: false, delete: false, approve: true },
        pharmacy: { view: true, create: false, edit: false, delete: false, approve: false },
        userManagement: { view: false, create: false, edit: false, delete: false, approve: false },
        systemConfig: { view: false, create: false, edit: false, delete: false, approve: false }
      },
      createdAt: new Date('2024-01-01'),
      modifiedAt: new Date('2024-01-15'),
      modifiedBy: 'Admin'
    }
  ]);

  const [users] = useState<User[]>([
    { id: 'U001', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@hospital.com', role: 'doctor', department: 'Cardiology', isActive: true }
  ]);

  const [userActivities] = useState<UserActivity[]>([
    { 
      userId: 'U001', 
      lastLogin: new Date('2024-01-15T14:30:00'), 
      modulesAccessed: ['patientProfile', 'appointments', 'prescriptions'], 
      roleHistory: [{ role: 'doctor', assignedAt: new Date('2024-01-01'), assignedBy: 'Admin' }] 
    }
  ]);

  const [auditLogs] = useState<AuditLog[]>([
    { id: '1', roleId: 'doctor', roleName: 'Doctor', action: 'modified', changes: 'Added billing view permission', modifiedBy: 'Admin', timestamp: new Date('2024-01-15T10:30:00') }
  ]);

  const [editingRole, setEditingRole] = useState<RolePermissions | null>(null);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [showRoleSummary, setShowRoleSummary] = useState(false);
  const [selectedRoleForSummary, setSelectedRoleForSummary] = useState<RolePermissions | null>(null);
  const [showCreateRoleDialog, setShowCreateRoleDialog] = useState(false);
  const [showAuditDialog, setShowAuditDialog] = useState(false);
  const [roleFilter, setRoleFilter] = useState('all');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkEditMode, setBulkEditMode] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    baseRole: ''
  });

  const { toast } = useToast();

  // Filter logic
  const filteredSystemModules = systemModules.filter(module => {
    const matchesSearch = searchTerm === '' || 
      module.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = moduleFilter === 'all' || module.category === moduleFilter;
    return matchesSearch && matchesCategory;
  });

  const filteredRoles = roles.filter(role => {
    return roleFilter === 'all' || role.id === roleFilter;
  });

  // Enhanced handlers
  const createNewRole = () => {
    if (!newRole.name) {
      toast({
        title: "Missing Information",
        description: "Please provide a role name.",
        variant: "destructive"
      });
      return;
    }

    const baseRolePerms = newRole.baseRole ? 
      roles.find(r => r.id === newRole.baseRole)?.permissions : 
      Object.fromEntries(systemModules.map(m => [m.key, { ...defaultPermission }]));

    const role: RolePermissions = {
      id: newRole.name.toLowerCase().replace(/\s+/g, '-'),
      name: newRole.name,
      description: newRole.description,
      permissions: baseRolePerms || {},
      createdAt: new Date(),
      modifiedAt: new Date(),
      modifiedBy: 'Admin',
      isCustom: true
    };

    setRoles(prev => [...prev, role]);
    setNewRole({ name: '', description: '', baseRole: '' });
    setShowCreateRoleDialog(false);

    toast({
      title: "Role Created",
      description: `${role.name} role has been created successfully.`,
    });
  };

  const updatePermission = (moduleName: string, permissionType: keyof Permission, value: boolean) => {
    if (!editingRole) return;

    setEditingRole(prev => prev ? {
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleName]: {
          ...prev.permissions[moduleName],
          [permissionType]: value
        }
      }
    } : null);
  };

  const bulkUpdatePermissions = (permissionType: keyof Permission, value: boolean) => {
    if (!editingRole || selectedModules.length === 0) return;

    const updatedPermissions = { ...editingRole.permissions };
    selectedModules.forEach(moduleKey => {
      if (!updatedPermissions[moduleKey]) {
        updatedPermissions[moduleKey] = { ...defaultPermission };
      }
      updatedPermissions[moduleKey] = {
        ...updatedPermissions[moduleKey],
        [permissionType]: value
      };
    });

    setEditingRole({
      ...editingRole,
      permissions: updatedPermissions,
      modifiedAt: new Date(),
      modifiedBy: 'Admin'
    });

    toast({
      title: "Bulk Update",
      description: `Updated ${permissionType} permission for ${selectedModules.length} modules.`,
    });
  };

  const handleSaveRole = () => {
    if (!editingRole) return;

    setRoles(prev => prev.map(role => 
      role.id === editingRole.id ? { 
        ...editingRole, 
        modifiedAt: new Date(),
        modifiedBy: 'Admin'
      } : role
    ));

    setEditingRole(null);
    setShowRoleDialog(false);
    
    toast({
      title: "Role Updated", 
      description: `${editingRole.name} role permissions have been updated.`,
    });
  };

  const duplicateRole = (sourceRoleId: string) => {
    const sourceRole = roles.find(r => r.id === sourceRoleId);
    if (!sourceRole || !editingRole) return;

    setEditingRole(prev => prev ? {
      ...prev,
      permissions: { ...sourceRole.permissions }
    } : null);

    toast({
      title: "Permissions Duplicated",
      description: `Permissions copied from ${sourceRole.name}.`,
    });
  };

  const exportRolePermissions = () => {
    const dataStr = JSON.stringify(roles, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'role-permissions.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: "Role permissions have been exported successfully.",
    });
  };

  const getUserActivity = (userId: string) => {
    return userActivities.find(activity => activity.userId === userId);
  };

  const getPermissionCount = (role: RolePermissions) => {
    return Object.values(role.permissions).reduce((acc, perm) => 
      acc + Object.values(perm).filter(Boolean).length, 0
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Enhanced Header with Search and Filters */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Role & Permissions Manager</h2>
          <p className="text-muted-foreground">Advanced role-based access control system</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search modules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Select value={moduleFilter} onValueChange={setModuleFilter}>
            <SelectTrigger className="w-48">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {moduleCategories.map((category) => (
                <SelectItem key={category.key} value={category.key}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              {roles.map((role) => (
                <SelectItem key={role.id} value={role.id}>
                  {role.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Action Buttons Row */}
      <div className="flex flex-wrap gap-3">
        <Button onClick={() => setShowCreateRoleDialog(true)} className="hover-scale">
          <UserPlus className="h-4 w-4 mr-2" />
          Create New Role
        </Button>
        
        <Button variant="outline" onClick={() => setShowAuditDialog(true)}>
          <History className="h-4 w-4 mr-2" />
          Audit Trail
        </Button>
        
        <Button variant="outline" onClick={exportRolePermissions}>
          <Download className="h-4 w-4 mr-2" />
          Export JSON
        </Button>
        
        <Button 
          variant="outline" 
          onClick={() => setBulkEditMode(!bulkEditMode)}
          className={bulkEditMode ? 'bg-primary/10' : ''}
        >
          <Zap className="h-4 w-4 mr-2" />
          Bulk Edit Mode
        </Button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Enhanced Roles List */}
        <div className="xl:col-span-1 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                System Roles ({filteredRoles.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {filteredRoles.map((role) => (
                <div 
                  key={role.id} 
                  className="group p-4 border rounded-lg hover:shadow-md transition-all hover-scale cursor-pointer"
                  onClick={() => {
                    setSelectedRoleForSummary(role);
                    setShowRoleSummary(true);
                  }}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{role.name}</h4>
                        {role.isCustom && (
                          <Badge variant="secondary" className="text-xs">Custom</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {role.description}
                      </p>
                    </div>
                    
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingRole(role);
                          setShowRoleDialog(true);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedRoleForSummary(role);
                          setShowRoleSummary(true);
                        }}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4 text-muted-foreground">
                      <span>{getPermissionCount(role)} permissions</span>
                      {role.modifiedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {role.modifiedAt.toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Quick Permission Icons */}
                  <div className="flex gap-2 mt-3">
                    {Object.entries(permissionIcons).map(([permission, IconComponent]) => {
                      const hasAnyPermission = Object.values(role.permissions).some(
                        perm => perm[permission as keyof Permission]
                      );
                      return (
                        <div 
                          key={permission}
                          className={`flex items-center gap-1 text-xs ${hasAnyPermission ? permissionColors[permission as keyof typeof permissionColors] : 'text-muted-foreground'}`}
                        >
                          <IconComponent className="h-3 w-3" />
                          <span className="capitalize hidden sm:inline">{permission}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Permissions Matrix */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <CardTitle>Permissions Matrix</CardTitle>
                {bulkEditMode && (
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setSelectedModules([])}>
                      Clear Selection
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={() => setSelectedModules(filteredSystemModules.map(m => m.key))}
                    >
                      Select All Visible
                    </Button>
                  </div>
                )}
              </div>
              {bulkEditMode && selectedModules.length > 0 && (
                <div className="flex gap-2 mt-4">
                  <span className="text-sm text-muted-foreground mr-2">
                    {selectedModules.length} modules selected. Quick actions:
                  </span>
                  {Object.keys(permissionIcons).map((permission) => (
                    <div key={permission} className="flex gap-1">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => bulkUpdatePermissions(permission as keyof Permission, true)}
                      >
                        Grant {permission}
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => bulkUpdatePermissions(permission as keyof Permission, false)}
                      >
                        Revoke {permission}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      {bulkEditMode && <th className="text-left p-2 w-8"></th>}
                      <th className="text-left p-2 min-w-48">Module</th>
                      {Object.entries(permissionIcons).map(([permission, IconComponent]) => (
                        <th key={permission} className="text-center p-2 min-w-16">
                          <div className="flex flex-col items-center gap-1">
                            <IconComponent className={`h-4 w-4 ${permissionColors[permission as keyof typeof permissionColors]}`} />
                            <span className="text-xs capitalize">{permission}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSystemModules.map((module) => {
                      const category = moduleCategories.find(cat => cat.key === module.category);
                      
                      return (
                        <tr key={module.key} className="border-b hover:bg-muted/20 transition-colors">
                          {bulkEditMode && (
                            <td className="p-2">
                              <Checkbox
                                checked={selectedModules.includes(module.key)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedModules(prev => [...prev, module.key]);
                                  } else {
                                    setSelectedModules(prev => prev.filter(m => m !== module.key));
                                  }
                                }}
                              />
                            </td>
                          )}
                          <td className="p-2">
                            <div className="flex flex-col gap-1">
                              <span className="font-medium">{module.name}</span>
                              {category && (
                                <Badge className={`text-xs w-fit ${category.color}`}>
                                  {category.name}
                                </Badge>
                              )}
                            </div>
                          </td>
                          {Object.keys(permissionIcons).map((permission) => {
                            const doctorRole = roles.find(r => r.id === 'doctor');
                            const hasPermission = doctorRole?.permissions[module.key]?.[permission as keyof Permission] || false;
                            
                            return (
                              <td key={permission} className="p-2 text-center">
                                <div className={`inline-flex p-1 rounded ${hasPermission ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'}`}>
                                  {hasPermission ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Enhanced User Activity Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            User Activity & Role Assignments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {users.map((user) => {
              const activity = getUserActivity(user.id);
              return (
                <div key={user.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium">{user.name}</h4>
                      <p className="text-sm text-muted-foreground">{user.email}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="capitalize">{user.role}</Badge>
                        <Badge variant="outline">{user.department}</Badge>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {activity && (
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        Last login: {activity.lastLogin.toLocaleString()}
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <FileCheck className="h-3 w-3" />
                        Active modules: {activity.modulesAccessed.length}
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {activity.modulesAccessed.slice(0, 3).map((moduleKey) => {
                          const module = systemModules.find(m => m.key === moduleKey);
                          return module ? (
                            <Badge key={moduleKey} variant="secondary" className="text-xs">
                              {module.name}
                            </Badge>
                          ) : null;
                        })}
                        {activity.modulesAccessed.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{activity.modulesAccessed.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Enhanced Role Dialog with all new features */}
      <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Edit {editingRole?.name} Permissions
            </DialogTitle>
          </DialogHeader>
          
          {editingRole && (
            <div className="space-y-6">
              {/* Role metadata */}
              <div className="p-4 bg-muted/50 rounded-lg">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Created:</span><br />
                    {editingRole.createdAt?.toLocaleString() || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Last Modified:</span><br />
                    {editingRole.modifiedAt?.toLocaleString() || 'N/A'}
                  </div>
                  <div>
                    <span className="font-medium">Modified By:</span><br />
                    {editingRole.modifiedBy || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Duplicate permissions option */}
              <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                <Copy className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium">Quick Setup:</span>
                <Select onValueChange={(roleId) => duplicateRole(roleId)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Copy from existing role" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.filter(r => r.id !== editingRole.id).map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Enhanced Permissions Matrix */}
              <div className="border rounded-lg overflow-hidden">
                <div className="bg-muted/50 p-3 border-b">
                  <h3 className="font-medium">Module Permissions</h3>
                </div>
                
                <div className="divide-y">
                  {moduleCategories.map((category) => {
                    const categoryModules = filteredSystemModules.filter(m => m.category === category.key);
                    if (categoryModules.length === 0) return null;
                    
                    return (
                      <div key={category.key}>
                        <div className="bg-muted/20 px-4 py-2 font-medium text-sm flex items-center gap-2">
                          <Badge className={category.color}>{category.name}</Badge>
                          <span className="text-muted-foreground">({categoryModules.length} modules)</span>
                        </div>
                        
                        {categoryModules.map((module) => {
                          const modulePerms = editingRole.permissions[module.key] || defaultPermission;
                          
                          return (
                            <div key={module.key} className="grid grid-cols-6 gap-4 p-4 items-center hover:bg-muted/20">
                              <div className="font-medium">{module.name}</div>
                              {(Object.keys(permissionIcons) as Array<keyof Permission>).map((permType) => {
                                const IconComponent = permissionIcons[permType];
                                return (
                                  <div key={permType} className="flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-1">
                                      <Switch
                                        checked={modulePerms[permType]}
                                        onCheckedChange={(checked) => updatePermission(module.key, permType, checked)}
                                      />
                                      <div className={`flex items-center gap-1 text-xs ${modulePerms[permType] ? permissionColors[permType] : 'text-muted-foreground'}`}>
                                        <IconComponent className="h-3 w-3" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <Button onClick={handleSaveRole} className="flex-1">
                  <Save className="h-4 w-4 mr-2" />
                  Save Role Permissions
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setEditingRole(null);
                    setShowRoleDialog(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create New Role Dialog */}
      <Dialog open={showCreateRoleDialog} onOpenChange={setShowCreateRoleDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRole.name}
                onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Senior Doctor, Lab Technician"
              />
            </div>
            
            <div>
              <Label htmlFor="roleDescription">Description</Label>
              <Textarea
                id="roleDescription"
                value={newRole.description}
                onChange={(e) => setNewRole(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Brief description of the role"
                rows={3}
              />
            </div>

            <div>
              <Label>Base on existing role (optional)</Label>
              <Select value={newRole.baseRole} onValueChange={(value) => setNewRole(prev => ({ ...prev, baseRole: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role to inherit permissions from" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.name} - {getPermissionCount(role)} permissions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={createNewRole} className="flex-1">
                Create Role
              </Button>
              <Button variant="outline" onClick={() => setShowCreateRoleDialog(false)} className="flex-1">
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Role Summary Modal */}
      <Dialog open={showRoleSummary} onOpenChange={setShowRoleSummary}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {selectedRoleForSummary?.name} - Role Summary
            </DialogTitle>
          </DialogHeader>
          
          {selectedRoleForSummary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/50 rounded-lg">
                <div>
                  <span className="font-medium">Total Permissions:</span>
                  <div className="text-2xl font-bold text-primary">
                    {getPermissionCount(selectedRoleForSummary)}
                  </div>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <div className="text-sm">
                    {selectedRoleForSummary.modifiedAt?.toLocaleDateString() || 'N/A'}
                  </div>
                </div>
              </div>

              {moduleCategories.map((category) => {
                const categoryModules = systemModules.filter(m => m.category === category.key);
                const categoryPerms = categoryModules.filter(m => 
                  Object.values(selectedRoleForSummary.permissions[m.key] || {}).some(Boolean)
                );
                
                if (categoryPerms.length === 0) return null;

                return (
                  <div key={category.key}>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={category.color}>{category.name}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {categoryPerms.length} of {categoryModules.length} modules
                      </span>
                    </div>
                    
                    <div className="space-y-2 ml-4">
                      {categoryPerms.map((module) => {
                        const perms = selectedRoleForSummary.permissions[module.key];
                        const activePerms = Object.entries(perms).filter(([_, value]) => value);
                        
                        return (
                          <div key={module.key} className="flex items-center justify-between p-2 border rounded">
                            <span className="font-medium">{module.name}</span>
                            <div className="flex gap-1">
                              {activePerms.map(([permission]) => {
                                const IconComponent = permissionIcons[permission as keyof typeof permissionIcons];
                                return (
                                  <div 
                                    key={permission}
                                    className={`p-1 rounded ${permissionColors[permission as keyof typeof permissionColors]}`}
                                    title={permission}
                                  >
                                    <IconComponent className="h-3 w-3" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={showAuditDialog} onOpenChange={setShowAuditDialog}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Role Changes Audit Trail
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-3">
            {auditLogs.map((log) => (
              <div key={log.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className={`p-2 rounded-full ${
                  log.action === 'created' ? 'bg-green-100 text-green-600' :
                  log.action === 'modified' ? 'bg-blue-100 text-blue-600' :
                  'bg-red-100 text-red-600'
                }`}>
                  {log.action === 'created' && <Plus className="h-4 w-4" />}
                  {log.action === 'modified' && <Edit className="h-4 w-4" />}
                  {log.action === 'deleted' && <Trash2 className="h-4 w-4" />}
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium">{log.roleName}</span>
                    <Badge variant="outline" className="capitalize">{log.action}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">{log.changes}</p>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>By {log.modifiedBy}</span>
                    <span>{log.timestamp.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};