export const userSchema = {
  title: 'User Schema',
  version: 0,
  description: 'Stores user information, mapping to auth.users and relevant personal account details',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 }, // UUID
    aud: { type: 'string' },
    role: { type: 'string' },
    email: { type: 'string', format: 'email' },
    email_confirmed_at: { type: 'string', format: 'date-time' },
    phone: { type: 'string' },
    confirmed_at: { type: 'string', format: 'date-time' },
    last_sign_in_at: { type: 'string', format: 'date-time' },
    app_metadata: { type: 'object' }, // In Supabase, provider, providers
    user_metadata: { type: 'object' }, // In Supabase, name, slug etc. from personal account
    identities: { type: 'array', items: { type: 'object' } },
    created_at: { type: 'string', format: 'date-time' },
    updated_at: { type: 'string', format: 'date-time' },
    // Custom/derived fields
    name: { type: 'string' }, // Often in user_metadata or derived from personal account
    personal_account_id: { type: 'string', maxLength: 36 }, // Could be same as user.id if personal accounts are 1:1
  },
  required: ['id', 'email', 'created_at', 'updated_at'],
};

export const accountSchema = {
  title: 'Account Schema',
  version: 0,
  description: 'Stores account information (teams/organizations)',
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { type: 'string', maxLength: 36 }, // UUID
    primary_owner_user_id: { type: 'string', maxLength: 36, ref: 'users' }, // Foreign key to auth.users
    name: { type: 'string' },
    slug: { type: 'string' }, // Potentially unique
    personal_account: { type: 'boolean', default: false },
    updated_at: { type: 'string', format: 'date-time' },
    created_at: { type: 'string', format: 'date-time' },
    created_by: { type: 'string', maxLength: 36, ref: 'users' }, // Foreign key to auth.users
    updated_by: { type: 'string', maxLength: 36, ref: 'users' }, // Foreign key to auth.users
    private_metadata: { type: 'object' },
    public_metadata: { type: 'object' },
  },
  required: ['id', 'primary_owner_user_id', 'personal_account', 'created_at', 'updated_at'],
  indexes: ['primary_owner_user_id', 'slug', 'personal_account'],
};

export const accountUserSchema = {
  title: 'Account User Schema',
  version: 0,
  description: 'Links users to accounts and defines their roles',
  primaryKey: {
    // Composite primary key
    key: 'id',
    fields: ['user_id', 'account_id'],
    separator: '|',
  },
  type: 'object',
  properties: {
    id: { type: 'string' }, // Generated composite key
    user_id: { type: 'string', maxLength: 36, ref: 'users' }, // Foreign key to auth.users
    account_id: { type: 'string', maxLength: 36, ref: 'accounts' }, // Foreign key to basejump.accounts
    account_role: { type: 'string' }, // Enum: 'owner', 'member'
  },
  required: ['user_id', 'account_id', 'account_role'],
  indexes: ['user_id', 'account_id', ['user_id', 'account_id']], // Index for lookups
};

export const billingCustomerSchema = {
  title: 'Billing Customer Schema',
  version: 0,
  description: 'Maps accounts to billing provider customer IDs',
  primaryKey: 'id', // This is the Stripe customer ID or similar
  type: 'object',
  properties: {
    id: { type: 'string' }, // Billing provider's customer ID
    account_id: { type: 'string', maxLength: 36, ref: 'accounts' }, // Foreign key to basejump.accounts
    email: { type: 'string', format: 'email' },
    active: { type: 'boolean' },
    provider: { type: 'string' }, // e.g., 'stripe'
  },
  required: ['id', 'account_id'],
  indexes: ['account_id', 'provider'],
};

export const billingSubscriptionSchema = {
  title: 'Billing Subscription Schema',
  version: 0,
  description: 'Stores subscription details for accounts',
  primaryKey: 'id', // This is the Stripe subscription ID or similar
  type: 'object',
  properties: {
    id: { type: 'string' }, // Billing provider's subscription ID
    account_id: { type: 'string', maxLength: 36, ref: 'accounts' },
    billing_customer_id: { type: 'string', ref: 'billing_customers' },
    status: { type: 'string' }, // Enum: 'trialing', 'active', etc.
    metadata: { type: 'object' },
    price_id: { type: 'string' },
    plan_name: { type: 'string' },
    quantity: { type: 'integer' },
    cancel_at_period_end: { type: 'boolean' },
    created: { type: 'string', format: 'date-time' },
    current_period_start: { type: 'string', format: 'date-time' },
    current_period_end: { type: 'string', format: 'date-time' },
    ended_at: { type: ['string', 'null'], format: 'date-time' },
    cancel_at: { type: ['string', 'null'], format: 'date-time' },
    canceled_at: { type: ['string', 'null'], format: 'date-time' },
    trial_start: { type: ['string', 'null'], format: 'date-time' },
    trial_end: { type: ['string', 'null'], format: 'date-time' },
    provider: { type: 'string' }, // e.g., 'stripe'
  },
  required: [
    'id',
    'account_id',
    'billing_customer_id',
    'status',
    'created',
    'current_period_start',
    'current_period_end',
  ],
  indexes: ['account_id', 'billing_customer_id', 'status', 'price_id', 'provider'],
};

export const configSchema = {
  title: 'Config Schema',
  version: 0,
  description: 'Stores admin configuration settings',
  primaryKey: 'id', // Assuming a single row, so a fixed ID can be used.
  type: 'object',
  properties: {
    id: { type: 'string', default: 'singleton', final: true }, // To ensure only one config document
    enable_team_accounts: { type: 'boolean', default: true },
    enable_personal_account_billing: { type: 'boolean', default: true },
    enable_team_account_billing: { type: 'boolean', default: true },
    billing_provider: { type: 'string', default: 'stripe' },
    // Add any other settings that might be stored
    updated_at: { type: 'string', format: 'date-time' }, // For tracking when config was last synced/updated
  },
  required: [
    'id',
    'enable_team_accounts',
    'enable_personal_account_billing',
    'enable_team_account_billing',
    'billing_provider',
  ],
};

// It's good practice to type the collections
// export type UserCollection = RxCollection<typeof userSchema>;
// export type AccountCollection = RxCollection<typeof accountSchema>;
// ... and so on for other schemas

// Similarly, for the database type
// export type MyDatabaseCollections = {
//   users: UserCollection;
//   accounts: AccountCollection;
//   account_users: AccountUserCollection;
//   billing_customers: BillingCustomerCollection;
//   billing_subscriptions: BillingSubscriptionCollection;
//   config: ConfigCollection;
// };
// export type MyDatabase = RxDatabase<MyDatabaseCollections>;
