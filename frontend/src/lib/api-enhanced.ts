import * as LocalAuth from '@/lib/auth'; // Import local auth functions
import { getDatabase } from '@/lib/rxdb/database'; // Import RxDB
import { backendApi, supabaseClient } from './api-client'; // supabaseClient might need to be phased out or adapted
import { handleApiSuccess } from './error-handler';
import { 
  Project, 
  Thread, 
  Message, 
  AgentRun, 
  InitiateAgentResponse,
  HealthCheckResponse,
  FileInfo,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  CreatePortalSessionRequest,
  SubscriptionStatus,
  AvailableModelsResponse,
  BillingStatusResponse,
  BillingError
} from './api';

export * from './api';

import { v4 as uuidv4 } from 'uuid'; // For generating IDs

export const projectsApi = {
  async getAll(): Promise<Project[]> {
    // Replaces the supabaseClient.execute wrapper for direct RxDB call
    try {
      const { data: userData, error: userError } = await LocalAuth.getUser();
      if (userError) {
        console.error('Error getting current user (mock):', userError);
        return [];
      }
      if (!userData.user) {
        console.log('[API-Enhanced] No user logged in (mock), returning empty projects array');
        return [];
      }
      const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

      console.log(`[RxDB-Enhanced] Fetching projects for account_id: ${MOCK_ACCOUNT_ID}`);
      const db = await getDatabase();
      if (!db.projects) {
        console.warn("[RxDB-Enhanced] projects collection not found.");
        return [];
      }
      
      const projectsQuery = db.projects.find({
        selector: {
          // account_id: MOCK_ACCOUNT_ID // TODO: Add account_id to project schema for filtering
        }
      });
      const projectsDocs = await projectsQuery.exec();
      
      const mappedProjects: Project[] = projectsDocs.map(doc => ({
        ...doc.toJSON(),
        id: doc.id, // Ensure 'id' is mapped if RxDB uses a different primary key name internally
      })) as Project[];
      
      console.log('[RxDB-Enhanced] Mapped projects:', mappedProjects.length);
      return mappedProjects;
    } catch (error) {
      console.error("Error in projectsApi.getAll (RxDB):", error);
      // Consider how error handling from supabaseClient.execute should be replicated
      return [];
    }
  },

  async getById(projectId: string): Promise<Project | null> {
    try {
      console.log(`[RxDB-Enhanced] Fetching project by id: ${projectId}`);
      const db = await getDatabase();
      if (!db.projects) {
        console.warn(`[RxDB-Enhanced] projects collection not found for getById(${projectId}).`);
        return null;
      }
      const projectDoc = await db.projects.findOne(projectId).exec();

      if (!projectDoc) {
        console.warn(`[RxDB-Enhanced] Project ${projectId} not found.`);
        return null;
      }
      
      const plainDoc = projectDoc.toJSON();
      const MOCK_ACCOUNT_ID = `mock-account-for-${(await LocalAuth.getUser()).data.user?.id || 'unknown_user'}`;

      if (plainDoc.sandbox?.id) {
        // Backend API call for sandbox activation remains unchanged for now
        backendApi.post(`/project/${projectId}/sandbox/ensure-active`, undefined, {
          showErrors: false,
          errorContext: { silent: true }
        });
      }

      return {
        ...plainDoc,
        id: plainDoc.id,
        account_id: plainDoc.account_id || MOCK_ACCOUNT_ID, // Ensure account_id consistency
      } as Project;
    } catch (error) {
      console.error(`Error in projectsApi.getById (RxDB) for ${projectId}:`, error);
      return null;
    }
  },

  async create(projectData: { name: string; description: string }, accountId?: string): Promise<Project | null> {
    try {
      if (!accountId) {
        const { data: userData, error: userError } = await LocalAuth.getUser();
        if (userError || !userData.user) {
          throw new Error('User not authenticated for createProject (mock)');
        }
        accountId = `mock-account-for-${userData.user.id}`;
      }

      console.log(`[RxDB-Enhanced] Creating project for account_id: ${accountId}`);
      const db = await getDatabase();
      if (!db.projects) throw new Error("Projects collection not available");
      
      const newProjectId = uuidv4();
      const newProjectRxData = {
        id: newProjectId,
        name: projectData.name,
        description: projectData.description || '',
        account_id: accountId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
        sandbox: { id: '', pass: '', vnc_preview: '', sandbox_url: '' },
      };
      const newDoc = await db.projects.insert(newProjectRxData);
      return { ...newDoc.toJSON(), id: newDoc.id } as Project;
    } catch (error) {
      console.error("Error in projectsApi.create (RxDB):", error);
      return null;
    }
  },

  async update(projectId: string, updateData: Partial<Project>): Promise<Project | null> {
    if (!projectId) throw new Error('Cannot update project: Invalid project ID');
    try {
      console.log(`[RxDB-Enhanced] Updating project ID: ${projectId}`);
      const db = await getDatabase();
      if (!db.projects) throw new Error("Projects collection not available");

      const projectDoc = await db.projects.findOne(projectId).exec();
      if (!projectDoc) throw new Error(`Project ${projectId} not found.`);

      const dataToSet = { ...updateData, updated_at: new Date().toISOString() };
      delete dataToSet.id;
      delete dataToSet.account_id;

      await projectDoc.patch(dataToSet);

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('project-updated', { detail: { projectId, updatedData: projectDoc.toJSON() } }));
      }
      return { ...projectDoc.toJSON(), id: projectDoc.id } as Project;
    } catch (error) {
      console.error(`Error in projectsApi.update (RxDB) for ${projectId}:`, error);
      return null;
    }
  },

  async delete(projectId: string): Promise<boolean> {
    try {
      console.log(`[RxDB-Enhanced] Deleting project ID: ${projectId}`);
      const db = await getDatabase();
      if (!db.projects) throw new Error("Projects collection not available");
      const projectDoc = await db.projects.findOne(projectId).exec();
      if (!projectDoc) {
        console.warn(`[RxDB-Enhanced] Project ${projectId} not found for deletion.`);
        return false; // Or true if "not found" means "successfully deleted" idempotent-style
      }
      await projectDoc.remove();
      return true;
    } catch (error) {
      console.error(`Error in projectsApi.delete (RxDB) for ${projectId}:`, error);
      return false;
    }
  },
};

