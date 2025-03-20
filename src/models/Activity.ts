import mongoose, { Document, Schema } from 'mongoose';

export type ActivityType = 'commit' | 'pr' | 'issue' | 'release';
export type ActivityStatus = 'pending' | 'processed' | 'published';

export interface IActivity extends Document {
  type: ActivityType;
  repo: string;
  title: string;
  description?: string;
  createdAt: Date;
  status: ActivityStatus;
  processedAt?: Date;
  publishedAt?: Date;
  userId: mongoose.Types.ObjectId;
  content?: string;
  githubUrl?: string;
  socialMediaIds?: {
    twitter?: string;
    linkedin?: string;
    facebook?: string;
  };
}

const ActivitySchema = new Schema<IActivity>({
  type: {
    type: String,
    enum: ['commit', 'pr', 'issue', 'release'],
    required: true
  },
  repo: {
    type: String,
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['pending', 'processed', 'published'],
    default: 'pending'
  },
  processedAt: {
    type: Date
  },
  publishedAt: {
    type: Date
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String
  },
  githubUrl: {
    type: String
  },
  socialMediaIds: {
    twitter: String,
    linkedin: String,
    facebook: String
  }
}, {
  timestamps: true
});

// Create indexes for common queries
ActivitySchema.index({ userId: 1, status: 1 });
ActivitySchema.index({ repo: 1 });
ActivitySchema.index({ createdAt: -1 });

// Utility method to find activities by status
ActivitySchema.statics.findByStatus = function(userId: mongoose.Types.ObjectId, status: ActivityStatus) {
  return this.find({ userId, status }).sort({ createdAt: -1 });
};

// Create or retrieve the Activity model
export const Activity = mongoose.models.Activity 
  ? mongoose.models.Activity as mongoose.Model<IActivity>
  : mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity; 