import { STATUS_STYLES } from "../../utils/telemetryUtils";

function StatusBadge({ status }) {
  const style = STATUS_STYLES[status] || STATUS_STYLES.Unknown;
  return (
    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${style}`}>
      {status}
    </span>
  );
}

export default StatusBadge;
