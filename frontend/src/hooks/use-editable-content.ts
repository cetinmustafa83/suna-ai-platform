'use client'; // If used in client components

import { useQuery } from '@tanstack/react-query';
import { getPublicEditableContent, EditableContentResponse } from '@/lib/api-admin'; // Using functions from api-admin for now

interface UseEditableContentOptions {
  enabled?: boolean;
  staleTime?: number;
  cacheTime?: number;
}

export const useEditableContent = (
  pageSlug: string,
  blockKey: string,
  defaultValue: string,
  options?: UseEditableContentOptions
) => {
  const { data, isLoading, error, isError } = useQuery<EditableContentResponse | null, Error>({
    queryKey: ['editableContent', pageSlug, blockKey],
    queryFn: async () => {
      // Do not attempt to fetch if pageSlug or blockKey is falsy, return null to use default.
      if (!pageSlug || !blockKey) {
        console.warn('useEditableContent: pageSlug or blockKey is missing, returning null.');
        return null;
      }
      return getPublicEditableContent(pageSlug, blockKey);
    },
    enabled: options?.enabled !== undefined ? options.enabled : true, // Enabled by default
    staleTime: options?.staleTime || 5 * 60 * 1000, // 5 minutes
    gcTime: options?.cacheTime || 10 * 60 * 1000, // 10 minutes (useQuery v5 uses gcTime)
    refetchOnWindowFocus: false,
    refetchOnMount: true, // Refetch on mount to ensure fresh data if stale
    retry: 1, // Retry once on error
  });

  let contentToDisplay = defaultValue;
  if (isLoading) {
    // Optionally, you could return a specific loading indicator string or state
    // For now, defaultValue is shown during initial load if not handled by Suspense
  } else if (isError) {
    console.error(`Error fetching content for ${pageSlug}/${blockKey}:`, error?.message);
    // Stays with defaultValue
  } else if (data && data.content !== null && data.content !== undefined) {
    contentToDisplay = data.content;
  }

  return {
    content: contentToDisplay,
    isLoading,
    isError,
    error,
    rawData: data, // Expose raw data which includes contentType etc.
  };
};

// Example of a component that could use this hook:
// import React from 'react';
// import { useEditableContent } from './useEditableContent'; // Adjust path as needed

// interface EditableDisplayProps {
//   pageSlug: string;
//   blockKey: string;
//   defaultValue: string;
//   as?: keyof JSX.IntrinsicElements; // e.g., 'p', 'h1', 'div'
//   className?: string;
// }

// export const EditableDisplay: React.FC<EditableDisplayProps> = ({
//   pageSlug,
//   blockKey,
//   defaultValue,
//   as: Component = 'span', // Default to span if 'as' is not provided
//   className,
// }) => {
//   const { content, isLoading, rawData } = useEditableContent(pageSlug, blockKey, defaultValue);

//   if (isLoading) {
//     // Optional: render a specific loading skeleton or just the default content
//     // For simplicity, showing defaultValue or a generic loading text might be enough
//     return <Component className={className}>(loading...)</Component>;
//   }

//   const contentType = rawData?.contentType || 'text';

//   if (contentType === 'html') {
//     return <Component className={className} dangerouslySetInnerHTML={{ __html: content }} />;
//   }
  
//   if (contentType === 'image_url') {
//     if (!content) return null; // Or a placeholder image
//     return <img src={content} alt={blockKey || 'Editable image'} className={className} />;
//   }
  
//   // For 'text' and 'json' (if JSON should be displayed as string or handled differently)
//   return <Component className={className}>{content}</Component>;
// };

import React from 'react'; // Add React import for JSX

// Example of a component that could use this hook:
// Re-enabling and exporting EditableDisplay
interface EditableDisplayProps {
  pageSlug: string;
  blockKey: string;
  defaultValue: string;
  as?: keyof JSX.IntrinsicElements; // e.g., 'p', 'h1', 'div'
  className?: string;
  [key: string]: any; // Allow other props like dangerouslySetInnerHTML
}

export const EditableDisplay: React.FC<EditableDisplayProps> = ({
  pageSlug,
  blockKey,
  defaultValue,
  as: Component = 'span', // Default to span if 'as' is not provided
  className,
  ...rest // Capture rest of the props
}) => {
  const { content, isLoading, rawData } = useEditableContent(pageSlug, blockKey, defaultValue);

  if (isLoading && !content) { // Show defaultValue or loading text only if content isn't available yet
    // To prevent layout shifts, you might want to render the defaultValue with a loading class,
    // or a skeleton of similar size. For now, simple loading text or default.
    return <Component className={className} {...rest}>{defaultValue} (loading...)</Component>;
  }

  const contentType = rawData?.contentType || 'text';
  const finalContent = content || defaultValue; // Fallback to defaultValue if content is null/undefined post-load

  if (contentType === 'html') {
    return <Component className={className} dangerouslySetInnerHTML={{ __html: finalContent }} {...rest} />;
  }
  
  if (contentType === 'image_url') {
    if (!finalContent) return null; // Or a placeholder image
    // Ensure 'as' prop is compatible with <img>, or handle img specifically
    if (Component === 'img') {
        return <img src={finalContent} alt={blockKey || 'Editable image'} className={className} {...rest} />;
    }
    // If 'as' is not img, this might not be appropriate. Consider a warning or different handling.
    return <img src={finalContent} alt={blockKey || 'Editable image'} className={className} />;
  }
  
  // For 'text' and 'json' (if JSON should be displayed as string or handled differently)
  return <Component className={className} {...rest}>{finalContent}</Component>;
};
