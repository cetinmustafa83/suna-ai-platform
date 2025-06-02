// import { createClient } from '@/lib/supabase/client'; // Supabase client removed
import * as LocalAuth from '@/lib/auth'; // Import local auth functions
import { handleApiError } from './error-handler';

// Get backend URL from environment variables
const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || '';

// Set to keep track of agent runs that are known to be non-running
const nonRunningAgentRuns = new Set<string>();
// Map to keep track of active EventSource streams
const activeStreams = new Map<string, EventSource>();

// Custom error for billing issues
export class BillingError extends Error {
  status: number;
  detail: { message: string; [key: string]: any }; // Allow other properties in detail

  constructor(
    status: number,
    detail: { message: string; [key: string]: any },
    message?: string,
  ) {
    super(message || detail.message || `Billing Error: ${status}`);
    this.name = 'BillingError';
    this.status = status;
    this.detail = detail;

    // Set the prototype explicitly.
    Object.setPrototypeOf(this, BillingError.prototype);
  }
}

// Type Definitions (moved from potential separate file for clarity)
export type Project = {
  id: string;
  name: string;
  description: string;
  account_id: string;
  created_at: string;
  updated_at?: string;
  sandbox: {
    vnc_preview?: string;
    sandbox_url?: string;
    id?: string;
    pass?: string;
  };
  is_public?: boolean; // Flag to indicate if the project is public
  [key: string]: any; // Allow additional properties to handle database fields
};

export type Thread = {
  thread_id: string;
  account_id: string | null;
  project_id?: string | null;
  is_public?: boolean;
  created_at: string;
  updated_at: string;
  [key: string]: any; // Allow additional properties to handle database fields
};

export type Message = {
  role: string;
  content: string;
  type: string;
};

export type AgentRun = {
  id: string;
  thread_id: string;
  status: 'running' | 'completed' | 'stopped' | 'error';
  started_at: string;
  completed_at: string | null;
  responses: Message[];
  error: string | null;
};

export type ToolCall = {
  name: string;
  arguments: Record<string, unknown>;
};

export interface InitiateAgentResponse {
  thread_id: string;
  agent_run_id: string;
}

export interface HealthCheckResponse {
  status: string;
  timestamp: string;
  instance_id: string;
}

export interface FileInfo {
  name: string;
  path: string;
  is_dir: boolean;
  size: number;
  mod_time: string;
  permissions?: string;
}

import { getDatabase } from '@/lib/rxdb/database'; // Import RxDB database
// import { projectSchema } from '@/lib/rxdb/schemas'; // Assuming project schema is defined

// Project APIs
export const getProjects = async (): Promise<Project[]> => {
  try {
    const { data: userData, error: userError } = await LocalAuth.getUser();
    if (userError) {
      console.error('Error getting current user (mock):', userError);
      return [];
    }
    if (!userData.user) {
      console.log('[API] No user logged in (mock), returning empty projects array');
      return [];
    }

    // TODO: Use a proper mock account ID or derive from user when multi-account is implemented
    const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

    console.log(`[RxDB] Fetching projects for account_id: ${MOCK_ACCOUNT_ID}`);
    const db = await getDatabase();
    if (!db.projects) {
      console.warn("[RxDB] projects collection not found. Ensure it's added to the database.");
      // await db.addCollections({ projects: { schema: projectSchema } }); // Example: Add if missing, ensure schema is imported
      return [];
    }

    const projectsQuery = db.projects.find({
      selector: {
        // account_id: MOCK_ACCOUNT_ID // Filter by account_id once field is in schema and data
      }
    });
    const projectsDocs = await projectsQuery.exec();

    console.log('[RxDB] Raw projects from DB:', projectsDocs.length, projectsDocs);

    const mappedProjects: Project[] = projectsDocs.map(doc => {
      const plainDoc = doc.toJSON(); // Get plain JSON object from RxDocument
      return {
        id: plainDoc.id, // Assuming RxDB primaryKey is 'id' and maps to project_id
        name: plainDoc.name || '',
        description: plainDoc.description || '',
        account_id: plainDoc.account_id || MOCK_ACCOUNT_ID, // Ensure this field exists in your RxDB schema
        created_at: plainDoc.created_at || new Date().toISOString(),
        updated_at: plainDoc.updated_at || new Date().toISOString(),
        sandbox: plainDoc.sandbox || {
          id: '',
          pass: '',
          vnc_preview: '',
          sandbox_url: '',
        },
        is_public: plainDoc.is_public || false,
      };
    });

    console.log('[RxDB] Mapped projects for frontend:', mappedProjects.length);
    return mappedProjects;

  } catch (err) {
    console.error('Error fetching projects from RxDB:', err);
    handleApiError(err, { operation: 'load projects', resource: 'projects' });
    return [];
  }
};

