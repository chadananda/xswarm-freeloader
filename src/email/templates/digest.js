// :arch: professional multi-range HTML email template — light theme, inline CSS, table layout
// :why: dark themes render inconsistently across Outlook/Gmail/Apple Mail; tables for email compat
// :rules: inline CSS only; no external assets; mobile-responsive via max-width
export function renderDigest(data) {
  const { date, ranges, hourly, opportunities, sanitizationSummary } = data;
  const r24 = ranges?.['24h'] || {};
  const r7 = ranges?.['7d'] || {};
  const r30 = ranges?.['30d'] || {};
  const r90 = ranges?.['90d'] || {};
  //
  const fmt = (n, decimals = 0) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const fmtCost = (n) => '$' + fmt(n, 4);
  const fmtSavings = (n) => '$' + fmt(n, 2);
  const fmtPct = (n) => (n || 0).toFixed(1) + '%';
  const fmtMs = (n) => Math.round(n || 0) + 'ms';
  const trend = (pct) => {
    if (!pct || Math.abs(pct) < 0.5) return '<span style="color:#6b7280;">—</span>';
    const arrow = pct > 0 ? '&#9650;' : '&#9660;';
    const color = pct > 0 ? '#059669' : '#dc2626';
    return `<span style="color:${color};font-size:11px;">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
  };
  // For costs, down is good
  const trendCost = (pct) => {
    if (!pct || Math.abs(pct) < 0.5) return '<span style="color:#6b7280;">—</span>';
    const arrow = pct > 0 ? '&#9650;' : '&#9660;';
    const color = pct > 0 ? '#dc2626' : '#059669';
    return `<span style="color:${color};font-size:11px;">${arrow} ${Math.abs(pct).toFixed(1)}%</span>`;
  };
  //
  const rangeSection = (r, key) => {
    if (!r.stats) return '';
    const t = r.trend || {};
    return `
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr><td colspan="4" style="padding:12px 16px;background:#f8fafc;border-radius:8px 8px 0 0;border-bottom:2px solid #e2e8f0;">
        <span style="font-size:16px;font-weight:700;color:#1e293b;">${r.label}</span>
      </td></tr>
      <tr>
        <td style="padding:16px;text-align:center;width:25%;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:24px;font-weight:700;color:#1e293b;">${fmt(r.stats.requests)}</div>
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Requests</div>
          <div>${trend(t.requests)}</div>
        </td>
        <td style="padding:16px;text-align:center;width:25%;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:24px;font-weight:700;color:#1e293b;">${fmtCost(r.stats.total_cost)}</div>
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Cost</div>
          <div>${trendCost(t.cost)}</div>
        </td>
        <td style="padding:16px;text-align:center;width:25%;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:24px;font-weight:700;color:#059669;">${fmtSavings(r.savings)}</div>
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Savings</div>
          <div>${trend(t.savings)}</div>
        </td>
        <td style="padding:16px;text-align:center;width:25%;border-bottom:1px solid #f1f5f9;">
          <div style="font-size:24px;font-weight:700;color:#1e293b;">${fmtMs(r.stats.avg_latency)}</div>
          <div style="font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:0.5px;">Avg Latency</div>
          <div>${trendCost(t.latency)}</div>
        </td>
      </tr>
      ${r.errorRate ? `<tr><td colspan="4" style="padding:8px 16px;font-size:12px;color:#64748b;">
        Error rate: <strong style="color:${(r.errorRate.error_rate || 0) > 5 ? '#dc2626' : '#1e293b'}">${fmtPct(r.errorRate.error_rate)}</strong>
        (${fmt(r.errorRate.errors)} of ${fmt(r.errorRate.total)})
      </td></tr>` : ''}
      ${r.providerBreakdown?.length ? `
      <tr><td colspan="4" style="padding:12px 16px 4px;">
        <div style="font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Top Providers</div>
      </td></tr>
      <tr><td colspan="4" style="padding:0 16px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;">
          <tr style="color:#64748b;font-size:11px;text-transform:uppercase;">
            <td>Provider</td><td style="text-align:right;">Requests</td><td style="text-align:right;">Cost</td><td style="text-align:right;">Avg Latency</td>
          </tr>
          ${r.providerBreakdown.slice(0, 5).map((p, i) => `
          <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
            <td style="color:#1e293b;font-weight:500;">${p.provider_name || p.provider_id}</td>
            <td style="text-align:right;color:#475569;">${fmt(p.requests)}</td>
            <td style="text-align:right;color:#475569;">${fmtCost(p.total_cost)}</td>
            <td style="text-align:right;color:#475569;">${fmtMs(p.avg_latency)}</td>
          </tr>`).join('')}
        </table>
      </td></tr>` : ''}
      ${r.topApps?.length ? `
      <tr><td colspan="4" style="padding:12px 16px 4px;">
        <div style="font-size:12px;font-weight:600;color:#475569;text-transform:uppercase;letter-spacing:0.5px;">Top Apps</div>
      </td></tr>
      <tr><td colspan="4" style="padding:0 16px 12px;">
        <table width="100%" cellpadding="6" cellspacing="0" style="font-size:13px;">
          <tr style="color:#64748b;font-size:11px;text-transform:uppercase;">
            <td>App</td><td style="text-align:right;">Requests</td><td style="text-align:right;">Cost</td>
          </tr>
          ${r.topApps.slice(0, 5).map((a, i) => `
          <tr style="background:${i % 2 === 0 ? '#f8fafc' : '#ffffff'};">
            <td style="color:#1e293b;font-weight:500;">${a.app_name || a.app_id}</td>
            <td style="text-align:right;color:#475569;">${fmt(a.requests)}</td>
            <td style="text-align:right;color:#475569;">${fmtCost(a.total_cost)}</td>
          </tr>`).join('')}
        </table>
      </td></tr>` : ''}
    </table>`;
  };
  //
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>xswarm-freeloader Report</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;-webkit-text-size-adjust:100%;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 0;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f172a 0%,#1e293b 100%);padding:32px 24px;text-align:center;">
          <div style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">xswarm-freeloader</div>
          <div style="font-size:13px;color:#94a3b8;margin-top:4px;">Usage Report &mdash; ${date}</div>
        </td></tr>
        <!-- Executive Summary -->
        <tr><td style="padding:24px;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#ecfdf5;border-radius:8px;border:1px solid #a7f3d0;">
            <tr><td style="padding:20px;text-align:center;">
              <div style="font-size:13px;color:#065f46;text-transform:uppercase;letter-spacing:1px;font-weight:600;">Total Savings (30 days)</div>
              <div style="font-size:42px;font-weight:800;color:#059669;line-height:1.2;">${fmtSavings(r30.savings)}</div>
              <div style="font-size:13px;color:#065f46;margin-top:4px;">vs. GPT-4o baseline pricing</div>
            </td></tr>
          </table>
        </td></tr>
        <!-- Range Sections -->
        <tr><td style="padding:0 24px 24px;">
          ${rangeSection(r24, '24h')}
          ${rangeSection(r7, '7d')}
          ${rangeSection(r30, '30d')}
          ${rangeSection(r90, '90d')}
        </td></tr>
        ${sanitizationSummary && sanitizationSummary.total > 0 ? `
        <!-- Sanitization -->
        <tr><td style="padding:0 24px 24px;">
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#fef3c7;border-radius:8px;border:1px solid #fcd34d;font-size:13px;color:#92400e;">
            <tr><td>
              <strong>Sanitization (24h):</strong> ${fmt(sanitizationSummary.total)} scanned,
              ${fmt(sanitizationSummary.total_secrets)} secrets found,
              ${fmt(sanitizationSummary.total_pii)} PII detected,
              ${fmt(sanitizationSummary.total_blocked)} blocked
            </td></tr>
          </table>
        </td></tr>` : ''}
        ${opportunities?.length ? `
        <!-- Opportunities -->
        <tr><td style="padding:0 24px 24px;">
          <table width="100%" cellpadding="12" cellspacing="0" style="background:#eff6ff;border-radius:8px;border:1px solid #93c5fd;font-size:13px;color:#1e40af;">
            <tr><td>
              <div style="font-weight:600;margin-bottom:8px;">Opportunities</div>
              ${opportunities.map(o => `<div style="margin:4px 0;">&#8226; ${o}</div>`).join('')}
            </td></tr>
          </table>
        </td></tr>` : ''}
        <!-- CTA -->
        <tr><td style="padding:0 24px 24px;text-align:center;">
          <a href="http://localhost:4010" style="display:inline-block;background:#0f172a;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">Open Dashboard</a>
        </td></tr>
        <!-- Footer -->
        <tr><td style="padding:16px 24px;background:#f8fafc;text-align:center;font-size:11px;color:#94a3b8;border-top:1px solid #e2e8f0;">
          Sent by xswarm-freeloader &bull; <a href="http://localhost:4010/settings" style="color:#3b82f6;">Manage preferences</a>
          &bull; PDF report attached
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
