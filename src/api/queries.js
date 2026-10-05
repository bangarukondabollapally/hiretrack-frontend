import { QueryClient, useQuery, useMutation } from '@tanstack/react-query';
import axiosInstance from './axiosInstance';

// Single global QueryClient instance
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000, // 60 seconds default
      gcTime: 10 * 60 * 1000, // 10 minutes cache time
      retry: 1,
      refetchOnMount: false, // Do not refetch on mount while data is fresh
      refetchOnWindowFocus: true,
    },
  },
});

// Clear cache helper (called on logout, login, 401, cross-tab switch)
export function clearAllQueryCache() {
  queryClient.clear();
}

// ----------------------------------------------------
// Raw API Fetchers
// ----------------------------------------------------
export const fetchDashboard = () => axiosInstance.get('/api/dashboard').then(r => r.data);
export const fetchApplications = () => axiosInstance.get('/api/applications').then(r => r.data);
export const fetchApplication = (id) => axiosInstance.get(`/api/applications/${id}`).then(r => r.data);
export const fetchInterviews = (params) => {
  const query = new URLSearchParams();
  if (params?.scope) query.set('scope', params.scope);
  if (params?.applicationId) query.set('applicationId', params.applicationId);
  if (params?.outcome) query.set('outcome', params.outcome);
  const qStr = query.toString();
  return axiosInstance.get(`/api/interviews${qStr ? `?${qStr}` : ''}`).then(r => r.data);
};
export const fetchApplicationInterviews = (appId) => axiosInstance.get(`/api/applications/${appId}/interviews`).then(r => r.data);
export const fetchTags = () => axiosInstance.get('/api/tags').then(r => r.data);
export const fetchOpenings = (includeClosed = false) =>
  axiosInstance.get(`/api/openings${includeClosed ? '?includeClosed=true' : ''}`).then(r => r.data);
export const fetchAdminOpenings = () => axiosInstance.get('/api/admin/openings').then(r => r.data);
export const fetchProfile = () => axiosInstance.get('/api/profile').then(r => r.data);

// Assistant Server-side History Fetchers
export const fetchConversations = () => axiosInstance.get('/api/assistant/conversations').then(r => r.data);
export const fetchMessages = (conversationId) =>
  axiosInstance.get(`/api/assistant/conversations/${conversationId}/messages`).then(r => r.data);
export const postConversation = (title) => axiosInstance.post('/api/assistant/conversations', { title }).then(r => r.data);
export const putConversation = ({ id, title }) => axiosInstance.put(`/api/assistant/conversations/${id}`, { title }).then(r => r.data);
export const deleteConversationApi = (id) => axiosInstance.delete(`/api/assistant/conversations/${id}`).then(r => r.data);