export const getProject = async (projectId: string): Promise<Project | null> => { // Return type changed to Project | null
  try {
    console.log(`[RxDB] Fetching project by id: ${projectId}`);
    const db = await getDatabase();
    if (!db.projects) {
      console.warn(`[RxDB] projects collection not found for getProject(${projectId}).`);
      return null;
    }
    const projectDoc = await db.projects.findOne(projectId).exec();

    if (!projectDoc) {
      handleApiError(new Error(`Project ${projectId} not found in RxDB`), { operation: 'load project', resource: `project ${projectId}` });
      return null;
    }

    const plainDoc = projectDoc.toJSON();
    const MOCK_ACCOUNT_ID = `mock-account-for-${(await LocalAuth.getUser()).data.user?.id || 'unknown_user'}`;

    // If project has a sandbox, ensure it's started (keeping this logic for now)
    if (plainDoc.sandbox?.id) {
      const ensureSandboxActive = async () => {
        try {
          const { data: authData } = await LocalAuth.getUser();
          const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null;
          const headers: Record<string, string> = { 'Content-Type': 'application/json' };
          if (mockSession?.access_token) {
            headers['Authorization'] = `Bearer ${mockSession.access_token}`;
          }
          console.log(`Ensuring sandbox is active for project ${projectId}...`);
          const response = await fetch(`${API_URL}/project/${projectId}/sandbox/ensure-active`, { method: 'POST', headers });
          if (!response.ok) {
            const errorText = await response.text().catch(() => 'No error details available');
            console.warn(`Failed to ensure sandbox is active: ${response.status} ${response.statusText}`, errorText);
          } else {
            console.log('Sandbox activation successful');
          }
        } catch (sandboxError) {
          console.warn('Failed to ensure sandbox is active:', sandboxError);
        }
      };
      ensureSandboxActive();
    }

    return {
      id: plainDoc.id,
      name: plainDoc.name || '',
      description: plainDoc.description || '',
      account_id: plainDoc.account_id || MOCK_ACCOUNT_ID,
      is_public: plainDoc.is_public || false,
      created_at: plainDoc.created_at || new Date().toISOString(),
      updated_at: plainDoc.updated_at || new Date().toISOString(),
      sandbox: plainDoc.sandbox || { id: '', pass: '', vnc_preview: '', sandbox_url: '' },
    };
  } catch (err) {
    console.error(`Error fetching project ${projectId} from RxDB:`, err);
    handleApiError(err, { operation: 'load project', resource: `project ${projectId}` });
    return null; // Return null on error
  }
};

import { v4 as uuidv4 } from 'uuid'; // For generating IDs

export const createProject = async (
  projectData: { name: string; description: string },
  accountId?: string,
): Promise<Project> => {
  try {
    if (!accountId) {
      const { data: userData, error: userError } = await LocalAuth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated for createProject (mock)');
      }
      accountId = `mock-account-for-${userData.user.id}`; // Use mock account ID logic
    }

    console.log(`[RxDB] Creating project for account_id: ${accountId}`);
    const db = await getDatabase();
    if (!db.projects) {
      console.warn("[RxDB] projects collection not found for createProject.");
      throw new Error("Projects collection not available");
    }

    const newProjectId = uuidv4();
    const newProjectData = {
      id: newProjectId, // RxDB uses 'id' as primary key by default in schemas
      name: projectData.name,
      description: projectData.description || '',
      account_id: accountId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      sandbox: { id: '', pass: '', vnc_preview: '', sandbox_url: '' },
    };

    const newDoc = await db.projects.insert(newProjectData);
    console.log('[RxDB] Project created:', newDoc.toJSON());

    // Return data conforming to Project type, mapping 'id' from RxDB to 'id' in Project
    return { ...newDoc.toJSON(), id: newDoc.id } as Project;

  } catch (err) {
    console.error('Error creating project in RxDB:', err);
    handleApiError(err, { operation: 'create project', resource: 'project' });
    throw err; // Re-throw after handling to allow TanStack Query to catch it
  }
};

export const updateProject = async (
  projectId: string,
  updateData: Partial<Project>, // Changed 'data' to 'updateData' to avoid conflict
): Promise<Project> => {
  try {
    console.log(`[RxDB] Updating project with ID: ${projectId}`);
    const db = await getDatabase();
    if (!db.projects) {
      console.warn("[RxDB] projects collection not found for updateProject.");
      throw new Error("Projects collection not available");
    }

    const projectDoc = await db.projects.findOne(projectId).exec();
    if (!projectDoc) {
      throw new Error(`Project with ID ${projectId} not found in RxDB.`);
    }

    // Apply updates, ensuring not to overwrite 'id' or 'account_id' if they are not meant to be changed
    const dataToSet = { ...updateData, updated_at: new Date().toISOString() };
    delete dataToSet.id; // Primary key should not be changed with set
    delete dataToSet.account_id; // Usually account_id should not be changed

    await projectDoc.patch(dataToSet); // Use patch for partial updates

    console.log('[RxDB] Project updated:', projectDoc.toJSON());

    // Dispatch custom event if still needed (consider if RxDB's reactivity handles this)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('project-updated', {
          detail: {
            projectId,
            updatedData: projectDoc.toJSON(), // Send the full updated document
          },
        }),
      );
    }
    return { ...projectDoc.toJSON(), id: projectDoc.id } as Project;
  } catch (err) {
    console.error(`Error updating project ${projectId} in RxDB:`, err);
    handleApiError(err, { operation: 'update project', resource: `project ${projectId}` });
    throw err;
  }
};

export const deleteProject = async (projectId: string): Promise<void> => {
  try {
    console.log(`[RxDB] Deleting project with ID: ${projectId}`);
    const db = await getDatabase();
    if (!db.projects) {
      console.warn("[RxDB] projects collection not found for deleteProject.");
      throw new Error("Projects collection not available");
    }
    const projectDoc = await db.projects.findOne(projectId).exec();
    if (!projectDoc) {
      console.warn(`Project with ID ${projectId} not found for deletion.`);
      // Depending on desired behavior, either throw or return successfully
      return;
    }
    await projectDoc.remove();
    console.log(`[RxDB] Project ${projectId} deleted.`);
  } catch (err) {
    console.error(`Error deleting project ${projectId} from RxDB:`, err);
    handleApiError(err, { operation: 'delete project', resource: `project ${projectId}` });
    throw err;
  }
};

