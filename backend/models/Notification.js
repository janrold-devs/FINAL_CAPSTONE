import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  user: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  type: { 
    type: String, 
    required: true,
    enum: ['low_stock', 'out_of_stock', 'expiring', 'expired']
  },
  priority: { 
    type: String, 
    required: true,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium'
  },
  title: { 
    type: String, 
    required: true 
  },
  message: { 
    type: String, 
    required: true 
  },
  ingredientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Ingredient" 
  },
  isCleared: { 
    type: Boolean, 
    default: false 
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Index for better performance
notificationSchema.index({ user: 1, isCleared: 1, createdAt: -1 });

export default mongoose.model("Notification", notificationSchema);