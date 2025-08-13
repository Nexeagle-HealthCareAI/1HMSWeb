import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Users, 
  UserPlus, 
  Edit2, 
  Trash2, 
  Search,
  Eye,
  Settings,
  FileText,
  Database,
  Calendar,
  DollarSign,
  TestTube,
  Pill,
  Mail
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { Role as ApiRole, RolesResponse, InviteUserRequest } from '../services/userManagementApi';
import { OnboardedUsers } from './OnboardedUsers';
import { InvitedUsers } from './InvitedUsers';
import { InvitationSuccessModal } from './InvitationSuccessModal';
import { useAuthStore } from '@/store/authStore';

export const UserManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState('onboarded');
  
  // API hooks
  const { getAllRoles, inviteUser } = useUserManagementApi();
  const { data: rolesResponse, isLoading: rolesLoading, error: rolesError } = getAllRoles();
  const typedRolesResponse = rolesResponse as RolesResponse | undefined;
  
  // Auth store
  const authStore = useAuthStore.getState();
  const currentUserId = authStore.getUserId();
  const hospitalId = authStore.getHospitalId();
  
  // User management states
  const [showAddUser, setShowAddUser] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [invitedUserInfo, setInvitedUserInfo] = useState({
    name: '',
    email: '',
    role: ''
  });
  
  // Form states
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    selectedRole: '',
    specialty: '',
    workingHours: ''
  });

  const handleAddUser = async () => {
    if (newUser.name && newUser.phone && newUser.selectedRole && currentUserId && hospitalId) {
      try {
        const selectedRole = typedRolesResponse?.allRoles.find(r => r.roleId === newUser.selectedRole);
        
        const inviteData: InviteUserRequest = {
          hospitalId: hospitalId,
          roleId: newUser.selectedRole,
          name: newUser.name,
          mobile: newUser.phone,
          email: newUser.email,
          invitedByUserId: currentUserId
        };

        await inviteUser.mutateAsync(inviteData);
        
        // Set invited user info for success modal
        setInvitedUserInfo({
          name: newUser.name,
          email: newUser.email,
          role: selectedRole?.roleName || newUser.selectedRole
        });
        
        // Reset form and close dialog
        setNewUser({ name: '', email: '', phone: '', selectedRole: '', specialty: '', workingHours: '' });
        setShowAddUser(false);
        
        // Show success modal
        setShowSuccessModal(true);
        
      } catch (error) {
        console.error('Error inviting user:', error);
        // Error handling is done in the mutation hook
      }
    }
  };

  // Get role display name from API roles
  const getRoleDisplayName = (roleId: string) => {
    const apiRole = typedRolesResponse?.allRoles.find(r => r.roleId === roleId);
    return apiRole?.roleName || roleId;
  };

  // Get role color for display
  const getRoleColor = (roleName: string) => {
    switch (roleName.toLowerCase()) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'admindoctor':
        return 'bg-purple-100 text-purple-800';
      case 'doctor':
        return 'bg-blue-100 text-blue-800';
      case 'nurse':
        return 'bg-green-100 text-green-800';
      case 'receptionist':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground">Manage users, roles, permissions and track activities</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="onboarded">Onboarded Users</TabsTrigger>
          <TabsTrigger value="invited">Invited Users</TabsTrigger>
        </TabsList>

        <TabsContent value="onboarded" className="space-y-4">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Onboarded Users</h3>
              <p className="text-sm text-muted-foreground">Users who have completed registration and are active in the system</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          <OnboardedUsers />
        </TabsContent>

        <TabsContent value="invited" className="space-y-4">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-lg font-semibold">Invited Users</h3>
              <p className="text-sm text-muted-foreground">Users who have been invited but haven't completed registration yet</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button>
                    <Mail className="h-4 w-4 mr-2" />
                    Invite User
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          <InvitedUsers />
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Invite New User</DialogTitle>
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
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder="Enter phone number"
                  required
                />
              </div>
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
              <Label>Select Role *</Label>
              {rolesLoading ? (
                <div className="p-4 text-center text-muted-foreground">Loading roles...</div>
              ) : rolesError ? (
                <div className="p-4 text-center text-red-600">Error loading roles</div>
              ) : (
                <RadioGroup
                  value={newUser.selectedRole}
                  onValueChange={(value) => setNewUser({...newUser, selectedRole: value})}
                  className="mt-2"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {typedRolesResponse?.allRoles?.map(role => (
                      <div key={role.roleId} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                        <RadioGroupItem value={role.roleId} id={role.roleId} />
                        <Label htmlFor={role.roleId} className="flex items-center gap-2 cursor-pointer flex-1">
                          <Badge className={getRoleColor(role.roleName)}>{role.roleName}</Badge>
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.phone || !newUser.selectedRole || inviteUser.isPending}
              >
                {inviteUser.isPending ? 'Sending Invitation...' : 'Send Invitation'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Success Modal */}
      <InvitationSuccessModal
        isOpen={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
        invitedUserName={invitedUserInfo.name}
        invitedUserEmail={invitedUserInfo.email}
        invitedUserRole={invitedUserInfo.role}
      />
    </div>
  );
};