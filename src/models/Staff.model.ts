import mongoose, { Schema, Document, Types } from 'mongoose';
import bcrypt from 'bcryptjs';
import { STAFF_ROLES } from '../config/constants.js';

export interface IStaff extends Document {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: typeof STAFF_ROLES.STAFF | typeof STAFF_ROLES.ADMIN;
  isActive: boolean;
  assignedEvents: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const staffSchema = new Schema<IStaff>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    role: {
      type: String,
      enum: Object.values(STAFF_ROLES),
      default: STAFF_ROLES.STAFF,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    assignedEvents: [{
      type: Schema.Types.ObjectId,
      ref: 'Event',
    }],
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
staffSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare passwords
staffSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export const Staff = mongoose.model<IStaff>('Staff', staffSchema);
