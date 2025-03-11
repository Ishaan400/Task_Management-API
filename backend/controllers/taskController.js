import Task from '../models/Task.js';
import Log from '../models/Log.js';

// Create a new task
export const createTask = async (req, res) => {
  try {
    const task = new Task({
      ...req.body,
      createdBy: req.user._id
    });
    await task.calculatePriority();
    await task.save();

    // Create log entry
    await Log.create({
      action: 'create',
      taskId: task._id,
      userId: req.user._id,
      changes: task.toObject(),
      metadata: {
        userRole: req.user.role
      }
    });

    res.status(201).json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Get tasks with pagination and filtering
export const getTasks = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      priority,
      assignedTo,
      search,
      sortBy = 'priority',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort,
      populate: [
        { path: 'assignedTo', select: 'name email' },
        { path: 'dependencies', select: 'title status' }
      ]
    };

    const tasks = await Task.paginate(filter, options);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get a single task
export const getTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('assignedTo', 'name email')
      .populate('dependencies', 'title status')
      .populate('createdBy', 'name email');
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    res.json(task);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Bulk update tasks
export const bulkUpdateTasks = async (req, res) => {
  try {
    const { tasks } = req.body;
    const updates = [];
    const logs = [];

    for (const task of tasks) {
      const existingTask = await Task.findById(task._id);
      if (!existingTask) {
        return res.status(404).json({ message: `Task ${task._id} not found` });
      }

      if (task.status === 'completed') {
        const dependenciesCompleted = await existingTask.areDependenciesCompleted();
        if (!dependenciesCompleted) {
          return res.status(400).json({
            message: `Cannot complete task ${task._id}: dependencies are not completed`
          });
        }
      }

      const originalTask = existingTask.toObject();
      Object.assign(existingTask, task);
      await existingTask.calculatePriority();
      updates.push(existingTask.save());

      // Prepare log entry
      logs.push({
        action: 'update',
        taskId: existingTask._id,
        userId: req.user._id,
        changes: {
          before: originalTask,
          after: existingTask.toObject()
        },
        metadata: {
          userRole: req.user.role,
          bulkUpdate: true
        }
      });
    }

    await Promise.all(updates);
    await Log.insertMany(logs);
    
    res.json({ message: 'Tasks updated successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update a task
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Check dependencies if trying to mark as completed
    if (req.body.status === 'completed') {
      const dependenciesCompleted = await task.areDependenciesCompleted();
      if (!dependenciesCompleted) {
        return res.status(400).json({ 
          message: 'Cannot complete task: dependencies are not completed' 
        });
      }
    }

    const originalTask = task.toObject();
    Object.assign(task, req.body);
    await task.calculatePriority();
    await task.save();

    // Create log entry
    await Log.create({
      action: 'update',
      taskId: task._id,
      userId: req.user._id,
      changes: {
        before: originalTask,
        after: task.toObject()
      },
      metadata: {
        userRole: req.user.role
      }
    });
    
    res.json(task);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Delete a task
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Check if this task is a dependency for other tasks
    const dependentTasks = await Task.find({ dependencies: task._id });
    if (dependentTasks.length > 0) {
      return res.status(400).json({ 
        message: 'Cannot delete task: other tasks depend on it' 
      });
    }

    const taskCopy = task.toObject();
    await task.remove();

    // Create log entry
    await Log.create({
      action: 'delete',
      taskId: task._id,
      userId: req.user._id,
      changes: taskCopy,
      metadata: {
        userRole: req.user.role
      }
    });
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};