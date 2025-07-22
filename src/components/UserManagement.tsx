import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Shield, 
  Key,
  Search,
  Filter,
  MoreVertical,
  UserCheck,
  UserX
} from 'lucide-react';

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  color: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  department?: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin: string;
  specialty?: string;
  workingHours?: string;
}

const permissions: Permission[] = [
  { id: 'view_patients', name: 'View Patients', description: 'View patient records and information' },
  { id: 'edit_patients', name: 'Edit Patients', description: 'Modify patient information' },
  { id: 'manage_appointments', name: 'Manage Appointments', description: 'Create, edit, and cancel appointments' },
  { id: 'view_billing', name: 'View Billing', description: 'Access billing and financial information' },
  { id: 'manage_billing', name: 'Manage Billing', description: 'Modify billing information' },
  { id: 'view_reports', name: 'View Reports', description: 'Access system reports' },
  { id: 'manage_users', name: 'Manage Users', description: 'Add, edit, and remove users' },
  { id: 'system_config', name: 'System Configuration', description: 'Modify system settings' }
];

const defaultRoles: Role[] = [
  { id: 'doctor', name: 'Doctor', permissions: ['view_patients', 'edit_patients', 'manage_appointments'], color: 'bg-blue-100 text-blue-800' },
  { id: 'nurse', name: 'Nurse', permissions: ['view_patients', 'manage_appointments'], color: 'bg-green-100 text-green-800' },
  { id: 'receptionist', name: 'Receptionist', permissions: ['manage_appointments', 'view_billing'], color: 'bg-purple-100 text-purple-800' },
  { id: 'lab_tech', name: 'Lab Technician', permissions: ['view_patients'], color: 'bg-orange-100 text-orange-800' },
  { id: 'pharmacist', name: 'Pharmacist', permissions: ['view_patients'], color: 'bg-teal-100 text-teal-800' },
  { id: 'admin', name: 'Administrator', permissions: permissions.map(p => p.id), color: 'bg-red-100 text-red-800' }
];