// Thread APIs
export const getThreads = async (projectId?: string): Promise<Thread[]> => {
  try {
    const { data: userData, error: userError } = await LocalAuth.getUser();
    if (userError) {
      console.error('Error getting current user (mock):', userError);
      return [];
    }
    if (!userData.user) {
      console.log('[API] No user logged in (mock), returning empty threads array');
      return [];
    }
    const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

    console.log(`[RxDB] Fetching threads for account_id: ${MOCK_ACCOUNT_ID}` + (projectId ? ` and project_id: ${projectId}` : ""));
    const db = await getDatabase();
    if (!db.threads) {
      console.warn("[RxDB] threads collection not found. Ensure it's added.");
      return [];
    }

    const selector: any = {
      // account_id: MOCK_ACCOUNT_ID, // Once account_id is in schema
    };
    if (projectId) {
      selector.project_id = projectId;
    }

    const threadsQuery = db.threads.find({ selector });
    const threadsDocs = await threadsQuery.exec();

    console.log('[RxDB] Raw threads from DB:', threadsDocs.length, threadsDocs);

    const mappedThreads: Thread[] = threadsDocs
      .map(doc => {
        const plainDoc = doc.toJSON();
        return {
          thread_id: plainDoc.id, // Assuming RxDB primaryKey 'id' maps to thread_id
          account_id: plainDoc.account_id || MOCK_ACCOUNT_ID,
          project_id: plainDoc.project_id,
          is_public: plainDoc.is_public || false,
          created_at: plainDoc.created_at || new Date().toISOString(),
          updated_at: plainDoc.updated_at || new Date().toISOString(),
          // metadata: plainDoc.metadata // if you add metadata to RxDB schema
        };
      })
      .filter((thread) => {
        // const metadata = thread.metadata || {}; // Re-enable if metadata is used
        // return !metadata.is_agent_builder;
        return true; // Temporarily allow all threads if metadata not in RxDB yet
      });

    return mappedThreads;
  } catch (err) {
    console.error('Error fetching threads from RxDB:', err);
    handleApiError(err, { operation: 'load threads', resource: projectId ? `threads for project ${projectId}` : 'threads' });
    return [];
  }
};

export const getThread = async (threadId: string): Promise<Thread | null> => { // Return type changed to Thread | null
  try {
    console.log(`[RxDB] Fetching thread by id: ${threadId}`);
    const db = await getDatabase();
    if (!db.threads) {
      console.warn(`[RxDB] threads collection not found for getThread(${threadId}).`);
      return null;
    }
    const threadDoc = await db.threads.findOne(threadId).exec();

    if (!threadDoc) {
      handleApiError(new Error('Thread not found in RxDB'), { operation: 'load thread', resource: `thread ${threadId}` });
      return null;
    }
    const plainDoc = threadDoc.toJSON();
    return {
      thread_id: plainDoc.id,
      account_id: plainDoc.account_id || `mock-account-for-${(await LocalAuth.getUser()).data.user?.id}`,
      project_id: plainDoc.project_id,
      is_public: plainDoc.is_public || false,
      created_at: plainDoc.created_at || new Date().toISOString(),
      updated_at: plainDoc.updated_at || new Date().toISOString(),
    };
  } catch (err) {
    console.error(`Error fetching thread ${threadId} from RxDB:`, err);
    handleApiError(err, { operation: 'load thread', resource: `thread ${threadId}` });
    return null; // Return null on error
  }
};

export const createThread = async (projectId: string): Promise<Thread> => {
  try {
    const { data: userData, error: userError } = await LocalAuth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated for createThread (mock)');
    }
    const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

    console.log(`[RxDB] Creating thread for project_id: ${projectId} and account_id: ${MOCK_ACCOUNT_ID}`);
    const db = await getDatabase();
    if (!db.threads) {
      console.warn("[RxDB] threads collection not found for createThread.");
      throw new Error("Threads collection not available");
    }

    const newThreadId = uuidv4();
    const newThreadData = {
      id: newThreadId, // RxDB uses 'id'
      project_id: projectId,
      account_id: MOCK_ACCOUNT_ID,
      created_by: userData.user.id, // Store creator
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_public: false,
      // metadata: {} // Add if needed
    };

    const newDoc = await db.threads.insert(newThreadData);
    console.log('[RxDB] Thread created:', newDoc.toJSON());

    return { ...newDoc.toJSON(), thread_id: newDoc.id } as Thread; // Map 'id' to 'thread_id'

  } catch (err) {
    console.error('Error creating thread in RxDB:', err);
    handleApiError(err, { operation: 'create thread', resource: 'thread' });
    throw err;
  }
};

export const addUserMessage = async (
  threadId: string,
  content: string,
  // attachments?: Attachment[], // If attachments are needed, ensure they are handled
): Promise<Message> => { // Changed to return Promise<Message>
  try {
    const { data: userData, error: userError } = await LocalAuth.getUser();
    if (userError || !userData.user) {
      throw new Error('User not authenticated for addUserMessage (mock)');
    }
    const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

    console.log(`[RxDB] Adding user message to thread_id: ${threadId}`);
    const db = await getDatabase();
    if (!db.messages) {
      console.warn("[RxDB] messages collection not found for addUserMessage.");
      throw new Error("Messages collection not available");
    }

    const newMessageId = uuidv4();
    const newMessageData = {
      id: newMessageId, // RxDB uses 'id'
      thread_id: threadId,
      role: 'user',
      content: content, // Store content directly, not stringified JSON unless schema expects it
      type: 'user', // Explicitly set type
      user_account_id: MOCK_ACCOUNT_ID,
      created_by: userData.user.id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      // attachments: attachments || [], // If handling attachments
      // metadata: {}, // Add if needed
      // is_llm_message: true, // This seems specific, decide if needed for RxDB
    };

    const newDoc = await db.messages.insert(newMessageData);
    console.log('[RxDB] User message added:', newDoc.toJSON());

    // Map to Message type, ensure all fields align with your Message type definition
    return {
      // id: newDoc.id, // if Message type has id
      role: newDoc.role,
      content: newDoc.content,
      type: newDoc.type,
      // ... other fields
    } as Message;

  } catch (err) {
    console.error('Error adding user message in RxDB:', err);
    handleApiError(err, { operation: 'add message', resource: 'message' });
    throw err;
  }
};

