// Create a new file: routes/settingRoutes.ts
import { Router } from 'express';
import { settingController } from '../controllers/settingController';

const router = Router();

router.get('/', settingController.getAllSettings);
router.put('/', settingController.updateSettings);

export default router;