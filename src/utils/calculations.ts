import { AppData, LearningTask, Student } from '../types';

/**
 * Calculates the overall progress of a student based on their assigned tasks.
 * Returns null if the student has no assigned tasks.
 */
export function getStudentProgress(studentId: string, tasks: LearningTask[]): number | null {
  const assignedTasks = tasks.filter((t) => {
    // If assignedStudentIds is empty, it means task applies to all students in that class
    // Or if studentId is explicitly included
    return t.assignedStudentIds.length === 0 || t.assignedStudentIds.includes(studentId);
  });

  if (assignedTasks.length === 0) {
    return null;
  }

  let totalPercent = 0;
  for (const task of assignedTasks) {
    const progress = task.studentProgress?.[studentId]?.percent ?? 0;
    totalPercent += progress;
  }

  return Math.round(totalPercent / assignedTasks.length);
}

/**
 * Checks if a specific task assignment is overdue.
 */
export function isTaskOverdue(dueDate?: string, percent: number = 0): boolean {
  if (!dueDate || percent >= 100) return false;
  const due = new Date(dueDate);
  // Compare by date only (ignoring time)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < today.getTime();
}

/**
 * Calculates average progress for a class.
 */
export function getClassAverageProgress(classId: string, students: Student[], tasks: LearningTask[]): number | null {
  const classStudents = students.filter((s) => s.classId === classId);
  if (classStudents.length === 0) return null;

  const progressList = classStudents
    .map((s) => getStudentProgress(s.id, tasks))
    .filter((p): p is number => p !== null);

  if (progressList.length === 0) return null;
  const sum = progressList.reduce((acc, curr) => acc + curr, 0);
  return Math.round(sum / progressList.length);
}

/**
 * Computes all dashboard statistics.
 */
export function computeDashboardStats(data: AppData, filterClassId?: string) {
  const filteredStudents = filterClassId
    ? data.students.filter((s) => s.classId === filterClassId)
    : data.students;

  const filteredClasses = filterClassId
    ? data.classes.filter((c) => c.id === filterClassId)
    : data.classes;

  const totalClasses = filteredClasses.length;
  const totalStudents = filteredStudents.length;

  // Completed: student status is 'Hoàn thành' OR aggregate progress is 100%
  let completedCount = 0;
  let needSupportCount = 0;
  let inProgressCount = 0;

  for (const student of filteredStudents) {
    if (student.status === 'Cần hỗ trợ') {
      needSupportCount++;
    } else if (student.status === 'Hoàn thành') {
      completedCount++;
    } else {
      inProgressCount++;
    }
  }

  return {
    totalClasses,
    totalStudents,
    completedCount,
    needSupportCount,
    inProgressCount,
  };
}

/**
 * Formats a date string to Vietnamese display format: DD/MM/YYYY
 */
export function formatDateVN(dateStr?: string): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
}

/**
 * Gets color classes for a progress value
 */
export function getProgressColor(percent: number | null): {
  bg: string;
  text: string;
  border: string;
  barColor: string;
} {
  if (percent === null) {
    return {
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      barColor: 'bg-slate-300',
    };
  }
  if (percent === 100) {
    return {
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      barColor: 'bg-emerald-600',
    };
  }
  if (percent >= 50) {
    return {
      bg: 'bg-blue-50',
      text: 'text-blue-700',
      border: 'border-blue-200',
      barColor: 'bg-blue-600',
    };
  }
  return {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    barColor: 'bg-amber-500',
  };
}

/**
 * Gets badge color classes for student or task status
 */
export function getStatusStyle(status: string): {
  bg: string;
  text: string;
  border: string;
  dotColor: string;
} {
  switch (status) {
    case 'Hoàn thành':
      return {
        bg: 'bg-emerald-50 text-emerald-800',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dotColor: 'bg-emerald-500',
      };
    case 'Cần hỗ trợ':
      return {
        bg: 'bg-rose-50 text-rose-800',
        text: 'text-rose-700',
        border: 'border-rose-200',
        dotColor: 'bg-rose-500',
      };
    case 'Đang học':
    case 'Đang thực hiện':
    default:
      return {
        bg: 'bg-blue-50 text-blue-800',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dotColor: 'bg-blue-500',
      };
  }
}