export const getMessages = async (threadId: string): Promise<Message[]> => {
 try {
    console.log(`[RxDB] Fetching messages for thread_id: ${threadId}`);
    const db = await getDatabase();
    if (!db.messages) { // Assuming 'messages' is the collection name
      console.warn("[RxDB] messages collection not found. Ensure it's added.");
      return [];
    }

    const messagesQuery = db.messages.find({
      selector: {
        thread_id: threadId,
        // type: { $nin: ['cost', 'summary'] } // TODO: Add type field to schema and data for this filter
      },
      sort: [{ created_at: 'asc' }]
    });
    const messagesDocs = await messagesQuery.exec();

    console.log('[RxDB] Raw messages from DB:', messagesDocs.length, messagesDocs);

    const mappedMessages: Message[] = messagesDocs.map(doc => {
      const plainDoc = doc.toJSON();
      // Assuming message content is stored directly, not as stringified JSON
      // If content IS stringified JSON, you'll need to parse it here.
      return {
        // id: plainDoc.id, // If your Message type has an id
        role: plainDoc.role,
        content: plainDoc.content, // Assumes content is not stringified JSON
        type: plainDoc.type || 'user', // Ensure type field exists
        // ... other fields like created_at, attachments, metadata
      } as Message; // Cast as Message, ensure all required fields are present
    });

    return mappedMessages.filter(msg => msg.type !== 'cost' && msg.type !== 'summary'); // Post-filter if not in query

  } catch (err) {
    console.error('Error fetching messages from RxDB:', err);
    handleApiError(err, { operation: 'load messages', resource: `messages for thread ${threadId}` });
    return [];
  }
};

