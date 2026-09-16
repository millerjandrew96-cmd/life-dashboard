// Shared icon design for app/icon.tsx, app/apple-icon.tsx, and the manifest icon routes —
// a black square with a white ring, echoing the dashboard's own ScoreRing component.
export function AppIconMark({ size }: { size: number }) {
  const stroke = Math.round(size * 0.09);
  const ringSize = Math.round(size * 0.56);

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0a0a0a",
      }}
    >
      <div
        style={{
          width: ringSize,
          height: ringSize,
          borderRadius: "50%",
          border: `${stroke}px solid #ededed`,
          borderTopColor: "#eab308",
          borderRightColor: "#eab308",
        }}
      />
    </div>
  );
}
