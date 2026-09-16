import { ImageResponse } from "next/og";

export const config = { runtime: "edge" };

const WIDTH = 1200;
const HEIGHT = 630;

/** Gambar pratinjau link kampanye (1200×630) untuk WhatsApp, X, Facebook, dll */
export default function handler(request) {
  const { searchParams } = new URL(request.url);
  const title = (searchParams.get("title") || "Crowdfunding").slice(0, 110);
  const category = searchParams.get("category") || "";
  const raised = searchParams.get("raised") || "0";
  const goal = searchParams.get("goal") || "0";
  const progress = Math.max(0, Math.min(100, Number(searchParams.get("progress")) || 0));

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "64px 72px",
        background: "linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%, #f0fdfa 100%)",
        fontFamily: "sans-serif",
        color: "#0f172a",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: "linear-gradient(135deg, #10b981, #0d9488)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="34"
            height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#fff"
            strokeWidth="1.9"
            strokeLinecap="round"
          >
            <circle cx="12" cy="6.4" r="2.5" />
            <path d="M3.4 12.1c-.55 4.25 2.3 8.05 6.4 8.95" />
            <path d="M3.4 12.1c.45-1.35 1.9-2 3.2-1.45" />
            <path d="M20.6 12.1c.55 4.25-2.3 8.05-6.4 8.95" />
            <path d="M20.6 12.1c-.45-1.35-1.9-2-3.2-1.45" />
          </svg>
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, display: "flex" }}>
          Crowd<span style={{ color: "#059669" }}>funding</span>
        </div>
        {category && (
          <div
            style={{
              marginLeft: "auto",
              padding: "8px 20px",
              borderRadius: 999,
              background: "#d1fae5",
              color: "#047857",
              fontSize: 24,
              fontWeight: 700,
            }}
          >
            {category}
          </div>
        )}
      </div>

      <div style={{ fontSize: title.length > 60 ? 56 : 68, fontWeight: 800, lineHeight: 1.1, letterSpacing: -1 }}>
        {title}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
            <span style={{ fontSize: 56, fontWeight: 800 }}>{raised} ETH</span>
            <span style={{ fontSize: 28, color: "#64748b" }}>/ {goal} ETH</span>
          </div>
          <span style={{ fontSize: 48, fontWeight: 800, color: "#059669" }}>{progress}%</span>
        </div>
        <div style={{ display: "flex", width: "100%", height: 20, borderRadius: 999, background: "#e2e8f0" }}>
          <div style={{ width: `${progress}%`, height: 20, borderRadius: 999, background: "#059669" }} />
        </div>
      </div>
    </div>,
    { width: WIDTH, height: HEIGHT },
  );
}