// Agent APIs
export const startAgent = async (
  threadId: string,
  options?: {
    model_name?: string;
    enable_thinking?: boolean;
    reasoning_effort?: string;
    stream?: boolean;
    agent_id?: string;
  },
): Promise<{ agent_run_id: string }> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session for backend call
    // TODO: Review if backend /agent/start needs auth in local mode & how to handle mock token

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    // Check if backend URL is configured
    if (!API_URL) {
      throw new Error(
        'Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL in your environment.',
      );
    }

    console.log(
      `[API] Starting agent for thread ${threadId} using ${API_URL}/thread/${threadId}/agent/start`,
    );

    const defaultOptions = {
      model_name: 'claude-3-7-sonnet-latest',
      enable_thinking: false,
      reasoning_effort: 'low',
      stream: true,
      agent_id: undefined,
    };

    const finalOptions = { ...defaultOptions, ...options };

    const body: any = {
      model_name: finalOptions.model_name,
      enable_thinking: finalOptions.enable_thinking,
      reasoning_effort: finalOptions.reasoning_effort,
      stream: finalOptions.stream,
    };
    
    // Only include agent_id if it's provided
    if (finalOptions.agent_id) {
      body.agent_id = finalOptions.agent_id;
    }

    const response = await fetch(`${API_URL}/thread/${threadId}/agent/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      // Check for 402 Payment Required first
      if (response.status === 402) {
        try {
          const errorData = await response.json();
          console.error(`[API] Billing error starting agent (402):`, errorData);
          // Ensure detail exists and has a message property
          const detail = errorData?.detail || { message: 'Payment Required' };
          if (typeof detail.message !== 'string') {
            detail.message = 'Payment Required'; // Default message if missing
          }
          throw new BillingError(response.status, detail);
        } catch (parseError) {
          // Handle cases where parsing fails or the structure isn't as expected
          console.error(
            '[API] Could not parse 402 error response body:',
            parseError,
          );
          throw new BillingError(
            response.status,
            { message: 'Payment Required' },
            `Error starting agent: ${response.statusText} (402)`,
          );
        }
      }

      // Handle other errors
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `[API] Error starting agent: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error starting agent: ${response.statusText} (${response.status})`,
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    // Rethrow BillingError instances directly
    if (error instanceof BillingError) {
      throw error;
    }

    console.error('[API] Failed to start agent:', error);
    
    // Handle different error types with appropriate user messages
    if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      const networkError = new Error(
        `Cannot connect to backend server. Please check your internet connection and make sure the backend is running.`,
      );
      handleApiError(networkError, { operation: 'start agent', resource: 'AI assistant' });
      throw networkError;
    }

    // For other errors, add context and rethrow
    handleApiError(error, { operation: 'start agent', resource: 'AI assistant' });
    throw error;
  }
};

export const stopAgent = async (agentRunId: string): Promise<void> => {
  // Add to non-running set immediately to prevent reconnection attempts
  nonRunningAgentRuns.add(agentRunId);

  // Close any existing stream
  const existingStream = activeStreams.get(agentRunId);
  if (existingStream) {
    console.log(
      `[API] Closing existing stream for ${agentRunId} before stopping agent`,
    );
    existingStream.close();
    activeStreams.delete(agentRunId);
  }

  // const supabase = createClient(); // Supabase client removed
  const { data: authData } = await LocalAuth.getUser(); // Use local auth
  const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
  // TODO: Review if backend /agent-run/.../stop needs auth in local mode

  if (!mockSession?.access_token) {
    const authError = new Error('No access token available (mock)');
    handleApiError(authError, { operation: 'stop agent', resource: 'AI assistant' });
    throw authError;
  }

  const response = await fetch(`${API_URL}/agent-run/${agentRunId}/stop`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
    },
    // Add cache: 'no-store' to prevent caching
    cache: 'no-store',
  });

  if (!response.ok) {
    const stopError = new Error(`Error stopping agent: ${response.statusText}`);
    handleApiError(stopError, { operation: 'stop agent', resource: 'AI assistant' });
    throw stopError;
  }
};

export const getAgentStatus = async (agentRunId: string): Promise<AgentRun> => {
  console.log(`[API] Requesting agent status for ${agentRunId}`);

  // If we already know this agent is not running, throw an error
  if (nonRunningAgentRuns.has(agentRunId)) {
    console.log(
      `[API] Agent run ${agentRunId} is known to be non-running, returning error`,
    );
    throw new Error(`Agent run ${agentRunId} is not running`);
  }

  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
     // TODO: Review if backend /agent-run/... needs auth in local mode

    if (!mockSession?.access_token) {
      console.error('[API] No access token available for getAgentStatus (mock)');
      throw new Error('No access token available (mock)');
    }

    const url = `${API_URL}/agent-run/${agentRunId}`;
    console.log(`[API] Fetching from: ${url}`);

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      // Add cache: 'no-store' to prevent caching
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `[API] Error getting agent status: ${response.status} ${response.statusText}`,
        errorText,
      );

      // If we get a 404, add to non-running set
      if (response.status === 404) {
        nonRunningAgentRuns.add(agentRunId);
      }

      throw new Error(
        `Error getting agent status: ${response.statusText} (${response.status})`,
      );
    }

    const data = await response.json();
    console.log(`[API] Successfully got agent status:`, data);

    // If agent is not running, add to non-running set
    if (data.status !== 'running') {
      nonRunningAgentRuns.add(agentRunId);
    }

    return data;
  } catch (error) {
    console.error('[API] Failed to get agent status:', error);
    handleApiError(error, { operation: 'get agent status', resource: 'AI assistant status', silent: true });
    throw error;
  }
};

export const getAgentRuns = async (threadId: string): Promise<AgentRun[]> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /thread/.../agent-runs needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const response = await fetch(`${API_URL}/thread/${threadId}/agent-runs`, {
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      // Add cache: 'no-store' to prevent caching
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`Error getting agent runs: ${response.statusText}`);
    }

    const data = await response.json();
    return data.agent_runs || [];
  } catch (error) {
    console.error('Failed to get agent runs:', error);
    handleApiError(error, { operation: 'load agent runs', resource: 'conversation history' });
    throw error;
  }
};

export const streamAgent = (
  agentRunId: string,
  callbacks: {
    onMessage: (content: string) => void;
    onError: (error: Error | string) => void;
    onClose: () => void;
  },
): (() => void) => {
  console.log(`[STREAM] streamAgent called for ${agentRunId}`);

  // Check if this agent run is known to be non-running
  if (nonRunningAgentRuns.has(agentRunId)) {
    console.log(
      `[STREAM] Agent run ${agentRunId} is known to be non-running, not creating stream`,
    );
    // Notify the caller immediately
    setTimeout(() => {
      callbacks.onError(`Agent run ${agentRunId} is not running`);
      callbacks.onClose();
    }, 0);

    // Return a no-op cleanup function
    return () => {};
  }

  // Check if there's already an active stream for this agent run
  const existingStream = activeStreams.get(agentRunId);
  if (existingStream) {
    console.log(
      `[STREAM] Stream already exists for ${agentRunId}, closing it first`,
    );
    existingStream.close();
    activeStreams.delete(agentRunId);
  }

  // Set up a new stream
  try {
    const setupStream = async () => {
      // First verify the agent is actually running
      try {
        const status = await getAgentStatus(agentRunId);
        if (status.status !== 'running') {
          console.log(
            `[STREAM] Agent run ${agentRunId} is not running (status: ${status.status}), not creating stream`,
          );
          nonRunningAgentRuns.add(agentRunId);
          callbacks.onError(
            `Agent run ${agentRunId} is not running (status: ${status.status})`,
          );
          callbacks.onClose();
          return;
        }
      } catch (err) {
        console.error(`[STREAM] Error verifying agent run ${agentRunId}:`, err);

        // Check if this is a "not found" error
        const errorMessage = err instanceof Error ? err.message : String(err);
        const isNotFoundError =
          errorMessage.includes('not found') ||
          errorMessage.includes('404') ||
          errorMessage.includes('does not exist');

        if (isNotFoundError) {
          console.log(
            `[STREAM] Agent run ${agentRunId} not found, not creating stream`,
          );
          nonRunningAgentRuns.add(agentRunId);
        }

        callbacks.onError(errorMessage);
        callbacks.onClose();
        return;
      }

      // const supabase = createClient(); // Supabase client removed
      const { data: authData } = await LocalAuth.getUser(); // Use local auth
      const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev-stream' } : null; // Mock session for stream
      // TODO: Review if backend stream needs auth/token in local mode

      if (!mockSession?.access_token) {
        console.error('[STREAM] No auth token available (mock)');
        callbacks.onError(new Error('Authentication required (mock)'));
        callbacks.onClose();
        return;
      }

      const url = new URL(`${API_URL}/agent-run/${agentRunId}/stream`);
      url.searchParams.append('token', mockSession.access_token); // Use mock token

      console.log(`[STREAM] Creating EventSource for ${agentRunId}`);
      const eventSource = new EventSource(url.toString());

      // Store the EventSource in the active streams map
      activeStreams.set(agentRunId, eventSource);

      eventSource.onopen = () => {
        console.log(`[STREAM] Connection opened for ${agentRunId}`);
      };

      eventSource.onmessage = (event) => {
        try {
          const rawData = event.data;
          if (rawData.includes('"type":"ping"')) return;

          // Log raw data for debugging (truncated for readability)
          console.log(
            `[STREAM] Received data for ${agentRunId}: ${rawData.substring(0, 100)}${rawData.length > 100 ? '...' : ''}`,
          );

          // Skip empty messages
          if (!rawData || rawData.trim() === '') {
            console.debug('[STREAM] Received empty message, skipping');
            return;
          }

          // Check for error status messages
          try {
            const jsonData = JSON.parse(rawData);
            if (jsonData.status === 'error') {
              console.error(`[STREAM] Error status received for ${agentRunId}:`, jsonData);
              
              // Pass the error message to the callback
              callbacks.onError(jsonData.message || 'Unknown error occurred');
              
              // Don't close the stream for error status messages as they may continue
              return;
            }
          } catch (jsonError) {
            // Not JSON or invalid JSON, continue with normal processing
          }

          // Check for "Agent run not found" error
          if (
            rawData.includes('Agent run') &&
            rawData.includes('not found in active runs')
          ) {
            console.log(
              `[STREAM] Agent run ${agentRunId} not found in active runs, closing stream`,
            );

            // Add to non-running set to prevent future reconnection attempts
            nonRunningAgentRuns.add(agentRunId);

            // Notify about the error
            callbacks.onError('Agent run not found in active runs');

            // Clean up
            eventSource.close();
            activeStreams.delete(agentRunId);
            callbacks.onClose();

            return;
          }

          // Check for completion messages
          if (
            rawData.includes('"type":"status"') &&
            rawData.includes('"status":"completed"')
          ) {
            console.log(
              `[STREAM] Detected completion status message for ${agentRunId}`,
            );

            // Check for specific completion messages that indicate we should stop checking
            if (
              rawData.includes('Run data not available for streaming') ||
              rawData.includes('Stream ended with status: completed')
            ) {
              console.log(
                `[STREAM] Detected final completion message for ${agentRunId}, adding to non-running set`,
              );
              // Add to non-running set to prevent future reconnection attempts
              nonRunningAgentRuns.add(agentRunId);
            }

            // Notify about the message
            callbacks.onMessage(rawData);

            // Clean up
            eventSource.close();
            activeStreams.delete(agentRunId);
            callbacks.onClose();

            return;
          }

          // Check for thread run end message
          if (
            rawData.includes('"type":"status"') &&
            rawData.includes('"status_type":"thread_run_end"')
          ) {
            console.log(
              `[STREAM] Detected thread run end message for ${agentRunId}`,
            );

            // Add to non-running set
            nonRunningAgentRuns.add(agentRunId);

            // Notify about the message
            callbacks.onMessage(rawData);

            // Clean up
            eventSource.close();
            activeStreams.delete(agentRunId);
            callbacks.onClose();

            return;
          }

          // For all other messages, just pass them through
          callbacks.onMessage(rawData);
        } catch (error) {
          console.error(`[STREAM] Error handling message:`, error);
          callbacks.onError(error instanceof Error ? error : String(error));
        }
      };

      eventSource.onerror = (event) => {
        console.log(`[STREAM] EventSource error for ${agentRunId}:`, event);

        // Check if the agent is still running
        getAgentStatus(agentRunId)
          .then((status) => {
            if (status.status !== 'running') {
              console.log(
                `[STREAM] Agent run ${agentRunId} is not running after error, closing stream`,
              );
              nonRunningAgentRuns.add(agentRunId);
              eventSource.close();
              activeStreams.delete(agentRunId);
              callbacks.onClose();
            } else {
              console.log(
                `[STREAM] Agent run ${agentRunId} is still running after error, keeping stream open`,
              );
              // Let the browser handle reconnection for non-fatal errors
            }
          })
          .catch((err) => {
            console.error(
              `[STREAM] Error checking agent status after stream error:`,
              err,
            );

            // Check if this is a "not found" error
            const errMsg = err instanceof Error ? err.message : String(err);
            const isNotFoundErr =
              errMsg.includes('not found') ||
              errMsg.includes('404') ||
              errMsg.includes('does not exist');

            if (isNotFoundErr) {
              console.log(
                `[STREAM] Agent run ${agentRunId} not found after error, closing stream`,
              );
              nonRunningAgentRuns.add(agentRunId);
              eventSource.close();
              activeStreams.delete(agentRunId);
              callbacks.onClose();
            }

            // For other errors, notify but don't close the stream
            callbacks.onError(errMsg);
          });
      };
    };

    // Start the stream setup
    setupStream();

    // Return a cleanup function
    return () => {
      console.log(`[STREAM] Cleanup called for ${agentRunId}`);
      const stream = activeStreams.get(agentRunId);
      if (stream) {
        console.log(`[STREAM] Closing stream for ${agentRunId}`);
        stream.close();
        activeStreams.delete(agentRunId);
      }
    };
  } catch (error) {
    console.error(`[STREAM] Error setting up stream for ${agentRunId}:`, error);
    callbacks.onError(error instanceof Error ? error : String(error));
    callbacks.onClose();
    return () => {};
  }
};

// Sandbox API Functions
export const createSandboxFile = async (
  sandboxId: string,
  filePath: string,
  content: string,
): Promise<void> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /sandboxes/.../files needs auth in local mode

    // Use FormData to handle both text and binary content more reliably
    const formData = new FormData();
    formData.append('path', filePath);

    // Create a Blob from the content string and append as a file
    const blob = new Blob([content], { type: 'application/octet-stream' });
    formData.append('file', blob, filePath.split('/').pop() || 'file');

    const headers: Record<string, string> = {};
    if (mockSession?.access_token) {
      headers['Authorization'] = `Bearer ${mockSession.access_token}`; // Use mock token
    }

    const response = await fetch(`${API_URL}/sandboxes/${sandboxId}/files`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error creating sandbox file: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error creating sandbox file: ${response.statusText} (${response.status})`,
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to create sandbox file:', error);
    handleApiError(error, { operation: 'create file', resource: `file ${filePath}` });
    throw error;
  }
};

