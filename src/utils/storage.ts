import { INITIAL_APP_DATA } from '../data/initialData';
import { AppData, ClassRoom, LearningTask, Student } from '../types';
import { getStudentProgress } from './calculations';

export const STORAGE_KEY = 'DBSS_SMART_CLASSROOM_DATA_V1';

/**
 * Loads data from localStorage or falls back to INITIAL_APP_DATA
 */
export function loadAppData(): AppData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveAppData(INITIAL_APP_DATA);
      return INITIAL_APP_DATA;
    }
    const parsed = JSON.parse(raw);
    if (parsed && Array.isArray(parsed.classes) && Array.isArray(parsed.students) && Array.isArray(parsed.tasks)) {
      return parsed;
    }
    return INITIAL_APP_DATA;
  } catch (error) {
    console.error('Lỗi khi đọc dữ liệu từ localStorage:', error);
    return INITIAL_APP_DATA;
  }
}

/**
 * Saves application state to localStorage
 */
export function saveAppData(data: AppData): void {
  try {
    const toSave: AppData = {
      ...data,
      lastUpdated: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (error) {
    console.error('Lỗi khi lưu dữ liệu vào localStorage:', error);
  }
}

/**
 * Resets data to initial sample data
 */
export function resetAppData(): AppData {
  const fresh = JSON.parse(JSON.stringify(INITIAL_APP_DATA));
  saveAppData(fresh);
  return fresh;
}

/**
 * Exports data to a JSON backup file
 */
export function exportJsonBackup(data: AppData): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `SaoLuu_QuanTriLopHoc_DBSS_${dateStr}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Imports and validates a JSON backup file
 */
export async function importJsonBackup(file: File): Promise<{ success: boolean; data?: AppData; message: string }> {
  try {
    const text = await file.text();
    const parsed = JSON.parse(text);

    if (!parsed || typeof parsed !== 'object') {
      return { success: false, message: 'Tệp không hợp lệ: Định dạng JSON không đúng cấu trúc.' };
    }

    if (!Array.isArray(parsed.classes) || !Array.isArray(parsed.students) || !Array.isArray(parsed.tasks)) {
      return {
        success: false,
        message: 'Tệp sao lưu thiếu các bảng dữ liệu bắt buộc (classes, students, tasks).',
      };
    }

    const validatedData: AppData = {
      classes: parsed.classes,
      students: parsed.students,
      tasks: parsed.tasks,
      teacherProfile: parsed.teacherProfile || INITIAL_APP_DATA.teacherProfile,
      lastUpdated: new Date().toISOString(),
    };

    saveAppData(validatedData);
    return { success: true, data: validatedData, message: 'Nhập dữ liệu thành công từ tệp sao lưu!' };
  } catch (err: any) {
    return {
      success: false,
      message: `Không thể đọc tệp sao lưu: ${err?.message || 'Lỗi phân tích JSON.'}`,
    };
  }
}

/**
 * Exports students list to CSV format with UTF-8 BOM
 */
export function exportStudentsCsv(students: Student[], classes: ClassRoom[], tasks: LearningTask[]): void {
  const classMap = new Map(classes.map((c) => [c.id, `${c.code} - ${c.name}`]));

  const headers = [
    'STT',
    'Mã học sinh',
    'Họ và tên',
    'Ngày sinh',
    'Giới tính',
    'Lớp học',
    'Năm học',
    'Tiến độ (%)',
    'Trạng thái',
    'Ghi chú của giáo viên',
  ];

  const rows = students.map((s, index) => {
    const progress = getStudentProgress(s.id, tasks);
    const progressText = progress !== null ? `${progress}%` : 'Chưa có dữ liệu';
    const className = classMap.get(s.classId) || 'Chưa phân lớp';

    return [
      index + 1,
      `"${s.studentCode.replace(/"/g, '""')}"`,
      `"${s.fullName.replace(/"/g, '""')}"`,
      s.birthDate || '',
      s.gender || '',
      `"${className.replace(/"/g, '""')}"`,
      `"${s.academicYear.replace(/"/g, '""')}"`,
      `"${progressText}"`,
      `"${s.status}"`,
      `"${(s.teacherNotes || '').replace(/"/g, '""')}"`,
    ].join(',');
  });

  // UTF-8 BOM: \uFEFF ensures Vietnamese diacritics render properly in Excel
  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `DanhSach_HocSinh_DBSS_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports tasks progress report to CSV with UTF-8 BOM
 */
export function exportTasksCsv(tasks: LearningTask[], classes: ClassRoom[], students: Student[]): void {
  const classMap = new Map(classes.map((c) => [c.id, `${c.code} - ${c.name}`]));
  const studentMap = new Map(students.map((s) => [s.id, s]));

  const headers = [
    'Mã nhiệm vụ',
    'Tên môn/Nhiệm vụ',
    'Lớp',
    'Mã học sinh',
    'Họ và tên học sinh',
    'Ngày giao',
    'Hạn hoàn thành',
    'Tiến độ (%)',
    'Trạng thái nhiệm vụ',
    'Ghi chú của giáo viên',
  ];

  const rows: string[] = [];

  tasks.forEach((task) => {
    const className = classMap.get(task.classId) || 'N/A';
    const assignedIds =
      task.assignedStudentIds.length > 0
        ? task.assignedStudentIds
        : students.filter((s) => s.classId === task.classId).map((s) => s.id);

    assignedIds.forEach((sid) => {
      const student = studentMap.get(sid);
      if (!student) return;
      const prog = task.studentProgress?.[sid] || { percent: 0, status: 'Đang thực hiện' };

      rows.push(
        [
          `"${task.id}"`,
          `"${task.title.replace(/"/g, '""')}"`,
          `"${className.replace(/"/g, '""')}"`,
          `"${student.studentCode}"`,
          `"${student.fullName.replace(/"/g, '""')}"`,
          task.assignedDate,
          task.dueDate || '',
          `${prog.percent}%`,
          `"${prog.status}"`,
          `"${(prog.notes || '').replace(/"/g, '""')}"`,
        ].join(',')
      );
    });
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const dateStr = new Date().toISOString().slice(0, 10);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', `BaoCao_TienDo_HocTap_DBSS_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
