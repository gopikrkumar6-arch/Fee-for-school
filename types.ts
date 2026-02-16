
export enum Page {
  Home = 'home',
  Directory = 'directory',
  Dashboard = 'dashboard',
  CounterEntry = 'counter-entry',
  DemandSlip = 'demand-slip',
  Payments = 'payments',
  Academics = 'academics',
  Contact = 'contact',
  Admissions = 'admissions',
  Login = 'login',
  Settings = 'settings',
  Hisab = 'hisab',
  ReceiptManager = 'receipt-manager',
  Reminders = 'reminders'
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type PaymentMode = 'Cash' | 'UPI' | 'Bank Transfer' | 'Demand' | 'Waiver' | 'Other Branch';

export interface ReceiptBook {
  id: string;
  startNo: number;
  endNo: number;
  creationDate: string;
  status: 'Active' | 'Completed' | 'Archived';
  bookLabel: string;
}

export interface CancelledReceipt {
  id: string;
  receiptNo: string;
  cancelDate: string;
  reason: string;
  cancelledBy: string;
}

export interface Transaction {
  id: string;
  receiptId: string;
  date: string;
  description: string;
  amount: number;
  type: 'Credit' | 'Debit';
  mode: PaymentMode;
  sourceAccount?: string; // Track which specific account received the online payment
  isOtherBranch?: boolean; // Flag to exclude from main income reports
  branchName?: string; // The branch where payment was received
}

export interface Complaint {
  id: string;
  date: string;
  category: 'Behavioral' | 'Academic' | 'Attendance' | 'Discipline' | 'Other';
  description: string;
  status: 'Pending' | 'Investigating' | 'Parent Notified' | 'Resolved';
}

export interface ActionLog {
  id: string;
  timestamp: string;
  action: string;
  details: string;
  type: 'SYSTEM' | 'PAYMENT' | 'UPDATE' | 'IMPORT' | 'EXPENSE';
}

export interface Expense {
  id: string;
  date: string; // ISO String or Locale Date String
  category: 'Salary' | 'Maintenance' | 'Utility' | 'Event' | 'Asset' | 'Other' | 'D.Sir' | 'Admission' | 'Grant';
  description: string;
  amount: number;
  paymentMode: 'Cash' | 'Online' | 'Cheque';
  recordedBy: string;
  recordType: 'Income' | 'Expense'; // Added to distinguish manual credits vs debits
}

export interface BranchCollection {
  id: string;
  date: string;
  branch: string;
  studentName: string;
  grade: string;
  section: string;
  rollNo: string;
  amount: number;
  paymentMode: PaymentMode;
  sourceAccount?: string;
  receiptNo: string;
}

export interface MonthlyStatus {
  [month: string]: 'Paid' | 'Unpaid' | 'Partial' | 'Exempted';
}

export interface DueReminder {
  id: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  mobileNumber: string;
  grade: string;
  section: string;
  dueAmount: number;
  createdDate: string;
  targetDate: string;
  description: string;
  status: 'Active' | 'Resolved' | 'Archived';
}

export interface ReminderHistory {
  id: string;
  studentId: string;
  studentName: string;
  fatherName: string;
  mobileNumber: string;
  grade: string;
  rollNo: string;
  reminderTime: string; // ISO timestamp
  dueAmount: number;
  targetDate?: string; // Due date for the fee
  method?: 'SMS' | 'WhatsApp' | 'Manual' | 'Auto';
}

export interface ExamFeeStatus {
  'Term 1': 'Paid' | 'Unpaid' | 'Exempted';
  'Term 2': 'Paid' | 'Unpaid' | 'Exempted';
  'Term 3': 'Paid' | 'Unpaid' | 'Exempted';
}

export type AcademicStatus = 'Active' | 'Inactive' | 'Dropped' | 'Promoted' | 'Transfer';

export interface FeeRecord {
  id: string;
  academicSession: string;
  academicStatus?: AcademicStatus;
  statusMetadata?: {
    leaveFrom?: string;
    leaveTo?: string;
    dropMonth?: string;
    transferMonth?: string;
    activeFrom?: string;
    oldClass?: string;
    oldRoll?: string;
  };
  admissionNo?: string;
  uidNo?: string;
  rollNo: string;
  studentName: string;
  grade: string;
  section: string;
  schoolBranch?: string;
  motherName: string;
  fatherName: string;
  mobileNumber?: string;
  whatsappNumber?: string;
  penNo?: string;
  apaarId?: string;
  aadharCard?: string;
  address?: string;
  dob?: string;
  previousClass?: string;
  previousRollNo?: string;
  previousBranch?: string;
  siblings?: string[];
  excludedSiblings?: string[];
  monthlyFee: number;
  cashDiscount: number;
  discountStartMonth?: string;
  totalAnnualFee: number;
  paidAmount: number;
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue' | 'Partial' | 'PASSED';
  category: 'Tuition' | 'Transport' | 'Development' | 'Library';
  arrearsMarch2025: number;
  monthlyStatus: MonthlyStatus;
  examFeeStatus: ExamFeeStatus;
  history: Transaction[];
  complaints?: Complaint[];
  photo?: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  icon: string;
  image: string;
}

export interface FacultyMember {
  id: string;
  name: string;
  role: string;
  subject: string;
  experience: string;
  image: string;
}

export interface GalleryImage {
  id: string;
  url: string;
  category: 'Academics' | 'Sports' | 'Campus' | 'Events';
  title: string;
}

// Fee Structure Types
export interface ClassFeeMetadata {
  name: string;
  tuition: number;
  onTimeReward: number;
  exam: number;
  tie: number;
  belt: number;
  idCard: number;
  diary: number;
  booklet: number;
}

export interface FeeCategory {
  category: string;
  classes: ClassFeeMetadata[];
}