// Fallback method for legacy support using JSON
export const createSandboxFileJson = async (
  sandboxId: string,
  filePath: string,
  content: string,
): Promise<void> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /sandboxes/.../files/json needs auth in local mode

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (mockSession?.access_token) {
      headers['Authorization'] = `Bearer ${mockSession.access_token}`; // Use mock token
    }

    const response = await fetch(
      `${API_URL}/sandboxes/${sandboxId}/files/json`,
      {
        method: 'POST',
        headers,
        body: JSON.stringify({
          path: filePath,
          content: content,
        }),
      },
    );

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error creating sandbox file (JSON): ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error creating sandbox file: ${response.statusText} (${response.status})`,
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Failed to create sandbox file with JSON:', error);
    handleApiError(error, { operation: 'create file', resource: `file ${filePath}` });
    throw error;
  }
};

// Helper function to normalize file paths with Unicode characters
function normalizePathWithUnicode(path: string): string {
  try {
    // Replace escaped Unicode sequences with actual characters
    return path.replace(/\\u([0-9a-fA-F]{4})/g, (_, hexCode) => {
      return String.fromCharCode(parseInt(hexCode, 16));
    });
  } catch (e) {
    console.error('Error processing Unicode escapes in path:', e);
    return path;
  }
}

export const listSandboxFiles = async (
  sandboxId: string,
  path: string,
): Promise<FileInfo[]> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /sandboxes/.../files needs auth in local mode (for listing)

    const url = new URL(`${API_URL}/sandboxes/${sandboxId}/files`);
    
    // Normalize the path to handle Unicode escape sequences
    const normalizedPath = normalizePathWithUnicode(path);
    
    // Properly encode the path parameter for UTF-8 support
    url.searchParams.append('path', normalizedPath);

    const headers: Record<string, string> = {};
    if (mockSession?.access_token) {
      headers['Authorization'] = `Bearer ${mockSession.access_token}`; // Use mock token
    }

    const response = await fetch(url.toString(), {
      headers,
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error listing sandbox files: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error listing sandbox files: ${response.statusText} (${response.status})`,
      );
    }

    const data = await response.json();
    return data.files || [];
  } catch (error) {
    console.error('Failed to list sandbox files:', error);
    handleApiError(error, { operation: 'list files', resource: `directory ${path}` });
    throw error;
  }
};

