# SheetShift — CSV to Excel Converter

A browser-based CSV-to-XLSX converter built with React, Vite, Papa Parse and SheetJS.

## Features
- Upload one or multiple CSV files using file selection or drag and drop.
- Preview the first eight data rows for each CSV.
- Add more CSV files or remove individual files before conversion.
- Combine all selected CSV files into one Excel workbook, with one worksheet per CSV.
- Set a custom `.xlsx` output filename.
- Preserve values as text to avoid silently stripping leading zeros from identifiers.
- Process files entirely in the browser; CSV contents are not sent to an application server.
- Responsive interface and Vercel-ready configuration.

## Requirements
- Node.js 18+
- npm

## Run locally
```bash
npm install
npm run dev
```

## Production build
```bash
npm run build
npm run preview
```

## Deploy through GitHub + Vercel
1. Create a new GitHub repository, for example `sheetshift`.
2. Extract this project and push the contents of the `csv-to-excel-converter` folder to the repository root.
3. Sign in to Vercel and choose **Add New → Project**.
4. Import the `sheetshift` GitHub repository and authorize Vercel to access it if prompted.
5. Vercel should detect **Vite** automatically. Use these settings if asked:
   - Framework preset: `Vite`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Install command: `npm install`
6. Select **Deploy**. No environment variables are required.
7. Vercel assigns a deployment URL. A custom domain can be configured later in Project → Settings → Domains.

## Privacy and limits
CSV parsing and Excel generation happen locally in the browser. Files are not uploaded to a backend. Each CSV is limited to 50 MB to reduce browser memory pressure. Very large combined workbooks may still depend on available device memory.

## Workbook behavior
- The first row of each CSV is treated as its header row.
- Each input CSV becomes a separate worksheet. Worksheet names are derived from filenames and made unique/Excel-compatible.
- The workbook filename defaults to the first CSV filename (or a combined name for multiple files) and can be edited before download.
- Values are imported as text to preserve identifiers and leading zeros.
