export type User = {
  id: number;
  username: string;
  full_name: string;
  role: string;
  modules: string[];
};

export type ClassLeaf = {
  id: number;
  className: string;
};

export type ClassLevel = {
  id: number;
  level: string;
  classes: ClassLeaf[];
};

export type ClassStage = {
  id: number;
  stage: string;
  levels: ClassLevel[];
};

export type Student = {
  id: number;
  seq_no: number;
  gender: "M" | "F" | "U";
  name: string;
  name_en: string | null;
  tel1: string | null;
  tel2: string | null;
  national_id: string | null;
  moe_code: string | null;
  address: string | null;
  birthday: string | null;
  division: string | null;
  section: string | null;
  category: string | null;
  class_id: number | null;
  country: string | null;
  area: string | null;
  district: string | null;
  admission_date: string | null;
  student_no: string | null;
  religion: string | null;
  nationality: string | null;
  count_value: string | null;
  status: string | null;
  status_date: string | null;
  father_name: string | null;
  father_national_id: string | null;
  father_mobile: string | null;
  father_job: string | null;
  father_education: string | null;
  father_company: string | null;
  father_email: string | null;
  mother_name: string | null;
  mother_national_id: string | null;
  mother_mobile: string | null;
  mother_job: string | null;
  mother_education: string | null;
  mother_company: string | null;
  mother_email: string | null;
  notes: string | null;
  medical_condition: string | null;
  education_authority: string | null;
  special_case: number;
  integrated: number;
  uses_bus: number;
  emergency_name: string | null;
  emergency_tel: string | null;
  photo_url: string | null;
  transferred_from: string | null;
};

export type StudentInput = {
  gender: "M" | "F" | "U";
  name: string;
  nameEn?: string;
  tel1?: string;
  tel2?: string;
  nationalId?: string;
  moeCode?: string;
  address?: string;
  birthday?: string;
  division?: string;
  section?: string;
  category?: string;
  classId?: number;
  country?: string;
  area?: string;
  district?: string;
  admissionDate?: string;
  studentNo?: string;
  religion?: string;
  nationality?: string;
  countValue?: string;
  status?: string;
  statusDate?: string;
  fatherName?: string;
  fatherNationalId?: string;
  fatherMobile?: string;
  fatherJob?: string;
  fatherEducation?: string;
  fatherCompany?: string;
  fatherEmail?: string;
  motherName?: string;
  motherNationalId?: string;
  motherMobile?: string;
  motherJob?: string;
  motherEducation?: string;
  motherCompany?: string;
  motherEmail?: string;
  notes?: string;
  medicalCondition?: string;
  educationAuthority?: string;
  specialCase?: boolean;
  integrated?: boolean;
  usesBus?: boolean;
  emergencyName?: string;
  emergencyTel?: string;
  transferredFrom?: string;
};

export type FeeType = {
  id: number;
  name: string;
  default_amount: number;
};

export type Payment = {
  id: number;
  student_id: number;
  student_name: string;
  class_id: number | null;
  fee_type_id: number | null;
  fee_type_name: string | null;
  amount: number;
  method: string;
  paid_on: string;
  note: string | null;
};

export type PaymentInput = {
  studentId: number;
  feeTypeId?: number;
  amount: number;
  method: string;
  paidOn: string;
  note?: string;
};

export type TimetableEntry = {
  id: number;
  class_id: number;
  day_of_week: number;
  period_no: number;
  start_time: string | null;
  end_time: string | null;
  subject: string;
  teacher_name: string | null;
};

export type TimetableEntryInput = {
  classId: number;
  dayOfWeek: number;
  periodNo: number;
  startTime?: string;
  endTime?: string;
  subject: string;
  teacherName?: string;
};

export type Bus = {
  id: number;
  route_name: string;
  plate_number: string | null;
  driver_name: string | null;
  driver_phone: string | null;
  capacity: number | null;
  notes: string | null;
  rider_count: number;
};

export type BusInput = {
  routeName: string;
  plateNumber?: string;
  driverName?: string;
  driverPhone?: string;
  capacity?: number;
  notes?: string;
};

export type BusRider = Student & { assignment_id: number; pickup_point: string | null };

export type InventoryItem = {
  id: number;
  name: string;
  category: string | null;
  quantity: number;
  unit: string | null;
  location: string | null;
  condition: string | null;
  notes: string | null;
};

export type InventoryItemInput = {
  name: string;
  category?: string;
  quantity?: number;
  unit?: string;
  location?: string;
  condition?: string;
  notes?: string;
};

export type SystemUser = {
  id: number;
  username: string;
  full_name: string;
  role: string;
};

export type SystemUserInput = {
  username: string;
  password?: string;
  fullName: string;
  role: string;
};

export type StaffMember = {
  id: number;
  name: string;
  position: string | null;
  department: string | null;
  phone: string | null;
  email: string | null;
  national_id: string | null;
  hire_date: string | null;
  address: string | null;
  notes: string | null;
};

export type StaffMemberInput = {
  name: string;
  position?: string;
  department?: string;
  phone?: string;
  email?: string;
  nationalId?: string;
  hireDate?: string;
  address?: string;
  notes?: string;
};

export type SchoolSettings = Record<string, string>;

export type AttendanceStatus = "present" | "absent" | "late";

export type AttendanceRecord = {
  id: number;
  student_id: number;
  class_id: number | null;
  date: string;
  status: AttendanceStatus;
  note: string | null;
};

export type AttendanceEntryInput = {
  studentId: number;
  classId?: number;
  status: AttendanceStatus;
  note?: string;
};

export type AttendanceAnalysisRow = {
  student_id: number;
  student_name: string;
  seq_no: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  marked_count: number;
  attendance_rate: number | null;
};

export type AdmissionStatus = "pending" | "approved" | "rejected";

export type Admission = {
  id: number;
  name: string;
  gender: "M" | "F";
  guardian_name: string | null;
  guardian_phone: string | null;
  desired_class_id: number | null;
  notes: string | null;
  status: AdmissionStatus;
  created_at: string;
};

export type AdmissionInput = {
  name: string;
  gender: "M" | "F";
  guardianName?: string;
  guardianPhone?: string;
  desiredClassId?: number;
  notes?: string;
};
