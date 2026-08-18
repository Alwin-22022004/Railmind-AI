import api from "./api";
export const getAssets = async () => (await api.get("/assets")).data;
export const createAsset = async (data) => (await api.post("/assets", data)).data;
export const updateAsset = async (id, data) => (await api.put(`/assets/${id}`, data)).data;
export const deactivateAsset = async (id) => (await api.patch(`/assets/${id}/deactivate`)).data;
