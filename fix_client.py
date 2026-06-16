content = open('frontend/src/api/client.ts', encoding='utf-8').read()

old = '''export const servicesApi = {
  list:       (p?: any) => api.get<any>("/services", p),
  categories: () => api.get<any>("/service-categories"),
  create:     (dto: any) => api.post<any>("/services", dto),
  update:     (id: string, dto: any) => api.patch<any>(`/services/${id}`, dto),
};'''

new = '''export const servicesApi = {
  list:           (p?: any) => api.get<any>("/services", p),
  categories:     () => api.get<any>("/service-categories"),
  create:         (dto: any) => api.post<any>("/services", dto),
  update:         (id: string, dto: any) => api.patch<any>(`/services/${id}`, dto),
  createCategory: (dto: any) => api.post<any>("/service-categories", dto),
  deleteCategory: (id: string) => api.delete(`/service-categories/${id}`),
};'''

if old in content:
    content = content.replace(old, new)
    print("OK")
else:
    print("NAO ENCONTRADO")

open('frontend/src/api/client.ts', 'w', encoding='utf-8').write(content)