export const threadsApi = {
  async getAll(projectId?: string): Promise<Thread[]> {
    try {
      const { data: userData, error: userError } = await LocalAuth.getUser();
      if (userError || !userData.user) {
        console.error('[API-Enhanced] User not authenticated for threadsApi.getAll:', userError);
        return [];
      }
      const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

      console.log(`[RxDB-Enhanced] Fetching threads for account_id: ${MOCK_ACCOUNT_ID}` + (projectId ? ` and project_id: ${projectId}` : ""));
      const db = await getDatabase();
      if (!db.threads) {
        console.warn("[RxDB-Enhanced] threads collection not found.");
        return [];
      }

      const selector: any = { 
        // account_id: MOCK_ACCOUNT_ID // TODO: Add account_id to thread schema for filtering
      };
      if (projectId) {
        selector.project_id = projectId;
      }

      const threadsQuery = db.threads.find({ selector });
      const threadsDocs = await threadsQuery.exec();
      
      const mappedThreads: Thread[] = threadsDocs.map(doc => ({
        ...doc.toJSON(),
        thread_id: doc.id, // Map RxDB 'id' to 'thread_id'
      })) as Thread[];

      console.log('[RxDB-Enhanced] Mapped threads:', mappedThreads.length);
      return mappedThreads;
    } catch (error) {
      console.error("Error in threadsApi.getAll (RxDB):", error);
      return [];
    }
  },

  async getById(threadId: string): Promise<Thread | null> {
    try {
      console.log(`[RxDB-Enhanced] Fetching thread by id: ${threadId}`);
      const db = await getDatabase();
      if (!db.threads) {
        console.warn(`[RxDB-Enhanced] threads collection not found for getById(${threadId}).`);
        return null;
      }
      const threadDoc = await db.threads.findOne(threadId).exec();

      if (!threadDoc) {
        console.warn(`[RxDB-Enhanced] Thread ${threadId} not found.`);
        return null;
      }
      return { ...threadDoc.toJSON(), thread_id: threadDoc.id } as Thread;
    } catch (error) {
      console.error(`Error in threadsApi.getById (RxDB) for ${threadId}:`, error);
      return null;
    }
  },

  async create(projectId: string): Promise<Thread | null> {
    try {
      const { data: userData, error: userError } = await LocalAuth.getUser();
      if (userError || !userData.user) {
        throw new Error('User not authenticated for threadsApi.create (mock)');
      }
      const MOCK_ACCOUNT_ID = `mock-account-for-${userData.user.id}`;

      console.log(`[RxDB-Enhanced] Creating thread for project_id: ${projectId}, account_id: ${MOCK_ACCOUNT_ID}`);
      const db = await getDatabase();
      if (!db.threads) throw new Error("Threads collection not available");

      const newThreadId = uuidv4();
      const newThreadRxData = {
        id: newThreadId,
        project_id: projectId,
        account_id: MOCK_ACCOUNT_ID,
        created_by: userData.user.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_public: false,
      };
      const newDoc = await db.threads.insert(newThreadRxData);
      return { ...newDoc.toJSON(), thread_id: newDoc.id } as Thread;
    } catch (error) {
      console.error("Error in threadsApi.create (RxDB):", error);
      return null;
    }
  },
};

