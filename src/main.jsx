import React, { useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { ArrowRight, Check, Download, FileSpreadsheet, FileText, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, UploadCloud, X } from 'lucide-react';
import './styles.css';

const MAX_FILE_SIZE = 50 * 1024 * 1024;
const formatBytes = (bytes) => bytes < 1024 ? `${bytes} B` : bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
const safeName = (name) => name.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]+/gi, '-').replace(/^-+|-+$/g, '') || 'converted-file';
const uniqueSheetName = (name, used) => {
  const base = (name.replace(/[\\/?*:[\]]/g, '').trim() || 'Sheet').slice(0, 31);
  let candidate = base, n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n++})`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
  }
  used.add(candidate.toLowerCase());
  return candidate;
};

function parseCsv(file) {
  return new Promise((resolve, reject) => {
    if (!/\.csv$/i.test(file.name) && file.type !== 'text/csv') return reject(new Error(`${file.name}: please choose a CSV file.`));
    if (!file.size) return reject(new Error(`${file.name}: this file is empty.`));
    if (file.size > MAX_FILE_SIZE) return reject(new Error(`${file.name}: exceeds the 50 MB per-file limit.`));
    Papa.parse(file, {
      header: true, skipEmptyLines: 'greedy', dynamicTyping: false, worker: true,
      complete: (result) => {
        const headers = result.meta.fields || [];
        const rows = result.data || [];
        if (!headers.length) return reject(new Error(`${file.name}: no column headers found. The first row should contain column names.`));
        if (!rows.length) return reject(new Error(`${file.name}: no data rows found.`));
        resolve({ file, headers, rows, warnings: result.errors || [] });
      },
      error: (err) => reject(new Error(`${file.name}: ${err.message || 'could not be read.'}`))
    });
  });
}

function App() {
  const inputRef = useRef(null);
  const [datasets, setDatasets] = useState([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [filename, setFilename] = useState('converted-files.xlsx');
  const [converted, setConverted] = useState(false);
  const active = datasets[activeIndex];
  const previewRows = useMemo(() => active?.rows.slice(0, 8) || [], [active]);

  const addFiles = async (fileList) => {
    const selected = Array.from(fileList || []);
    if (!selected.length) return;
    setError(''); setConverted(false); setBusy(true);
    const parsed = [], failures = [];
    for (const file of selected) {
      try { parsed.push(await parseCsv(file)); }
      catch (e) { failures.push(e.message); }
    }
    if (!datasets.length && parsed.length) {
      setActiveIndex(0);
      setFilename(`${safeName(parsed[0].file.name)}${parsed.length > 1 ? '-workbook' : ''}.xlsx`);
    }
    setDatasets((current) => [...current, ...parsed]);
    if (failures.length) setError(failures.join(' '));
    setBusy(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const removeFile = (index) => {
    setDatasets((current) => current.filter((_, i) => i !== index));
    setActiveIndex((current) => index < current ? current - 1 : index === current ? Math.max(0, current - 1) : current);
    setConverted(false);
    if (datasets.length <= 1) setFilename('converted-files.xlsx');
  };

  const reset = () => { setDatasets([]); setActiveIndex(0); setError(''); setFilename('converted-files.xlsx'); setConverted(false); if (inputRef.current) inputRef.current.value = ''; };

  const convert = () => {
    if (!datasets.length) return;
    try {
      const workbook = XLSX.utils.book_new();
      const usedNames = new Set();
      datasets.forEach((dataset) => {
        const worksheet = XLSX.utils.json_to_sheet(dataset.rows, { header: dataset.headers });
        worksheet['!cols'] = dataset.headers.map((header) => ({ wch: Math.min(Math.max(String(header).length + 4, 14), 32) }));
        XLSX.utils.book_append_sheet(workbook, worksheet, uniqueSheetName(dataset.file.name.replace(/\.csv$/i, ''), usedNames));
      });
      const outputName = (filename.trim() || 'converted-files').replace(/\.xlsx$/i, '') + '.xlsx';
      XLSX.writeFile(workbook, outputName, { compression: true });
      setConverted(true); setError('');
    } catch (e) { setError(`Conversion failed: ${e.message || 'Please try again.'}`); }
  };

  return <div className="app-shell">
    <header className="topbar"><a className="brand" href="#top" aria-label="SheetShift home"><span className="brand-icon"><FileSpreadsheet size={21}/></span><span>Sheet<span className="brand-accent">Shift</span></span></a><div className="top-note"><LockKeyhole size={14}/> Files stay on your device</div></header>
    <main id="top" className="main-content">
      <section className="hero"><div className="eyebrow"><Sparkles size={13}/> SIMPLE. SECURE. SPREADSHEET-READY.</div><h1>CSV to Excel,<br/><span>without the hassle.</span></h1><p className="hero-copy">Turn one or multiple CSV files into a single Excel workbook in seconds. No sign-up, no server uploads — just a simple conversion.</p></section>
      <section className="workspace">
        {!datasets.length ? <div className={`upload-card ${dragging ? 'is-dragging' : ''}`} onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragging(false); }} onDrop={(e) => { e.preventDefault(); setDragging(false); addFiles(e.dataTransfer.files); }}>
          <div className="upload-icon"><UploadCloud size={29}/></div><h2>{busy ? 'Reading your files…' : 'Drop your CSV files here'}</h2><p>or choose one or more files from your device</p>
          <button className="primary-btn choose-btn" onClick={() => inputRef.current?.click()} disabled={busy}>{busy ? <RefreshCw className="spin" size={17}/> : <FileText size={17}/>} {busy ? 'Processing' : 'Choose CSV files'} <ArrowRight size={16}/></button>
          <input ref={inputRef} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => addFiles(e.target.files)}/>
          <div className="upload-meta"><span>CSV format</span><i/> <span>Up to 50 MB each</span><i/> <span>Secure local processing</span></div>
        </div> : <div className="result-card">
          <div className="result-topline"><div><h2>Your CSV files</h2><p>{datasets.length} file{datasets.length === 1 ? '' : 's'} ready · {datasets.reduce((sum, d) => sum + d.rows.length, 0).toLocaleString()} total rows</p></div><button className="secondary-btn add-more" onClick={() => inputRef.current?.click()} disabled={busy}>＋ Add files</button><input ref={inputRef} type="file" accept=".csv,text/csv" multiple hidden onChange={(e) => addFiles(e.target.files)}/></div>
          <div className="file-list">{datasets.map((dataset, index) => <div className={`file-list-item ${index === activeIndex ? 'selected' : ''}`} key={`${dataset.file.name}-${index}`}><button className="file-select" onClick={() => setActiveIndex(index)}><FileSpreadsheet size={18}/><span><strong>{dataset.file.name}</strong><small>{formatBytes(dataset.file.size)} · {dataset.rows.length.toLocaleString()} rows · {dataset.headers.length} columns</small></span></button><button className="icon-btn remove-file" onClick={() => removeFile(index)} aria-label={`Remove ${dataset.file.name}`}><X size={16}/></button></div>)}</div>
          {active && <><div className="preview-heading"><div><h2>Data preview</h2><p>Showing first {Math.min(8, active.rows.length)} of {active.rows.length.toLocaleString()} rows · {active.file.name}</p></div><span className="ready-pill"><Check size={13}/> Ready</span></div>
          <div className="table-wrap"><table><thead><tr>{active.headers.slice(0, 6).map((h, i) => <th key={i}>{h || `Column ${i + 1}`}</th>)}{active.headers.length > 6 && <th>+{active.headers.length - 6} more</th>}</tr></thead><tbody>{previewRows.map((row, ri) => <tr key={ri}>{active.headers.slice(0, 6).map((h, ci) => <td key={ci}>{String(row[h] ?? '').slice(0, 100) || <span className="empty-cell">—</span>}</td>)}{active.headers.length > 6 && <td className="more-cell">…</td>}</tr>)}</tbody></table></div></>}
          <label className="filename-label" htmlFor="filename">Excel file name</label><div className="filename-input"><FileSpreadsheet size={17}/><input id="filename" value={filename.replace(/\.xlsx$/i, '')} onChange={(e) => { setFilename(e.target.value); setConverted(false); }} aria-label="Excel file name"/><span>.xlsx</span></div>
          <div className="action-row"><button className="secondary-btn" onClick={reset}><RefreshCw size={16}/> Start over</button><button className="primary-btn convert-btn" onClick={convert}><Download size={17}/> Convert & download <ArrowRight size={16}/></button></div>
          {converted && <div className="success-note"><Check size={16}/> Your Excel workbook has been downloaded with {datasets.length} worksheet{datasets.length === 1 ? '' : 's'}.</div>}
        </div>}
        {error && <div className="error-note"><span>{error}</span><button onClick={() => setError('')} aria-label="Dismiss error"><X size={15}/></button></div>}
      </section>
      <section className="benefits"><div className="benefit"><span><ShieldCheck size={18}/></span><div><strong>Private by design</strong><p>Your files never leave your browser.</p></div></div><div className="benefit"><span><span className="zap-symbol">↯</span></span><div><strong>Batch conversion</strong><p>Combine multiple CSVs into one workbook.</p></div></div><div className="benefit"><span><FileSpreadsheet size={18}/></span><div><strong>Excel-ready output</strong><p>Each CSV becomes its own worksheet.</p></div></div></section>
      <footer><span>© {new Date().getFullYear()} SheetShift</span><span>Made for quick, secure conversions</span></footer>
    </main>
  </div>;
}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>);
