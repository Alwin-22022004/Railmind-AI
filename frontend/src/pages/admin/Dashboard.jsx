import { useState, useEffect } from "react";
import { FiServer, FiAlertTriangle, FiCpu } from "react-icons/fi";

import DashboardLayout from "../../components/dashboard/DashboardLayout";
import PageHeader from "../../components/dashboard/PageHeader";
import SystemStatusStrip from "../../components/dashboard/SystemStatusStrip";
import StatCard from "../../components/dashboard/StatCard";
import FleetTable from "../../components/telemetry/FleetTable";
import TrendChart from "../../components/telemetry/TrendChart";
import AssetDetailModal from "../../components/dashboard/AssetDetailModal";
import FleetHealthDistributionCard from "../../components/dashboard/FleetHealthDistributionCard";
import RecentAlertsCard from "../../components/dashboard/RecentAlertsCard";
import TelemetryStatusBanner from "../../components/telemetry/TelemetryStatusBanner";
import { SkeletonCard, SkeletonTable } from "../../components/common/SkeletonLoader";
import { useLatestTelemetry, useTelemetryHistory } from "../../hooks/useTelemetry";

import { getAlerts } from "../../services/alertService";

function Dashboard() {
  const { assets, loading, loadError } = useLatestTelemetry();
  const [selectedId, setSelectedId] = useState(null);
  const [modalAsset, setModalAsset] = useState(null);
  const [activeAlerts, setActiveAlerts] = useState([]);

  const activeId = selectedId || assets[0]?.id || null;
  const selectedAsset = assets.find((a) => a.id === activeId) || null;
  const history = useTelemetryHistory(activeId, 40);

  useEffect(() => {
    let isMounted = true;
    getAlerts({ status: "ACTIVE" })
      .then((res) => {
        if (isMounted) setActiveAlerts(res.data || []);
      })
      .catch(() => {});
    return () => { isMounted = false; };
  }, []);

  const reportingAssets = assets.filter((a) => a.hasTelemetry && typeof a.healthScore === "number");
  const avgHealth =
    reportingAssets.length > 0
      ? Math.round(reportingAssets.reduce((sum, a) => sum + a.healthScore, 0) / reportingAssets.length)
      : 100;

  const criticalAlertsCount = activeAlerts.filter((a) => a.level === "critical").length;
  const warningAlertsCount = activeAlerts.filter((a) => a.level === "warning").length;
  const compressorsNeedingAttention = new Set([
    ...reportingAssets
      .filter((a) => a.healthStatus === "CRITICAL" || a.healthStatus === "MAINTENANCE_REQUIRED" || a.healthStatus === "WARNING")
      .map((a) => a.asset_code),
    ...activeAlerts.map((a) => a.asset_code),
  ]).size;

  const handleExportReport = () => {
    const reportData = JSON.stringify(assets, null, 2);
    const blob = new Blob([reportData], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `railmind_fleet_report_${Date.now()}.json`;
    a.click();
  };

  return (
    <DashboardLayout>
      {/* Page Header */}
      <PageHeader
        onRefresh={() => window.location.reload()}
        onExport={handleExportReport}
      />

      {/* System Operational Strip */}
      <SystemStatusStrip />

      <TelemetryStatusBanner loadError={loadError} loading={loading} isEmpty={!loading && assets.length === 0} />

      {/* 4 Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: Registered Compressors */}
          <StatCard
            title="Registered Compressors"
            value={assets.length}
            subtitle="+2 added this month"
            icon={FiServer}
          />

          {/* Card 2: Fleet Average Health (Circular Gauge) */}
          <StatCard
            title="Fleet Average Health"
            value={`${avgHealth}%`}
            type="health"
            healthScore={avgHealth}
            subtitle="+3.2% vs last week"
            badgeText="Optimal"
          />

          {/* Card 3: Needs Attention */}
          <StatCard
            title="Needs Attention"
            value={compressorsNeedingAttention}
            subtitle={`${criticalAlertsCount} critical · ${warningAlertsCount} warning alerts`}
            icon={FiAlertTriangle}
          />

          {/* Card 4: AI Model Status */}
          <StatCard
            title="AI Model Status"
            value="TRAINED"
            subtitle="Baseline fault-classification model trained and evaluated. Live inference integration is planned."
            icon={FiCpu}
            badgeText="Offline Prototype"
          />
        </div>
      )}

      {/* Live Compressor Telemetry Table */}
      {loading ? (
        <SkeletonTable />
      ) : (
        <FleetTable
          assets={assets}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onRowClick={(asset) => setModalAsset(asset)}
          onRefresh={() => window.location.reload()}
        />
      )}

      {/* Compressor Performance Trend Section */}
      <TrendChart
        history={history}
        selectedId={activeId}
        healthStatus={selectedAsset?.healthStatus}
        height={320}
      />

      {/* Industrial Intelligence & Secondary Analytics Cards Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <RecentAlertsCard />
        <div className="industrial-card">
          <div className="text-xs font-black uppercase tracking-wider text-[#08A9E6] mb-2">
            AI / ML Status — Trained
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            Baseline Fault Classifier Model Trained
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
            Random Forest model trained offline with 99.80% accuracy across 6 compressor fault classes.
            Live telemetry inference integration is not connected yet and is planned for a future phase.
          </p>
        </div>
      </div>

      {/* Fleet Health Distribution & Risk Breakdown */}
      <FleetHealthDistributionCard assets={assets} />

      {/* Compressor Detail Modal (Opened on Row Click) */}
      {modalAsset && (
        <AssetDetailModal
          asset={modalAsset}
          onClose={() => setModalAsset(null)}
        />
      )}
    </DashboardLayout>
  );
}

export default Dashboard;