export const agentApi = {
  async start(
    threadId: string,
    options?: {
      model_name?: string;
      enable_thinking?: boolean;
      reasoning_effort?: string;
      stream?: boolean;
    }
  ): Promise<{ agent_run_id: string } | null> {
    const result = await backendApi.post(
      `/thread/${threadId}/agent/start`,
      options,
      {
        errorContext: { operation: 'start agent', resource: 'AI assistant' },
        timeout: 60000,
      }
    );
    return result.data || null;
  },

  async stop(agentRunId: string): Promise<boolean> {
    const result = await backendApi.post(
      `/agent/${agentRunId}/stop`,
      undefined,
      {
        errorContext: { operation: 'stop agent', resource: 'AI assistant' },
      }
    );

    if (result.success) {
      handleApiSuccess('AI assistant stopped');
    }

    return result.success;
  },

  async getStatus(agentRunId: string): Promise<AgentRun | null> {
    const result = await backendApi.get(
      `/agent/${agentRunId}/status`,
      {
        errorContext: { operation: 'get agent status', resource: 'AI assistant status' },
        showErrors: false,
      }
    );

    return result.data || null;
  },

  async getRuns(threadId: string): Promise<AgentRun[]> {
    const result = await backendApi.get(
      `/thread/${threadId}/agent/runs`,
      {
        errorContext: { operation: 'load agent runs', resource: 'conversation history' },
      }
    );

    return result.data || [];
  },
};

export const billingApi = {
  async getSubscription(): Promise<SubscriptionStatus | null> {
    const result = await backendApi.get(
      '/billing/subscription',
      {
        errorContext: { operation: 'load subscription', resource: 'billing information' },
      }
    );

    return result.data || null;
  },

  async checkStatus(): Promise<BillingStatusResponse | null> {
    const result = await backendApi.get(
      '/billing/status',
      {
        errorContext: { operation: 'check billing status', resource: 'account status' },
      }
    );

    return result.data || null;
  },

  async createCheckoutSession(request: CreateCheckoutSessionRequest): Promise<CreateCheckoutSessionResponse | null> {
    const result = await backendApi.post(
      '/billing/create-checkout-session',
      request,
      {
        errorContext: { operation: 'create checkout session', resource: 'billing' },
      }
    );

    return result.data || null;
  },

  async createPortalSession(request: CreatePortalSessionRequest): Promise<{ url: string } | null> {
    const result = await backendApi.post(
      '/billing/create-portal-session',
      request,
      {
        errorContext: { operation: 'create portal session', resource: 'billing portal' },
      }
    );

    return result.data || null;
  },

  async getAvailableModels(): Promise<AvailableModelsResponse | null> {
    const result = await backendApi.get(
      '/billing/available-models',
      {
        errorContext: { operation: 'load available models', resource: 'AI models' },
      }
    );

    return result.data || null;
  },
};

export const healthApi = {
  async check(): Promise<HealthCheckResponse | null> {
    const result = await backendApi.get(
      '/health',
      {
        errorContext: { operation: 'check system health', resource: 'system status' },
        timeout: 10000,
      }
    );

    return result.data || null;
  },
}; 