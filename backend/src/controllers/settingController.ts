// Create a new file: controllers/settingController.ts
import { Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { settingRepository } from '../repositories/settingRepository';
import logger from '../utils/logger';

export class SettingController {
    async getAllSettings(req: Request, res: Response): Promise<Response> {
        try {
            const settings = await settingRepository.getAll();

            // Transform to a more frontend-friendly format
            const formattedSettings = settings.reduce<Record<string, { value: any; description?: string }>>((acc, setting) => {
                acc[setting.key] = {
                    value: setting.value,
                    description: setting.description
                };
                return acc;
            }, {});

            return res.status(200).json({
                success: true,
                data: formattedSettings
            });
        } catch (error) {
            logger.error({
                msg: 'Error getting all settings',
                error: error instanceof Error ? error.message : String(error)
            });

            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to retrieve settings'
                }
            });
        }
    }

    async updateSettings(req: Request, res: Response): Promise<Response> {
        try {
            const updates = req.body;

            if (!updates || typeof updates !== 'object') {
                return res.status(400).json({
                    success: false,
                    error: {
                        message: 'Invalid request body, expected object with settings'
                    }
                });
            }

            // Process each setting update
            const updatePromises = Object.entries(updates).map(async ([key, value]) => {
                // Handle nested objects where value might have description
                if (value && typeof value === 'object' && 'value' in value) {
                    const settingValue = value as { value: any; description?: string };
                    return settingRepository.set(
                        key,
                        settingValue.value,
                        settingValue.description
                    );
                } else {
                    // Simple value update
                    return settingRepository.set(key, value);
                }
            });

            await Promise.all(updatePromises);

            // Get the updated settings
            const updatedSettings = await settingRepository.getAll();

            // Transform to a more frontend-friendly format
            const formattedSettings = updatedSettings.reduce<Record<string, { value: any; description?: string }>>((acc, setting) => {
                acc[setting.key] = {
                    value: setting.value,
                    description: setting.description
                };
                return acc;
            }, {});

            return res.status(200).json({
                success: true,
                data: formattedSettings
            });
        } catch (error) {
            logger.error({
                msg: 'Error updating settings',
                error: error instanceof Error ? error.message : String(error),
                data: req.body
            });

            return res.status(500).json({
                success: false,
                error: {
                    message: 'Failed to update settings'
                }
            });
        }
    }
}

export const settingController = new SettingController();