import api from "./api";

export async function getAllUsers() {
  const response = await api.get("/users");
  return response.data;
}
export async function createUser(data) {
  const response = await api.post("/users", data);
  return response.data;
}
export async function toggleUserStatus(id) {
  const response = await api.patch(`/users/${id}/toggle-status`);
  return response.data;
}
export async function getPermissions() {
  const response = await api.get("/users/permissions");
  return response.data;
}
export async function getUserAccess(id) {
  const response = await api.get(`/users/${id}/access`);
  return response.data;
}
export async function updateUserAccess(id, data) {
  const response = await api.put(`/users/${id}/access`, data);
  return response.data;
}
