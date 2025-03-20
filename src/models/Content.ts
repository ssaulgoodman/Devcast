import mongoose, { Document, Schema } from 'mongoose';
import { IUser } from './User';
import { IActivity } from './Activity';

export interface IContent extends Document {
  user: IUser['_id'];
  relatedActivities: IActivity['_id'][];
  text: string;
  originalText?: string;
  imageUrl?: string;
  status: 'pending' | 'approved' | 'edited' | 'rejected' | 'posted';
  platform: 'twitter' | 'other';
  postId?: string;
  postUrl?: string;
  scheduledFor?: Date;
  postedAt?: Date;
  analytics?: {
    likes?: number;
    retweets?: number;
    replies?: number;
    impressions?: number;
    lastUpdated?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const ContentSchema = new Schema<IContent>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    relatedActivities: [{ type: Schema.Types.ObjectId, ref: 'Activity' }],
    text: { type: String, required: true },
    originalText: { type: String },
    imageUrl: { type: String },
    status: { 
      type: String, 
      enum: ['pending', 'approved', 'edited', 'rejected', 'posted'],
      default: 'pending',
      required: true 
    },
    platform: { 
      type: String, 
      enum: ['twitter', 'other'],
      default: 'twitter',
      required: true 
    },
    postId: { type: String },
    postUrl: { type: String },
    scheduledFor: { type: Date },
    postedAt: { type: Date },
    analytics: {
      likes: { type: Number, default: 0 },
      retweets: { type: Number, default: 0 },
      replies: { type: Number, default: 0 },
      impressions: { type: Number, default: 0 },
      lastUpdated: { type: Date }
    }
  },
  { timestamps: true }
);

// Create indexes for faster queries
ContentSchema.index({ user: 1, status: 1, scheduledFor: 1 });
ContentSchema.index({ user: 1, createdAt: -1 });

// Use existing model or create a new one
export const Content = mongoose.models.Content || 
  mongoose.model<IContent>('Content', ContentSchema);

export default Content; 