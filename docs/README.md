# Task Management System Documentation

## Overview
A robust task management system built API with the MEN stack (MongoDB,Express.js,Node.js) featuring role-based access control, task dependencies, priority calculation, and comprehensive activity logging.

## Core Features

### 1. User Authentication & Authorization
- Role-based access control (Admin, Manager, User)
- JWT-based authentication
- Secure password hashing using bcrypt

```javascript
// Example of role-based route protection
router.post('/tasks', authenticate, authorize(['admin', 'manager']), createTask);
```

### 2. Task Management

#### Dynamic Priority Calculation
Tasks automatically calculate their priority based on deadline proximity and dependencies:

```javascript
// From Task.js model
taskSchema.methods.calculatePriority = async function() {
  const today = new Date();
  const daysUntilDeadline = Math.ceil((this.deadline - today) / (1000 * 60 * 60 * 24));
  
  let priority = 5 - Math.min(5, Math.max(0, daysUntilDeadline / 7));
  
  if (this.dependencies.length > 0) {
    priority += 1;
  }
  
  this.priority = Math.min(5, priority);
  return this.priority;
};
```

#### Task Dependencies
The system ensures task dependencies are properly managed:

```javascript
// Checking dependencies before completion
taskSchema.methods.areDependenciesCompleted = async function() {
  const dependencies = await this.model('Task').find({
    '_id': { $in: this.dependencies }
  });
  return dependencies.every(task => task.status === 'completed');
};
```

### 3. Activity Logging
Comprehensive logging system for all task-related activities:

```javascript
// Log schema structure
const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
    enum: ['create', 'update', 'delete', 'status_change', 'dependency_update']
  },
  taskId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task',
    required: true
  },
  // ... other fields
});
```

## API Endpoints

### Task Routes
- `POST /api/tasks` - Create new task (Admin/Manager)
- `GET /api/tasks` - Get tasks list (All authenticated users)
- `GET /api/tasks/:id` - Get specific task (All authenticated users)
- `PUT /api/tasks/:id` - Update task (Admin/Manager)
- `DELETE /api/tasks/:id` - Delete task (Admin only)
- `POST /api/tasks/bulk-update` - Bulk update tasks (Admin/Manager)

### User Routes
- `POST /api/users/register` - Register new user
- `POST /api/users/login` - User login
- `GET /api/users/profile` - Get user profile (Authenticated)

## Database Schema

### Task Model
Key features:
```javascript
const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'blocked']
  },
  priority: { type: Number, min: 0, max: 5 },
  dependencies: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Task' }],
  // ... other fields
});
```

### User Model
Key features:
```javascript
const userSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['admin', 'manager', 'user']
  },
  activeTaskCount: { type: Number, default: 0 },
  skills: [{ type: String }],
  // ... other fields
});
```

## Security Features

1. Password Hashing
```javascript
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});
```

2. Authentication Middleware
```javascript
export const authenticate = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  // ... validation logic
};
```

## Performance Optimizations

1. Database Indexing
```javascript
// Task Model Indexes
taskSchema.index({ status: 1, priority: -1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ deadline: 1, status: 1 });

// User Model Indexes
userSchema.index({ role: 1, department: 1 });
userSchema.index({ role: 1, activeTaskCount: 1 });
```

2. Pagination Support
```javascript
// Example of paginated task query
const tasks = await Task.paginate(filter, {
  page: parseInt(page),
  limit: parseInt(limit),
  sort,
  populate: [
    { path: 'assignedTo', select: 'name email' },
    { path: 'dependencies', select: 'title status' }
  ]
});
```

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables in `.env`:
```
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PORT=5000
```

3. Start the development server:
```bash
npm run dev    # Frontend
npm run server # Backend
```