const sampleUsers: User[] = [
  { id: '1', name: 'Dr. Sarah Johnson', email: 'sarah.johnson@hospital.com', role: 'doctor', department: 'Cardiology', status: 'active', lastLogin: '2024-01-15 09:30', specialty: 'Cardiology', workingHours: '9:00 AM - 5:00 PM' },
  { id: '2', name: 'Nurse Maria Garcia', email: 'maria.garcia@hospital.com', role: 'nurse', department: 'Emergency', status: 'active', lastLogin: '2024-01-15 08:15' },
  { id: '3', name: 'John Smith', email: 'john.smith@hospital.com', role: 'receptionist', status: 'active', lastLogin: '2024-01-14 17:45' },
  { id: '4', name: 'Dr. Michael Brown', email: 'michael.brown@hospital.com', role: 'doctor', department: 'Neurology', status: 'inactive', lastLogin: '2024-01-10 14:20', specialty: 'Neurology', workingHours: '10:00 AM - 6:00 PM' },
  { id: '5', name: 'Lisa Wong', email: 'lisa.wong@hospital.com', role: 'pharmacist', status: 'active', lastLogin: '2024-01-15 11:00' }
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showAddUser, setShowAddUser] = useState(false);
  const [showCreateRole, setShowCreateRole] = useState(false);
  
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    role: '',
    department: '',
    specialty: '',
    workingHours: ''
  });
  
  const [newRole, setNewRole] = useState({
    name: '',
    permissions: [] as string[]
  });

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter;
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = () => {
    if (newUser.name && newUser.email && newUser.role) {
      const user: User = {
        id: Date.now().toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        department: newUser.department || undefined,
        specialty: newUser.specialty || undefined,
        workingHours: newUser.workingHours || undefined,
        status: 'active',
        lastLogin: 'Never'
      };
      
      setUsers([...users, user]);
      setNewUser({ name: '', email: '', role: '', department: '', specialty: '', workingHours: '' });
      setShowAddUser(false);
    }
  };

  const handleCreateRole = () => {
    if (newRole.name && newRole.permissions.length > 0) {
      const role: Role = {
        id: newRole.name.toLowerCase().replace(/\s+/g, '_'),
        name: newRole.name,
        permissions: newRole.permissions,
        color: 'bg-gray-100 text-gray-800'
      };
      
      setRoles([...roles, role]);
      setNewRole({ name: '', permissions: [] });
      setShowCreateRole(false);
    }
  };

  const handleUserStatusChange = (userId: string, newStatus: User['status']) => {
    setUsers(users.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(users.filter(user => user.id !== userId));
  };

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    if (checked) {
      setNewRole(prev => ({
        ...prev,
        permissions: [...prev.permissions, permissionId]
      }));
    } else {
      setNewRole(prev => ({
        ...prev,
        permissions: prev.permissions.filter(id => id !== permissionId)
      }));
    }
  };

  const getRoleBadge = (roleId: string) => {
    const role = roles.find(r => r.id === roleId);
    return role ? (
      <Badge className={role.color}>{role.name}</Badge>
    ) : (
      <Badge variant="outline">{roleId}</Badge>
    );
  };

  const getStatusBadge = (status: User['status']) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge className="bg-gray-100 text-gray-800">Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-100 text-red-800">Suspended</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Create Role
              </Button>
            </DialogTrigger>
          </Dialog>
          
          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            </DialogTrigger>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search users..."
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
                    {user.department && (
                      <p className="text-xs text-muted-foreground">Department: {user.department}</p>
                    )}
                    {user.specialty && (
                      <p className="text-xs text-muted-foreground">Specialty: {user.specialty}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {getRoleBadge(user.role)}
                  {getStatusBadge(user.status)}
                  
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    {user.status === 'active' ? (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUserStatusChange(user.id, 'inactive')}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    ) : (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleUserStatusChange(user.id, 'active')}
                      >
                        <UserCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New User</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={newUser.name}
                onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                placeholder="Enter full name"
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <Select value={newUser.role} onValueChange={(value) => setNewUser({...newUser, role: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="department">Department (Optional)</Label>
              <Input
                id="department"
                value={newUser.department}
                onChange={(e) => setNewUser({...newUser, department: e.target.value})}
                placeholder="Enter department"
              />
            </div>
            {newUser.role === 'doctor' && (
              <>
                <div>
                  <Label htmlFor="specialty">Specialty</Label>
                  <Input
                    id="specialty"
                    value={newUser.specialty}
                    onChange={(e) => setNewUser({...newUser, specialty: e.target.value})}
                    placeholder="Enter medical specialty"
                  />
                </div>
                <div>
                  <Label htmlFor="workingHours">Working Hours</Label>
                  <Input
                    id="workingHours"
                    value={newUser.workingHours}
                    onChange={(e) => setNewUser({...newUser, workingHours: e.target.value})}
                    placeholder="e.g., 9:00 AM - 5:00 PM"
                  />
                </div>
              </>
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

      {/* Create Role Dialog */}
      <Dialog open={showCreateRole} onOpenChange={setShowCreateRole}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Custom Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="roleName">Role Name</Label>
              <Input
                id="roleName"
                value={newRole.name}
                onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                placeholder="Enter role name"
              />
            </div>
            <div>
              <Label>Permissions</Label>
              <div className="grid grid-cols-2 gap-3 mt-2">
                {permissions.map(permission => (
                  <div key={permission.id} className="flex items-start space-x-2">
                    <Checkbox
                      id={permission.id}
                      checked={newRole.permissions.includes(permission.id)}
                      onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked as boolean)}
                    />
                    <div className="grid gap-1.5 leading-none">
                      <label
                        htmlFor={permission.id}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {permission.name}
                      </label>
                      <p className="text-xs text-muted-foreground">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateRole(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateRole}>
                Create Role
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Roles Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Current Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {roles.map(role => (
              <div key={role.id} className="border rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Badge className={role.color}>{role.name}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {users.filter(u => u.role === role.id).length} users
                  </span>
                </div>
                <div className="space-y-1">
                  {role.permissions.map(permId => {
                    const perm = permissions.find(p => p.id === permId);
                    return perm ? (
                      <div key={permId} className="text-xs text-muted-foreground">
                        • {perm.name}
                      </div>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};