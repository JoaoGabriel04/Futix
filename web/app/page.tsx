const colors = [
  { token: "--color-bg-app", label: "bg/app", value: "#0e0f11" },
  { token: "--color-bg-surface", label: "bg/surface", value: "#1a1b1f" },
  { token: "--color-bg-raised", label: "bg/raised", value: "#212328" },
  { token: "--color-bg-sidebar", label: "bg/sidebar", value: "#141518" },
  { token: "--color-text-primary", label: "text/primary", value: "#f1f1ee" },
  { token: "--color-text-secondary", label: "text/secondary", value: "#b3b6bf" },
  { token: "--color-text-muted", label: "text/muted", value: "#8a8e99" },
  { token: "--color-text-on-accent", label: "text/on-accent", value: "#0e0f11" },
  { token: "--color-accent-default", label: "accent/default", value: "#ffd60a" },
  { token: "--color-accent-subtle", label: "accent/subtle", value: "#ffd60a24" },
  { token: "--color-border-default", label: "border/default", value: "#2b2d33" },
  { token: "--color-border-strong", label: "border/strong", value: "#3a3d45" },
  { token: "--color-status-success", label: "status/success", value: "#2fd27b" },
  { token: "--color-status-success-subtle", label: "status/success-subtle", value: "#2fd27b24" },
  { token: "--color-status-warning", label: "status/warning", value: "#ff9f43" },
  { token: "--color-status-warning-subtle", label: "status/warning-subtle", value: "#ff9f4324" },
  { token: "--color-status-danger", label: "status/danger", value: "#ff5a4e" },
  { token: "--color-status-danger-subtle", label: "status/danger-subtle", value: "#ff5a4e24" },
  { token: "--color-status-info", label: "status/info", value: "#5aa9ff" },
  { token: "--color-status-info-subtle", label: "status/info-subtle", value: "#5aa9ff24" },
];

const spacing = [
  { token: "--space-xs", label: "xs", value: "4px" },
  { token: "--space-sm", label: "sm", value: "8px" },
  { token: "--space-md", label: "md", value: "12px" },
  { token: "--space-lg", label: "lg", value: "16px" },
  { token: "--space-xl", label: "xl", value: "20px" },
  { token: "--space-2xl", label: "2xl", value: "24px" },
  { token: "--space-3xl", label: "3xl", value: "32px" },
];

const radii = [
  { token: "--radius-sm", label: "sm", value: "8px" },
  { token: "--radius-md", label: "md", value: "12px" },
  { token: "--radius-lg", label: "lg", value: "16px" },
  { token: "--radius-xl", label: "xl", value: "24px" },
  { token: "--radius-full", label: "full", value: "999px" },
];

const typeScale = [
  { cls: "text-display-h1", label: "Display / H1", spec: "28px · 700 · lh 34" },
  { cls: "text-heading-h2", label: "Heading / H2", spec: "22px · 700 · lh 28" },
  { cls: "text-heading-h3", label: "Heading / H3", spec: "17px · 600 · lh 22" },
  { cls: "text-body-regular", label: "Body / Regular", spec: "15px · 400 · lh 22" },
  { cls: "text-body-strong", label: "Body / Strong", spec: "15px · 600 · lh 22" },
  { cls: "text-caption-regular", label: "Caption / Regular", spec: "13px · 400 · lh 18" },
  { cls: "text-caption-strong", label: "Caption / Strong", spec: "13px · 600 · lh 18" },
  { cls: "text-overline", label: "Overline", spec: "11px · 600 · lh 14 · ls 6" },
];

export default function TokensPage() {
  return (
    <main style={{ padding: "32px", maxWidth: "960px", margin: "0 auto" }}>
      <h1 className="text-display-h1" style={{ marginBottom: "32px" }}>
        Tokens — Fase 0
      </h1>

      <section style={{ marginBottom: "48px" }}>
        <h2 className="text-heading-h2" style={{ marginBottom: "16px" }}>
          Cores
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "8px" }}>
          {colors.map(({ token, label, value }) => (
            <div
              key={token}
              style={{
                background: "var(--color-bg-surface)",
                borderRadius: "var(--radius-md)",
                padding: "12px",
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div
                style={{
                  width: "100%",
                  height: "40px",
                  borderRadius: "var(--radius-sm)",
                  background: `var(${token})`,
                  marginBottom: "8px",
                  border: "1px solid var(--color-border-default)",
                }}
              />
              <p className="text-caption-strong" style={{ color: "var(--color-text-primary)" }}>
                {label}
              </p>
              <p className="text-caption-regular" style={{ color: "var(--color-text-muted)" }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "48px" }}>
        <h2 className="text-heading-h2" style={{ marginBottom: "16px" }}>
          Espacamento
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {spacing.map(({ token, label, value }) => (
            <div key={token} style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  width: `var(${token})`,
                  height: "24px",
                  background: "var(--color-accent-default)",
                  borderRadius: "2px",
                  minWidth: "4px",
                }}
              />
              <span className="text-body-regular" style={{ color: "var(--color-text-secondary)" }}>
                space/{label} — {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section style={{ marginBottom: "48px" }}>
        <h2 className="text-heading-h2" style={{ marginBottom: "16px" }}>
          Raios
        </h2>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {radii.map(({ token, label, value }) => (
            <div
              key={token}
              style={{
                width: "80px",
                height: "80px",
                background: "var(--color-bg-raised)",
                border: "2px solid var(--color-accent-default)",
                borderRadius: `var(${token})`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px",
              }}
            >
              <span className="text-caption-strong" style={{ color: "var(--color-text-primary)" }}>
                {label}
              </span>
              <span className="text-caption-regular" style={{ color: "var(--color-text-muted)" }}>
                {value}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-heading-h2" style={{ marginBottom: "16px" }}>
          Tipografia (Inter)
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {typeScale.map(({ cls, label, spec }) => (
            <div key={cls}>
              <p className={cls} style={{ color: "var(--color-text-primary)", marginBottom: "2px" }}>
                {label}
              </p>
              <p className="text-caption-regular" style={{ color: "var(--color-text-muted)" }}>
                {spec}
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
