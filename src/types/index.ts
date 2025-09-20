// Workshop Types
export interface WorkshopConfig {
  gaPrice: number;
  vipPrice: number;
  sixFBDiscount: number;
  bulkDiscounts: {
    quantity2: number;
    quantity3: number;
    quantity4: number;
  };
}

export type TicketType = 'GA' | 'VIP';

export interface TicketInfo {
  type: TicketType;
  quantity: number;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
  discountReason?: string;
}

// Registration Types
export interface RegistrationData {
  // Personal Information
  firstName: string;
  lastName: string;
  email: string;
  phone: string;

  // Business Information
  businessName?: string;
  businessType: 'individual' | 'shop_owner' | 'enterprise';
  yearsExperience: string;

  // Ticket Information
  ticketType: TicketType;
  quantity: number;
  isSixFBMember: boolean;

  // Additional Information
  dietaryRestrictions?: string;
  specialRequests?: string;
  emergencyContact?: {
    name: string;
    phone: string;
    relationship: string;
  };
}

// Member Verification Types
export interface SixFBMember {
  email: string;
  name: string;
  membershipType: string;
  isActive: boolean;
  joinDate: string;
}

export interface MemberVerificationResult {
  isVerified: boolean;
  member?: SixFBMember;
  error?: string;
}

// Payment Types
export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: string;
  clientSecret: string;
}

export interface PaymentData {
  registrationData: RegistrationData;
  ticketInfo: TicketInfo;
  totalAmount: number;
  paymentIntentId?: string;
}

// Webhook Types
export interface ZapierWebhookPayload {
  email: string;
  name: string;
  membershipQuestions?: Record<string, string>;
  timestamp: string;
  groupId: string;
}

export interface StripeWebhookPayload {
  id: string;
  object: string;
  type: string;
  data: {
    object: any;
  };
  created: number;
}

// API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Component Props Types
export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
  isDisabled?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  type?: 'button' | 'submit' | 'reset';
}

export interface InputProps {
  label?: string;
  placeholder?: string;
  type?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  className?: string;
  disabled?: boolean;
}

export interface FormStepProps {
  currentStep: number;
  totalSteps: number;
  onNext: () => void;
  onPrevious: () => void;
  onComplete: () => void;
  isValid: boolean;
  isLoading?: boolean;
}

// Analytics Types
export interface AnalyticsEvent {
  event: string;
  properties?: Record<string, any>;
  timestamp?: number;
}

export interface ConversionEvent extends AnalyticsEvent {
  event:
    | 'page_view'
    | 'form_start'
    | 'form_step'
    | 'form_complete'
    | 'payment_start'
    | 'payment_complete';
  properties: {
    step?: number;
    ticketType?: TicketType;
    amount?: number;
    isSixFBMember?: boolean;
  };
}

// Workshop Schedule Types
export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  capacity: number;
  registered: number;
  price: number;
}

export interface WorkshopSchedule {
  id: string;
  title: string;
  description: string;
  date: string;
  location: {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  timeSlots: TimeSlot[];
  maxCapacity: number;
  totalRegistered: number;
  status: 'scheduled' | 'full' | 'cancelled';
  instructors: string[];
  requirements: string[];
  materials: string[];
}

export interface SelectedSchedule {
  scheduleId: string;
  timeSlotId: string;
  date: Date;
  timeSlot: TimeSlot;
  workshop: WorkshopSchedule;
}

export interface WorkshopCalendarProps {
  schedules: WorkshopSchedule[];
  onScheduleSelect?: (selection: SelectedSchedule) => void;
  selectedSchedule?: SelectedSchedule | null;
  showTimeSlots?: boolean;
  allowMultipleSelection?: boolean;
  className?: string;
}

export interface WorkshopOrder {
  id: string;
  customerEmail: string;
  customerName: string;
  ticketType: TicketType;
  quantity: number;
  totalAmount: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  workshopDate?: string;
}

// Multi-City Tour Types
export interface CityWorkshop {
  id: string;
  city: string;
  state: string;
  month: string;
  year: number;
  dates: string[]; // e.g., ["January 15-16", "January 22-23"]
  location: string; // "Location TBA" or actual venue
  climateAppeal: string; // "Escape winter weather"
  status: 'upcoming' | 'open' | 'filling-fast' | 'sold-out';
  availableSpots: {
    ga: number;
    vip: number;
  };
  registeredCount: {
    ga: number;
    vip: number;
  };
  stripe: {
    gaPriceId: string;
    vipPriceId: string;
  };
}

export interface CitySelection {
  cityId: string;
  cityName: string;
  month: string;
  ticketType: TicketType;
  quantity: number;
}

// Extended Registration Data for multi-city
export interface CityRegistrationData extends RegistrationData {
  selectedCity: CitySelection;
}

// Inventory Management Types
export interface InventoryStatus {
  cityId: string;
  publicLimits: {
    ga: number;
    vip: number;
  };
  actualLimits: {
    ga: number;
    vip: number;
  };
  sold: {
    ga: number;
    vip: number;
  };
  publicAvailable: {
    ga: number;
    vip: number;
  };
  actualAvailable: {
    ga: number;
    vip: number;
  };
  isPublicSoldOut: boolean;
  isActualSoldOut: boolean;
  lastUpdated: Date;
}

export interface InventoryTransaction {
  id: string;
  cityId: string;
  tier: 'ga' | 'vip';
  quantity: number;
  operation: 'decrement' | 'expand' | 'reset';
  timestamp: Date;
  metadata?: {
    paymentIntentId?: string;
    sessionId?: string;
    adminUserId?: string;
    reason?: string;
  };
}

export interface InventoryExpansion {
  cityId: string;
  tier: 'ga' | 'vip';
  additionalSpots: number;
  reason: string;
  authorizedBy: string;
  timestamp: Date;
}

export interface CheckoutValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  inventory: {
    requested: number;
    available: number;
    tier: 'ga' | 'vip';
    cityId: string;
  };
  suggestions?: {
    alternativeTiers?: { tier: 'ga' | 'vip'; available: number }[];
    alternativeCities?: { cityId: string; available: number }[];
  };
}

export interface InventoryReservation {
  id: string;
  cityId: string;
  tier: 'ga' | 'vip';
  quantity: number;
  reservedAt: Date;
  expiresAt: Date;
  status: 'active' | 'completed' | 'expired' | 'cancelled';
  metadata?: {
    sessionId?: string;
    customerEmail?: string;
  };
}
