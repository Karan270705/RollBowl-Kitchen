import 'dotenv/config';
import * as XLSX from 'xlsx';
import { fetchOrdersForExport, generateXlsxBase64 } from '../src/services/reports/orderExport';
import * as fs from 'fs';
import * as path from 'path';

async function main() {
  console.log('Testing export generation...');
  // Find stall and dates
  const { createClient } = require('@supabase/supabase-js');
  const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
  
  const { data: stalls } = await supabase.from('stalls').select('id').eq('is_active', true).limit(1);
  if (!stalls || stalls.length === 0) {
    console.error('No active stall found');
    return;
  }
  const stallId = stalls[0].id;
  console.log('Using stallId:', stallId);

  const fromDate = '2026-01-01';
  const toDate = '2026-12-31';

  console.log('Fetching dataset...');
  const dataset = await fetchOrdersForExport(stallId, fromDate, toDate, (p) => {
    console.log('Progress:', p.stage);
  });

  console.log(`Fetched ${dataset.orders.length} orders, ${dataset.orderItems.length} items`);

  console.log('Generating XLSX Base64...');
  const base64 = generateXlsxBase64(dataset, fromDate, toDate);

  const outPath = path.join(__dirname, 'test_export.xlsx');
  fs.writeFileSync(outPath, Buffer.from(base64, 'base64'));
  console.log('Wrote workbook to:', outPath);

  // Now open and inspect using XLSX
  const wb = XLSX.readFile(outPath);
  console.log('Workbook SheetNames:', wb.SheetNames);
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    const rowCount = range.e.r - range.s.r + 1;
    const filterRange = ws['!autofilter'] ? ws['!autofilter'].ref : 'NONE';
    console.log(`Sheet "${name}": ${rowCount} rows, autofilter: ${filterRange}`);
  }
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
