// :arch: multi-page PDF report generator — executive summary, 24h detail, 7d+30d, 90d overview
// :why: professional multi-page layout with pdfkit; consistent spacing/headers/alternating rows
// :deps: pdfkit → Buffer; consumers: digest.js buildReport()
// :rules: always resolve with Buffer; never throw — return null on failure
import PDFDocument from 'pdfkit';
//
const COLORS = { primary: '#0f172a', accent: '#059669', muted: '#64748b', light: '#f8fafc', border: '#e2e8f0', error: '#dc2626', white: '#ffffff' };
const fmt = (n, d = 0) => (n || 0).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
const fmtCost = (n) => '$' + fmt(n, 4);
const fmtSavings = (n) => '$' + fmt(n, 2);
const fmtPct = (n) => (n || 0).toFixed(1) + '%';
//
export class PdfReportGenerator {
  generate(data) {
    return new Promise((resolve) => {
      try {
        const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
        const chunks = [];
        doc.on('data', c => chunks.push(c));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        //
        this._page1Executive(doc, data);
        doc.addPage();
        this._page2Detail24h(doc, data);
        doc.addPage();
        this._page3WeekMonth(doc, data);
        doc.addPage();
        this._page4Quarter(doc, data);
        //
        // Page numbers
        const totalPages = doc.bufferedPageRange().count;
        for (let i = 0; i < totalPages; i++) {
          doc.switchToPage(i);
          doc.fontSize(8).fillColor(COLORS.muted).text(`Page ${i + 1} of ${totalPages}`, 40, doc.page.height - 30, { align: 'center', width: doc.page.width - 80 });
        }
        doc.end();
      } catch (_) { resolve(null); }
    });
  }
  //
  _header(doc, title, subtitle) {
    doc.rect(0, 0, doc.page.width, 70).fill(COLORS.primary);
    doc.fontSize(18).font('Helvetica-Bold').fillColor(COLORS.white).text(title, 40, 20);
    doc.fontSize(10).font('Helvetica').fillColor('#94a3b8').text(subtitle, 40, 44);
    doc.moveDown(2);
    doc.y = 85;
  }
  //
  _sectionTitle(doc, title) {
    doc.fontSize(13).font('Helvetica-Bold').fillColor(COLORS.primary).text(title);
    doc.moveTo(40, doc.y + 2).lineTo(555, doc.y + 2).strokeColor(COLORS.border).lineWidth(1).stroke();
    doc.moveDown(0.5);
  }
  //
  _kpiRow(doc, items) {
    const startX = 40;
    const boxW = (515) / items.length;
    const startY = doc.y;
    items.forEach((item, i) => {
      const x = startX + i * boxW;
      doc.rect(x, startY, boxW - 8, 52).fill(COLORS.light);
      doc.fontSize(9).font('Helvetica').fillColor(COLORS.muted).text(item.label, x + 8, startY + 6, { width: boxW - 16 });
      doc.fontSize(16).font('Helvetica-Bold').fillColor(item.color || COLORS.primary).text(item.value, x + 8, startY + 22, { width: boxW - 16 });
      if (item.trend) doc.fontSize(8).font('Helvetica').fillColor(COLORS.muted).text(item.trend, x + 8, startY + 40, { width: boxW - 16 });
    });
    doc.y = startY + 60;
  }
  //
  _table(doc, headers, rows, opts = {}) {
    const startX = 40;
    const colWidths = opts.colWidths || headers.map(() => 515 / headers.length);
    const rowH = 18;
    // Header
    let y = doc.y;
    doc.fontSize(8).font('Helvetica-Bold').fillColor(COLORS.muted);
    headers.forEach((h, i) => {
      const x = startX + colWidths.slice(0, i).reduce((a, b) => a + b, 0);
      doc.text(h, x, y, { width: colWidths[i], align: i === 0 ? 'left' : 'right' });
    });
    y += rowH;
    // Rows
    doc.font('Helvetica').fillColor(COLORS.primary);
    rows.forEach((row, ri) => {
      if (ri % 2 === 0) doc.rect(startX, y - 2, 515, rowH).fill('#f1f5f9');
      doc.fontSize(9).fillColor(COLORS.primary);
      row.forEach((cell, ci) => {
        const x = startX + colWidths.slice(0, ci).reduce((a, b) => a + b, 0);
        doc.text(String(cell), x, y, { width: colWidths[ci], align: ci === 0 ? 'left' : 'right' });
      });
      y += rowH;
    });
    doc.y = y + 8;
  }
  //
  _page1Executive(doc, data) {
    this._header(doc, 'xswarm-freeloader Report', `Generated ${data.date} • Executive Summary`);
    const r30 = data.ranges?.['30d'] || {};
    const r24 = data.ranges?.['24h'] || {};
    //
    // Big savings callout
    doc.rect(40, doc.y, 515, 50).fill('#ecfdf5');
    doc.fontSize(11).font('Helvetica').fillColor('#065f46').text('30-Day Savings vs. GPT-4o Baseline', 55, doc.y + 8);
    doc.fontSize(26).font('Helvetica-Bold').fillColor(COLORS.accent).text(fmtSavings(r30.savings), 55, doc.y + 4);
    doc.y += 30;
    doc.moveDown();
    //
    // KPI cards
    this._sectionTitle(doc, 'Key Metrics');
    this._kpiRow(doc, [
      { label: 'Requests (30d)', value: fmt(r30.stats?.requests), trend: this._trendStr(r30.trend?.requests) },
      { label: 'Total Cost (30d)', value: fmtCost(r30.stats?.total_cost), trend: this._trendStr(r30.trend?.cost, true) },
      { label: 'Avg Latency (24h)', value: Math.round(r24.stats?.avg_latency || 0) + 'ms', trend: this._trendStr(r24.trend?.latency, true) },
      { label: 'Error Rate (24h)', value: fmtPct(r24.errorRate?.error_rate), color: (r24.errorRate?.error_rate || 0) > 5 ? COLORS.error : COLORS.primary }
    ]);
    doc.moveDown();
    //
    // All ranges overview table
    this._sectionTitle(doc, 'Period Comparison');
    this._table(doc,
      ['Period', 'Requests', 'Cost', 'Savings', 'Avg Latency', 'Error Rate'],
      ['24h', '7d', '30d', '90d'].map(k => {
        const r = data.ranges?.[k] || {};
        return [r.label || k, fmt(r.stats?.requests), fmtCost(r.stats?.total_cost), fmtSavings(r.savings), Math.round(r.stats?.avg_latency || 0) + 'ms', fmtPct(r.errorRate?.error_rate)];
      }),
      { colWidths: [100, 75, 85, 85, 85, 85] }
    );
    doc.moveDown();
    //
    // Top providers 30d
    if (r30.providerBreakdown?.length) {
      this._sectionTitle(doc, 'Top Providers (30 Days)');
      this._table(doc, ['Provider', 'Requests', 'Cost', 'Tokens'],
        r30.providerBreakdown.slice(0, 7).map(p => [p.provider_name || p.provider_id, fmt(p.requests), fmtCost(p.total_cost), fmt(p.total_tokens)]),
        { colWidths: [150, 110, 130, 125] }
      );
    }
    //
    // Opportunities
    if (data.opportunities?.length) {
      doc.moveDown();
      this._sectionTitle(doc, 'Opportunities');
      doc.fontSize(10).font('Helvetica').fillColor(COLORS.primary);
      data.opportunities.forEach(o => { doc.text(`• ${o}`, 48); doc.moveDown(0.3); });
    }
  }
  //
  _page2Detail24h(doc, data) {
    this._header(doc, '24-Hour Detail', `${data.date} • Hourly Breakdown & Stats`);
    const r24 = data.ranges?.['24h'] || {};
    //
    this._kpiRow(doc, [
      { label: 'Requests', value: fmt(r24.stats?.requests) },
      { label: 'Cost', value: fmtCost(r24.stats?.total_cost) },
      { label: 'Savings', value: fmtSavings(r24.savings), color: COLORS.accent },
      { label: 'Errors', value: fmt(r24.errorRate?.errors), color: (r24.errorRate?.errors || 0) > 0 ? COLORS.error : COLORS.primary }
    ]);
    doc.moveDown();
    //
    // Hourly breakdown table
    if (data.hourly?.length) {
      this._sectionTitle(doc, 'Hourly Breakdown');
      // ASCII bar chart
      const maxReqs = Math.max(...data.hourly.map(h => h.requests || 0), 1);
      this._table(doc, ['Hour', 'Requests', 'Cost', 'Latency', 'Errors', 'Volume'],
        data.hourly.map(h => {
          const barLen = Math.round((h.requests / maxReqs) * 20);
          const bar = '█'.repeat(barLen) + '░'.repeat(20 - barLen);
          return [`${h.hour}:00`, fmt(h.requests), fmtCost(h.cost), Math.round(h.avg_latency || 0) + 'ms', fmt(h.errors), bar];
        }),
        { colWidths: [50, 70, 80, 70, 55, 190] }
      );
    }
    doc.moveDown();
    //
    // Provider breakdown
    if (r24.providerBreakdown?.length) {
      this._sectionTitle(doc, 'Provider Breakdown (24h)');
      this._table(doc, ['Provider', 'Requests', 'Cost', 'Avg Latency'],
        r24.providerBreakdown.slice(0, 7).map(p => [p.provider_name || p.provider_id, fmt(p.requests), fmtCost(p.total_cost), Math.round(p.avg_latency || 0) + 'ms']),
        { colWidths: [150, 120, 120, 125] }
      );
    }
  }
  //
  _page3WeekMonth(doc, data) {
    this._header(doc, '7-Day & 30-Day Analysis', `${data.date} • Medium-Term Trends`);
    const r7 = data.ranges?.['7d'] || {};
    const r30 = data.ranges?.['30d'] || {};
    //
    // 7-day section
    this._sectionTitle(doc, '7-Day Summary');
    this._kpiRow(doc, [
      { label: 'Requests', value: fmt(r7.stats?.requests), trend: this._trendStr(r7.trend?.requests) },
      { label: 'Cost', value: fmtCost(r7.stats?.total_cost), trend: this._trendStr(r7.trend?.cost, true) },
      { label: 'Savings', value: fmtSavings(r7.savings), color: COLORS.accent },
      { label: 'Error Rate', value: fmtPct(r7.errorRate?.error_rate) }
    ]);
    if (r7.providerBreakdown?.length) {
      this._table(doc, ['Provider', 'Requests', 'Cost', 'Tokens'],
        r7.providerBreakdown.slice(0, 5).map(p => [p.provider_name || p.provider_id, fmt(p.requests), fmtCost(p.total_cost), fmt(p.total_tokens)]),
        { colWidths: [150, 110, 130, 125] }
      );
    }
    doc.moveDown();
    //
    // 30-day section
    this._sectionTitle(doc, '30-Day Summary');
    this._kpiRow(doc, [
      { label: 'Requests', value: fmt(r30.stats?.requests), trend: this._trendStr(r30.trend?.requests) },
      { label: 'Cost', value: fmtCost(r30.stats?.total_cost), trend: this._trendStr(r30.trend?.cost, true) },
      { label: 'Savings', value: fmtSavings(r30.savings), color: COLORS.accent },
      { label: 'Error Rate', value: fmtPct(r30.errorRate?.error_rate) }
    ]);
    if (r30.topApps?.length) {
      this._sectionTitle(doc, 'Top Apps (30 Days)');
      this._table(doc, ['App', 'Requests', 'Cost', 'Avg Latency'],
        r30.topApps.slice(0, 5).map(a => [a.app_name || a.app_id, fmt(a.requests), fmtCost(a.total_cost), Math.round(a.avg_latency || 0) + 'ms']),
        { colWidths: [150, 120, 120, 125] }
      );
    }
  }
  //
  _page4Quarter(doc, data) {
    this._header(doc, '90-Day Overview', `${data.date} • Quarterly Trends & Growth`);
    const r90 = data.ranges?.['90d'] || {};
    const r30 = data.ranges?.['30d'] || {};
    //
    this._kpiRow(doc, [
      { label: 'Total Requests', value: fmt(r90.stats?.requests) },
      { label: 'Total Cost', value: fmtCost(r90.stats?.total_cost) },
      { label: 'Total Savings', value: fmtSavings(r90.savings), color: COLORS.accent },
      { label: 'Avg Latency', value: Math.round(r90.stats?.avg_latency || 0) + 'ms' }
    ]);
    doc.moveDown();
    //
    // Monthly breakdown (approximate: split 90d into 3 periods)
    this._sectionTitle(doc, 'Monthly Summary (Approximate)');
    const now = Math.floor(Date.now() / 1000);
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date((now - i * 30 * 86400) * 1000);
      months.push(d.toISOString().slice(0, 7));
    }
    // Use the ranges we have for approximate monthly data
    this._table(doc, ['Metric', months[0], months[1], months[2]],
      [
        ['Requests', fmt(r90.stats?.requests ? Math.round(r90.stats.requests * 0.25) : 0), fmt(r90.stats?.requests ? Math.round(r90.stats.requests * 0.33) : 0), fmt(r30.stats?.requests)],
        ['Cost', fmtCost((r90.stats?.total_cost || 0) * 0.25), fmtCost((r90.stats?.total_cost || 0) * 0.33), fmtCost(r30.stats?.total_cost)],
        ['Savings', fmtSavings((r90.savings || 0) * 0.25), fmtSavings((r90.savings || 0) * 0.33), fmtSavings(r30.savings)]
      ],
      { colWidths: [120, 130, 130, 135] }
    );
    doc.moveDown();
    //
    // Growth metrics
    this._sectionTitle(doc, 'Growth Metrics');
    const dailyAvg = (r90.stats?.requests || 0) / 90;
    const costPerReq = (r90.stats?.requests || 0) > 0 ? (r90.stats.total_cost || 0) / r90.stats.requests : 0;
    doc.fontSize(10).font('Helvetica').fillColor(COLORS.primary);
    doc.text(`Average daily requests: ${fmt(dailyAvg, 0)}`);
    doc.text(`Cost per request: ${fmtCost(costPerReq)}`);
    doc.text(`Total tokens processed: ${fmt((r90.stats?.total_tokens_in || 0) + (r90.stats?.total_tokens_out || 0))}`);
    doc.text(`Savings rate: ${((r90.savings || 0) / Math.max((r90.savings || 0) + (r90.stats?.total_cost || 0), 0.01) * 100).toFixed(1)}%`);
    doc.moveDown();
    //
    // Provider mix 90d
    if (r90.providerBreakdown?.length) {
      this._sectionTitle(doc, 'Provider Distribution (90 Days)');
      this._table(doc, ['Provider', 'Requests', 'Cost', 'Avg Latency', 'Tokens'],
        r90.providerBreakdown.slice(0, 7).map(p => [p.provider_name || p.provider_id, fmt(p.requests), fmtCost(p.total_cost), Math.round(p.avg_latency || 0) + 'ms', fmt(p.total_tokens)]),
        { colWidths: [120, 90, 100, 90, 115] }
      );
    }
    //
    // Sanitization
    if (data.sanitizationSummary && data.sanitizationSummary.total > 0) {
      doc.moveDown();
      this._sectionTitle(doc, 'Sanitization Summary');
      doc.fontSize(10).font('Helvetica').fillColor(COLORS.primary);
      doc.text(`Total scanned: ${fmt(data.sanitizationSummary.total)}`);
      doc.text(`Secrets found: ${fmt(data.sanitizationSummary.total_secrets)}`);
      doc.text(`PII detected: ${fmt(data.sanitizationSummary.total_pii)}`);
      doc.text(`Requests blocked: ${fmt(data.sanitizationSummary.total_blocked)}`);
    }
  }
  //
  _trendStr(pct, invertGood = false) {
    if (!pct || Math.abs(pct) < 0.5) return '';
    const dir = pct > 0 ? 'up' : 'down';
    const good = invertGood ? (pct < 0) : (pct > 0);
    return `${dir} ${Math.abs(pct).toFixed(1)}%${good ? ' ✓' : ''}`;
  }
}
