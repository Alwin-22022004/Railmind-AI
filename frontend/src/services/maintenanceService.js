import api from "./api";
export const getMaintenanceLogs = async (assetCode = "") => (await api.get(`/maintenance${assetCode ? `?assetCode=${encodeURIComponent(assetCode)}` : ""}`)).data;
export const createMaintenanceLog = async (data) => (await api.post("/maintenance", data)).data;
