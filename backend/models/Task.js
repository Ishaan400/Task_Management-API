import mongoose from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';

const taskSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    index: true
  },
  description: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in-progress', 'completed', 'blocked'],
    default: 'pending',
    index: true
  },
  priority: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
    index: true
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  dependencies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Task'
  }],
  deadline: {
    type: Date,
    required: true,
    index: true
  },
  tags: [{
    type: String,
    trim: true
  }],
  estimatedHours: {
    type: Number,
    min: 0
  },
  actualHours: {
    type: Number,
    min: 0,
    default: 0
  },
  completionPercentage: {
    type: Number,
    min: 0,
    max: 100,
    default: 0
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Add pagination plugin
taskSchema.plugin(mongoosePaginate);

// Compound indexes for common queries
taskSchema.index({ status: 1, priority: -1 });
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ deadline: 1, status: 1 });

// Middleware to update the updatedAt timestamp
taskSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Method to check if all dependencies are completed
taskSchema.methods.areDependenciesCompleted = async function() {
  const dependencies = await this.model('Task').find({
    '_id': { $in: this.dependencies }
  });
  return dependencies.every(task => task.status === 'completed');
};

// Method to calculate priority based on deadline and dependencies
taskSchema.methods.calculatePriority = async function() {
  const today = new Date();
  const daysUntilDeadline = Math.ceil((this.deadline - today) / (1000 * 60 * 60 * 24));
  
  // Base priority calculation
  let priority = 5 - Math.min(5, Math.max(0, daysUntilDeadline / 7));
  
  // Add extra priority if has dependencies
  if (this.dependencies.length > 0) {
    priority += 1;
  }
  
  this.priority = Math.min(5, priority);
  return this.priority;
};

const Task = mongoose.model('Task', taskSchema);
export default Task;