export const getSandboxFileContent = async (
  sandboxId: string,
  path: string,
): Promise<string | Blob> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /sandboxes/.../files/content needs auth in local mode

    const url = new URL(`${API_URL}/sandboxes/${sandboxId}/files/content`);
    
    // Normalize the path to handle Unicode escape sequences
    const normalizedPath = normalizePathWithUnicode(path);
    
    // Properly encode the path parameter for UTF-8 support
    url.searchParams.append('path', normalizedPath);

    const headers: Record<string, string> = {};
    if (mockSession?.access_token) {
      headers['Authorization'] = `Bearer ${mockSession.access_token}`; // Use mock token
    }

    const response = await fetch(url.toString(), {
      headers,
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error getting sandbox file content: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error getting sandbox file content: ${response.statusText} (${response.status})`,
      );
    }

    // Check if it's a text file or binary file based on content-type
    const contentType = response.headers.get('content-type');
    if (
      (contentType && contentType.includes('text')) ||
      contentType?.includes('application/json')
    ) {
      return await response.text();
    } else {
      return await response.blob();
    }
  } catch (error) {
    console.error('Failed to get sandbox file content:', error);
    handleApiError(error, { operation: 'load file content', resource: `file ${path}` });
    throw error;
  }
};

// Function to get public projects
export const getPublicProjects = async (): Promise<Project[]> => {
  try {
    console.log('[RxDB] Fetching public projects');
    const db = await getDatabase();
    if (!db.projects) {
      console.warn("[RxDB] projects collection not found for getPublicProjects. Ensure it's added to the database.");
      return [];
    }

    const publicProjectsQuery = db.projects.find({
      selector: {
        is_public: true // Filter for public projects
      }
    });
    const projectsDocs = await publicProjectsQuery.exec();

    console.log('[RxDB] Raw public projects from DB:', projectsDocs.length, projectsDocs);

    const mappedProjects: Project[] = projectsDocs.map(doc => {
      const plainDoc = doc.toJSON();
      return {
        id: plainDoc.id,
        name: plainDoc.name || '',
        description: plainDoc.description || '',
        account_id: plainDoc.account_id || 'public-account', // Or however public projects are attributed
        created_at: plainDoc.created_at || new Date().toISOString(),
        updated_at: plainDoc.updated_at || new Date().toISOString(),
        sandbox: plainDoc.sandbox || {
          id: '',
          pass: '',
          vnc_preview: '',
          sandbox_url: '',
        },
        is_public: true,
      };
    });

    console.log('[RxDB] Mapped public projects for frontend:', mappedProjects.length);
    return mappedProjects;

  } catch (err) {
    console.error('Error fetching public projects from RxDB:', err);
    handleApiError(err, { operation: 'load public projects', resource: 'public projects' });
    return [];
  }
};


export const initiateAgent = async (
  formData: FormData,
): Promise<InitiateAgentResponse> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /agent/initiate needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    if (!API_URL) {
      throw new Error(
        'Backend URL is not configured. Set NEXT_PUBLIC_BACKEND_URL in your environment.',
      );
    }

    console.log(
      `[API] Initiating agent with files using ${API_URL}/agent/initiate`,
    );

    const response = await fetch(`${API_URL}/agent/initiate`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      body: formData,
      cache: 'no-store',
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      
      console.error(
        `[API] Error initiating agent: ${response.status} ${response.statusText}`,
        errorText,
      );
    
      if (response.status === 402) {
        throw new Error('Payment Required');
      } else if (response.status === 401) {
        throw new Error('Authentication error: Please sign in again');
      } else if (response.status >= 500) {
        throw new Error('Server error: Please try again later');
      }
    
      throw new Error(
        `Error initiating agent: ${response.statusText} (${response.status})`,
      );
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('[API] Failed to initiate agent:', error);

    if (
      error instanceof TypeError &&
      error.message.includes('Failed to fetch')
    ) {
      const networkError = new Error(
        `Cannot connect to backend server. Please check your internet connection and make sure the backend is running.`,
      );
      handleApiError(networkError, { operation: 'initiate agent', resource: 'AI assistant' });
      throw networkError;
    }
    handleApiError(error, { operation: 'initiate agent' });
    throw error;
  }
};

export const checkApiHealth = async (): Promise<HealthCheckResponse> => {
  try {
    const response = await fetch(`${API_URL}/health`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      throw new Error(`API health check failed: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('API health check failed:', error);
    handleApiError(error, { operation: 'check system health', resource: 'system status' });
    throw error;
  }
};

// Billing API Types
export interface CreateCheckoutSessionRequest {
  price_id: string;
  success_url: string;
  cancel_url: string;
}

export interface CreatePortalSessionRequest {
  return_url: string;
}

export interface SubscriptionStatus {
  status: string; // Includes 'active', 'trialing', 'past_due', 'scheduled_downgrade', 'no_subscription'
  plan_name?: string;
  price_id?: string; // Added
  current_period_end?: string; // ISO Date string
  cancel_at_period_end: boolean;
  trial_end?: string; // ISO Date string
  minutes_limit?: number;
  current_usage?: number;
  // Fields for scheduled changes
  has_schedule: boolean;
  scheduled_plan_name?: string;
  scheduled_price_id?: string; // Added
  scheduled_change_date?: string; // ISO Date string - Deprecate? Check backend usage
  schedule_effective_date?: string; // ISO Date string - Added for consistency
}

