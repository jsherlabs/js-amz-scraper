/**
 * Tests for Resume Manager Utility
 */

const fs = require('fs').promises;
const { ResumeManager, createResumeManager } = require('../../src/utils/resume');
const { createConsoleLogger } = require('../../src/utils/logger');

jest.mock('fs', () => ({
  promises: {
    access: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    unlink: jest.fn()
  }
}));

describe('Resume Manager Utility', () => {
  let logger;

  beforeEach(() => {
    jest.clearAllMocks();
    logger = createConsoleLogger('error');
  });

  describe('ResumeManager', () => {
    it('should create with default options', () => {
      const manager = new ResumeManager();

      expect(manager.stateFile).toBeDefined();
      expect(manager.saveInterval).toBeGreaterThan(0);
      expect(manager.state).toBeDefined();
    });

    it('should create with custom options', () => {
      const manager = new ResumeManager({
        stateFile: 'custom.json',
        saveInterval: 20,
        logger
      });

      expect(manager.stateFile).toBe('custom.json');
      expect(manager.saveInterval).toBe(20);
    });

    it('should initialize fresh state when no file exists', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));

      const manager = new ResumeManager({ logger });
      await manager.initialize();

      expect(manager.state.startTime).toBeDefined();
      expect(manager.state.processedUrls).toEqual([]);
      expect(manager.state.collectedProducts).toEqual([]);
    });

    it('should load existing state', async () => {
      const existingState = {
        startTime: '2024-01-01',
        processedUrls: ['url1', 'url2'],
        collectedProducts: [{ title: 'Product 1' }],
        currentUrl: 'url3',
        currentPage: 2
      };

      fs.access.mockResolvedValue(undefined);
      fs.readFile.mockResolvedValue(JSON.stringify(existingState));

      const manager = new ResumeManager({ logger });
      await manager.initialize();

      expect(manager.state.processedUrls).toEqual(['url1', 'url2']);
      expect(manager.state.collectedProducts).toHaveLength(1);
      expect(manager.state.currentPage).toBe(2);
    });

    it('should check if state exists', async () => {
      fs.access.mockResolvedValue(undefined);

      const manager = new ResumeManager({ logger });
      const exists = await manager.stateExists();

      expect(exists).toBe(true);
    });

    it('should return false when state does not exist', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));

      const manager = new ResumeManager({ logger });
      const exists = await manager.stateExists();

      expect(exists).toBe(false);
    });

    it('should save state to file', async () => {
      const manager = new ResumeManager({ logger, saveInterval: 5 });
      manager.productsSinceLastSave = 5;

      await manager.saveState();

      expect(fs.writeFile).toHaveBeenCalled();
      expect(manager.productsSinceLastSave).toBe(0);
    });

    it('should not save state if interval not met', async () => {
      const manager = new ResumeManager({ logger, saveInterval: 10 });
      manager.productsSinceLastSave = 5;

      await manager.saveState(false);

      expect(fs.writeFile).not.toHaveBeenCalled();
    });

    it('should force save state', async () => {
      const manager = new ResumeManager({ logger, saveInterval: 10 });
      manager.productsSinceLastSave = 0;

      await manager.saveState(true);

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should clear state file', async () => {
      const manager = new ResumeManager({ logger });

      await manager.clearState();

      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should mark URL as processed', () => {
      const manager = new ResumeManager({ logger });

      manager.markUrlProcessed('url1', true);

      expect(manager.state.processedUrls).toContain('url1');
      expect(manager.state.failedUrls).not.toContain('url1');
    });

    it('should mark URL as failed', () => {
      const manager = new ResumeManager({ logger });

      manager.markUrlProcessed('url1', false);

      expect(manager.state.failedUrls).toContain('url1');
      expect(manager.state.processedUrls).not.toContain('url1');
    });

    it('should check if URL is processed', () => {
      const manager = new ResumeManager({ logger });
      manager.state.processedUrls = ['url1', 'url2'];

      expect(manager.isUrlProcessed('url1')).toBe(true);
      expect(manager.isUrlProcessed('url3')).toBe(false);
    });

    it('should set current URL', () => {
      const manager = new ResumeManager({ logger });

      manager.setCurrentUrl('url1');

      expect(manager.state.currentUrl).toBe('url1');
    });

    it('should set pagination state', () => {
      const manager = new ResumeManager({ logger });

      manager.setPaginationState(3, 10);

      expect(manager.state.currentPage).toBe(3);
      expect(manager.state.totalPages).toBe(10);
    });

    it('should add products and trigger auto-save', async () => {
      const manager = new ResumeManager({ logger, saveInterval: 2 });
      const products = [{ title: 'P1' }, { title: 'P2' }, { title: 'P3' }];

      await manager.addProducts(products);

      expect(manager.state.collectedProducts).toHaveLength(3);
      // After adding 3 products with saveInterval of 2, auto-save should have triggered
      // which resets productsSinceLastSave to 0
      expect(manager.productsSinceLastSave).toBe(0);
      expect(fs.writeFile).toHaveBeenCalled(); // Verify auto-save was called
    });

    it('should get all collected products', () => {
      const manager = new ResumeManager({ logger });
      manager.state.collectedProducts = [{ title: 'P1' }, { title: 'P2' }];

      const products = manager.getProducts();

      expect(products).toHaveLength(2);
    });

    it('should set and get metadata', () => {
      const manager = new ResumeManager({ logger });

      manager.setMetadata('key1', 'value1');

      expect(manager.getMetadata('key1')).toBe('value1');
    });

    it('should get statistics', () => {
      const manager = new ResumeManager({ logger });
      manager.state.processedUrls = ['url1', 'url2'];
      manager.state.failedUrls = ['url3'];
      manager.state.collectedProducts = [{ title: 'P1' }];

      const stats = manager.getStats();

      expect(stats.processedUrls).toBe(2);
      expect(stats.failedUrls).toBe(1);
      expect(stats.collectedProducts).toBe(1);
    });

    it('should check if can resume', async () => {
      const existingState = {
        processedUrls: ['url1'],
        collectedProducts: []
      };

      fs.access.mockResolvedValue(undefined);
      fs.readFile.mockResolvedValue(JSON.stringify(existingState));

      const manager = new ResumeManager({ logger });
      const canResume = await manager.canResume();

      expect(canResume).toBe(true);
    });

    it('should return false when cannot resume', async () => {
      fs.access.mockRejectedValue(new Error('ENOENT'));

      const manager = new ResumeManager({ logger });
      const canResume = await manager.canResume();

      expect(canResume).toBe(false);
    });

    it('should create checkpoint', async () => {
      const manager = new ResumeManager({ logger });

      await manager.checkpoint();

      expect(fs.writeFile).toHaveBeenCalled();
    });

    it('should finalize and clear state', async () => {
      const manager = new ResumeManager({ logger });

      await manager.finalize(true);

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.unlink).toHaveBeenCalled();
    });

    it('should finalize without clearing state', async () => {
      const manager = new ResumeManager({ logger });

      await manager.finalize(false);

      expect(fs.writeFile).toHaveBeenCalled();
      expect(fs.unlink).not.toHaveBeenCalled();
    });
  });

  describe('createResumeManager', () => {
    it('should create a new resume manager instance', () => {
      const manager = createResumeManager({ saveInterval: 15 });

      expect(manager).toBeInstanceOf(ResumeManager);
      expect(manager.saveInterval).toBe(15);
    });
  });
});
