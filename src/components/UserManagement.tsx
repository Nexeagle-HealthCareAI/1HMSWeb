import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Key,
  Search,
  Upload,
  Download,
  Eye,
  Copy,
  Clock,
  Activity,
  Settings,
  FileText,
  Database,
  Calendar,
  DollarSign,
  TestTube,
  Pill
} from 'lucide-react';

// Module definitions for better organization
const systemModules = [
  { id: 'patients', name: 'Patient Records', icon: Users, description: 'Patient information and medical records' },
  { id: 'appointments', name: 'Appointments', icon: Calendar, description: 'Appointment scheduling and management' },
  { id: 'billing', name: 'Billing', icon: DollarSign, description: 'Financial transactions and insurance' },
  { id: 'lab', name: 'Laboratory', icon: TestTube, description: 'Lab tests and results' },
  { id: 'pharmacy', name: 'Pharmacy', icon: Pill, description: 'Medication and prescriptions' },
  { id: 'reports', name: 'Reports', icon: FileText, description: 'Analytics and reporting' },
  { id: 'system', name: 'System Admin', icon: Settings, description: 'System configuration and settings' }
];

const permissionTypes = [
  { id: 'view', name: 'View', icon: Eye, color: 'text-blue-600' },
  { id: 'create', name: 'Create', icon: UserPlus, color: 'text-green-600' },
  { id: 'edit', name: 'Edit', icon: Edit2, color: 'text-yellow-600' },
  { id: 'delete', name: 'Delete', icon: Trash2, color: 'text-red-600' },
  { id: 'approve', name: 'Approve', icon: Shield, color: 'text-purple-600' }
];

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  roles: string[];
  department?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  createdBy: string;
  createdAt: string;
  specialty?: string;
  workingHours?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Record<string, string[]>; // moduleId -> permission types
  color: string;
  isDefault: boolean;
  createdAt: string;
}

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  module: string;
  timestamp: string;
  details: string;
}

const defaultRoles: Role[] = [
  {
    id: 'doctor',
    name: 'Doctor',
    description: 'Medical practitioner with full patient access',
    permissions: {
      patients: ['view', 'create', 'edit'],
      appointments: ['view', 'create', 'edit'],
      lab: ['view', 'approve'],
      pharmacy: ['view', 'create'],
      reports: ['view']
    },
    color: 'bg-blue-100 text-blue-800',
    isDefault: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'nurse',
    name: 'Nurse',
    description: 'Nursing staff with patient care access',
    permissions: {
      patients: ['view', 'edit'],
      appointments: ['view', 'create', 'edit'],
      lab: ['view'],
      pharmacy: ['view']
    },
    color: 'bg-green-100 text-green-800',
    isDefault: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'receptionist',
    name: 'Receptionist',
    description: 'Front desk staff for appointments and basic patient info',
    permissions: {
      patients: ['view', 'create'],
      appointments: ['view', 'create', 'edit'],
      billing: ['view', 'create']
    },
    color: 'bg-purple-100 text-purple-800',
    isDefault: true,
    createdAt: '2024-01-01'
  },
  {
    id: 'admin',
    name: 'System Administrator',
    description: 'Full system access and user management',
    permissions: Object.fromEntries(
      systemModules.map(module => [module.id, ['view', 'create', 'edit', 'delete', 'approve']])
    ),
    color: 'bg-red-100 text-red-800',
    isDefault: true,
    createdAt: '2024-01-01'
  }
];

const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@hospital.com',
    phone: '+1-555-0101',
    roles: ['doctor'],
    department: 'Cardiology',
    status: 'active',
    lastLogin: '2024-01-15 09:30',
    createdBy: 'admin',
    createdAt: '2024-01-01',
    specialty: 'Cardiology',
    workingHours: '9:00 AM - 5:00 PM'
  },
  {
    id: '2',
    name: 'Nurse Maria Garcia',
    email: 'maria.garcia@hospital.com',
    phone: '+1-555-0102',
    roles: ['nurse'],
    department: 'Emergency',
    status: 'active',
    lastLogin: '2024-01-15 08:15',
    createdBy: 'admin',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    name: 'John Smith',
    email: 'john.smith@hospital.com',
    phone: '+1-555-0103',
    roles: ['receptionist'],
    status: 'active',
    lastLogin: '2024-01-14 17:45',
    createdBy: 'admin',
    createdAt: '2024-01-02'
  }
];

