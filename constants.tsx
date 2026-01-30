
import { Page, Program, FeeRecord, MonthlyStatus, ExamFeeStatus, FacultyMember, GalleryImage } from './types';

export const SCHOOL_INFO = {
  name: 'Unique English School',
  motto: 'Knowledge, Character, Excellence',
  founded: '2005',
  address: 'Patwatoli, Manpur, Gaya, Bihar - 823003',
  phone: '+91 94312 00000',
  email: 'info@uesgaya.edu.in',
  affiliation: 'Affiliated to CBSE, New Delhi | Session 2026-27'
};

export const NAV_LINKS = [
  { name: 'Home', path: Page.Home, restricted: false },
  { name: 'Student Directory', path: Page.Directory, restricted: true },
  { name: 'Ledger Portal', path: Page.Dashboard, restricted: true },
  { name: 'Campus Entry', path: Page.CounterEntry, restricted: true },
  { name: 'Receipt Manager', path: Page.ReceiptManager, restricted: true },
  { name: 'Reminders', path: Page.Reminders, restricted: true },
  { name: 'Accounts', path: Page.Hisab, restricted: true },
  { name: 'Fee Schedule', path: Page.Academics, restricted: false },
  { name: 'Settings', path: Page.Settings, restricted: true },
];

export const BRANCH_OPTIONS = ['1', '2', '3', '4', '5'];

const SESSION_MONTHS = ['APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC', 'JAN', 'FEB', 'MAR'];

export const formatDate = (date: Date | string | number = new Date()): string => {
  const d = new Date(date);
  // Returns format like "16 Jan 2026" then lowercases it to "16 jan 2026"
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).replace(/,/g, '').toLowerCase();
};

