import { useEffect, useState } from "react";
import { getLatestTelemetry, getTelemetryHistory } from "../services/telemetryService";
import { mapRowToAsset, mapHistoryRow } from "../utils/telemetryUtils";

// Polls GET /api/telemetry/latest every `intervalMs` and returns the
// fleet as an array of flattened asset objects, plus loading/error state.
export function useLatestTelemetry(intervalMs = 3000) {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchTelemetry() {
      try {
        const response = await getLatestTelemetry();
        if (cancelled) return;

        if (!response.success) {
          setLoadError(response.message || "Failed to load telemetry");
          return;
        }

        setAssets((response.data || []).map(mapRowToAsset));
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Could not reach the backend. Is the server running?");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [intervalMs]);

  return { assets, loading, loadError };
}

// Polls GET /api/telemetry/:assetCode/history every `intervalMs` for
// one compressor and returns it in chart-ready (oldest-first) order.
export function useTelemetryHistory(assetCode, limit = 40, intervalMs = 3000) {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    if (!assetCode) {
      setHistory([]);
      return;
    }
    let cancelled = false;

    async function fetchHistory() {
      try {
        const response = await getTelemetryHistory(assetCode, limit);
        if (cancelled || !response.success) return;
        // API returns newest-first; reverse so charts read left-to-right in time.
        setHistory((response.data || []).map(mapHistoryRow).reverse());
      } catch {
        // Silently skip — whatever page called this already surfaces
        // connectivity errors via useLatestTelemetry.
      }
    }

    fetchHistory();
    const interval = setInterval(fetchHistory, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [assetCode, limit, intervalMs]);

  return history;
}
