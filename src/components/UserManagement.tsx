import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  Mail,
  Search,
  Filter,
  MoreVertical,
  Eye,
  EyeOff,
  Calendar,
  Activity
} from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { Switch } from './ui/switch';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

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
  isCustom: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  status: 'active' | 'inactive' | 'suspended';
  lastLogin?: Date;
  createdAt: Date;
  avatar?: string;
}

const permissions: Permission[] = [
  { id: 'dashboard', name: 'Dashboard', description: 'View dashboard and analytics' },
  { id: 'appointments', name: 'Appointments', description: 'Manage patient appointments' },
  { id: 'patients', name: 'Patients', description: 'View and manage patient records' },
  { id: 'billing', name: 'Billing', description: 'Generate and manage bills' },
  { id: 'prescriptions', name: 'Prescriptions', description: 'Create and manage prescriptions' },
  { id: 'lab', name: 'Lab Management', description: 'Manage lab tests and results' },
  { id: 'pharmacy', name: 'Pharmacy', description: 'View prescriptions and medications' },
  { id: 'chat', name: 'Internal Chat', description: 'Access internal communication' },
  { id: 'bulk-messaging', name: 'Bulk Messaging', description: 'Send bulk SMS/WhatsApp messages' },
  { id: 'user-management', name: 'User Management', description: 'Manage users and permissions' },
  { id: 'reports', name: 'Reports', description: 'Generate and view reports' }
];

const defaultRoles: Role[] = [
  {
    id: 'admin',
    name: 'Admin (Doctor)',
    permissions: permissions.map(p => p.id),
    color: 'bg-red-500',
    isCustom: false
  },
  {
    id: 'receptionist',
    name: 'Receptionist',
    permissions: ['dashboard', 'appointments', 'patients', 'chat'],
    color: 'bg-blue-500',
    isCustom: false
  },
  {
    id: 'lab-tech',
    name: 'Lab Technician',
    permissions: ['dashboard', 'lab', 'patients', 'chat'],
    color: 'bg-green-500',
    isCustom: false
  },
  {
    id: 'pharmacist',
    name: 'Pharmacist',
    permissions: ['dashboard', 'prescriptions', 'pharmacy', 'patients', 'chat'],
    color: 'bg-purple-500',
    isCustom: false
  }
];

const sampleUsers: User[] = [
  {
    id: '1',
    name: 'Dr. Sarah Johnson',
    email: 'sarah.johnson@hospital.com',
    phone: '+91-9876543210',
    roleId: 'admin',
    status: 'active',
    lastLogin: new Date('2024-01-15T09:30:00'),
    createdAt: new Date('2023-06-01')
  },
  {
    id: '2',
    name: 'Emily Reception',
    email: 'emily@hospital.com',
    phone: '+91-9876543211',
    roleId: 'receptionist',
    status: 'active',
    lastLogin: new Date('2024-01-15T10:15:00'),
    createdAt: new Date('2023-08-15')
  },
  {
    id: '3',
    name: 'John Lab',
    email: 'john.lab@hospital.com',
    phone: '+91-9876543212',
    roleId: 'lab-tech',
    status: 'inactive',
    createdAt: new Date('2023-09-01')
  },
  {
    id: '4',
    name: 'Maria Pharmacy',
    email: 'maria@hospital.com',
    phone: '+91-9876543213',
    roleId: 'pharmacist',
    status: 'active',
    lastLogin: new Date('2024-01-14T16:20:00'),
    createdAt: new Date('2023-10-10')
  }
];

