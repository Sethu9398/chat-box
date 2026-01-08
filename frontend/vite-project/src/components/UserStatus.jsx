import { useEffect, useState } from "react";

/**
 * UserStatus Component (Frontend-Only / Dummy)
 * Displays user's online/offline status with last seen time
 * Supports both inline (compact) and detailed display modes
 */
function UserStatus({
  userId,
  isOnline: initialIsOnline,
  lastSeen: initialLastSeen,
  mode = "detailed",
}) {
  const [isOnline, setIsOnline] = useState(initialIsOnline ?? true);
  const [lastSeen, setLastSeen] = useState(initialLastSeen ?? null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 10 seconds (for relative time display)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  // Sync props → state (dummy-safe)
  useEffect(() => {
    setIsOnline(initialIsOnline ?? true);
    setLastSeen(initialLastSeen ?? null);
  }, [initialIsOnline, initialLastSeen]);

  /**
   * Format last seen time in a human-readable way
   */
  const formatLastSeen = (date) => {
    if (!date) return null;

    try {
      const d = typeof date === "string" ? new Date(date) : date;
      if (isNaN(d.getTime())) return null;

      const diffMs = currentTime.getTime() - d.getTime();
      if (diffMs < 0) return "just now";

      const mins = Math.floor(diffMs / 60000);
      const hours = Math.floor(diffMs / 3600000);
      const days = Math.floor(diffMs / 86400000);
      const weeks = Math.floor(days / 7);

      if (mins < 1) return "just now";
      if (mins < 60) return `${mins}m ago`;
      if (hours < 24) return `${hours}h ago`;
      if (days < 7) return `${days}d ago`;
      if (days < 30) return `${weeks}w ago`;

      return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    } catch {
      return null;
    }
  };

  /**
   * Exact time for tooltip
   */
  const getExactTime = () => {
    if (!lastSeen) return "";

    try {
      const d = typeof lastSeen === "string" ? new Date(lastSeen) : lastSeen;
      if (isNaN(d.getTime())) return "Time unavailable";

      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch {
      return "";
    }
  };

  /* =========================
     INLINE MODE (Sidebar)
     ========================= */
  if (mode === "inline") {
    return (
      <span
        className={isOnline ? "text-success fw-500" : "text-muted"}
        title={isOnline ? "Online" : `Last seen: ${getExactTime()}`}
        style={{ fontSize: "0.85rem" }}
      >
        {isOnline ? "🟢 Online" : `⚪ ${formatLastSeen(lastSeen)}`}
      </span>
    );
  }

  /* =========================
     DETAILED MODE (Chat Header)
     ========================= */
  const lastSeenFormatted = formatLastSeen(lastSeen);

  return (
    <span
      className={isOnline ? "text-success fw-600" : "text-muted"}
      style={{
        fontSize: "0.9rem",
        fontWeight: isOnline ? "600" : "500",
      }}
      title={!isOnline ? getExactTime() : ""}
    >
      {isOnline
        ? "Active now"
        : lastSeenFormatted
        ? `Last seen ${lastSeenFormatted}`
        : "Offline"}
    </span>
  );
}

export default UserStatus;