export interface BillingStatusResponse {
  can_run: boolean;
  message: string;
  subscription: {
    price_id: string;
    plan_name: string;
    minutes_limit?: number;
  };
}

export interface Model {
  id: string;
  display_name: string;
  short_name?: string;
  requires_subscription?: boolean;
}

export interface AvailableModelsResponse {
  models: Model[];
  subscription_tier: string;
  total_models: number;
}

export interface CreateCheckoutSessionResponse {
  status:
    | 'upgraded'
    | 'downgrade_scheduled'
    | 'checkout_created'
    | 'no_change'
    | 'new'
    | 'updated'
    | 'scheduled';
  subscription_id?: string;
  schedule_id?: string;
  session_id?: string;
  url?: string;
  effective_date?: string;
  message?: string;
  details?: {
    is_upgrade?: boolean;
    effective_date?: string;
    current_price?: number;
    new_price?: number;
    invoice?: {
      id: string;
      status: string;
      amount_due: number;
      amount_paid: number;
    };
  };
}

// Billing API Functions
export const createCheckoutSession = async (
  request: CreateCheckoutSessionRequest,
): Promise<CreateCheckoutSessionResponse> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /billing/create-checkout-session needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const response = await fetch(`${API_URL}/billing/create-checkout-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error creating checkout session: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error creating checkout session: ${response.statusText} (${response.status})`,
      );
    }

    const data = await response.json();
    console.log('Checkout session response:', data);

    // Handle all possible statuses
    switch (data.status) {
      case 'upgraded':
      case 'updated':
      case 'downgrade_scheduled':
      case 'scheduled':
      case 'no_change':
        return data;
      case 'new':
      case 'checkout_created':
        if (!data.url) {
          throw new Error('No checkout URL provided');
        }
        return data;
      default:
        console.warn(
          'Unexpected status from createCheckoutSession:',
          data.status,
        );
        return data;
    }
  } catch (error) {
    console.error('Failed to create checkout session:', error);
    handleApiError(error, { operation: 'create checkout session', resource: 'billing' });
    throw error;
  }
};


export const createPortalSession = async (
  request: CreatePortalSessionRequest,
): Promise<{ url: string }> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /billing/create-portal-session needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const response = await fetch(`${API_URL}/billing/create-portal-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error creating portal session: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error creating portal session: ${response.statusText} (${response.status})`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('Failed to create portal session:', error);
    handleApiError(error, { operation: 'create portal session', resource: 'billing portal' });
    throw error;
  }
};


export const getSubscription = async (): Promise<SubscriptionStatus> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /billing/subscription needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const response = await fetch(`${API_URL}/billing/subscription`, {
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error getting subscription: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error getting subscription: ${response.statusText} (${response.status})`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('Failed to get subscription:', error);
    handleApiError(error, { operation: 'load subscription', resource: 'billing information' });
    throw error;
  }
};

export const getAvailableModels = async (): Promise<AvailableModelsResponse> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /billing/available-models needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const response = await fetch(`${API_URL}/billing/available-models`, {
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error getting available models: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error getting available models: ${response.statusText} (${response.status})`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('Failed to get available models:', error);
    handleApiError(error, { operation: 'load available models', resource: 'AI models' });
    throw error;
  }
};


export const checkBillingStatus = async (): Promise<BillingStatusResponse> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /billing/check-status needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const response = await fetch(`${API_URL}/billing/check-status`, {
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error checking billing status: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error checking billing status: ${response.statusText} (${response.status})`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('Failed to check billing status:', error);
    handleApiError(error, { operation: 'check billing status', resource: 'account status' });
    throw error;
  }
};

// Transcription API Types
export interface TranscriptionResponse {
  text: string;
}

// Transcription API Functions
export const transcribeAudio = async (audioFile: File): Promise<TranscriptionResponse> => {
  try {
    // const supabase = createClient(); // Supabase client removed
    const { data: authData } = await LocalAuth.getUser(); // Use local auth
    const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
    // TODO: Review if backend /transcription needs auth in local mode

    if (!mockSession?.access_token) {
      throw new Error('No access token available (mock)');
    }

    const formData = new FormData();
    formData.append('audio_file', audioFile);

    const response = await fetch(`${API_URL}/transcription`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response
        .text()
        .catch(() => 'No error details available');
      console.error(
        `Error transcribing audio: ${response.status} ${response.statusText}`,
        errorText,
      );
      throw new Error(
        `Error transcribing audio: ${response.statusText} (${response.status})`,
      );
    }

    return response.json();
  } catch (error) {
    console.error('Failed to transcribe audio:', error);
    handleApiError(error, { operation: 'transcribe audio', resource: 'speech-to-text' });
    throw error;
  }
};

export const getAgentBuilderChatHistory = async (agentId: string): Promise<{messages: Message[], thread_id: string | null}> => {
  // const supabase = createClient(); // Supabase client removed
  const { data: authData } = await LocalAuth.getUser(); // Use local auth
  const mockSession = authData.user ? { access_token: 'mock-token-for-local-dev' } : null; // Mock session
  // TODO: Review if backend /agents/.../builder-chat-history needs auth in local mode

  if (!mockSession?.access_token) {
    throw new Error('No access token available (mock)');
  }

  const response = await fetch(`${API_URL}/agents/${agentId}/builder-chat-history`, {
    headers: {
      Authorization: `Bearer ${mockSession.access_token}`, // Use mock token
    },
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'No error details available');
    console.error(`Error getting agent builder chat history: ${response.status} ${response.statusText}`, errorText);
    throw new Error(`Error getting agent builder chat history: ${response.statusText}`);
  }

  const data = await response.json();
  console.log('[API] Agent builder chat history fetched:', data);

  return data;
};
