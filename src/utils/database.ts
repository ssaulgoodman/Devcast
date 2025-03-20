import mongoose from 'mongoose';

// Connection status tracking
const MONGODB_URI = process.env.MONGODB_URI || '';

// Connection state tracking
interface ConnectionState {
  isConnected: number;
}

const connection: ConnectionState = {
  isConnected: 0,
};

/**
 * Connect to MongoDB using mongoose
 */
async function connectDb(): Promise<void> {
  // If we're already connected, return
  if (connection.isConnected === 1) {
    return;
  }

  // If the connection doesn't exist yet, create it
  if (mongoose.connections.length === 0) {
    // Check if MongoDB URI is defined
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in the environment variables');
    }

    // Set up Mongoose connection options
    const opts = {
      bufferCommands: true,
    };

    mongoose.set('strictQuery', false);

    try {
      // Connect to MongoDB
      const conn = await mongoose.connect(MONGODB_URI, opts);
      connection.isConnected = conn.connections[0].readyState;
      
      console.log('MongoDB connected');
    } catch (error) {
      console.error('MongoDB connection error:', error);
      throw error;
    }
  } else {
    // Reuse the existing connection
    connection.isConnected = mongoose.connections[0].readyState;
    
    // If disconnected, reconnect
    if (connection.isConnected === 0) {
      try {
        const conn = await mongoose.connect(MONGODB_URI);
        connection.isConnected = conn.connections[0].readyState;
        
        console.log('MongoDB reconnected');
      } catch (error) {
        console.error('MongoDB reconnection error:', error);
        throw error;
      }
    }
  }
}

export default connectDb; 