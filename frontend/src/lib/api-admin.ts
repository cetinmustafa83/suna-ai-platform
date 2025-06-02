import { apiClient, ApiResponse } from './api-client'; // Assuming apiClient is set up for authenticated requests

// Define types based on Pydantic schemas in backend/schemas/admin_schemas.py
// These should ideally be shared or generated from the backend schema.

export interface SiteSettingBase {
  key: string;
  value?: string | null;
}

export interface SiteSettingCreate extends SiteSettingBase {}

export interface SiteSettingUpdate {
  value?: string | null;
}

export interface SiteSettingResponse extends SiteSettingBase {
  id: string;
  createdAt: string; // Assuming string representation of datetime
  updatedAt: string; // Assuming string representation of datetime
}

const adminApiPrefix = '/admin/site-settings';

export async function listSiteSettings(): Promise<SiteSettingResponse[]> {
  const response: ApiResponse<SiteSettingResponse[]> = await apiClient.get(
    `${adminApiPrefix}/`
  );
  if (!response.success || !response.data) {
    throw response.error || new Error('Failed to list site settings');
  }
  return response.data;
}

export async function getSiteSetting(key: string): Promise<SiteSettingResponse> {
  const response: ApiResponse<SiteSettingResponse> = await apiClient.get(
    `${adminApiPrefix}/${key}`
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to get site setting: ${key}`);
  }
  return response.data;
}

export async function createSiteSetting(data: SiteSettingCreate): Promise<SiteSettingResponse> {
  const response: ApiResponse<SiteSettingResponse> = await apiClient.post(
    `${adminApiPrefix}/`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error('Failed to create site setting');
  }
  return response.data;
}

export async function updateSiteSetting(key: string, data: SiteSettingUpdate): Promise<SiteSettingResponse> {
  const response: ApiResponse<SiteSettingResponse> = await apiClient.put(
    `${adminApiPrefix}/${key}`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to update site setting: ${key}`);
  }
  return response.data;
}

export async function deleteSiteSetting(key: string): Promise<void> {
  const response: ApiResponse<void> = await apiClient.delete(
    `${adminApiPrefix}/${key}`
  );
  if (!response.success) {
    throw response.error || new Error(`Failed to delete site setting: ${key}`);
  }
  // No data expected on successful delete with 204 No Content
}

// --- EditableContent ---

export interface EditableContentBase {
  pageSlug: string;
  blockKey: string;
  content: string;
  contentType?: string; // Should match Pydantic default "text"
}

export interface EditableContentCreate extends EditableContentBase {}

export interface EditableContentUpdate {
  content?: string;
  contentType?: string;
}

export interface EditableContentResponse extends EditableContentBase {
  id: string;
  createdAt: string; // Assuming string representation of datetime
  updatedAt: string; // Assuming string representation of datetime
}

const editableContentApiPrefix = '/admin/editable-content';

export async function listEditableContents(pageSlug?: string): Promise<EditableContentResponse[]> {
  let url = `${editableContentApiPrefix}/`;
  if (pageSlug) {
    url += `?pageSlug=${encodeURIComponent(pageSlug)}`;
  }
  const response: ApiResponse<EditableContentResponse[]> = await apiClient.get(url);
  if (!response.success || !response.data) {
    throw response.error || new Error('Failed to list editable contents');
  }
  return response.data;
}

export async function getEditableContentById(id: string): Promise<EditableContentResponse> {
  const response: ApiResponse<EditableContentResponse> = await apiClient.get(
    `${editableContentApiPrefix}/id/${id}`
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to get editable content by ID: ${id}`);
  }
  return response.data;
}

export async function getEditableContentByKey(pageSlug: string, blockKey: string): Promise<EditableContentResponse> {
  const response: ApiResponse<EditableContentResponse> = await apiClient.get(
    `${editableContentApiPrefix}/key/${encodeURIComponent(pageSlug)}/${encodeURIComponent(blockKey)}`
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to get editable content by key: ${pageSlug}/${blockKey}`);
  }
  return response.data;
}

export async function createEditableContent(data: EditableContentCreate): Promise<EditableContentResponse> {
  const response: ApiResponse<EditableContentResponse> = await apiClient.post(
    `${editableContentApiPrefix}/`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error('Failed to create editable content');
  }
  return response.data;
}

export async function updateEditableContentById(id: string, data: EditableContentUpdate): Promise<EditableContentResponse> {
  const response: ApiResponse<EditableContentResponse> = await apiClient.put(
    `${editableContentApiPrefix}/id/${id}`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to update editable content by ID: ${id}`);
  }
  return response.data;
}

export async function updateEditableContentByKey(pageSlug: string, blockKey: string, data: EditableContentUpdate): Promise<EditableContentResponse> {
  const response: ApiResponse<EditableContentResponse> = await apiClient.put(
    `${editableContentApiPrefix}/key/${encodeURIComponent(pageSlug)}/${encodeURIComponent(blockKey)}`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to update editable content by key: ${pageSlug}/${blockKey}`);
  }
  return response.data;
}

export async function deleteEditableContentById(id: string): Promise<void> {
  const response: ApiResponse<void> = await apiClient.delete(
    `${editableContentApiPrefix}/id/${id}`
  );
  if (!response.success) {
    throw response.error || new Error(`Failed to delete editable content by ID: ${id}`);
  }
}

