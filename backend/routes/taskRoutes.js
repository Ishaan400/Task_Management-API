import express from 'express';
import {
  createTask,
  getTasks,
  getTask,
  updateTask,
  deleteTask,
  bulkUpdateTasks
} from '../controllers/taskController.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Protected routes with role-based access
router.post('/', authenticate, authorize(['admin', 'manager']), createTask);
router.get('/', authenticate, getTasks);
router.get('/:id', authenticate, getTask);
router.put('/:id', authenticate, authorize(['admin', 'manager']), updateTask);
router.delete('/:id', authenticate, authorize(['admin']), deleteTask);
router.post('/bulk-update', authenticate, authorize(['admin', 'manager']), bulkUpdateTasks);

export default router;