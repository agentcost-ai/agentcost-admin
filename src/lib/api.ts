/**
 * Admin API client for AgentCost backend
 *
 * All requests target /v1/admin/* endpoints which require superuser JWT.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

if (typeof window !== "undefined" && API_BASE === "http://localhost:8000") {
  console.warn(
    "[AgentCost Admin] NEXT_PUBLIC_API_URL is not set — defaulting to http://localhost:8000. " +
      "Set NEXT_PUBLIC_API_URL in your environment for production.",
  );
}

class AdminApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "AdminApiError";
    this.status = status;
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("admin_refresh_token");
}

// M8 fix: mutex to prevent concurrent token refresh storms
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = doRefreshAccessToken();
  try {
    return await refreshPromise;
  } finally {
    refreshPromise = null;
  }
}

async function doRefreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const response = await fetch(`${API_BASE}/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    localStorage.setItem("admin_access_token", data.access_token);
    if (data.refresh_token) {
      localStorage.setItem("admin_refresh_token", data.refresh_token);
    }
    return data.access_token;
  } catch {
    return null;
  }
}

async function request<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  let token = getToken();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  let response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If 401, try refreshing the token once
  if (response.status === 401 && token) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers["Authorization"] = `Bearer ${newToken}`;
      response = await fetch(`${API_BASE}${path}`, { ...options, headers });
    }
  }

  if (!response.ok) {
    const body = await response
      .json()
      .catch(() => ({ detail: response.statusText }));
    throw new AdminApiError(body.detail || "Request failed", response.status);
  }

  return response.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export async function adminLogin(
  email: string,
  password: string,
): Promise<{
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    email: string;
    name: string | null;
    is_superuser?: boolean;
  };
}> {
  // Step 1: Authenticate via the standard auth endpoint
  const res = await fetch(`${API_BASE}/v1/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: "Login failed" }));
    if (res.status === 401 || res.status === 400) {
      throw new AdminApiError("Invalid email or password.", res.status);
    }
    if (res.status === 403) {
      throw new AdminApiError(
        "This account has been disabled. Contact your administrator.",
        403,
      );
    }
    throw new AdminApiError(
      body.detail || "Authentication server unavailable. Try again later.",
      res.status,
    );
  }

  const data = await res.json();

  // Step 2: Verify superuser access via admin endpoint
  const verifyRes = await fetch(`${API_BASE}/v1/admin/auth/verify`, {
    headers: { Authorization: `Bearer ${data.access_token}` },
  });

  if (!verifyRes.ok) {
    throw new AdminApiError(
      "Access denied. This account does not have admin privileges.",
      403,
    );
  }

  return data;
}

export async function verifyAdmin(): Promise<{
  id: string;
  email: string;
  name: string | null;
  is_superuser: boolean;
}> {
  return request("/v1/admin/auth/verify");
}

// ---------------------------------------------------------------------------
// Overview
// ---------------------------------------------------------------------------

export interface PlatformStats {
  total_users: number;
  active_users: number;
  total_projects: number;
  active_projects: number;
  total_events: number;
  total_tokens: number;
  total_cost: number;
  active_sdk_installations: number;
}

export async function getPlatformStats(): Promise<PlatformStats> {
  return request("/v1/admin/overview/stats");
}

export interface TimeseriesPoint {
  date: string;
  events: number;
  cost: number;
  tokens: number;
}

export async function getPlatformTimeseries(
  range = "30d",
): Promise<TimeseriesPoint[]> {
  return request(`/v1/admin/overview/timeseries?range=${range}`);
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export interface AdminUser {
  id: string;
  email: string;
  name: string | null;
  is_active: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  user_number: number | null;
  milestone_badge: string | null;
  created_at: string | null;
  last_login_at: string | null;
}

export interface UserListResponse {
  items: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}

export async function listUsers(params: {
  search?: string;
  is_active?: boolean;
  is_superuser?: boolean;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: string;
}): Promise<UserListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.is_active !== undefined)
    qs.set("is_active", String(params.is_active));
  if (params.is_superuser !== undefined)
    qs.set("is_superuser", String(params.is_superuser));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.sort) qs.set("sort", params.sort);
  if (params.order) qs.set("order", params.order);
  return request(`/v1/admin/users?${qs.toString()}`);
}

export interface UserDetail {
  id: string;
  email: string;
  name: string | null;
  avatar_url: string | null;
  is_active: boolean;
  is_superuser: boolean;
  email_verified: boolean;
  admin_notes: string | null;
  user_number: number | null;
  milestone_badge: string | null;
  created_at: string | null;
  last_login_at: string | null;
  active_sessions: number;
  owned_projects: {
    id: string;
    name: string;
    is_active: boolean;
    created_at: string | null;
  }[];
  memberships: { project_id: string; project_name: string; role: string }[];
  milestones: {
    id: string;
    milestone_type: string;
    milestone_name: string;
    milestone_description: string | null;
    achieved_at: string | null;
  }[];
  usage: { total_events: number; total_tokens: number; total_cost: number };
}

export async function getUserDetail(userId: string): Promise<UserDetail> {
  return request(`/v1/admin/users/${userId}`);
}

export async function updateUser(
  userId: string,
  data: { is_active?: boolean; is_superuser?: boolean },
): Promise<{
  id: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  message: string;
}> {
  return request(`/v1/admin/users/${userId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function revokeUserSessions(
  userId: string,
): Promise<{ revoked: number }> {
  return request(`/v1/admin/users/${userId}/revoke-sessions`, {
    method: "POST",
  });
}

export async function deleteUser(
  userId: string,
): Promise<{ message: string; user_id: string; email: string }> {
  return request(`/v1/admin/users/${userId}`, { method: "DELETE" });
}

export async function setAdminNotes(
  userId: string,
  notes: string,
): Promise<{ message: string; user_id: string }> {
  return request(`/v1/admin/users/${userId}/notes`, {
    method: "PUT",
    body: JSON.stringify({ notes }),
  });
}

export async function sendEmailToUser(
  userId: string,
  subject: string,
  body: string,
): Promise<{ message: string; recipient: string }> {
  return request(`/v1/admin/users/${userId}/send-email`, {
    method: "POST",
    body: JSON.stringify({ subject, body }),
  });
}

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export interface AdminProject {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  key_prefix: string | null;
  owner_email: string | null;
  owner_name: string | null;
  created_at: string | null;
  event_count: number;
  last_event_at: string | null;
}

export interface ProjectListResponse {
  items: AdminProject[];
  total: number;
  limit: number;
  offset: number;
}

export async function listProjects(params: {
  search?: string;
  is_active?: boolean;
  limit?: number;
  offset?: number;
}): Promise<ProjectListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.is_active !== undefined)
    qs.set("is_active", String(params.is_active));
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/projects?${qs.toString()}`);
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  key_prefix: string | null;
  key_created_at: string | null;
  owner: { id: string; email: string; name: string | null } | null;
  members: {
    user_id: string;
    email: string;
    name: string | null;
    role: string;
  }[];
  usage: {
    total_events: number;
    total_tokens: number;
    total_cost: number;
    first_event_at: string | null;
    last_event_at: string | null;
  };
}

export async function getProjectDetail(
  projectId: string,
): Promise<ProjectDetail> {
  return request(`/v1/admin/projects/${projectId}`);
}

export async function updateProject(
  projectId: string,
  data: { is_active?: boolean },
): Promise<{ id: string; is_active: boolean; message: string }> {
  return request(`/v1/admin/projects/${projectId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function rotateProjectKey(
  projectId: string,
): Promise<{ id: string; key_prefix: string; message: string }> {
  return request(`/v1/admin/projects/${projectId}/rotate-key`, {
    method: "POST",
  });
}

export async function revokeProjectKey(
  projectId: string,
): Promise<{ id: string; is_active: boolean; message: string }> {
  return request(`/v1/admin/projects/${projectId}/revoke-key`, {
    method: "POST",
  });
}

// ---------------------------------------------------------------------------
// Pricing
// ---------------------------------------------------------------------------

export interface PricingModel {
  id: number;
  model_name: string;
  provider: string;
  input_price_per_1k: number;
  output_price_per_1k: number;
  is_active: boolean;
  pricing_source: string;
  max_tokens: number | null;
  supports_vision: boolean;
  supports_function_calling: boolean;
  source_updated_at: string | null;
  updated_at: string | null;
}

export interface PricingListResponse {
  items: PricingModel[];
  total: number;
  limit: number;
  offset: number;
}

export async function listPricingModels(params: {
  search?: string;
  provider?: string;
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<PricingListResponse> {
  const qs = new URLSearchParams();
  if (params.search) qs.set("search", params.search);
  if (params.provider) qs.set("provider", params.provider);
  if (params.source) qs.set("source", params.source);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/pricing/models?${qs.toString()}`);
}

export interface ProviderSummary {
  provider: string;
  model_count: number;
  avg_input_price: number;
  avg_output_price: number;
}

export async function listPricingProviders(): Promise<ProviderSummary[]> {
  return request("/v1/admin/pricing/providers");
}

export async function updateModelPricing(
  modelId: number,
  data: {
    input_price_per_1k?: number;
    output_price_per_1k?: number;
    is_active?: boolean;
    notes?: string;
  },
): Promise<{
  id: number;
  model_name: string;
  pricing_source: string;
  message: string;
}> {
  return request(`/v1/admin/pricing/models/${modelId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function syncLitellmPricing(): Promise<Record<string, unknown>> {
  return request("/v1/admin/pricing/sync/litellm", { method: "POST" });
}

export async function syncOpenrouterPricing(): Promise<
  Record<string, unknown>
> {
  return request("/v1/admin/pricing/sync/openrouter", { method: "POST" });
}

// ---------------------------------------------------------------------------
// Pricing Sync History
// ---------------------------------------------------------------------------

export interface PricingSyncLogEntry {
  id: string;
  admin_id: string | null;
  source: string;
  status: string;
  models_created: number;
  models_updated: number;
  models_skipped: number;
  new_models: Record<string, unknown>[] | null;
  price_changes: Record<string, unknown>[] | null;
  capability_changes: Record<string, unknown>[] | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string | null;
}

export interface PricingSyncHistoryResponse {
  items: PricingSyncLogEntry[];
  total: number;
  limit: number;
  offset: number;
}

export async function getPricingSyncHistory(params: {
  source?: string;
  limit?: number;
  offset?: number;
}): Promise<PricingSyncHistoryResponse> {
  const qs = new URLSearchParams();
  if (params.source) qs.set("source", params.source);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/pricing/sync-history?${qs.toString()}`);
}

// ---------------------------------------------------------------------------
// System Health
// ---------------------------------------------------------------------------

export interface SystemHealth {
  status: string;
  database: {
    connected: boolean;
    tables: Record<string, number>;
  };
  ingestion: {
    events_24h: number;
    errors_24h: number;
    error_rate_24h: number;
    last_event_at: string | null;
  };
  pricing: {
    total_models: number;
  };
  version: string;
  environment: string;
}

export async function getSystemHealth(): Promise<SystemHealth> {
  return request("/v1/admin/system/health");
}

export interface IngestionStat {
  date: string;
  total: number;
  success: number;
  failed: number;
}

export async function getIngestionStats(
  range = "24h",
): Promise<IngestionStat[]> {
  return request(`/v1/admin/system/ingestion-stats?range=${range}`);
}

// ---------------------------------------------------------------------------
// Platform Analytics
// ---------------------------------------------------------------------------

export interface TopModel {
  model: string;
  calls: number;
  tokens: number;
  cost: number;
  project_count: number;
}

export async function getTopModels(
  range = "30d",
  limit = 20,
): Promise<TopModel[]> {
  return request(
    `/v1/admin/analytics/top-models?range=${range}&limit=${limit}`,
  );
}

export interface TopSpender {
  project_id: string;
  project_name: string;
  owner_email: string | null;
  cost: number;
  calls: number;
  tokens: number;
}

export async function getTopSpenders(
  range = "30d",
  limit = 20,
): Promise<TopSpender[]> {
  return request(
    `/v1/admin/analytics/top-spenders?range=${range}&limit=${limit}`,
  );
}

export interface ProviderGrowthPoint {
  date: string;
  provider: string;
  calls: number;
  cost: number;
}

export async function getProviderGrowth(
  range = "30d",
): Promise<ProviderGrowthPoint[]> {
  return request(`/v1/admin/analytics/provider-growth?range=${range}`);
}

export interface CostPerUser {
  total_cost: number;
  unique_users: number;
  avg_cost_per_user: number;
}

export async function getCostPerUser(range = "30d"): Promise<CostPerUser> {
  return request(`/v1/admin/analytics/cost-per-user?range=${range}`);
}

// ---------------------------------------------------------------------------
// Incidents
// ---------------------------------------------------------------------------

export interface FailedEvent {
  id: string;
  project_id: string;
  project_name: string;
  model: string;
  agent_name: string;
  error: string | null;
  timestamp: string | null;
}

export interface FailedEventsResponse {
  items: FailedEvent[];
  total: number;
  limit: number;
  offset: number;
}

export async function getFailedEvents(params: {
  limit?: number;
  offset?: number;
  project_id?: string;
}): Promise<FailedEventsResponse> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  if (params.project_id) qs.set("project_id", params.project_id);
  return request(`/v1/admin/incidents/events?${qs.toString()}`);
}

export interface FeedbackIncident {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  user_email: string | null;
  created_at: string | null;
  admin_response: string | null;
}

export interface FeedbackIncidentsResponse {
  items: FeedbackIncident[];
  total: number;
  limit: number;
  offset: number;
}

export async function getFeedbackIncidents(params: {
  status?: string;
  priority?: string;
  type?: string;
  limit?: number;
  offset?: number;
}): Promise<FeedbackIncidentsResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);
  if (params.type) qs.set("type", params.type);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/incidents/feedback?${qs.toString()}`);
}

// ---------------------------------------------------------------------------
// Audit Log
// ---------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  feedback_id: string;
  event_type: string;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  actor_id: string | null;
  created_at: string | null;
}

export interface AuditLogResponse {
  items: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export async function getAuditLog(params: {
  limit?: number;
  offset?: number;
}): Promise<AuditLogResponse> {
  const qs = new URLSearchParams();
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/audit-log?${qs.toString()}`);
}

// ---------------------------------------------------------------------------
// Feedback Management
// ---------------------------------------------------------------------------

export interface AdminFeedback {
  id: string;
  type: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  upvotes: number;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  model_name: string | null;
  model_provider: string | null;
  admin_response: string | null;
  admin_responded_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminFeedbackListResponse {
  items: AdminFeedback[];
  total: number;
  limit: number;
  offset: number;
}

export async function listFeedback(params: {
  status?: string;
  priority?: string;
  type?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminFeedbackListResponse> {
  const qs = new URLSearchParams();
  if (params.status) qs.set("status", params.status);
  if (params.priority) qs.set("priority", params.priority);
  if (params.type) qs.set("type", params.type);
  if (params.search) qs.set("search", params.search);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/feedback?${qs.toString()}`);
}

export interface AdminFeedbackDetail extends AdminFeedback {
  environment: string | null;
  is_confidential: boolean;
  attachments: Record<string, unknown>[] | null;
  client_metadata: Record<string, unknown> | null;
  comments: {
    id: string;
    user_name: string | null;
    comment: string;
    is_admin: boolean;
    is_internal: boolean;
    created_at: string | null;
  }[];
  events: {
    id: string;
    event_type: string;
    old_value: Record<string, unknown> | null;
    new_value: Record<string, unknown> | null;
    actor_id: string | null;
    created_at: string | null;
  }[];
}

export async function getFeedbackDetail(
  feedbackId: string,
): Promise<AdminFeedbackDetail> {
  return request(`/v1/admin/feedback/${feedbackId}`);
}

export async function updateFeedback(
  feedbackId: string,
  data: {
    status?: string;
    priority?: string;
    admin_response?: string;
  },
): Promise<{
  id: string;
  status: string;
  priority: string;
  admin_response: string | null;
  message: string;
}> {
  return request(`/v1/admin/feedback/${feedbackId}`, {
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

// ---------------------------------------------------------------------------
// Enhanced Audit Log
// ---------------------------------------------------------------------------

export interface AdminAuditEntry {
  id: string;
  admin_id: string | null;
  admin_email: string | null;
  admin_name: string | null;
  action_type: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface AdminAuditLogResponse {
  items: AdminAuditEntry[];
  total: number;
  limit: number;
  offset: number;
}

export async function getAdminAuditLog(params: {
  action_type?: string;
  target_type?: string;
  admin_id?: string;
  limit?: number;
  offset?: number;
}): Promise<AdminAuditLogResponse> {
  const qs = new URLSearchParams();
  if (params.action_type) qs.set("action_type", params.action_type);
  if (params.target_type) qs.set("target_type", params.target_type);
  if (params.admin_id) qs.set("admin_id", params.admin_id);
  if (params.limit) qs.set("limit", String(params.limit));
  if (params.offset) qs.set("offset", String(params.offset));
  return request(`/v1/admin/audit-log?${qs.toString()}`);
}