export async function deleteEditableContentByKey(pageSlug: string, blockKey: string): Promise<void> {
  const response: ApiResponse<void> = await apiClient.delete(
    `${editableContentApiPrefix}/key/${encodeURIComponent(pageSlug)}/${encodeURIComponent(blockKey)}`
  );
  if (!response.success) {
    throw response.error || new Error(`Failed to delete editable content by key: ${pageSlug}/${blockKey}`);
  }
}

// --- Public Getters for EditableContent (using existing admin GET endpoints for now) ---
// These are intended for use by public-facing components.
// Assumption: Admin GET endpoints are usable for now, or will have public equivalents.

export async function getPublicEditableContent(pageSlug: string, blockKey: string): Promise<EditableContentResponse | null> {
  try {
    const response: ApiResponse<EditableContentResponse> = await apiClient.get(
      `${editableContentApiPrefix}/public/key/${encodeURIComponent(pageSlug)}/${encodeURIComponent(blockKey)}` // Added /public
    );
    if (!response.success || !response.data) {
      // For public fetching, we might not want to throw an error if content is simply not found,
      // but rather return null so the component can use a default.
      console.warn(`Failed to get public editable content for ${pageSlug}/${blockKey}:`, response.error?.message);
      return null;
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching public editable content for ${pageSlug}/${blockKey}:`, error);
    return null; // Return null on outright error as well for graceful fallback
  }
}

export async function getPublicEditableContentsByPage(pageSlug: string): Promise<EditableContentResponse[]> {
  try {
    // The admin endpoint for listing by pageSlug was GET /admin/editable-content/?pageSlug=...
    // The new public one is GET /admin/editable-content/public/page/{pageSlug}
    let url = `${editableContentApiPrefix}/public/page/${encodeURIComponent(pageSlug)}`;
    const response: ApiResponse<EditableContentResponse[]> = await apiClient.get(url);
    if (!response.success || !response.data) {
      console.warn(`Failed to list public editable contents for page ${pageSlug}:`, response.error?.message);
      return []; // Return empty array if page has no content or error
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching public editable contents for page ${pageSlug}:`, error);
    return [];
  }
}


// --- PageSEO ---

export interface PageSEOBase {
  pageSlug: string;
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
}

export interface PageSEOCreate extends PageSEOBase {}

export interface PageSEOUpdate {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
}

export interface PageSEOResponse extends PageSEOBase {
  id: string;
  createdAt: string; // Assuming string representation of datetime
  updatedAt: string; // Assuming string representation of datetime
}

const pageSEOApiPrefix = '/admin/page-seo';

export async function listPageSEOEntries(): Promise<PageSEOResponse[]> {
  const response: ApiResponse<PageSEOResponse[]> = await apiClient.get(
    `${pageSEOApiPrefix}/`
  );
  if (!response.success || !response.data) {
    throw response.error || new Error('Failed to list PageSEO entries');
  }
  return response.data;
}

export async function getPageSEOBySlug(pageSlug: string): Promise<PageSEOResponse> {
  const response: ApiResponse<PageSEOResponse> = await apiClient.get(
    `${pageSEOApiPrefix}/${encodeURIComponent(pageSlug)}`
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to get PageSEO entry: ${pageSlug}`);
  }
  return response.data;
}

export async function createPageSEOEntry(data: PageSEOCreate): Promise<PageSEOResponse> {
  const response: ApiResponse<PageSEOResponse> = await apiClient.post(
    `${pageSEOApiPrefix}/`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error('Failed to create PageSEO entry');
  }
  return response.data;
}

export async function updatePageSEOBySlug(pageSlug: string, data: PageSEOUpdate): Promise<PageSEOResponse> {
  const response: ApiResponse<PageSEOResponse> = await apiClient.put(
    `${pageSEOApiPrefix}/${encodeURIComponent(pageSlug)}`,
    data
  );
  if (!response.success || !response.data) {
    throw response.error || new Error(`Failed to update PageSEO entry: ${pageSlug}`);
  }
  return response.data;
}

export async function deletePageSEOBySlug(pageSlug: string): Promise<void> {
  const response: ApiResponse<void> = await apiClient.delete(
    `${pageSEOApiPrefix}/${encodeURIComponent(pageSlug)}`
  );
  if (!response.success) {
    throw response.error || new Error(`Failed to delete PageSEO entry: ${pageSlug}`);
  }
}

// --- Public Getters for PageSEO (using existing admin GET endpoints for now) ---
export async function getPublicPageSEO(pageSlug: string): Promise<PageSEOResponse | null> {
  try {
    const response: ApiResponse<PageSEOResponse> = await apiClient.get(
      `${pageSEOApiPrefix}/public/${encodeURIComponent(pageSlug)}` // Added /public
    );
    if (!response.success || !response.data) {
      // For public fetching, return null if not found, allowing fallback to defaults.
      console.warn(`Failed to get public PageSEO for slug "${pageSlug}":`, response.error?.message);
      return null;
    }
    return response.data;
  } catch (error) {
    console.error(`Error fetching public PageSEO for slug "${pageSlug}":`, error);
    return null; // Return null on outright error for graceful fallback
  }
}
