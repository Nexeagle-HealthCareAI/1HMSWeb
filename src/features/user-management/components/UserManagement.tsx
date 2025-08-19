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
  Mail,
  AlertCircle
} from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { Role as ApiRole, RolesResponse, InviteUserRequest } from '../services/userManagementApi';
import { OnboardedUsers } from './OnboardedUsers';
import { InvitedUsers } from './InvitedUsers';
import { InvitationSuccessModal } from './InvitationSuccessModal';
import { useAuthStore } from '@/store/authStore';
import { useMutation } from '@tanstack/react-query';
import { InviteUserResponse } from '../services/userManagementApi';

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
      const selectedRole = typedRolesResponse?.allRoles.find(r => r.roleId === newUser.selectedRole);
      
      const inviteData: InviteUserRequest = {
        hospitalId: hospitalId,
        roleId: newUser.selectedRole,
        name: newUser.name,
        mobile: newUser.phone,
        email: newUser.email,
        invitedByUserId: currentUserId
      };

      try {
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
        // Error handling is done in the mutation hook
        console.error('Error inviting user:', error);
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
          <h2 className="text-3xl font-bold text-foreground">User Management</h2>
          <p className="text-muted-foreground mt-1">Manage users, roles, permissions and track activities</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        {/* Active Tab Indicator */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${activeTab === 'onboarded' ? 'bg-primary/10 text-primary' : 'bg-primary/10 text-primary'}`}>
              {activeTab === 'onboarded' ? <Users className="h-5 w-5" /> : <Mail className="h-5 w-5" />}
            </div>
            <div>
              <h3 className="text-lg font-semibold">
                {activeTab === 'onboarded' ? 'Onboarded Users' : 'Invited Users'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {activeTab === 'onboarded' 
                  ? 'Manage active users in the system' 
                  : 'Track and manage user invitations'
                }
              </p>
            </div>
          </div>
        </div>

        <TabsList className="grid w-full grid-cols-2 h-auto p-2 bg-muted/30 gap-2">
          <TabsTrigger 
            value="onboarded" 
            className="flex items-center gap-3 py-4 px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-primary/20 data-[state=active]:scale-105 transition-all duration-200 hover:bg-muted/50 rounded-lg"
          >
            <div className={`p-2 rounded-full ${activeTab === 'onboarded' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Users className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Onboarded Users</div>
              <div className="text-xs text-muted-foreground">Active users</div>
            </div>
          </TabsTrigger>
          <TabsTrigger 
            value="invited" 
            className="flex items-center gap-3 py-4 px-6 data-[state=active]:bg-background data-[state=active]:shadow-lg data-[state=active]:border-2 data-[state=active]:border-primary/20 data-[state=active]:scale-105 transition-all duration-200 hover:bg-muted/50 rounded-lg"
          >
            <div className={`p-2 rounded-full ${activeTab === 'invited' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <Mail className="h-5 w-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold">Invited Users</div>
              <div className="text-xs text-muted-foreground">Pending invitations</div>
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="onboarded" className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold">Onboarded Users</h3>
              <p className="text-sm text-muted-foreground mt-1">Users who have completed registration and are active in the system</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Mail className="h-4 w-4" />
                    Invite User
                  </Button>
                </DialogTrigger>
              </Dialog>
            </div>
          </div>

          <OnboardedUsers />
        </TabsContent>

        <TabsContent value="invited" className="space-y-6">
          {/* Header Actions */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h3 className="text-xl font-semibold">Invited Users</h3>
              <p className="text-sm text-muted-foreground mt-1">Users who have been invited but haven't completed registration yet</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
                <DialogTrigger asChild>
                  <Button className="gap-2">
                    <Mail className="h-4 w-4" />
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
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Invite New User
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder="Enter full name"
                  required
                />
              </div>
              <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder="Enter email address"
              />
            </div>
            <div className="space-y-3">
              <Label>Select Role *</Label>
              {rolesLoading ? (
                <div className="p-6 text-center text-muted-foreground border rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  Loading roles...
                </div>
              ) : rolesError ? (
                <div className="p-6 text-center text-red-600 border border-red-200 rounded-lg">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  Error loading roles
                </div>
              ) : (
                <RadioGroup
                  value={newUser.selectedRole}
                  onValueChange={(value) => setNewUser({...newUser, selectedRole: value})}
                  className="space-y-3"
                >
                  <div className="grid grid-cols-2 gap-3">
                    {typedRolesResponse?.allRoles?.map(role => (
                      <div key={role.roleId} className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors">
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
            <div className="flex justify-end gap-3 pt-4">
              <Button variant="outline" onClick={() => setShowAddUser(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.phone || !newUser.selectedRole || inviteUser.isPending}
                className="gap-2"
              >
                {inviteUser.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Send Invitation
                  </>
                )}
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