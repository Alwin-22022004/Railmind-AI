import api from "./api";

// Latest reading for every compressor — used for the dashboard overview
// and the asset table.
export async function getLatestTelemetry() {
  const response = await api.get("/telemetry/latest");
  return response.data;
}

// Recent history for one compressor (for charts) — asset_code e.g. "COMP-001"
export async function getTelemetryHistory(assetCode, limit = 50) {
  const response = await api.get(`/telemetry/${assetCode}/history?limit=${limit}`);
  return response.data;
}