export const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>(sampleUsers);
  const [roles, setRoles] = useState<Role[]>(defaultRoles);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showEditRole, setShowEditRole] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const { toast } = useToast();

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    roleId: '',
    sendInvite: true
  });

  const [newRole, setNewRole] = useState({
    name: '',
    permissions: [] as string[]
  });

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.roleId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    const user: User = {
      id: (users.length + 1).toString(),
      name: newUser.name,
      email: newUser.email,
      phone: newUser.phone,
      roleId: newUser.roleId,
      status: 'active',
      createdAt: new Date()
    };

    setUsers(prev => [...prev, user]);
    setNewUser({ name: '', email: '', phone: '', roleId: '', sendInvite: true });
    setShowAddUser(false);

    toast({
      title: "User Added",
      description: `${user.name} has been added successfully.${newUser.sendInvite ? ' Invitation email sent.' : ''}`,
    });
  };

  const handleCreateRole = () => {
    if (!newRole.name || newRole.permissions.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please provide role name and select at least one permission.",
        variant: "destructive"
      });
      return;
    }

    const role: Role = {
      id: `custom-${roles.length + 1}`,
      name: newRole.name,
      permissions: newRole.permissions,
      color: 'bg-gray-500',
      isCustom: true
    };

    setRoles(prev => [...prev, role]);
    setNewRole({ name: '', permissions: [] });
    setShowEditRole(false);

    toast({
      title: "Role Created",
      description: `Role "${role.name}" has been created successfully.`,
    });
  };

  const handleUserStatusChange = (userId: string, newStatus: User['status']) => {
    setUsers(prev => prev.map(user => 
      user.id === userId ? { ...user, status: newStatus } : user
    ));

    toast({
      title: "User Updated",
      description: `User status changed to ${newStatus}.`,
    });
  };

  const handleDeleteUser = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
    toast({
      title: "User Deleted",
      description: "User has been removed from the system.",
    });
  };

  const getRoleById = (roleId: string) => {
    return roles.find(role => role.id === roleId);
  };

  const getStatusBadge = (status: User['status']) => {
    const variants = {
      active: 'default',
      inactive: 'secondary',
      suspended: 'destructive'
    };
    return <Badge variant={variants[status] as any}>{status.toUpperCase()}</Badge>;
  };

  const formatLastLogin = (date?: Date) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    return 'Just now';
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'all' || user.roleId === filterRole;
    const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesRole && matchesStatus;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-muted-foreground">Manage users, roles, and permissions</p>
        </div>
        
        <div className="flex gap-2">
          <Dialog open={showEditRole} onOpenChange={setShowEditRole}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Shield className="h-4 w-4" />
                Create Role
              </Button>
            </DialogTrigger>
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
                    onChange={(e) => setNewRole(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter role name"
                  />
                </div>
                
                <div>
                  <Label>Permissions</Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                    {permissions.map((permission) => (
                      <div key={permission.id} className="flex items-start gap-2">
                        <Checkbox
                          checked={newRole.permissions.includes(permission.id)}
                          onCheckedChange={(checked) => handlePermissionToggle(permission.id, checked as boolean)}
                        />
                        <div className="flex-1">
                          <Label className="font-medium">{permission.name}</Label>
                          <p className="text-xs text-muted-foreground">{permission.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleCreateRole} className="flex-1">Create Role</Button>
                  <Button variant="outline" onClick={() => setShowEditRole(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add User
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New User</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="userName">Full Name</Label>
                  <Input
                    id="userName"
                    value={newUser.name}
                    onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter full name"
                  />
                </div>
                
                <div>
                  <Label htmlFor="userEmail">Email</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <Label htmlFor="userPhone">Phone</Label>
                  <Input
                    id="userPhone"
                    value={newUser.phone}
                    onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Enter phone number"
                  />
                </div>

                <div>
                  <Label htmlFor="userRole">Role</Label>
                  <Select value={newUser.roleId} onValueChange={(value) => setNewUser(prev => ({ ...prev, roleId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={newUser.sendInvite}
                    onCheckedChange={(checked) => setNewUser(prev => ({ ...prev, sendInvite: checked }))}
                  />
                  <Label>Send invitation email</Label>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleAddUser} className="flex-1">Add User</Button>
                  <Button variant="outline" onClick={() => setShowAddUser(false)} className="flex-1">Cancel</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            {roles.map((role) => (
              <SelectItem key={role.id} value={role.id}>{role.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-36">
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

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Users ({filteredUsers.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-semibold">User</th>
                  <th className="text-left py-3 px-4 font-semibold">Role</th>
                  <th className="text-left py-3 px-4 font-semibold">Status</th>
                  <th className="text-left py-3 px-4 font-semibold">Last Login</th>
                  <th className="text-left py-3 px-4 font-semibold">Created</th>
                  <th className="text-left py-3 px-4 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const role = getRoleById(user.roleId);
                  return (
                    <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={user.avatar} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-medium">{user.name}</h4>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${role?.color}`}></div>
                          <span>{role?.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(user.status)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{formatLastLogin(user.lastLogin)}</td>
                      <td className="py-3 px-4 text-muted-foreground">{user.createdAt.toLocaleDateString()}</td>
                      <td className="py-3 px-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="ghost">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleUserStatusChange(user.id, user.status === 'active' ? 'inactive' : 'active')}
                            >
                              {user.status === 'active' ? (
                                <>
                                  <EyeOff className="mr-2 h-4 w-4" />
                                  Deactivate
                                </>
                              ) : (
                                <>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Activate
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteUser(user.id)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-4">
            {filteredUsers.map((user) => {
              const role = getRoleById(user.roleId);
              return (
                <Card key={user.id} className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={user.avatar} />
                        <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <h4 className="font-medium">{user.name}</h4>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="ghost">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem>Edit User</DropdownMenuItem>
                        <DropdownMenuItem>Change Status</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Role:</span>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${role?.color}`}></div>
                        <span>{role?.name}</span>
                      </div>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      {getStatusBadge(user.status)}
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last Login:</span>
                      <span>{formatLastLogin(user.lastLogin)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{user.createdAt.toLocaleDateString()}</span>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Roles Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Roles & Permissions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roles.map((role) => {
              const userCount = users.filter(user => user.roleId === role.id).length;
              return (
                <div key={role.id} className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`w-4 h-4 rounded-full ${role.color}`}></div>
                    <h4 className="font-medium">{role.name}</h4>
                    {role.isCustom && <Badge variant="secondary" className="text-xs">Custom</Badge>}
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {userCount} user{userCount !== 1 ? 's' : ''}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};