// ----------------------------------------------------
// Custom Query Hooks
// ----------------------------------------------------
export function useDashboardQuery(userId, options = {}) {
  return useQuery({
    queryKey: ['dashboard', userId],
    queryFn: fetchDashboard,
    staleTime: 30 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useApplicationsQuery(userId, options = {}) {
  return useQuery({
    queryKey: ['applications', userId],
    queryFn: fetchApplications,
    staleTime: 60 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useApplicationQuery(userId, id, options = {}) {
  return useQuery({
    queryKey: ['application', userId, id],
    queryFn: () => fetchApplication(id),
    staleTime: 60 * 1000,
    enabled: !!userId && !!id,
    ...options,
  });
}

export function useInterviewsQuery(userId, filters = {}, options = {}) {
  return useQuery({
    queryKey: ['interviews', userId, filters],
    queryFn: () => fetchInterviews(filters),
    staleTime: 60 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useApplicationInterviewsQuery(userId, applicationId, options = {}) {
  return useQuery({
    queryKey: ['applicationInterviews', userId, applicationId],
    queryFn: () => fetchApplicationInterviews(applicationId),
    staleTime: 60 * 1000,
    enabled: !!userId && !!applicationId,
    ...options,
  });
}

export function useTagsQuery(userId, options = {}) {
  return useQuery({
    queryKey: ['tags', userId],
    queryFn: fetchTags,
    staleTime: 60 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useOpeningsQuery(userId, includeClosed = false, options = {}) {
  return useQuery({
    queryKey: ['openings', userId, Boolean(includeClosed)],
    queryFn: () => fetchOpenings(includeClosed),
    staleTime: 60 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useAdminOpeningsQuery(userId, options = {}) {
  return useQuery({
    queryKey: ['adminOpenings', userId],
    queryFn: fetchAdminOpenings,
    staleTime: 60 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useProfileQuery(userId, options = {}) {
  return useQuery({
    queryKey: ['profile', userId],
    queryFn: fetchProfile,
    staleTime: 60 * 1000,
    enabled: !!userId,
    ...options,
  });
}

// Assistant Queries & Mutations
export function useConversationsQuery(userId, options = {}) {
  return useQuery({
    queryKey: ['conversations', userId],
    queryFn: fetchConversations,
    staleTime: 10 * 1000,
    enabled: !!userId,
    ...options,
  });
}

export function useMessagesQuery(conversationId, userId, options = {}) {
  return useQuery({
    queryKey: ['messages', userId, conversationId],
    queryFn: () => fetchMessages(conversationId),
    staleTime: 10 * 1000,
    enabled: !!userId && !!conversationId,
    ...options,
  });
}

export function useConversationMessagesQuery(userId, conversationId, options = {}) {
  return useMessagesQuery(conversationId, userId, options);
}

export function useCreateConversationMutation(userId) {
  return useMutation({
    mutationFn: (title) => postConversation(title),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
  });
}

export function useRenameConversationMutation(userId) {
  return useMutation({
    mutationFn: ({ id, title }) => putConversation({ id, title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
  });
}

export function useDeleteConversationMutation(userId) {
  return useMutation({
    mutationFn: (id) => deleteConversationApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', userId] });
    },
  });
}

// ----------------------------------------------------
// Mutation Invalidation Helpers
// ----------------------------------------------------
export function invalidateApplicationQueries(userId) {
  queryClient.invalidateQueries({ queryKey: ['applications', userId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
  queryClient.invalidateQueries({ queryKey: ['interviews', userId] });
}

export function invalidateInterviewQueries(userId, applicationId) {
  queryClient.invalidateQueries({ queryKey: ['interviews', userId] });
  queryClient.invalidateQueries({ queryKey: ['dashboard', userId] });
  queryClient.invalidateQueries({ queryKey: ['applications', userId] });
  if (applicationId) {
    queryClient.invalidateQueries({ queryKey: ['applicationInterviews', userId, applicationId] });
  }
}

export function invalidateTagQueries(userId) {
  queryClient.invalidateQueries({ queryKey: ['tags', userId] });
  queryClient.invalidateQueries({ queryKey: ['applications', userId] });
}

export function invalidateOpeningQueries(userId) {
  queryClient.invalidateQueries({ queryKey: ['openings', userId] });
  queryClient.invalidateQueries({ queryKey: ['adminOpenings', userId] });
}

export function invalidateProfileQueries(userId) {
  queryClient.invalidateQueries({ queryKey: ['profile', userId] });
}

// ----------------------------------------------------
// Prefetch Helper
// ----------------------------------------------------
export function prefetchUserData(userId, role = 'USER') {
  if (!userId) return Promise.resolve();
  const prefetches = [
    queryClient.prefetchQuery({ queryKey: ['openings', userId, false], queryFn: () => fetchOpenings(false), staleTime: 60000 }),
    queryClient.prefetchQuery({ queryKey: ['profile', userId], queryFn: fetchProfile, staleTime: 60000 }),
  ];

  if (role !== 'ADMIN') {
    prefetches.push(
      queryClient.prefetchQuery({ queryKey: ['dashboard', userId], queryFn: fetchDashboard, staleTime: 30000 }),
      queryClient.prefetchQuery({ queryKey: ['applications', userId], queryFn: fetchApplications, staleTime: 60000 }),
      queryClient.prefetchQuery({ queryKey: ['interviews', userId, { scope: 'all' }], queryFn: () => fetchInterviews({ scope: 'all' }), staleTime: 60000 }),
      queryClient.prefetchQuery({ queryKey: ['conversations', userId], queryFn: fetchConversations, staleTime: 10000 }),
    );
  } else {
    prefetches.push(
      queryClient.prefetchQuery({ queryKey: ['adminOpenings', userId], queryFn: fetchAdminOpenings, staleTime: 60000 }),
    );
  }

  return Promise.all(prefetches).catch(() => {});
}

export function prefetchRouteData(userId, path) {
  if (!userId) return;
  if (path === '/dashboard') {
    queryClient.prefetchQuery({ queryKey: ['dashboard', userId], queryFn: fetchDashboard, staleTime: 30000 });
  } else if (path === '/applications') {
    queryClient.prefetchQuery({ queryKey: ['applications', userId], queryFn: fetchApplications, staleTime: 60000 });
  } else if (path === '/interviews') {
    queryClient.prefetchQuery({ queryKey: ['interviews', userId, { scope: 'all' }], queryFn: () => fetchInterviews({ scope: 'all' }), staleTime: 60000 });
  } else if (path === '/openings') {
    queryClient.prefetchQuery({ queryKey: ['openings', userId, false], queryFn: () => fetchOpenings(false), staleTime: 60000 });
  } else if (path === '/admin/openings') {
    queryClient.prefetchQuery({ queryKey: ['adminOpenings', userId], queryFn: fetchAdminOpenings, staleTime: 60000 });
  } else if (path === '/profile') {
    queryClient.prefetchQuery({ queryKey: ['profile', userId], queryFn: fetchProfile, staleTime: 60000 });
  } else if (path.startsWith('/assistant')) {
    queryClient.prefetchQuery({ queryKey: ['conversations', userId], queryFn: fetchConversations, staleTime: 10000 });
  }
}