export const getStudentPhoto = (photoUrl?: string, name: string = 'Student'): string => {
  if (photoUrl && photoUrl.trim() !== '') {
    if (photoUrl.startsWith('http') || photoUrl.startsWith('data:')) {
      return photoUrl;
    }
    return photoUrl;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=7f1d1d&color=fff&bold=true`;
};

export const CLASS_FEE_STRUCTURE = [
  {
    category: 'Foundational Stage',
    classes: [
      { name: 'Pre Nursery', tuition: 6500, onTimeReward: 500, exam: 1200, tie: 250, belt: 200, idCard: 150, diary: 200, booklet: 1500 },
      { name: 'Nursery', tuition: 6800, onTimeReward: 500, exam: 1500, tie: 250, belt: 200, idCard: 150, diary: 200, booklet: 1800 },
      { name: 'LKG', tuition: 6800, onTimeReward: 500, exam: 1500, tie: 250, belt: 200, idCard: 150, diary: 200, booklet: 1800 },
      { name: 'UKG', tuition: 6800, onTimeReward: 500, exam: 1500, tie: 250, belt: 200, idCard: 150, diary: 200, booklet: 1800 }
    ]
  },
  {
    category: 'Preparatory Stage',
    classes: [
      { name: 'Class 1', tuition: 8200, onTimeReward: 600, exam: 2500, tie: 250, belt: 250, idCard: 200, diary: 200, booklet: 3200 },
      { name: 'Class 2', tuition: 8200, onTimeReward: 600, exam: 2500, tie: 250, belt: 250, idCard: 200, diary: 200, booklet: 3200 },
      { name: 'Class 3', tuition: 8500, onTimeReward: 600, exam: 2800, tie: 250, belt: 250, idCard: 200, diary: 200, booklet: 3500 },
      { name: 'Class 4', tuition: 8500, onTimeReward: 600, exam: 2800, tie: 250, belt: 250, idCard: 200, diary: 200, booklet: 3500 },
      { name: 'Class 5', tuition: 8800, onTimeReward: 600, exam: 3000, tie: 250, belt: 250, idCard: 200, diary: 200, booklet: 3800 }
    ]
  },
  {
    category: 'Middle Stage',
    classes: [
      { name: 'Class 6', tuition: 9800, onTimeReward: 800, exam: 3500, tie: 300, belt: 300, idCard: 250, diary: 250, booklet: 4500 },
      { name: 'Class 7', tuition: 9800, onTimeReward: 800, exam: 3500, tie: 300, belt: 300, idCard: 250, diary: 250, booklet: 4500 },
      { name: 'Class 8', tuition: 10800, onTimeReward: 800, exam: 4000, tie: 300, belt: 300, idCard: 250, diary: 250, booklet: 4800 }
    ]
  },
  {
    category: 'Secondary Stage',
    classes: [
      { name: 'Class 9', tuition: 12800, onTimeReward: 1000, exam: 5000, tie: 400, belt: 350, idCard: 300, diary: 300, booklet: 5500 },
      { name: 'Class 10', tuition: 13800, onTimeReward: 1000, exam: 5500, tie: 400, belt: 350, idCard: 300, diary: 300, booklet: 5500 }
    ]
  }
];

export const getFeeConfig = (grade: string) => {
  for (const cat of CLASS_FEE_STRUCTURE) {
    const cls = cat.classes.find(c => c.name === grade);
    if (cls) return cls;
  }
  return { 
    name: 'Standard',
    tuition: 8500, 
    onTimeReward: 600,
    exam: 2500,
    tie: 250,
    belt: 250,
    idCard: 200,
    diary: 200,
    booklet: 3000
  };
};

export const MOCK_FEES: FeeRecord[] = [
  {
    id: 'ADM-26-101',
    academicSession: '2026-27',
    admissionNo: 'ADM/2026/001',
    uidNo: 'UID-99201',
    rollNo: '01',
    studentName: 'Aarav Sharma',
    grade: 'Class 1',
    section: 'A',
    motherName: 'Anjali Sharma',
    fatherName: 'Rajesh Sharma',
    mobileNumber: '9876543210',
    address: 'Flat 402, Royal Residency, Manpur, Gaya',
    dob: '2020-05-15',
    monthlyFee: 8200,
    cashDiscount: 600,
    discountStartMonth: 'APR',
    totalAnnualFee: 98400,
    paidAmount: 22800,
    dueDate: '2026-04-10',
    status: 'Partial',
    category: 'Tuition',
    arrearsMarch2025: 0,
    monthlyStatus: {
      'APR': 'Paid', 'MAY': 'Paid', 'JUN': 'Paid', 'JUL': 'Unpaid', 'AUG': 'Unpaid', 'SEP': 'Unpaid',
      'OCT': 'Unpaid', 'NOV': 'Unpaid', 'DEC': 'Unpaid', 'JAN': 'Unpaid', 'FEB': 'Unpaid', 'MAR': 'Unpaid'
    },
    examFeeStatus: { 'Term 1': 'Paid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' },
    history: [
      { id: 'TXN-1', receiptId: 'SA-RCPT-26-1001', date: '05/04/2026', description: 'Fee Payment (Monthly)', amount: 22800, type: 'Credit', mode: 'UPI' },
      { id: 'DEM-1', receiptId: '-', date: '01/04/2026', description: 'Tuition Fee Due - APR 2026-27', amount: 7600, type: 'Debit', mode: 'Demand' },
      { id: 'DEM-2', receiptId: '-', date: '01/05/2026', description: 'Tuition Fee Due - MAY 2026-27', amount: 7600, type: 'Debit', mode: 'Demand' },
      { id: 'DEM-3', receiptId: '-', date: '01/06/2026', description: 'Tuition Fee Due - JUN 2026-27', amount: 7600, type: 'Debit', mode: 'Demand' }
    ],
    photo: 'https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?auto=format&fit=crop&q=80&w=200'
  },
  {
    id: 'ADM-26-102',
    academicSession: '2026-27',
    admissionNo: 'ADM/2026/002',
    uidNo: 'UID-99202',
    rollNo: '05',
    studentName: 'Ishani Verma',
    grade: 'Class 4',
    section: 'B',
    motherName: 'Priya Verma',
    fatherName: 'Amit Verma',
    mobileNumber: '9123456789',
    address: 'Near Kali Mandir, Patwatoli, Gaya',
    dob: '2017-08-22',
    monthlyFee: 8500,
    cashDiscount: 600,
    discountStartMonth: 'APR',
    totalAnnualFee: 102000,
    paidAmount: 0,
    dueDate: '2026-04-10',
    status: 'Pending',
    category: 'Tuition',
    arrearsMarch2025: 1200,
    monthlyStatus: {
      'APR': 'Unpaid', 'MAY': 'Unpaid', 'JUN': 'Unpaid', 'JUL': 'Unpaid', 'AUG': 'Unpaid', 'SEP': 'Unpaid',
      'OCT': 'Unpaid', 'NOV': 'Unpaid', 'DEC': 'Unpaid', 'JAN': 'Unpaid', 'FEB': 'Unpaid', 'MAR': 'Unpaid'
    },
    examFeeStatus: { 'Term 1': 'Unpaid', 'Term 2': 'Unpaid', 'Term 3': 'Unpaid' },
    history: [],
    photo: 'https://images.unsplash.com/photo-1595878715977-2e8f8df18ea8?auto=format&fit=crop&q=80&w=200'
  }
];

export const PROGRAMS: Program[] = [
  {
    id: 'foundational',
    title: 'Foundational Stage',
    description: 'Nurturing curiosity and fundamental skills through play-based learning for our youngest scholars.',
    icon: '🌱',
    image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'preparatory',
    title: 'Preparatory Stage',
    description: 'Transitioning to formal subjects with an emphasis on interactive and experiential pedagogy.',
    icon: '📚',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800'
  },
  {
    id: 'middle',
    title: 'Middle & Secondary',
    description: 'Advanced academic rigor combined with critical thinking and leadership development.',
    icon: '🚀',
    image: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&q=80&w=800'
  }
];

export const FACULTY_MEMBERS: FacultyMember[] = [
  { id: '1', name: 'Dr. S.P. Verma', role: 'Principal', subject: 'Mathematics', experience: '25 Years', image: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=400' },
  { id: '2', name: 'Mrs. Rekha Singh', role: 'Vice Principal', subject: 'English Literature', experience: '20 Years', image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400' },
  { id: '3', name: 'Mr. R.K. Mishra', role: 'HOD Science', subject: 'Physics', experience: '15 Years', image: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=400' },
  { id: '4', name: 'Ms. Priya Sahay', role: 'HOD Humanities', subject: 'Social Studies', experience: '12 Years', image: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400' }
];

export const GALLERY_IMAGES: GalleryImage[] = [
  { id: '1', url: 'https://images.unsplash.com/photo-1546410531-bb4caa6b424d?auto=format&fit=crop&q=80&w=800', category: 'Campus', title: 'UES Main Block' },
  { id: '2', url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&q=80&w=800', category: 'Academics', title: 'Interactive Learning' },
  { id: '3', url: 'https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&q=80&w=800', category: 'Sports', title: 'Annual Athletics' },
  { id: '4', url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&q=80&w=800', category: 'Events', title: 'Cultural Fest' },
  { id: '5', url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=800', category: 'Campus', title: 'Library Wing' },
  { id: '6', url: 'https://images.unsplash.com/photo-1577896851231-70ef18881754?auto=format&fit=crop&q=80&w=800', category: 'Academics', title: 'Science Laboratory' }
];
