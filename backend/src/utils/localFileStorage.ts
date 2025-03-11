import fs from 'fs';
import path from 'path';
import logger from './logger';

/**
 * Simple file-based storage for critical data that persists across restarts
 * This acts as a last-resort backup when both primary and in-memory fallbacks fail
 */
export class LocalFileStorage {
  private baseDir: string;
  private initialized: boolean = false;

  constructor(baseDir?: string) {
    // Default to data directory in project root
    this.baseDir = baseDir || path.join(process.cwd(), 'data');
    this.ensureDirectoryExists();
  }

  // Make sure the directory exists
  private ensureDirectoryExists() {
    try {
      if (!fs.existsSync(this.baseDir)) {
        fs.mkdirSync(this.baseDir, { recursive: true });
      }
      this.initialized = true;
    } catch (error) {
      logger.error({
        msg: 'Failed to create local storage directory',
        error: error instanceof Error ? error.message : String(error),
        path: this.baseDir
      });
      this.initialized = false;
    }
  }

  // Save data to a file
  public async save<T>(collection: string, data: T): Promise<boolean> {
    if (!this.initialized) {
      this.ensureDirectoryExists();
      if (!this.initialized) return false;
    }

    try {
      const filePath = path.join(this.baseDir, `${collection}.json`);
      await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
      logger.debug({
        msg: `Data saved to local file storage`,
        collection
      });
      return true;
    } catch (error) {
      logger.error({
        msg: 'Failed to save data to local file',
        error: error instanceof Error ? error.message : String(error),
        collection
      });
      return false;
    }
  }

  // Append data to a file
  public async append<T>(collection: string, item: T): Promise<boolean> {
    if (!this.initialized) {
      this.ensureDirectoryExists();
      if (!this.initialized) return false;
    }

    try {
      const filePath = path.join(this.baseDir, `${collection}.json`);
      let existingData: T[] = [];

      // Read existing data if file exists
      if (fs.existsSync(filePath)) {
        const fileContent = await fs.promises.readFile(filePath, 'utf8');
        existingData = JSON.parse(fileContent);
      }

      // Append new item and write back
      existingData.push(item);
      await fs.promises.writeFile(filePath, JSON.stringify(existingData, null, 2));
      
      logger.debug({
        msg: `Item appended to local file storage`,
        collection
      });
      
      return true;
    } catch (error) {
      logger.error({
        msg: 'Failed to append data to local file',
        error: error instanceof Error ? error.message : String(error),
        collection
      });
      return false;
    }
  }

  // Load data from a file
  public async load<T>(collection: string): Promise<T | null> {
    if (!this.initialized) {
      this.ensureDirectoryExists();
      if (!this.initialized) return null;
    }

    try {
      const filePath = path.join(this.baseDir, `${collection}.json`);
      
      // Return null if file doesn't exist
      if (!fs.existsSync(filePath)) {
        return null;
      }
      
      const fileContent = await fs.promises.readFile(filePath, 'utf8');
      const data = JSON.parse(fileContent) as T;
      
      logger.debug({
        msg: `Data loaded from local file storage`,
        collection
      });
      
      return data;
    } catch (error) {
      logger.error({
        msg: 'Failed to load data from local file',
        error: error instanceof Error ? error.message : String(error),
        collection
      });
      return null;
    }
  }

  // Check if a file exists
  public exists(collection: string): boolean {
    if (!this.initialized) {
      this.ensureDirectoryExists();
      if (!this.initialized) return false;
    }

    try {
      const filePath = path.join(this.baseDir, `${collection}.json`);
      return fs.existsSync(filePath);
    } catch (error) {
      logger.error({
        msg: 'Failed to check if file exists',
        error: error instanceof Error ? error.message : String(error),
        collection
      });
      return false;
    }
  }

  // Delete a file
  public async delete(collection: string): Promise<boolean> {
    if (!this.initialized) return false;

    try {
      const filePath = path.join(this.baseDir, `${collection}.json`);
      
      // Return true if file doesn't exist (already deleted)
      if (!fs.existsSync(filePath)) {
        return true;
      }
      
      await fs.promises.unlink(filePath);
      
      logger.debug({
        msg: `Data deleted from local file storage`,
        collection
      });
      
      return true;
    } catch (error) {
      logger.error({
        msg: 'Failed to delete data from local file',
        error: error instanceof Error ? error.message : String(error),
        collection
      });
      return false;
    }
  }
}

// Create singleton instance
export const localFileStorage = new LocalFileStorage();