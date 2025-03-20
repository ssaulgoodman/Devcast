import mongoose, { Document, Schema } from 'mongoose';

// Define the User settings interface
export interface UserSettings {
  postingFrequency: 'daily' | 'weekdays' | 'custom';
  customDays?: string[];
  postingTime: string;
  contentStyle: string;
  autoApprove: boolean;
}

// Define the User interface extending the Document interface
export interface IUser extends Document {
  name?: string;
  email: string;
  image?: string;
  emailVerified?: Date;
  
  // OAuth connections
  github?: {
    id: string;
    username?: string;
    accessToken?: string;
  };
  
  twitter?: {
    id: string;
    username: string;
    accessToken?: string;
    accessTokenSecret?: string;
  };
  
  // Telegram connection
  telegram?: {
    chatId: string;
    username?: string;
  };
  
  // User preferences/settings
  settings: UserSettings;
  
  createdAt: Date;
  updatedAt: Date;
}

// Define the User schema
const UserSchema = new Schema<IUser>(
  {
    name: { type: String },
    email: { type: String, required: true, unique: true },
    image: { type: String },
    emailVerified: { type: Date },
    
    // OAuth connections
    github: {
      id: { type: String },
      username: { type: String },
      accessToken: { type: String },
    },
    
    twitter: {
      id: { type: String },
      username: { type: String },
      accessToken: { type: String },
      accessTokenSecret: { type: String },
    },
    
    // Telegram connection
    telegram: {
      chatId: { type: String },
      username: { type: String },
    },
    
    // User preferences/settings
    settings: {
      postingFrequency: {
        type: String,
        enum: ['daily', 'weekdays', 'custom'],
        default: 'daily'
      },
      customDays: {
        type: [String],
        default: []
      },
      postingTime: {
        type: String,
        default: '18:00'
      },
      contentStyle: {
        type: String,
        default: 'professional'
      },
      autoApprove: {
        type: Boolean,
        default: false
      }
    }
  },
  { timestamps: true }
);

// Create a model or get it if it already exists
export const User = mongoose.models.User as mongoose.Model<IUser> || 
  mongoose.model<IUser>('User', UserSchema);

export default User; 