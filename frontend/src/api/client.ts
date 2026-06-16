import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  import.meta.env["VITE_SUPABASE_URL"],
  import.meta.env["VITE_SUPABASE_ANON_KEY"],
);

class ApiClient {
  private readonly baseUrl = `${import.meta.env["VITE_API_URL"] ?? "http://localhost:3000"}/api/v1`;

  private async getToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    if (token) return token;
    throw new Error("Sessao expirada");
  }

  private async request<T>(method: string, endpoint: string, body?: unknown, params?: Record<string, any>): Promise<T> {
    const token = await this.getToken();
    let url = `${this.baseUrl}${endpoint}`;
    if (params) {
      const qs = new URLSearchParams();
      Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null && v !== "") qs.set(k, String(v)); });
      const s = qs.toString();
      if (s) url += `?${s}`;
    }
    const headers: Record<string, string> = { "Authorization": `Bearer ${token}` };
    if (body !== undefined) headers["Content-Type"] = "application/json";

    const res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return undefined as T;
    const json = await res.json();
    if (!res.ok || json.success === false) throw new Error(json.error ?? json.message ?? "Erro desconhecido");
    return json as T;
  }

  get<T>(endpoint: string, params?: Record<string, any>) { return this.request<T>("GET", endpoint, undefined, params); }
  post<T>(endpoint: string, body?: unknown) { return this.request<T>("POST", endpoint, body); }
  patch<T>(endpoint: string, body?: unknown) { return this.request<T>("PATCH", endpoint, body); }
  delete<T = void>(endpoint: string) { return this.request<T>("DELETE", endpoint); }
}

export const api = new ApiClient();

export const clientsApi = {
  list:      (p?: any) => api.get<any>("/clients", p),
  getById:   (id: string) => api.get<any>(`/clients/${id}`),
  create:    (dto: any) => api.post<any>("/clients", dto),
  update:    (id: string, dto: any) => api.patch<any>(`/clients/${id}`, dto),
  remove:    (id: string) => api.delete(`/clients/${id}`),
  birthdays: () => api.get<any>("/clients/birthdays"),
  atRisk:    () => api.get<any>("/clients/at-risk"),
};

export const appointmentsApi = {
  list:     (p?: any) => api.get<any>("/appointments", p),
  today:    () => api.get<any>("/appointments/today"),
  create:   (dto: any) => api.post<any>("/appointments", dto),
  update:   (id: string, dto: any) => api.patch<any>(`/appointments/${id}`, dto),
  confirm:  (id: string) => api.post<any>(`/appointments/${id}/confirm`),
  checkin:  (id: string) => api.post<any>(`/appointments/${id}/checkin`),
  complete: (id: string, dto: any) => api.post<any>(`/appointments/${id}/complete`, dto),
  cancel:   (id: string, reason?: string) => api.post<any>(`/appointments/${id}/cancel`, { reason }),
  noShow:   (id: string) => api.post<any>(`/appointments/${id}/no-show`),
  remove:   (id: string) => api.delete(`/appointments/${id}`),
};

export const professionalsApi = {
  list:        (p?: any) => api.get<any>("/professionals", p),
  create:      (dto: any) => api.post<any>("/professionals", dto),
  update:      (id: string, dto: any) => api.patch<any>(`/professionals/${id}`, dto),
  commissions: (id: string, p?: any) => api.get<any>(`/professionals/${id}/commissions`, p),
};

export const servicesApi = {
  list:           (p?: any) => api.get<any>("/services", p),
  categories:     () => api.get<any>("/service-categories"),
  create:         (dto: any) => api.post<any>("/services", dto),
  update:         (id: string, dto: any) => api.patch<any>(`/services/${id}`, dto),
  createCategory: (dto: any) => api.post<any>("/service-categories", dto),
  deleteCategory: (id: string) => api.delete(`/service-categories/${id}`),
};

export const packagesApi = {
  list:       (p?: any) => api.get<any>("/packages", p),
  create:     (dto: any) => api.post<any>("/packages", dto),
  useSession: (id: string) => api.post<any>(`/packages/${id}/use-session`),
};

export const financialApi = {
  list:           (p?: any) => api.get<any>("/financial", p),
  summary:        () => api.get<any>("/financial/summary"),
  accounts:       () => api.get<any>("/financial/accounts"),
  categories:     (p?: any) => api.get<any>("/financial/categories", p),
  create:         (dto: any) => api.post<any>("/financial", dto),
  update:         (id: string, dto: any) => api.patch<any>(`/financial/${id}`, dto),
  confirmPayment: (id: string, dto: any) => api.post<any>(`/financial/${id}/confirm-payment`, dto),
};

export const commissionsApi = {
  list: (p?: any) => api.get<any>("/commissions", p),
  pay:  (id: string) => api.post<any>(`/commissions/${id}/pay`),
};

export const dashboardApi = {
  kpis:        () => api.get<any>("/dashboard/kpis"),
  agenda:      () => api.get<any>("/dashboard/agenda"),
  churnRisk:   () => api.get<any>("/dashboard/churn-risk"),
  birthdays:   () => api.get<any>("/dashboard/birthdays"),
  performance: () => api.get<any>("/dashboard/professionals-performance"),
};

export const crmApi = {
  leads:   (p?: any) => api.get<any>("/leads", p),
  create:  (dto: any) => api.post<any>("/leads", dto),
  update:  (id: string, dto: any) => api.patch<any>(`/leads/${id}`, dto),
  convert: (id: string, dto: any) => api.post<any>(`/leads/${id}/convert`, dto),
};

export const loyaltyApi = {
  get:       (clientId: string) => api.get<any>(`/loyalty/${clientId}`),
  addPoints: (dto: any) => api.post<any>("/loyalty/add-points", dto),
  referrals: () => api.get<any>("/referrals"),
};

export const whatsappApi = {
  send:          (dto: any) => api.post<any>("/whatsapp/send", dto),
  status:        () => api.get<any>("/whatsapp/status"),
  notifications: (p?: any) => api.get<any>("/whatsapp/notifications", p),
  templates:     () => api.get<any>("/whatsapp/templates"),
  link:          (phone: string, msg?: string) => api.get<any>("/whatsapp/link", { phone, message: msg }),
};
export const notificationsApi = {
  list:       (p?: any) => api.get<any>('/automations/notifications', p),
  templates:  () => api.get<any>('/automations/templates'),
  sendManual: (dto: any) => api.post<any>('/automations/notifications/send-manual', dto),
  retry:      (id: string) => api.post<any>('/automations/notifications/' + id + '/retry'),
  markSent:   (id: string) => api.post<any>('/automations/notifications/' + id + '/sent'),
};