const sampleActivities: UserActivity[] = [
  {
    id: '1',
    userId: '1',
    action: 'Login',
    module: 'system',
    timestamp: '2024-01-15 09:30',
    details: 'User logged in successfully'
  },
  {
    id: '2',
    userId: '1',
    action: 'View Patient',
    module: 'patients',
    timestamp: '2024-01-15 09:45',
    details: 'Viewed patient John Doe (ID: P001)'
  },
  {
    id: '3',
    userId: '2',
    action: 'Create Appointment',
    module: 'appointments',
    timestamp: '2024-01-15 10:15',
    details: 'Created appointment for patient Jane Smith'
  }
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [activities, setActivities] = useState<UserActivity[]>(sampleActivities);
  const [activeTab, setActiveTab] = useState('users');
  
  // User management states
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Role management states
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showRolePreview, setShowRolePreview] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [duplicatingRole, setDuplicatingRole] = useState<Role | null>(null);
  
  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    roles: [] as string[],
    department: '',
    specialty: '',
    workingHours: ''
  });
  
  const [newRole, setNewRole] = useState({
    name: '',
    description: '',
    permissions: {} as Record<string, string[]>
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.roles.includes(roleFilter);
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = () => {
    if (newUser.name && newUser.email && newUser.roles.length > 0) {
      const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        roles: newUser.roles,
        department: newUser.department || undefined,
        specialty: newUser.specialty || undefined,
        workingHours: newUser.workingHours || undefined,
        status: 'active',
        lastLogin: 'Never',
        createdBy: 'current_user',
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setUsers([...users, user]);
      setNewUser({ name: '', email: '', phone: '', roles: [], department: '', specialty: '', workingHours: '' });
      setShowAddUser(false);
    }
  };

  const handleCreateRole = () => {
    if (newRole.name && newRole.description) {
      const role: Role = {
        id: newRole.name.toLowerCase().replace(/\s+/g, '_'),
        name: newRole.name,
        description: newRole.description,
        permissions: newRole.permissions,
        color: 'bg-gray-100 text-gray-800',
        isDefault: false,
        createdAt: new Date().toISOString().split('T')[0]
      };
      
      setRoles([...roles, role]);
      setNewRole({ name: '', description: '', permissions: {} });
      setShowCreateRole(false);
    }
  };

  const handleDuplicateRole = (role: Role) => {
    setNewRole({
      name: `${role.name} (Copy)`,
      description: role.description,
      permissions: { ...role.permissions }
    });
    setDuplicatingRole(role);
    setShowCreateRole(true);
  };

  const togglePermission = (moduleId: string, permissionType: string) => {
    setNewRole(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [moduleId]: prev.permissions[moduleId]?.includes(permissionType)
          ? prev.permissions[moduleId].filter(p => p !== permissionType)
          : [...(prev.permissions[moduleId] || []), permissionType]
      }
    }));
  };

  const getRolePermissionSummary = (roleIds: string[]) => {
    const allPermissions = new Set<string>();
    roleIds.forEach(roleId => {
      const role = roles.find(r => r.id === roleId);
      if (role) {
        Object.entries(role.permissions).forEach(([moduleId, perms]) => {
          perms.forEach(perm => {
            allPermissions.add(`${moduleId}:${perm}`);
          });
        });
      }
    });
    return allPermissions.size;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage users, roles, permissions and track activities</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="roles">Roles & Permissions</TabsTrigger>
          <TabsTrigger value="activity">User Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          {/* Users Header Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add User
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Bulk Upload
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Users
              </Button>
            </div>
          </div>

          {/* Users Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search users by name or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    {roles.map(role => (
                      <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Users List */}
          <div className="grid gap-4">
            {filteredUsers.map(user => (
              <Card key={user.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{user.name}</h3>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                        <p className="text-sm text-muted-foreground">{user.phone}</p>
                        {user.department && (
                          <p className="text-xs text-muted-foreground">Department: {user.department}</p>
                        )}
                        <div className="flex gap-1 mt-1">
                          {user.roles.map(roleId => {
                            const role = roles.find(r => r.id === roleId);
                            return role ? (
                              <Badge key={roleId} className={role.color}>{role.name}</Badge>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={user.status === 'active' ? 'default' : 'secondary'}>
                          {user.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          Last login: {user.lastLogin}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getRolePermissionSummary(user.roles)} permissions
                        </p>
                      </div>
                      
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setSelectedUser(user)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="roles" className="space-y-4">
          {/* Roles Header Actions */}
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
                <DialogTrigger asChild>
                  <Button>
                    <Shield className="h-4 w-4 mr-2" />
                    Create Role
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          {/* Permission Matrix */}
          <Card>
            <CardHeader>
              <CardTitle>Permission Matrix</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Module</TableHead>
                      {roles.map(role => (
                        <TableHead key={role.id} className="text-center min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <Badge className={role.color}>{role.name}</Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateRole(role)}
                              className="h-6 px-2"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {systemModules.map(module => (
                      <TableRow key={module.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <module.icon className="h-4 w-4" />
                            {module.name}
                          </div>
                        </TableCell>
                        {roles.map(role => (
                          <TableCell key={role.id} className="text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {permissionTypes.map(permType => {
                                const hasPermission = role.permissions[module.id]?.includes(permType.id);
                                return hasPermission ? (
                                  <Badge key={permType.id} variant="outline" className={permType.color}>
                                    <permType.icon className="h-3 w-3" />
                                  </Badge>
                                ) : null;
                              })}
                            </div>
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Roles List */}
          <div className="grid gap-4">
            {roles.map(role => (
              <Card key={role.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={role.color}>{role.name}</Badge>
                        {role.isDefault && <Badge variant="outline">Default</Badge>}
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{role.description}</p>
                      <p className="text-xs text-muted-foreground">
                        Created: {role.createdAt} | 
                        Modules: {Object.keys(role.permissions).length} | 
                        Total Permissions: {Object.values(role.permissions).flat().length}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleDuplicateRole(role)}>
                        <Copy className="h-4 w-4" />
                      </Button>
                      {!role.isDefault && (
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                User Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {activities.map(activity => (
                  <div key={activity.id} className="flex items-center gap-4 p-3 border rounded-lg">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {users.find(u => u.id === activity.userId)?.name || 'Unknown User'}
                        </span>
                        <Badge variant="outline">{activity.action}</Badge>
                        <Badge variant="secondary">{activity.module}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{activity.details}</p>
                      <p className="text-xs text-muted-foreground">{activity.timestamp}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  placeholder="Enter email address"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="Enter phone number"
                />
              </div>
              <div>
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={newUser.department}
                  onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                  placeholder="Enter department"
                />
              </div>
            </div>
            <div>
              <Label>Select Roles *</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {roles.map(role => (
                  <div key={role.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={role.id}
                      checked={newUser.roles.includes(role.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setNewUser(prev => ({
                            ...prev,
                            roles: [...prev.roles, role.id]
                          }));
                        } else {
                          setNewUser(prev => ({
                            ...prev,
                            roles: prev.roles.filter(r => r !== role.id)
                          }));
                        }
                      }}
                    />
                    <Label htmlFor={role.id} className="flex items-center gap-2">
                      <Badge className={role.color}>{role.name}</Badge>
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            {newUser.roles.length > 0 && (
              <div className="p-3 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Permission Preview</h4>
                <p className="text-sm text-muted-foreground">
                  This user will have {getRolePermissionSummary(newUser.roles)} total permissions across {
                    new Set(newUser.roles.flatMap(roleId => 
                      Object.keys(roles.find(r => r.id === roleId)?.permissions || {})
                    )).size
                  } modules.
                </p>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddUser}>
                Add User
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Upload Dialog */}
      <Dialog open={showBulkUpload} onOpenChange={setShowBulkUpload}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Upload Users</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Upload CSV File</Label>
              <Input type="file" accept=".csv" className="mt-2" />
              <p className="text-sm text-muted-foreground mt-1">
                CSV should include: Name, Email, Phone, Role, Department
              </p>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowBulkUpload(false)}>
                Cancel
              </Button>
              <Button>
                Upload Users
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create Role Dialog */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {duplicatingRole ? `Duplicate Role: ${duplicatingRole.name}` : 'Create New Role'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="roleName">Role Name *</Label>
                <Input
                  id="roleName"
                  value={newRole.name}
                  onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                  placeholder="Enter role name"
                />
              </div>
              <div>
                <Label htmlFor="roleDesc">Description</Label>
                <Input
                  id="roleDesc"
                  value={newRole.description}
                  onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                  placeholder="Enter role description"
                />
              </div>
            </div>
            
            <div>
              <Label>Permissions by Module</Label>
              <div className="mt-2 space-y-4">
                {systemModules.map(module => (
                  <Card key={module.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <module.icon className="h-5 w-5" />
                        <h4 className="font-medium">{module.name}</h4>
                        <p className="text-sm text-muted-foreground">{module.description}</p>
                      </div>
                      <div className="flex gap-4">
                        {permissionTypes.map(permType => (
                          <label key={permType.id} className="flex items-center space-x-2 cursor-pointer">
                            <Switch
                              checked={newRole.permissions[module.id]?.includes(permType.id) || false}
                              onCheckedChange={() => togglePermission(module.id, permType.id)}
                            />
                            <div className="flex items-center gap-1">
                              <permType.icon className={`h-4 w-4 ${permType.color}`} />
                              <span className="text-sm">{permType.name}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => {
                setShowCreateRole(false);
                setDuplicatingRole(null);
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole}>
                {duplicatingRole ? 'Duplicate Role' : 'Create Role'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};