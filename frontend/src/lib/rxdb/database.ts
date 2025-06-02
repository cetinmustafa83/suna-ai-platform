import { createRxDatabase, addRxPlugin, RxDatabase } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';
import { RxDBDevModePlugin } from 'rxdb/plugins/dev-mode'; // Optional: for development
import {
  userSchema,
  accountSchema,
  accountUserSchema,
  billingCustomerSchema,
  billingSubscriptionSchema,
  configSchema,
  // Assuming you will create these schemas based on Project, Thread, Message types
  // For now, let's define minimal ones here or import them if they exist.
  // It's better to have them in schemas.ts
} from './schemas';

// Define types for collections if not already done in schemas.ts
// export type MyDatabaseCollections = {
//   users: RxCollection<typeof userSchema>;
//   accounts: RxCollection<typeof accountSchema>;
//   projects: RxCollection<any>; // Replace 'any' with actual project schema type
//   threads: RxCollection<any>;  // Replace 'any' with actual thread schema type
//   messages: RxCollection<any>; // Replace 'any' with actual message schema type
//   // ... other collections
// };
// export type MyDatabase = RxDatabase<MyDatabaseCollections>;


// Temporary minimal schemas for project, thread, message if not in schemas.ts
// It's STRONGLY recommended to move these to schemas.ts and make them complete.
const projectSchemaMinimal = {
  title: 'Project Schema (Minimal)',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    name: { type: 'string' },
    description: { type: 'string' },
    account_id: { type: 'string', maxLength: 36 },
    is_public: { type: 'boolean', default: false },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    sandbox: { type: 'object' }, // Keep as object for now
  },
  required: ['id', 'name', 'account_id', 'created_at', 'updated_at'],
};

const threadSchemaMinimal = {
  title: 'Thread Schema (Minimal)',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 }, // Was thread_id, mapped to id for RxDB
    project_id: { type: 'string', maxLength: 36, ref: 'projects' },
    account_id: { type: 'string', maxLength: 36 },
    created_by: { type: 'string', maxLength: 36 },
    is_public: { type: 'boolean', default: false },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    // metadata: { type: 'object' },
  },
  required: ['id', 'project_id', 'account_id', 'created_at', 'updated_at'],
  indexes: ['project_id', 'account_id', 'created_at']
};

const messageSchemaMinimal = {
  title: 'Message Schema (Minimal)',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 },
    thread_id: { type: 'string', maxLength: 36, ref: 'threads' },
    role: { type: 'string', enum: ['user', 'assistant', 'system', 'tool'] }, // Example roles
    content: { type: 'string' },
    type: { type: 'string' }, // To filter out 'cost', 'summary'
    user_account_id: { type: 'string', maxLength: 36 },
    created_by: { type: 'string', maxLength: 36 },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    // attachments: { type: 'array', items: { type: 'object' } },
    // metadata: { type: 'object' },
    // is_llm_message: { type: 'boolean' }
  },
  required: ['id', 'thread_id', 'role', 'content', 'created_at'],
  indexes: ['thread_id', 'created_at', 'type']
};


let dbInstance: Promise<RxDatabase> | null = null;

export async function getDatabase(): Promise<RxDatabase> {
  if (!dbInstance) {
    console.log('Creating new database instance...');
    addRxPlugin(RxDBDevModePlugin); // Optional: for development, provides warnings
    // addRxPlugin(require('pouchdb-adapter-idb')); // This was incorrect for getRxStorageDexie

    const db = await createRxDatabase({
      name: 'sunadatabase', // TODO: Choose a more suitable name
      storage: getRxStorageDexie(),
      // password: 'mysecurepassword', // TODO: Add password if needed
      multiInstance: false, // Typically false for client-side browser use unless specific need
      ignoreDuplicate: true, // Optional: If you try to create already existing db
    });

    console.log('Database created. Adding collections...');
    try {
      await db.addCollections({
        users: { schema: userSchema },
        accounts: { schema: accountSchema },
        account_users: { schema: accountUserSchema },
        billing_customers: { schema: billingCustomerSchema },
        billing_subscriptions: { schema: billingSubscriptionSchema },
        config: { schema: configSchema },
        projects: { schema: projectSchemaMinimal }, // Using minimal for now
        threads: { schema: threadSchemaMinimal },   // Using minimal for now
        messages: { schema: messageSchemaMinimal }, // Using minimal for now
      });
      console.log('Collections added.');
    } catch (err) {
      console.error('Error adding collections:', err);
      // This can happen if collections already exist, especially with HMR in dev.
      // Depending on RxDB setup, it might not be an issue, or might need specific handling.
    }

    // Log all collections
    // console.log('Current collections:', Object.keys(db.collections));

    dbInstance = Promise.resolve(db); // Store the resolved database instance
    return db;
  }
  return dbInstance; // Return the promise directly
}
