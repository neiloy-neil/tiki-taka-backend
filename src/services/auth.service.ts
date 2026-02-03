import { User, IUser } from '../models/User.model.js';
import { Staff, IStaff } from '../models/Staff.model.js';
import { generateTokenPair } from '../utils/jwt.js';
import { USER_ROLES } from '../config/constants.js';

export interface RegisterUserInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface GuestCheckoutInput {
  email: string;
}

/**
 * Register a new customer user
 */
export const registerUser = async (input: RegisterUserInput) => {
  const { email, password, firstName, lastName, phoneNumber } = input;

  // Check if user already exists
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    throw new Error('User with this email already exists');
  }

  // Create new user
  const user = await User.create({
    email,
    password,
    firstName,
    lastName,
    phoneNumber,
    role: USER_ROLES.CUSTOMER,
    isGuest: false,
  });

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    ...tokens,
  };
};

/**
 * Login user
 */
export const loginUser = async (input: LoginInput) => {
  const { email, password } = input;

  // Find user and include password
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    throw new Error('Invalid credentials');
  }

  // Check if user is guest (guests can't login)
  if (user.isGuest) {
    throw new Error('Guest users cannot login. Please create an account.');
  }

  // Verify password
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokenPair({
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
  });

  return {
    user: {
      id: user._id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
    },
    ...tokens,
  };
};

/**
 * Create guest checkout session
 */
export const createGuestCheckout = async (input: GuestCheckoutInput) => {
  const { email } = input;

  // Check if regular user exists
  const existingUser = await User.findOne({ email, isGuest: false });
  if (existingUser) {
    throw new Error('User with this email exists. Please login instead.');
  }

  // Find or create guest user
  let guestUser = await User.findOne({ email, isGuest: true });

  if (!guestUser) {
    guestUser = await User.create({
      email,
      role: USER_ROLES.GUEST,
      isGuest: true,
    });
  }

  // Generate short-lived token (1 hour)
  const tokens = generateTokenPair({
    userId: guestUser._id.toString(),
    email: guestUser.email,
    role: guestUser.role,
    isGuest: true,
  });

  return {
    user: {
      id: guestUser._id,
      email: guestUser.email,
      role: guestUser.role,
      isGuest: true,
    },
    ...tokens,
  };
};

/**
 * Login staff
 */
export const loginStaff = async (input: LoginInput) => {
  const { email, password } = input;

  // Find staff and include password
  const staff = await Staff.findOne({ email }).select('+password');
  if (!staff) {
    throw new Error('Invalid credentials');
  }

  // Check if staff is active
  if (!staff.isActive) {
    throw new Error('Your account has been deactivated');
  }

  // Verify password
  const isPasswordValid = await staff.comparePassword(password);
  if (!isPasswordValid) {
    throw new Error('Invalid credentials');
  }

  // Generate tokens
  const tokens = generateTokenPair({
    userId: staff._id.toString(),
    email: staff.email,
    role: staff.role,
    assignedEvents: staff.assignedEvents.map((id) => id.toString()),
  });

  return {
    staff: {
      id: staff._id,
      email: staff.email,
      firstName: staff.firstName,
      lastName: staff.lastName,
      role: staff.role,
      assignedEvents: staff.assignedEvents,
    },
    ...tokens,
  };
};

/**
 * Get user by ID
 */
export const getUserById = async (userId: string): Promise<IUser | null> => {
  return User.findById(userId);
};

/**
 * Get staff by ID
 */
export const getStaffById = async (staffId: string): Promise<IStaff | null> => {
  return Staff.findById(staffId);
};
