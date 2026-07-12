import { useState } from 'react';
import { 
  fetchOrdersForExport, 
  generateXlsxBase64, 
  saveAndShareExport,
  buildOrdersSheetData,
  ExportProgress
} from '../services/reports/orderExport';
import { getPrimaryStallId } from '../services/orders';
import { buildCsvString } from '../utils/export/csv';
import { cleanupOldExportFiles } from '../utils/export/fileCleanup';
import * as FileSystem from 'expo-file-system/legacy';

export const useExportOrders = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);

  const performExport = async (fromDate: string, toDate: string, format: 'xlsx' | 'csv') => {
    if (isExporting) return;
    
    try {
      setIsExporting(true);
      setProgress({ stage: 'Starting export...' });
      
      // Initial cleanup
      await cleanupOldExportFiles();
      
      // Stall resolution
      const stallId = await getPrimaryStallId();

      // Fetch
      const dataset = await fetchOrdersForExport(stallId, fromDate, toDate, setProgress);
      
      if (dataset.orders.length === 0) {
        throw new Error(`No orders found between ${fromDate} and ${toDate}`);
      }

      const filenameDate = `${fromDate}_to_${toDate}`;
      
      if (format === 'xlsx') {
        setProgress({ stage: 'Building workbook...' });
        const base64 = generateXlsxBase64(dataset, fromDate, toDate);
        
        setProgress({ stage: 'Saving & Sharing file...' });
        const filename = `RollBowl_Orders_${filenameDate}.xlsx`;
        await saveAndShareExport(
          filename, 
          base64, 
          FileSystem.EncodingType.Base64, 
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        );
      } else {
        setProgress({ stage: 'Building CSV...' });
        const rows = buildOrdersSheetData(dataset);
        const csvString = buildCsvString(rows);
        
        setProgress({ stage: 'Saving & Sharing file...' });
        const filename = `RollBowl_Orders_${filenameDate}.csv`;
        await saveAndShareExport(
          filename, 
          csvString, 
          FileSystem.EncodingType.UTF8, 
          'text/csv'
        );
      }
      
      setProgress(null);
    } catch (err: any) {
      setProgress(null);
      throw err;
    } finally {
      setIsExporting(false);
    }
  };

  return {
    isExporting,
    progress,
    exportXlsx: (from: string, to: string) => performExport(from, to, 'xlsx'),
    exportCsv: (from: string, to: string) => performExport(from, to, 'csv')
  };
};
