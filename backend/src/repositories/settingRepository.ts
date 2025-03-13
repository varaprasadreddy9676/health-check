// Create a new file: repositories/settingRepository.ts
import { Setting, ISetting, defaultSettings } from '../models/Setting';
import logger from '../utils/logger';

export class SettingRepository {
  async initializeSettings(): Promise<void> {
    try {
      // Check if settings already exist
      const count = await Setting.countDocuments();
      
      // If no settings exist, create defaults
      if (count === 0) {
        logger.info('Initializing default settings');
        
        const defaultSettingsPromises = Object.entries(defaultSettings).map(([key, data]) => {
          return Setting.create({
            key,
            value: data.value,
            description: data.description
          });
        });
        
        await Promise.all(defaultSettingsPromises);
        logger.info('Default settings initialized successfully');
      }
    } catch (error) {
      logger.error({
        msg: 'Error initializing settings',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  async getAll(): Promise<ISetting[]> {
    try {
      return await Setting.find().sort({ key: 1 });
    } catch (error) {
      logger.error({
        msg: 'Error getting all settings',
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
  
  async get(key: string): Promise<ISetting | null> {
    try {
      return await Setting.findOne({ key });
    } catch (error) {
      logger.error({
        msg: 'Error getting setting',
        error: error instanceof Error ? error.message : String(error),
        key
      });
      throw error;
    }
  }
  
  async set(key: string, value: any, description?: string): Promise<ISetting> {
    try {
      const setting = await Setting.findOne({ key });
      
      if (setting) {
        setting.value = value;
        if (description) {
          setting.description = description;
        }
        await setting.save();
        return setting;
      } else {
        return await Setting.create({
          key,
          value,
          description
        });
      }
    } catch (error) {
      logger.error({
        msg: 'Error setting setting',
        error: error instanceof Error ? error.message : String(error),
        key,
        value
      });
      throw error;
    }
  }
  
  async delete(key: string): Promise<boolean> {
    try {
      const result = await Setting.deleteOne({ key });
      return result.deletedCount > 0;
    } catch (error) {
      logger.error({
        msg: 'Error deleting setting',
        error: error instanceof Error ? error.message : String(error),
        key
      });
      throw error;
    }
  }
  
  async getValueByKey(key: string, defaultValue?: any): Promise<any> {
    try {
      const setting = await this.get(key);
      if (setting) {
        return setting.value;
      }
      
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      
      // Check if there's a default setting for this key
      if (defaultSettings[key]) {
        return defaultSettings[key].value;
      }
      
      return null;
    } catch (error) {
      logger.error({
        msg: 'Error getting setting value',
        error: error instanceof Error ? error.message : String(error),
        key
      });
      
      // Return default value if provided
      if (defaultValue !== undefined) {
        return defaultValue;
      }
      
      // Check if there's a default setting for this key
      if (defaultSettings[key]) {
        return defaultSettings[key].value;
      }
      
      return null;
    }
  }
}

export const settingRepository = new SettingRepository();