export function renderAlert(data) {
  const { type, title, message, details } = data;

  const colors = {
    info: '#3b82f6',
    warning: '#f59e0b',
    success: '#00ff88',
    error: '#ef4444'
  };

  const color = colors[type] || colors.info;

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #1a1a2e; color: #e0e0e0; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; }
    .alert { background: #16213e; border-left: 4px solid ${color}; border-radius: 0 8px 8px 0; padding: 20px; margin: 12px 0; }
    .alert h2 { margin: 0 0 10px 0; color: ${color}; }
    .footer { text-align: center; padding: 20px 0; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="alert">
      <h2>${title}</h2>
      <p>${message}</p>
      ${details ? `<p style="color:#888;font-size:13px">${details}</p>` : ''}
    </div>
    <div class="footer">xswarm-freeloader alert</div>
  </div>
</body>
</html>`;
}
