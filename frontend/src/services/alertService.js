import api from "./api";

export const getAlerts = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.assetCode) params.append("assetCode", filters.assetCode);
  if (filters.severity) params.append("severity", filters.severity);
  if (filters.status) params.append("status", filters.status);
  if (filters.limit) params.append("limit", filters.limit);

  const query = params.toString() ? `?${params.toString()}` : "";
  return (await api.get(`/alerts${query}`)).data;
};

export const acknowledgeAlert = async (id) =>
  (await api.patch(`/alerts/${id}/acknowledge`)).data;

export const assignAlert = async (id, assignedTo) =>
  (await api.patch(`/alerts/${id}/assign`, { assignedTo })).data;

export const resolveAlert = async (id, resolutionNotes = "") =>
  (await api.patch(`/alerts/${id}/resolve`, { resolutionNotes })).data;
