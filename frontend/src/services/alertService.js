import api from "./api";
export const getAlerts = async () => (await api.get("/alerts")).data;
export const resolveAlert = async (id) => (await api.patch(`/alerts/${id}/resolve`)).data;
