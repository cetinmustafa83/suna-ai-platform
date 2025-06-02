'use client';

import React, { useEffect, useState } from 'react';
import *
as LocalAuth from '@/lib/auth';
import { getDatabase } from '@/lib/rxdb/database';
import { RxDocument } from 'rxdb';
// Assuming ConfigDocType is the type derived from your configSchema.
// You might need to define this type properly based on your schema.
// For now, using a generic one.
// import { ConfigDocType } from '@/lib/rxdb/schemas';
interface ConfigDocType {
  id: string;
  enable_team_accounts?: boolean;
  enable_personal_account_billing?: boolean;
  enable_team_account_billing?: boolean;
  billing_provider?: string;
  [key: string]: any; // Allow other properties
}


const AdminSettingsPage = () => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [configDoc, setConfigDoc] = useState<RxDocument<ConfigDocType> | null>(null);
  const [settings, setSettings] = useState<Partial<ConfigDocType>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkAdminAndLoadConfig = async () => {
      setIsLoading(true);
      const user = LocalAuth.getMockUser();
      if (!user?.isAdmin) {
        setError('Access Denied: You are not an admin.');
        setIsAdmin(false);
        setIsLoading(false);
        return;
      }
      setIsAdmin(true);

      try {
        const db = await getDatabase();
        if (!db.config) {
          console.warn("AdminSettings: 'config' collection not found in RxDB.");
          setError("Configuration collection not available.");
          setIsLoading(false);
          return;
        }
        // Fetch the singleton config document (ID 'singleton' as per schema)
        let doc = await db.config.findOne('singleton').exec();
        if (!doc) {
          console.log("AdminSettings: No config document found, creating one with defaults.");
          // Values from configSchema defaults (ensure they match your schema)
          const defaultConfig = {
            id: 'singleton', // Must match primaryKey
            enable_team_accounts: true,
            enable_personal_account_billing: true,
            enable_team_account_billing: true,
            billing_provider: 'stripe',
            // Add other default settings from your configSchema here
          };
          doc = await db.config.insert(defaultConfig);
        }
        setConfigDoc(doc);
        setSettings(doc.toJSON());
      } catch (e: any) {
        console.error("Error loading/creating config:", e);
        setError(`Failed to load settings: ${e.message}`);
      } finally {
        setIsLoading(false);
      }
    };

    checkAdminAndLoadConfig();
  }, []);

  const handleSettingChange = (key: keyof ConfigDocType, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = async () => {
    if (!configDoc) {
      setError("Cannot save settings: config document not loaded.");
      return;
    }
    setIsLoading(true);
    try {
      // We use patch for the existing document.
      // RxDB's atomicUpdate or incrementalModify might be better for complex updates
      // to avoid race conditions if multiple admins could edit, but for a single admin
      // local mock, patch is usually fine.
      // The 'id' should not be in the patch data.
      const { id, ...settingsToSave } = settings;
      await configDoc.patch(settingsToSave);
      alert('Settings saved!');
    } catch (e: any) {
      console.error("Error saving config:", e);
      setError(`Failed to save settings: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div>Loading admin settings...</div>;
  }

  if (error) {
    return <div style={{ color: 'red' }}>Error: {error}</div>;
  }

  if (!isAdmin) {
    // This case is technically handled by the error state above, but as a fallback.
    return <div>Access Denied. You must be an admin to view this page.</div>;
  }

  if (!settings) {
    return <div>No settings document found, and could not create one.</div>
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Admin Settings (Local Mock)</h1>
      <p>Manage application configuration stored in RxDB.</p>
      <br />

      {Object.keys(settings).filter(key => key !== 'id' && key !== '_rev' && !key.startsWith('_')).map(key => {
        const value = settings[key as keyof ConfigDocType];
        if (typeof value === 'boolean') {
          return (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label>
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => handleSettingChange(key as keyof ConfigDocType, e.target.checked)}
                />
                <span style={{ marginLeft: '8px' }}>{key.replace(/_/g, ' ')}</span>
              </label>
            </div>
          );
        }
        if (typeof value === 'string') {
          return (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label htmlFor={key} style={{ display: 'block', marginBottom: '5px' }}>
                {key.replace(/_/g, ' ')}:
              </label>
              <input
                type="text"
                id={key}
                value={value}
                onChange={(e) => handleSettingChange(key as keyof ConfigDocType, e.target.value)}
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '300px' }}
              />
            </div>
          );
        }
        // Add handlers for other types if needed (number, etc.)
        return (
            <div key={key} style={{ marginBottom: '10px' }}>
              <label htmlFor={key} style={{ display: 'block', marginBottom: '5px' }}>
                {key.replace(/_/g, ' ')}:
              </label>
              <input
                type="text"
                id={key}
                value={String(value)}
                disabled
                style={{ padding: '8px', border: '1px solid #ccc', borderRadius: '4px', width: '300px', background: '#f0f0f0' }}
              />
               <small> (Type: {typeof value} - Not editable in this basic UI)</small>
            </div>
        )
      })}

      <button
        onClick={handleSaveSettings}
        disabled={isLoading}
        style={{ padding: '10px 20px', background: 'blue', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
      >
        {isLoading ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
};

export default AdminSettingsPage;
