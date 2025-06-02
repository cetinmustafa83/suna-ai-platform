'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as LocalAuth from '@/lib/auth';
import {
  listPageSEOEntries,
  createPageSEOEntry,
  updatePageSEOBySlug, // Using slug for updates
  deletePageSEOBySlug, // Using slug for deletes
  PageSEOCreate,
  PageSEOUpdate,
  PageSEOResponse,
} from '@/lib/api-admin'; // Assuming you'll add these to api-admin.ts
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

const AdminPageSEOPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentSEOEntry, setCurrentSEOEntry] = useState<PageSEOResponse | null>(null);
  
  // Form state
  const [pageSlug, setPageSlug] = useState('');
  const [title, setTitle] = useState<string | undefined>('');
  const [description, setDescription] = useState<string | undefined>('');
  const [keywords, setKeywords] = useState<string | undefined>('');


  useEffect(() => {
    const user = LocalAuth.getMockUser();
    setIsAdmin(user?.isAdmin || false);
    setIsLoadingAuth(false);
  }, []);

  const { data: seoEntries, isLoading: isLoadingSEO, error: seoError } = useQuery<PageSEOResponse[], Error>({
    queryKey: ['pageSEOEntries'],
    queryFn: listPageSEOEntries,
    enabled: isAdmin, 
  });

  const createMutation = useMutation({
    mutationFn: createPageSEOEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageSEOEntries'] });
      toast.success('SEO entry created successfully!');
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create SEO entry: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ pageSlug, data }: { pageSlug: string; data: PageSEOUpdate }) => updatePageSEOBySlug(pageSlug, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageSEOEntries'] });
      toast.success('SEO entry updated successfully!');
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update SEO entry: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deletePageSEOBySlug,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pageSEOEntries'] });
      toast.success('SEO entry deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete SEO entry: ${error.message}`);
    },
  });

  const handleOpenCreateModal = () => {
    setCurrentSEOEntry(null);
    setPageSlug('');
    setTitle('');
    setDescription('');
    setKeywords('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (entry: PageSEOResponse) => {
    setCurrentSEOEntry(entry);
    setPageSlug(entry.pageSlug);
    setTitle(entry.title || '');
    setDescription(entry.description || '');
    setKeywords(entry.keywords || '');
    setIsModalOpen(true);
  };

  const handleDeleteEntry = (slug: string) => {
    if (window.confirm(`Are you sure you want to delete SEO entry for page slug "${slug}"?`)) {
      deleteMutation.mutate(slug);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const formData: PageSEOCreate | PageSEOUpdate = {
      pageSlug, // pageSlug is part of base for create
      title: title || undefined,
      description: description || undefined,
      keywords: keywords || undefined,
    };

    if (currentSEOEntry) { // Editing
      // For update, pageSlug is used in URL, not in payload typically unless it's also being changed.
      // Prisma schema has pageSlug as @unique, so it's the identifier.
      // The PageSEOUpdate schema doesn't include pageSlug.
      const updateData: PageSEOUpdate = {
        title: title || undefined,
        description: description || undefined,
        keywords: keywords || undefined,
      }
      updateMutation.mutate({ pageSlug: currentSEOEntry.pageSlug, data: updateData });
    } else { // Creating
      if (!pageSlug) {
        toast.error("Page Slug cannot be empty.");
        return;
      }
      createMutation.mutate(formData as PageSEOCreate);
    }
  };
  
  if (isLoadingAuth) {
    return <div className="p-4">Checking admin status...</div>;
  }

  if (!isAdmin) {
    return <div className="p-4 text-red-600">Access Denied: You are not authorized to view this page.</div>;
  }

  if (isLoadingSEO) {
    return <div className="p-4">Loading Page SEO entries...</div>;
  }

  if (seoError) {
    return <div className="p-4 text-red-600">Error loading SEO entries: {seoError.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin - Page SEO Settings</h1>
        <Button onClick={handleOpenCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New SEO Entry
        </Button>
      </header>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentSEOEntry ? 'Edit Page SEO' : 'Create New Page SEO Entry'}</DialogTitle>
            <DialogDescription>
              {currentSEOEntry ? `Editing SEO for: ${currentSEOEntry.pageSlug}` : 'Define SEO settings for a new page slug.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="seo-pageslug">Page Slug</Label>
                <Input 
                  id="seo-pageslug" 
                  value={pageSlug} 
                  onChange={(e) => setPageSlug(e.target.value)} 
                  disabled={!!currentSEOEntry}
                  placeholder="e.g., homepage, /about, /products/cool-widget"
                />
              </div>
              <div>
                <Label htmlFor="seo-title">Title</Label>
                <Input 
                  id="seo-title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Page title (optional)"
                />
              </div>
              <div>
                <Label htmlFor="seo-description">Description</Label>
                <Textarea 
                  id="seo-description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Meta description (optional)"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="seo-keywords">Keywords</Label>
                <Input 
                  id="seo-keywords" 
                  value={keywords} 
                  onChange={(e) => setKeywords(e.target.value)}
                  placeholder="Comma-separated keywords (optional)"
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save SEO Entry'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Page Slug</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Title</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {seoEntries && seoEntries.length > 0 ? (
              seoEntries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{entry.pageSlug}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={entry.title}>{entry.title || '(not set)'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={entry.description}>{entry.description || '(not set)'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(entry)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteEntry(entry.pageSlug)} disabled={deleteMutation.isPending && deleteMutation.variables === entry.pageSlug}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                  No Page SEO entries found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPageSEOPage;
