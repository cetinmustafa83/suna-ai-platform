'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as LocalAuth from '@/lib/auth';
import {
  listSiteSettings,
  createSiteSetting,
  updateSiteSetting,
  deleteSiteSetting,
  SiteSettingCreate,
  SiteSettingUpdate,
  SiteSettingResponse,
} from '@/lib/api-admin'; // Using the new admin API client
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Trash2, Edit, PlusCircle } from 'lucide-react';

const AdminSiteSettingsPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSetting, setCurrentSetting] = useState<SiteSettingResponse | null>(null);
  const [editKey, setEditKey] = useState(''); // For key (cannot be changed on edit)
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    const user = LocalAuth.getMockUser();
    setIsAdmin(user?.isAdmin || false);
    setIsLoadingAuth(false);
  }, []);

  const { data: settings, isLoading: isLoadingSettings, error: settingsError } = useQuery<SiteSettingResponse[], Error>({
    queryKey: ['siteSettings'],
    queryFn: listSiteSettings,
    enabled: isAdmin, // Only fetch if user is admin
  });

  const createMutation = useMutation({
    mutationFn: createSiteSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success('Setting created successfully!');
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create setting: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ key, data }: { key: string; data: SiteSettingUpdate }) => updateSiteSetting(key, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success('Setting updated successfully!');
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update setting: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSiteSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['siteSettings'] });
      toast.success('Setting deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete setting: ${error.message}`);
    },
  });

  const handleOpenCreateModal = () => {
    setCurrentSetting(null);
    setEditKey('');
    setEditValue('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (setting: SiteSettingResponse) => {
    setCurrentSetting(setting);
    setEditKey(setting.key);
    setEditValue(setting.value || '');
    setIsModalOpen(true);
  };

  const handleDeleteSetting = (key: string) => {
    if (window.confirm(`Are you sure you want to delete setting "${key}"?`)) {
      deleteMutation.mutate(key);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentSetting) { // Editing existing setting
      updateMutation.mutate({ key: currentSetting.key, data: { value: editValue } });
    } else { // Creating new setting
      if (!editKey) {
        toast.error("Setting key cannot be empty.");
        return;
      }
      createMutation.mutate({ key: editKey, value: editValue });
    }
  };
  
  if (isLoadingAuth) {
    return <div className="p-4">Checking admin status...</div>;
  }

  if (!isAdmin) {
    return <div className="p-4 text-red-600">Access Denied: You are not authorized to view this page.</div>;
  }

  if (isLoadingSettings) {
    return <div className="p-4">Loading settings...</div>;
  }

  if (settingsError) {
    return <div className="p-4 text-red-600">Error loading settings: {settingsError.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Admin - Global Site Configuration</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage global key-value settings for the application. These settings can be used to control various aspects of the site.
          </p>
        </div>
        <Button onClick={handleOpenCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Setting
        </Button>
      </header>

      <div className="mb-6 p-4 border rounded-lg bg-secondary/30">
        <h2 className="text-lg font-semibold mb-2">Common Setting Keys</h2>
        <p className="text-sm text-muted-foreground">
          Consider using consistent keys for common configurations. Examples:
        </p>
        <ul className="list-disc list-inside text-sm text-muted-foreground mt-1 space-y-1">
          <li><code>site_title</code>: The main title of the website.</li>
          <li><code>site_description</code>: A brief description for SEO and metadata.</li>
          <li><code>logo_url</code>: URL for the site logo.</li>
          <li><code>contact_email</code>: Public contact email address.</li>
          <li><code>maintenance_mode</code>: (true/false) Enable or disable site maintenance mode.</li>
          <li><code>social_media_links_json</code>: JSON string for social media links, e.g., <code>{"twitter": "url", "linkedin": "url"}</code>.</li>
        </ul>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentSetting ? 'Edit Site Setting' : 'Create New Site Setting'}</DialogTitle>
            <DialogDescription>
              {currentSetting ? `Editing setting: ${currentSetting.key}` : 'Enter details for the new site setting.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="setting-key">Key</Label>
                <Input 
                  id="setting-key" 
                  value={editKey} 
                  onChange={(e) => setEditKey(e.target.value)} 
                  disabled={!!currentSetting} // Key is not editable for existing settings
                  placeholder="e.g., site_name, contact_email"
                />
              </div>
              <div>
                <Label htmlFor="setting-value">Value</Label>
                <Input 
                  id="setting-value" 
                  value={editValue} 
                  onChange={(e) => setEditValue(e.target.value)}
                  placeholder="Setting value (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Setting'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Value</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {settings && settings.length > 0 ? (
              settings.map((setting) => (
                <tr key={setting.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{setting.key}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{setting.value || '(empty)'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(setting)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteSetting(setting.key)} disabled={deleteMutation.isPending && deleteMutation.variables === setting.key}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                  No site settings found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminSiteSettingsPage;
