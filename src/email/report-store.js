// :arch: local file store for generated PDF reports
// :why: reports always saved locally regardless of email config; zero-friction access from dashboard
// :deps: fs, path; consumers: digest.js, app.js report endpoints
// :rules: reports dir auto-created under ~/.xswarm/reports/; keeps last 90 days; filename = date
import fs from 'fs';
import path from 'path';
//
export class ReportStore {
  constructor(baseDir) {
    this.dir = baseDir || path.join(process.env.HOME || process.env.USERPROFILE, '.xswarm', 'reports');
    if (!fs.existsSync(this.dir)) fs.mkdirSync(this.dir, { recursive: true });
  }
  //
  save(date, pdfBuffer) {
    const filePath = path.join(this.dir, `xswarm-report-${date}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);
    return filePath;
  }
  //
  getLatest() {
    const files = fs.readdirSync(this.dir).filter(f => f.endsWith('.pdf')).sort().reverse();
    if (!files.length) return null;
    return { name: files[0], path: path.join(this.dir, files[0]), buffer: fs.readFileSync(path.join(this.dir, files[0])) };
  }
  //
  getByDate(date) {
    const filePath = path.join(this.dir, `xswarm-report-${date}.pdf`);
    if (!fs.existsSync(filePath)) return null;
    return { name: path.basename(filePath), path: filePath, buffer: fs.readFileSync(filePath) };
  }
  //
  list() {
    return fs.readdirSync(this.dir).filter(f => f.endsWith('.pdf')).sort().reverse();
  }
  //
  prune(keepDays = 90) {
    const cutoff = Date.now() - keepDays * 86400000;
    for (const f of fs.readdirSync(this.dir)) {
      const full = path.join(this.dir, f);
      if (fs.statSync(full).mtimeMs < cutoff) fs.unlinkSync(full);
    }
  }
}
