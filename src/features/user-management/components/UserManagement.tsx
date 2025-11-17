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
import { useTranslation } from 'react-i18next';

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
import type { LucideIcon } from 'lucide-react';
import { useUserManagementApi } from '../hooks/useUserManagementApi';
import { Role as ApiRole, RolesResponse, InviteUserRequest } from '../services/userManagementApi';
import { OnboardedUsers } from './OnboardedUsers';
import { InvitedUsers } from './InvitedUsers';
import { InvitationSuccessModal } from './InvitationSuccessModal';
import { useAuthStore } from '@/store/authStore';
import { useMutation } from '@tanstack/react-query';
import { InviteUserResponse } from '../services/userManagementApi';
import { ValidationUtils } from '@/utils/validation';

export const UserManagement: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('onboarded');
  const [invitedUsersScope, setInvitedUsersScope] = useState<'Pending' | 'Accepted' | 'Revoked' | 'ALL'>('ALL');
  
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

  const userTabsConfig: Array<{
    value: 'onboarded' | 'invited';
    title: string;
    helper: string;
    Icon: LucideIcon;
    accent: string;
    indicator: string;
  }> = [
    {
      value: 'onboarded',
      title: t('userManagement.onboardedUsers'),
      helper: t('userManagement.activeUsers'),
      Icon: Users,
      accent: 'from-sky-500 via-indigo-500 to-blue-600',
      indicator: 'bg-sky-500'
    },
    {
      value: 'invited',
      title: t('userManagement.invitedUsers'),
      helper: t('userManagement.pendingInvitations'),
      Icon: Mail,
      accent: 'from-amber-500 via-orange-500 to-pink-500',
      indicator: 'bg-amber-500'
    }
  ];



  const handleAddUser = async () => {
    if (newUser.name && newUser.phone && newUser.selectedRole && currentUserId && hospitalId) {
      const selectedRole = typedRolesResponse?.allRoles.find(r => r.roleId === newUser.selectedRole);
      
      const inviteData: InviteUserRequest = {
        hospitalId: hospitalId,
        roleId: newUser.selectedRole,
        name: newUser.name,
        mobile: ValidationUtils.cleanMobileNumber(newUser.phone),
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

  // Handle view invited users navigation
  const handleViewInvitedUsers = () => {
    setActiveTab('invited');
    setInvitedUsersScope('ALL');
    setShowSuccessModal(false);
  };

  return (
    <div className="min-h-screen w-full p-4 lg:p-6 space-y-6 bg-gradient-subtle">
      <div className="flex flex-col gap-2">
        <h2 className="text-3xl font-bold text-foreground">{t('userManagement.title')}</h2>
        <p className="text-muted-foreground text-sm">{t('userManagement.subtitle')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-transparent p-0">
          {userTabsConfig.map(({ value, title, helper, Icon, accent, indicator }) => {
            const isActive = activeTab === value;
            return (
              <TabsTrigger
                key={value}
                value={value}
                className={`group relative overflow-hidden rounded-2xl border px-4 py-4 text-left transition-all duration-300 focus-visible:ring-2 focus-visible:ring-offset-2 ${
                  isActive
                    ? 'bg-background border-primary/40 shadow-xl shadow-primary/20'
                    : 'bg-white/90 dark:bg-gray-900 border-border hover:border-primary/30 hover:shadow-lg'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-3 rounded-xl transition-all duration-300 ${
                        isActive
                          ? `bg-gradient-to-br ${accent} text-white shadow-lg`
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="font-semibold text-sm">{title}</p>
                      <p className="text-xs text-muted-foreground">{helper}</p>
                    </div>
                  </div>
                  <span
                    className={`text-[11px] font-semibold px-3 py-1 rounded-full transition-colors duration-300 ${
                      isActive
                        ? `${indicator} text-white`
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {isActive ? 'Active' : 'Switch'}
                  </span>
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        <TabsContent value="onboarded" className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-end">
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t('userManagement.inviteUser')}
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>

          <OnboardedUsers />
        </TabsContent>

        <TabsContent value="invited" className="space-y-6">
          {/* Header Actions */}
          <div className="flex justify-end">
            <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Mail className="h-4 w-4" />
                  {t('userManagement.inviteUser')}
                </Button>
              </DialogTrigger>
            </Dialog>
          </div>

          <InvitedUsers initialScope={invitedUsersScope} />
        </TabsContent>
      </Tabs>

      {/* Add User Dialog */}
      <Dialog open={showAddUser} onOpenChange={setShowAddUser}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              {t('userManagement.inviteNewUser')}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('userManagement.fullName')} *</Label>
                <Input
                  id="name"
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  placeholder={t('userManagement.enterFullName')}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">{t('userManagement.phone')} *</Label>
                <Input
                  id="phone"
                  value={newUser.phone}
                  onChange={(e) => setNewUser({...newUser, phone: e.target.value})}
                  placeholder={t('userManagement.enterPhoneNumber')}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">{t('userManagement.email')}</Label>
              <Input
                id="email"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                placeholder={t('userManagement.enterEmailAddress')}
              />
            </div>
            <div className="space-y-3">
              <Label>{t('userManagement.selectRole')} *</Label>
              {rolesLoading ? (
                <div className="p-6 text-center text-muted-foreground border rounded-lg">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  {t('userManagement.loadingRoles')}
                </div>
              ) : rolesError ? (
                <div className="p-6 text-center text-red-600 border border-red-200 rounded-lg">
                  <AlertCircle className="h-6 w-6 mx-auto mb-2" />
                  {t('userManagement.errorLoadingRoles')}
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
                {t('userManagement.cancel')}
              </Button>
              <Button 
                onClick={handleAddUser}
                disabled={!newUser.name || !newUser.phone || !newUser.selectedRole || inviteUser.isPending}
                className="gap-2"
              >
                {inviteUser.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('userManagement.sendingInvitation')}
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    {t('userManagement.sendInvitation')}
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
        onViewInvitedUsers={handleViewInvitedUsers}
        invitedUserName={invitedUserInfo.name}
        invitedUserEmail={invitedUserInfo.email}
        invitedUserRole={invitedUserInfo.role}
      />
    </div>
  );
};