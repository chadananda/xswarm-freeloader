export function renderDigest(data) {
  const { date, stats, topModels, savings, opportunities } = data;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .header { text-align: center; padding: 20px 0; }
    .header h1 { color: #00ff88; margin: 0; font-size: 24px; }
    .card { background: #16213e; border-radius: 8px; padding: 20px; margin: 12px 0; }
    .stat { display: inline-block; text-align: center; margin: 0 15px; }
    .stat .value { font-size: 28px; font-weight: bold; color: #00ff88; }
    .stat .label { font-size: 12px; color: #888; text-transform: uppercase; }
    .savings { background: #0a3d0a; border: 1px solid #00ff88; text-align: center; }
    .savings .value { font-size: 36px; color: #00ff88; }
    table { width: 100%; border-collapse: collapse; }
    td, th { padding: 8px 12px; text-align: left; border-bottom: 1px solid #2a2a4a; }
    th { color: #888; font-weight: normal; font-size: 12px; text-transform: uppercase; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
    .cta { display: inline-block; background: #00ff88; color: #000; padding: 10px 20px; border-radius: 4px; text-decoration: none; font-weight: bold; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ xswarm-freeloader</h1>
      <p style="color: #888">Daily Digest — ${date}</p>
    </div>

    <div class="card savings">
      <p style="margin:0;color:#888">You saved</p>
      <p class="value" style="margin:5px 0">$${(savings || 0).toFixed(2)}</p>
      <p style="margin:0;color:#888">by routing to free tiers yesterday</p>
    </div>

    <div class="card">
      <div style="text-align:center">
        <div class="stat"><div class="value">${stats?.requests || 0}</div><div class="label">Requests</div></div>
        <div class="stat"><div class="value">$${(stats?.total_cost || 0).toFixed(4)}</div><div class="label">Actual Cost</div></div>
        <div class="stat"><div class="value">${stats?.avg_latency ? Math.round(stats.avg_latency) + 'ms' : 'N/A'}</div><div class="label">Avg Latency</div></div>
      </div>
    </div>

    ${topModels?.length ? `
    <div class="card">
      <h3 style="margin-top:0;color:#fff">Top Models</h3>
      <table>
        <tr><th>Model</th><th>Requests</th><th>Cost</th></tr>
        ${topModels.map(m => `<tr><td>${m.model}</td><td>${m.requests}</td><td>$${(m.cost || 0).toFixed(4)}</td></tr>`).join('')}
      </table>
    </div>` : ''}

    ${opportunities?.length ? `
    <div class="card">
      <h3 style="margin-top:0;color:#fff">💡 Opportunities</h3>
      <ul style="padding-left:20px">
        ${opportunities.map(o => `<li>${o}</li>`).join('')}
      </ul>
    </div>` : ''}

    <div style="text-align:center;margin:20px 0">
      <a class="cta" href="http://localhost:4010">Open Dashboard →</a>
    </div>

    <div class="footer">
      Sent by xswarm-freeloader • <a href="http://localhost:4010/settings" style="color:#00ff88">Manage preferences</a>
    </div>
  </div>
</body>
</html>`;
}
