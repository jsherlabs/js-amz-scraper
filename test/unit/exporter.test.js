/**
 * Tests for Exporter Utility
 */

const fs = require('fs').promises;
const {
  exportToJson,
  exportToCsv,
  exportData,
  exportToMultipleFormats,
  readData,
  getExtension
} = require('../../src/utils/exporter');
const { createConsoleLogger } = require('../../src/utils/logger');

jest.mock('fs', () => ({
  promises: {
    writeFile: jest.fn(),
    readFile: jest.fn()
  }
}));

jest.mock('objects-to-csv');

describe('Exporter Utility', () => {
  const testData = [
    { title: 'Product 1', price: '$10', asin: 'A1' },
    { title: 'Product 2', price: '$20', asin: 'A2' }
  ];

  const logger = createConsoleLogger('error');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getExtension', () => {
    it('should return correct extension for csv', () => {
      expect(getExtension('csv')).toBe('.csv');
    });

    it('should return correct extension for json', () => {
      expect(getExtension('json')).toBe('.json');
    });

    it('should return correct extension for xlsx', () => {
      expect(getExtension('xlsx')).toBe('.xlsx');
    });

    it('should return correct extension for excel', () => {
      expect(getExtension('excel')).toBe('.xlsx');
    });

    it('should default to csv for unknown formats', () => {
      expect(getExtension('unknown')).toBe('.csv');
    });

    it('should be case insensitive', () => {
      expect(getExtension('CSV')).toBe('.csv');
      expect(getExtension('JSON')).toBe('.json');
    });
  });

  describe('exportToJson', () => {
    it('should export data to JSON without metadata', async () => {
      await exportToJson(testData, 'output.json', { includeMetadata: false });

      expect(fs.writeFile).toHaveBeenCalledWith('output.json', expect.any(String), 'utf8');

      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData).toEqual(testData);
    });

    it('should export data to JSON with metadata', async () => {
      await exportToJson(testData, 'output.json', { includeMetadata: true });

      const writtenData = JSON.parse(fs.writeFile.mock.calls[0][1]);
      expect(writtenData.metadata).toBeDefined();
      expect(writtenData.metadata.totalProducts).toBe(2);
      expect(writtenData.products).toEqual(testData);
    });

    it('should export pretty JSON when configured', async () => {
      await exportToJson(testData, 'output.json', { pretty: true, includeMetadata: false });

      const writtenJson = fs.writeFile.mock.calls[0][1];
      expect(writtenJson).toContain('\n'); // Pretty printed has newlines
      expect(writtenJson).toContain('  '); // Pretty printed has indentation
    });

    it('should export compact JSON when pretty is false', async () => {
      await exportToJson(testData, 'output.json', { pretty: false, includeMetadata: false });

      const writtenJson = fs.writeFile.mock.calls[0][1];
      expect(writtenJson).toBe(JSON.stringify(testData));
    });
  });

  describe('exportToCsv', () => {
    it('should export data to CSV', async () => {
      const ObjectsToCsv = require('objects-to-csv');
      const mockToDisk = jest.fn().mockResolvedValue(undefined);
      ObjectsToCsv.mockImplementation(() => ({
        toDisk: mockToDisk
      }));

      await exportToCsv(testData, 'output.csv');

      expect(ObjectsToCsv).toHaveBeenCalledWith(testData);
      expect(mockToDisk).toHaveBeenCalledWith('output.csv');
    });
  });

  describe('exportData', () => {
    it('should export to JSON format', async () => {
      const result = await exportData(testData, 'output', 'json', {}, logger);

      expect(result).toBe('output.json');
      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should export to CSV format', async () => {
      const ObjectsToCsv = require('objects-to-csv');
      const mockToDisk = jest.fn().mockResolvedValue(undefined);
      ObjectsToCsv.mockImplementation(() => ({
        toDisk: mockToDisk
      }));

      const result = await exportData(testData, 'output', 'csv', {}, logger);

      expect(result).toBe('output.csv');
      expect(mockToDisk).toHaveBeenCalled();
    });

    it('should handle empty data', async () => {
      const result = await exportData([], 'output', 'csv', {}, logger);

      expect(result).toBeNull();
    });

    it('should throw error for unsupported format', async () => {
      await expect(exportData(testData, 'output', 'unsupported', {}, logger)).rejects.toThrow(
        'Unsupported export format'
      );
    });

    it('should add correct file extension', async () => {
      const result = await exportData(testData, 'output', 'json', {}, logger);

      expect(result).toBe('output.json');
    });

    it('should not duplicate extension if already present', async () => {
      const result = await exportData(testData, 'output.json', 'json', {}, logger);

      expect(result).toBe('output.json');
    });
  });

  describe('exportToMultipleFormats', () => {
    it('should export to multiple formats', async () => {
      const ObjectsToCsv = require('objects-to-csv');
      const mockToDisk = jest.fn().mockResolvedValue(undefined);
      ObjectsToCsv.mockImplementation(() => ({
        toDisk: mockToDisk
      }));

      const results = await exportToMultipleFormats(
        testData,
        'output',
        ['csv', 'json'],
        {},
        logger
      );

      expect(results).toHaveLength(2);
      expect(results).toContain('output.csv');
      expect(results).toContain('output.json');
    });

    it('should continue on error when configured', async () => {
      const results = await exportToMultipleFormats(
        testData,
        'output',
        ['csv', 'unsupported', 'json'],
        { continueOnError: true },
        logger
      );

      expect(results.length).toBeGreaterThan(0);
    });

    it('should throw on first error when continueOnError is false', async () => {
      await expect(
        exportToMultipleFormats(
          testData,
          'output',
          ['unsupported'],
          { continueOnError: false },
          logger
        )
      ).rejects.toThrow();
    });
  });

  describe('readData', () => {
    it('should read JSON data', async () => {
      fs.readFile.mockResolvedValue(JSON.stringify(testData));

      const data = await readData('input.json');

      expect(data).toEqual(testData);
    });

    it('should read JSON data with metadata wrapper', async () => {
      const wrappedData = {
        metadata: { total: 2 },
        products: testData
      };
      fs.readFile.mockResolvedValue(JSON.stringify(wrappedData));

      const data = await readData('input.json');

      expect(data).toEqual(testData);
    });

    it('should read CSV data', async () => {
      const csvContent = 'title,price,asin\nProduct 1,$10,A1\nProduct 2,$20,A2';
      fs.readFile.mockResolvedValue(csvContent);

      const data = await readData('input.csv');

      expect(data).toHaveLength(2);
      expect(data[0].title).toBe('Product 1');
      expect(data[1].price).toBe('$20');
    });

    it('should throw error for unsupported format', async () => {
      await expect(readData('input.unknown')).rejects.toThrow('Unsupported file format');
    });
  });
});
