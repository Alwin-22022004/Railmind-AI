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
      } catch {
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
  const [state, setState] = useState({
    assetCode,
    history: [],
    loading: Boolean(assetCode),
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    let latestRequestId = 0;

    if (!assetCode) {
      setState({
        assetCode: null,
        history: [],
        loading: false,
        error: null,
      });
      return;
    }

    // Isolate and immediately clear previous history on asset selection change
    setState((prev) => ({
      assetCode,
      history: prev.assetCode === assetCode ? prev.history : [],
      loading: prev.assetCode !== assetCode || prev.history.length === 0,
      error: null,
    }));

    async function fetchHistory(isInitial = false) {
      const requestId = ++latestRequestId;
      try {
        const response = await getTelemetryHistory(assetCode, limit);
        if (cancelled || requestId < latestRequestId) return;

        if (!response.success) {
          setState({
            assetCode,
            history: [],
            loading: false,
            error: response.message || "Failed to load telemetry history",
          });
          return;
        }

        // API returns newest-first; reverse so charts read left-to-right in time.
        const mapped = (response.data || []).map(mapHistoryRow).reverse();
        setState({
          assetCode,
          history: mapped,
          loading: false,
          error: null,
        });
      } catch (err) {
        if (!cancelled && requestId >= latestRequestId) {
          setState({
            assetCode,
            history: [],
            loading: false,
            error: err.response?.data?.message || err.message || "Failed to fetch telemetry history",
          });
        }
      } finally {
        if (!cancelled && isInitial && requestId >= latestRequestId) {
          setState((prev) => (prev.loading ? { ...prev, loading: false } : prev));
        }
      }
    }

    fetchHistory(true);
    const interval = setInterval(() => fetchHistory(false), intervalMs);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [assetCode, limit, intervalMs]);

  // Isolate data: if state.assetCode does not match assetCode, never return stale data
  const isStaleAsset = state.assetCode !== assetCode;
  const currentHistory = isStaleAsset ? [] : state.history;
  const currentLoading = isStaleAsset ? Boolean(assetCode) : state.loading;
  const currentError = isStaleAsset ? null : state.error;

  // Return history array with attached loading and error metadata.
  // Supports both array usage and object destructuring { history, loading, error }
  const result = [...currentHistory];
  result.history = currentHistory;
  result.loading = currentLoading;
  result.error = currentError;
  return result;
}
