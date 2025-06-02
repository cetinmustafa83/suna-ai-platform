'use client';

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as LocalAuth from '@/lib/auth';
import {
  listEditableContents,
  createEditableContent,
  updateEditableContentById, // Using ID for updates primarily
  deleteEditableContentById, // Using ID for deletes primarily
  // getEditableContentByKey, // Can be used for specific fetch if needed
  // updateEditableContentByKey,
  // deleteEditableContentByKey,
  EditableContentCreate,
  EditableContentUpdate,
  EditableContentResponse,
} from '@/lib/api-admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Trash2, Edit, PlusCircle, Filter } from 'lucide-react';

const AdminEditableContentPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  
  const queryClient = useQueryClient();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentContent, setCurrentContent] = useState<EditableContentResponse | null>(null);
  
  // Form state
  const [pageSlug, setPageSlug] = useState('');
  const [blockKey, setBlockKey] = useState('');
  const [content, setContent] = useState('');
  const [contentType, setContentType] = useState('text');

  // Filter state
  const [filterPageSlug, setFilterPageSlug] = useState('');

  useEffect(() => {
    const user = LocalAuth.getMockUser();
    setIsAdmin(user?.isAdmin || false);
    setIsLoadingAuth(false);
  }, []);

  const { data: contents, isLoading: isLoadingContents, error: contentsError } = useQuery<EditableContentResponse[], Error>({
    queryKey: ['editableContents', filterPageSlug], // Include filter in queryKey
    queryFn: () => listEditableContents(filterPageSlug || undefined),
    enabled: isAdmin, 
  });

  const createMutation = useMutation({
    mutationFn: createEditableContent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editableContents'] });
      toast.success('Content block created successfully!');
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to create content block: ${error.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: EditableContentUpdate }) => updateEditableContentById(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editableContents'] });
      toast.success('Content block updated successfully!');
      setIsModalOpen(false);
    },
    onError: (error: Error) => {
      toast.error(`Failed to update content block: ${error.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteEditableContentById, // Using by ID for simplicity here
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['editableContents'] });
      toast.success('Content block deleted successfully!');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete content block: ${error.message}`);
    },
  });

  const handleOpenCreateModal = () => {
    setCurrentContent(null);
    setPageSlug('');
    setBlockKey('');
    setContent('');
    setContentType('text');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item: EditableContentResponse) => {
    setCurrentContent(item);
    setPageSlug(item.pageSlug);
    setBlockKey(item.blockKey);
    setContent(item.content);
    setContentType(item.contentType || 'text');
    setIsModalOpen(true);
  };

  const handleDeleteContent = (item: EditableContentResponse) => {
    if (window.confirm(`Are you sure you want to delete content block "${item.pageSlug}/${item.blockKey}"?`)) {
      deleteMutation.mutate(item.id);
    }
  };

  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const formData: EditableContentCreate | EditableContentUpdate = {
      pageSlug,
      blockKey,
      content,
      contentType,
    };

    if (currentContent) { // Editing
      // For update, we only send fields that can be changed.
      // pageSlug and blockKey are part of the identifier for updateByKey, or not sent for updateById.
      const updateData: EditableContentUpdate = { content, contentType };
      updateMutation.mutate({ id: currentContent.id, data: updateData });
    } else { // Creating
      if (!pageSlug || !blockKey) {
        toast.error("Page Slug and Block Key cannot be empty.");
        return;
      }
      createMutation.mutate(formData as EditableContentCreate);
    }
  };
  
  if (isLoadingAuth) {
    return <div className="p-4">Checking admin status...</div>;
  }

  if (!isAdmin) {
    return <div className="p-4 text-red-600">Access Denied: You are not authorized to view this page.</div>;
  }

  if (isLoadingContents) {
    return <div className="p-4">Loading editable content...</div>;
  }

  if (contentsError) {
    return <div className="p-4 text-red-600">Error loading content: {contentsError.message}</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <header className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold mb-4 sm:mb-0">Admin - Editable Content</h1>
        <Button onClick={handleOpenCreateModal}>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Content Block
        </Button>
      </header>

      <div className="mb-4 flex items-center gap-2">
        <Label htmlFor="filter-pageslug">Filter by Page Slug:</Label>
        <Input 
          id="filter-pageslug"
          type="text"
          value={filterPageSlug}
          onChange={(e) => setFilterPageSlug(e.target.value)}
          placeholder="e.g., homepage"
          className="max-w-xs"
        />
        {/* Refresh button might not be strictly necessary if queryKey includes filterPageSlug */}
        {/* <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['editableContents', filterPageSlug] })} size="sm"><Filter className="mr-2 h-4 w-4"/>Apply Filter</Button> */}
      </div>


      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{currentContent ? 'Edit Content Block' : 'Create New Content Block'}</DialogTitle>
            <DialogDescription>
              {currentContent ? `Editing: ${currentContent.pageSlug} / ${currentContent.blockKey}` : 'Define a new editable content block.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitForm}>
            <div className="grid gap-4 py-4">
              <div>
                <Label htmlFor="ec-pageslug">Page Slug</Label>
                <Input 
                  id="ec-pageslug" 
                  value={pageSlug} 
                  onChange={(e) => setPageSlug(e.target.value)} 
                  disabled={!!currentContent}
                  placeholder="e.g., homepage, about_us"
                />
              </div>
              <div>
                <Label htmlFor="ec-blockkey">Block Key</Label>
                <Input 
                  id="ec-blockkey" 
                  value={blockKey} 
                  onChange={(e) => setBlockKey(e.target.value)}
                  disabled={!!currentContent}
                  placeholder="e.g., hero_title, footer_copyright"
                />
              </div>
              <div>
                <Label htmlFor="ec-contenttype">Content Type</Label>
                <Select value={contentType} onValueChange={setContentType}>
                  <SelectTrigger id="ec-contenttype">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Text</SelectItem>
                    <SelectItem value="html">HTML</SelectItem>
                    <SelectItem value="image_url">Image URL</SelectItem>
                    <SelectItem value="json">JSON</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="ec-content">Content</Label>
                <Textarea 
                  id="ec-content" 
                  value={content} 
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Enter content here (text, HTML, URL, or JSON string)"
                  rows={contentType === 'json' || contentType === 'html' ? 10 : 3}
                />
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">Cancel</Button>
              </DialogClose>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {(createMutation.isPending || updateMutation.isPending) ? 'Saving...' : 'Save Content Block'}
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Block Key</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Content (Snippet)</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
            {contents && contents.length > 0 ? (
              contents.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{item.pageSlug}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.blockKey}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{item.contentType}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 max-w-xs truncate" title={item.content}>
                    {item.content.substring(0, 50)}{item.content.length > 50 ? '...' : ''}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <Button variant="outline" size="sm" onClick={() => handleOpenEditModal(item)}>
                      <Edit className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteContent(item)} disabled={deleteMutation.isPending && deleteMutation.variables === item.id}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-300">
                  No editable content blocks found. {filterPageSlug && `For page slug: "${filterPageSlug}".`}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminEditableContentPage;
