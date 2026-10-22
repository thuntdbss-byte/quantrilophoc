export type StudentStatus = 'Hoàn thành' | 'Đang học' | 'Cần hỗ trợ';

export interface ClassRoom {
  id: string;
  code: string;
  name: string;
  academicYear: string;
  teacherName: string;
  description: string;
  createdAt: string;
}

export interface Student {
  id: string;
  studentCode: string;
  fullName: string;
  birthDate: string;
  gender?: 'Nam' | 'Nữ' | 'Khác' | '';
  classId: string;
  academicYear: string;
  status: StudentStatus;
  teacherNotes: string;
  createdAt: string;
}

export interface TaskStudentAssignment {
  studentId?: string;
  percent: number; // 0 - 100
  status: 'Đang thực hiện' | 'Hoàn thành' | 'Cần hỗ trợ';
  completedDate?: string;
  notes?: string;
}

export interface LearningTask {
  id: string;
  title: string;
  subject: string;
  description: string;
  classId: string;
  assignedStudentIds: string[]; // If empty, applies to all students in class
  assignedDate: string; // YYYY-MM-DD
  dueDate?: string; // YYYY-MM-DD
  studentProgress: Record<string, TaskStudentAssignment>;
  createdAt: string;
}

export interface AppData {
  classes: ClassRoom[];
  students: Student[];
  tasks: LearningTask[];
  teacherProfile: {
    fullName: string;
    schoolName: string;
    email: string;
  };
  lastUpdated: string;
}

export type ActiveTab = 'overview' | 'classes' | 'students' | 'progress';
