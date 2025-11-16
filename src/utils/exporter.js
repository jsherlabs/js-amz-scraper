/**
 * Export Utility
 *
 * Handles exporting scraped data to various formats (CSV, JSON, Excel)
 */

const fs = require('fs').promises;
const path = require('path');
const ObjectsToCsv = require('objects-to-csv');
const config = require('../config/scraper.config');
const { createConsoleLogger } = require('./logger');

/**
 * Export data to JSON format
 * @param {Array} data - Data to export
 * @param {string} filename - Output filename
 * @param {Object} options - Export options
 * @returns {Promise<void>}
 */
async function exportToJson(data, filename, options = {}) {
  const { pretty = config.export.jsonPretty, includeMetadata = config.export.includeMetadata } =
    options;

  let output = data;

  if (includeMetadata) {
    output = {
      metadata: {
        exportDate: new Date().toISOString(),
        totalProducts: data.length,
        format: 'json'
      },
      products: data
    };
  }

  const jsonString = pretty ? JSON.stringify(output, null, 2) : JSON.stringify(output);

  await fs.writeFile(filename, jsonString, 'utf8');
}

/**
 * Export data to CSV format
 * @param {Array} data - Data to export
 * @param {string} filename - Output filename
 * @returns {Promise<void>}
 */
async function exportToCsv(data, filename) {
  const csv = new ObjectsToCsv(data);
  await csv.toDisk(filename);
}

/**
 * Export data to Excel format
 * @param {Array} data - Data to export
 * @param {string} filename - Output filename
 * @param {Object} options - Export options
 * @returns {Promise<void>}
 */
async function exportToExcel(data, filename, options = {}) {
  const { sheetName = config.export.excelSheetName } = options;

  try {
    // Dynamic import for ExcelJS (optional dependency)
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(sheetName);

    if (data.length === 0) {
      throw new Error('No data to export to Excel');
    }

    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD3D3D3' }
    };

    // Add data rows
    data.forEach((item) => {
      const row = headers.map((header) => item[header] || '');
      worksheet.addRow(row);
    });

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: true }, (cell) => {
        const cellLength = cell.value ? cell.value.toString().length : 10;
        maxLength = Math.max(maxLength, cellLength);
      });
      column.width = Math.min(maxLength + 2, 50);
    });

    await workbook.xlsx.writeFile(filename);
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      throw new Error('ExcelJS not installed. Install with: npm install exceljs');
    }
    throw error;
  }
}

/**
 * Get file extension from format
 * @param {string} format - Export format (csv, json, xlsx, excel)
 * @returns {string} - File extension
 */
function getExtension(format) {
  const extensions = {
    csv: '.csv',
    json: '.json',
    xlsx: '.xlsx',
    excel: '.xlsx'
  };
  return extensions[format.toLowerCase()] || '.csv';
}

/**
 * Export data to specified format
 * @param {Array} data - Data to export
 * @param {string} filename - Base output filename (without extension)
 * @param {string} format - Export format (csv, json, xlsx)
 * @param {Object} options - Export options
 * @param {Object} logger - Logger instance
 * @returns {Promise<string>} - Output filename
 */
async function exportData(
  data,
  filename,
  format = 'csv',
  options = {},
  logger = createConsoleLogger('info')
) {
  if (!data || data.length === 0) {
    logger.warn('No data to export');
    return null;
  }

  const ext = getExtension(format);
  const outputFilename = filename.endsWith(ext) ? filename : `${filename}${ext}`;

  logger.info(`Exporting ${data.length} products to ${format.toUpperCase()} format...`);

  try {
    switch (format.toLowerCase()) {
      case 'json':
        await exportToJson(data, outputFilename, options);
        break;
      case 'csv':
        await exportToCsv(data, outputFilename);
        break;
      case 'xlsx':
      case 'excel':
        await exportToExcel(data, outputFilename, options);
        break;
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }

    logger.info(`Data exported successfully to ${outputFilename}`);
    return outputFilename;
  } catch (error) {
    logger.error(`Failed to export to ${format}: ${error.message}`);
    throw error;
  }
}

/**
 * Export data to multiple formats
 * @param {Array} data - Data to export
 * @param {string} baseFilename - Base output filename (without extension)
 * @param {Array<string>} formats - Array of formats to export to
 * @param {Object} options - Export options
 * @param {Object} logger - Logger instance
 * @returns {Promise<Array<string>>} - Array of output filenames
 */
async function exportToMultipleFormats(
  data,
  baseFilename,
  formats = ['csv'],
  options = {},
  logger = createConsoleLogger('info')
) {
  const results = [];

  for (const format of formats) {
    try {
      const outputFile = await exportData(data, baseFilename, format, options, logger);
      if (outputFile) {
        results.push(outputFile);
      }
    } catch (error) {
      logger.error(`Failed to export to ${format}: ${error.message}`);
      if (!options.continueOnError) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Read data from file
 * @param {string} filename - Input filename
 * @returns {Promise<Array>} - Parsed data
 */
async function readData(filename) {
  const ext = path.extname(filename).toLowerCase();
  const content = await fs.readFile(filename, 'utf8');

  if (ext === '.json') {
    const parsed = JSON.parse(content);
    // Handle metadata wrapper
    return parsed.products || parsed;
  } else if (ext === '.csv') {
    // Simple CSV parsing (for basic use cases)
    const lines = content.trim().split('\n');
    const headers = lines[0].split(',');
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      const obj = {};
      headers.forEach((header, index) => {
        obj[header.trim()] = values[index] ? values[index].trim() : '';
      });
      data.push(obj);
    }

    return data;
  }

  throw new Error(`Unsupported file format: ${ext}`);
}

module.exports = {
  exportToJson,
  exportToCsv,
  exportToExcel,
  exportData,
  exportToMultipleFormats,
  readData,
  getExtension
};
