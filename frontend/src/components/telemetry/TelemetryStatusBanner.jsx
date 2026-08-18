function TelemetryStatusBanner({ loadError, loading, isEmpty }) {
  if (loadError) {
    return (
      <div className="mb-6 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm dark:bg-red-950/40 dark:border-red-900 dark:text-red-400">
        {loadError}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="mb-6 px-4 py-3 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700 text-sm dark:bg-cyan-950/30 dark:border-cyan-900 dark:text-cyan-400">
        Loading live telemetry from the backend…
      </div>
    );
  }

  if (isEmpty) {
    return (
      <div className="mb-6 px-4 py-3 rounded-lg bg-yellow-50 border border-yellow-200 text-yellow-700 text-sm dark:bg-yellow-950/30 dark:border-yellow-900 dark:text-yellow-400">
        Connected to the backend, but no telemetry has arrived yet. Make sure the
        Railway-AirCompressor-Simulation is running and pointed at this backend.
      </div>
    );
  }

  return null;
}

export default TelemetryStatusBanner;
