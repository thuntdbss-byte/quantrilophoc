import React, { useState, useEffect } from 'react';
import { ClassRoom, Student, LearningTask, StudentStatus } from '../types';
import { X, AlertTriangle, CheckCircle, Info, Calendar, BookOpen, User, Users } from 'lucide-react';
import { formatDateVN } from '../utils/calculations';

// ======================== MODAL LỚP HỌC (THÊM / SỬA) ========================
interface ClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (classData: Omit<ClassRoom, 'id' | 'createdAt'> & { id?: string }) => void;
  initialData?: ClassRoom | null;
  existingCodes: string[];
}

export const ClassModal: React.FC<ClassModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  existingCodes,
}) => {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [teacherName, setTeacherName] = useState('Nguyễn Thị Thu');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setCode(initialData.code);
      setName(initialData.name);
      setAcademicYear(initialData.academicYear);
      setTeacherName(initialData.teacherName || 'Nguyễn Thị Thu');
      setDescription(initialData.description || '');
      setError('');
    } else {
      setCode('');
      setName('');
      setAcademicYear('2025 - 2026');
      setTeacherName('Nguyễn Thị Thu');
      setDescription('');
      setError('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    const trimmedName = name.trim();

    if (!trimmedCode) {
      setError('Vui lòng nhập Mã lớp học (ví dụ: K21-DB01).');
      return;
    }
    if (!trimmedName) {
      setError('Vui lòng nhập Tên lớp học.');
      return;
    }

    // Check duplicate code if not editing the same class
    if (
      (!initialData || initialData.code.toUpperCase() !== trimmedCode) &&
      existingCodes.map((c) => c.toUpperCase()).includes(trimmedCode)
    ) {
      setError(`Mã lớp "${trimmedCode}" đã tồn tại. Vui lòng chọn mã khác.`);
      return;
    }

    onSave({
      id: initialData?.id,
      code: trimmedCode,
      name: trimmedName,
      academicYear: academicYear.trim(),
      teacherName: teacherName.trim() || 'Nguyễn Thị Thu',
      description: description.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-base">
              {initialData ? 'Chỉnh sửa thông tin lớp học' : 'Thêm lớp học mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã lớp học <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: K21-DB01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Năm học</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                placeholder="VD: 2025 - 2026"
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên lớp học <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Lớp Dự bị 1 - Khoa học Xã hội"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Giáo viên phụ trách
            </label>
            <input
              type="text"
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả / Ghi chú về lớp
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Mô tả mục tiêu bồi dưỡng, chuyên ban, đặc điểm học sinh..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#00897b] hover:bg-[#00796b] rounded-lg shadow-xs transition-colors"
            >
              {initialData ? 'Lưu thay đổi' : 'Thêm lớp học'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== MODAL HỌC SINH (THÊM / SỬA) ========================
interface StudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (studentData: Omit<Student, 'id' | 'createdAt'> & { id?: string }) => void;
  initialData?: Student | null;
  classes: ClassRoom[];
  existingStudentCodes: string[];
}

export const StudentModal: React.FC<StudentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  classes,
  existingStudentCodes,
}) => {
  const [studentCode, setStudentCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState<'Nam' | 'Nữ' | 'Khác' | ''>('Nữ');
  const [classId, setClassId] = useState('');
  const [academicYear, setAcademicYear] = useState('2025 - 2026');
  const [status, setStatus] = useState<StudentStatus>('Đang học');
  const [teacherNotes, setTeacherNotes] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setStudentCode(initialData.studentCode);
      setFullName(initialData.fullName);
      setBirthDate(initialData.birthDate || '');
      setGender(initialData.gender || 'Nam');
      setClassId(initialData.classId || (classes[0]?.id ?? ''));
      setAcademicYear(initialData.academicYear || '2025 - 2026');
      setStatus(initialData.status || 'Đang học');
      setTeacherNotes(initialData.teacherNotes || '');
      setError('');
    } else {
      // Suggest next auto code
      const nextNum = existingStudentCodes.length + 1;
      const suggestedCode = `DBSS26-${String(nextNum).padStart(3, '0')}`;
      setStudentCode(suggestedCode);
      setFullName('');
      setBirthDate('2008-01-01');
      setGender('Nam');
      setClassId(classes[0]?.id || '');
      setAcademicYear('2025 - 2026');
      setStatus('Đang học');
      setTeacherNotes('');
      setError('');
    }
  }, [initialData, isOpen, classes]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedCode = studentCode.trim().toUpperCase();
    const trimmedName = fullName.trim();

    if (!trimmedCode) {
      setError('Vui lòng nhập Mã học sinh (ví dụ: DBSS26-001).');
      return;
    }
    if (!trimmedName) {
      setError('Vui lòng nhập Họ và tên học sinh.');
      return;
    }

    // Check duplicate student code
    if (
      (!initialData || initialData.studentCode.toUpperCase() !== trimmedCode) &&
      existingStudentCodes.map((c) => c.toUpperCase()).includes(trimmedCode)
    ) {
      setError(`Mã học sinh "${trimmedCode}" đã tồn tại trên hệ thống.`);
      return;
    }

    onSave({
      id: initialData?.id,
      studentCode: trimmedCode,
      fullName: trimmedName,
      birthDate,
      gender,
      classId,
      academicYear,
      status,
      teacherNotes: teacherNotes.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <User className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-base">
              {initialData ? 'Chỉnh sửa hồ sơ học sinh' : 'Thêm học sinh mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Mã học sinh <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="VD: DBSS26-001"
                value={studentCode}
                onChange={(e) => setStudentCode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Giới tính</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Nam">Nam</option>
                <option value="Nữ">Nữ</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên học sinh <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Lò Thị Mai"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày sinh</label>
              <input
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lớp học</label>
              <select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Chưa phân lớp --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Năm học</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Trạng thái học tập
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as StudentStatus)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="Đang học">Đang học</option>
                <option value="Hoàn thành">Hoàn thành</option>
                <option value="Cần hỗ trợ">Cần hỗ trợ</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú của giáo viên
            </label>
            <textarea
              rows={3}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Nhận xét tình hình học tập, năng khiếu, sự tiến bộ hoặc vấn đề cần phụ đạo..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#00897b] hover:bg-[#00796b] rounded-lg shadow-xs transition-colors"
            >
              {initialData ? 'Lưu thay đổi' : 'Thêm học sinh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== MODAL CHUYỂN LỚP CHO HỌC SINH ========================
interface TransferClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTransfer: (studentId: string, targetClassId: string) => void;
  student: Student | null;
  classes: ClassRoom[];
}

export const TransferClassModal: React.FC<TransferClassModalProps> = ({
  isOpen,
  onClose,
  onTransfer,
  student,
  classes,
}) => {
  const [targetClassId, setTargetClassId] = useState('');

  useEffect(() => {
    if (student) {
      setTargetClassId(student.classId || '');
    }
  }, [student, isOpen]);

  if (!isOpen || !student) return null;

  const currentClass = classes.find((c) => c.id === student.classId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onTransfer(student.id, targetClassId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-base">Chuyển lớp học cho học sinh</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg space-y-1">
            <p className="text-xs text-blue-700 font-medium">Học sinh được chuyển:</p>
            <p className="text-sm font-bold text-blue-950">
              {student.fullName} ({student.studentCode})
            </p>
            <p className="text-xs text-slate-600">
              Lớp hiện tại: <span className="font-semibold">{currentClass ? `${currentClass.code} - ${currentClass.name}` : 'Chưa phân lớp'}</span>
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chọn lớp học chuyển đến <span className="text-rose-500">*</span>
            </label>
            <select
              value={targetClassId}
              onChange={(e) => setTargetClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">-- Chọn lớp học mới --</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id} disabled={c.id === student.classId}>
                  {c.code} - {c.name} {c.id === student.classId ? '(Lớp hiện tại)' : ''}
                </option>
              ))}
            </select>
          </div>

          <p className="text-xs text-slate-500">
            Lưu ý: Các nhiệm vụ học tập theo lớp cũ vẫn được lưu giữ và giáo viên có thể điều chỉnh bất kỳ lúc nào.
          </p>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={!targetClassId || targetClassId === student.classId}
              className="px-5 py-2 text-sm font-medium text-white bg-[#00897b] hover:bg-[#00796b] rounded-lg shadow-xs transition-colors disabled:opacity-50"
            >
              Xác nhận chuyển lớp
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== MODAL NHIỆM VỤ HỌC TẬP (THÊM / SỬA) ========================
interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (taskData: Omit<LearningTask, 'id' | 'createdAt' | 'studentProgress'> & { id?: string }) => void;
  initialData?: LearningTask | null;
  classes: ClassRoom[];
  students: Student[];
}

export const TaskModal: React.FC<TaskModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
  classes,
  students,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('Ngữ văn');
  const [description, setDescription] = useState('');
  const [classId, setClassId] = useState('');
  const [assignedDate, setAssignedDate] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assignedStudentIds, setAssignedStudentIds] = useState<string[]>([]);
  const [assignAllInClass, setAssignAllInClass] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setSubject(initialData.subject);
      setDescription(initialData.description);
      setClassId(initialData.classId);
      setAssignedDate(initialData.assignedDate);
      setDueDate(initialData.dueDate || '');
      setAssignedStudentIds(initialData.assignedStudentIds || []);
      setAssignAllInClass((initialData.assignedStudentIds || []).length === 0);
      setError('');
    } else {
      setTitle('');
      setSubject('Ngữ văn');
      setDescription('');
      const defaultClassId = classes[0]?.id || '';
      setClassId(defaultClassId);
      const todayStr = new Date().toISOString().slice(0, 10);
      setAssignedDate(todayStr);
      // default due date: +14 days
      const due = new Date();
      due.setDate(due.getDate() + 14);
      setDueDate(due.toISOString().slice(0, 10));
      setAssignedStudentIds([]);
      setAssignAllInClass(true);
      setError('');
    }
  }, [initialData, isOpen, classes]);

  if (!isOpen) return null;

  const classStudents = students.filter((s) => s.classId === classId);

  const toggleStudent = (id: string) => {
    if (assignedStudentIds.includes(id)) {
      setAssignedStudentIds(assignedStudentIds.filter((sid) => sid !== id));
    } else {
      setAssignedStudentIds([...assignedStudentIds, id]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Vui lòng nhập tên môn học hoặc tên nhiệm vụ.');
      return;
    }
    if (!classId) {
      setError('Vui lòng chọn lớp học.');
      return;
    }

    const finalAssignedIds = assignAllInClass
      ? []
      : assignedStudentIds.length > 0
      ? assignedStudentIds
      : classStudents.map((s) => s.id);

    onSave({
      id: initialData?.id,
      title: title.trim(),
      subject: subject.trim(),
      description: description.trim(),
      classId,
      assignedDate,
      dueDate: dueDate || undefined,
      assignedStudentIds: finalAssignedIds,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-800 text-base">
              {initialData ? 'Chỉnh sửa nhiệm vụ học tập' : 'Giao nhiệm vụ học tập mới'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên nhiệm vụ / Chuyên đề <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              placeholder="VD: Chuyên đề Đọc hiểu văn bản & Nghị luận xã hội"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phân môn</label>
              <select
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Ngữ văn">Ngữ văn</option>
                <option value="Toán học">Toán học</option>
                <option value="Tiếng Anh">Tiếng Anh</option>
                <option value="Lịch sử">Lịch sử</option>
                <option value="Địa lý">Địa lý</option>
                <option value="Vật lý">Vật lý</option>
                <option value="Hóa học">Hóa học</option>
                <option value="Sinh học">Sinh học</option>
                <option value="Kỹ năng ĐH">Kỹ năng ĐH & Tự học</option>
                <option value="Khác">Khác</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp học <span className="text-rose-500">*</span>
              </label>
              <select
                value={classId}
                onChange={(e) => {
                  setClassId(e.target.value);
                  setAssignedStudentIds([]);
                }}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Ngày giao</label>
              <input
                type="date"
                value={assignedDate}
                onChange={(e) => setAssignedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hạn hoàn thành (Deadline)
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung học tập / Yêu cầu chi tiết
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi rõ yêu cầu nộp bài, phạm vi câu hỏi hoặc bài tập cần hoàn thành..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Assignment option: whole class or pick individual */}
          <div className="border border-slate-200 rounded-xl p-3 bg-slate-50/60">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-700">Phân công học sinh:</span>
              <div className="flex items-center gap-4 text-xs">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={assignAllInClass}
                    onChange={() => setAssignAllInClass(true)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Toàn bộ lớp ({classStudents.length} học sinh)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="assignMode"
                    checked={!assignAllInClass}
                    onChange={() => setAssignAllInClass(false)}
                    className="text-blue-600 focus:ring-blue-500"
                  />
                  <span>Tùy chọn học sinh</span>
                </label>
              </div>
            </div>

            {!assignAllInClass && (
              <div className="mt-2 max-h-36 overflow-y-auto space-y-1.5 pr-1 border-t border-slate-200 pt-2">
                {classStudents.length === 0 ? (
                  <p className="text-xs text-slate-500 italic">Lớp này hiện chưa có học sinh nào.</p>
                ) : (
                  classStudents.map((stu) => {
                    const isChecked = assignedStudentIds.includes(stu.id);
                    return (
                      <label
                        key={stu.id}
                        className="flex items-center justify-between p-1.5 rounded hover:bg-slate-100 cursor-pointer text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleStudent(stu.id)}
                            className="rounded text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-medium text-slate-800">{stu.fullName}</span>
                          <span className="text-slate-500 text-[11px]">({stu.studentCode})</span>
                        </div>
                        <span className="text-[11px] text-slate-500">{stu.status}</span>
                      </label>
                    );
                  })
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#00897b] hover:bg-[#00796b] rounded-lg shadow-xs transition-colors"
            >
              {initialData ? 'Lưu thay đổi' : 'Giao nhiệm vụ'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== MODAL CẬP NHẬT TIẾN ĐỘ CHO HỌC SINH ========================
interface UpdateProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: LearningTask | null;
  student: Student | null;
  onSaveProgress: (
    taskId: string,
    studentId: string,
    percent: number,
    status: 'Đang thực hiện' | 'Hoàn thành' | 'Cần hỗ trợ',
    notes: string,
    completedDate?: string
  ) => void;
}

export const UpdateProgressModal: React.FC<UpdateProgressModalProps> = ({
  isOpen,
  onClose,
  task,
  student,
  onSaveProgress,
}) => {
  const [percent, setPercent] = useState<number>(0);
  const [status, setStatus] = useState<'Đang thực hiện' | 'Hoàn thành' | 'Cần hỗ trợ'>('Đang thực hiện');
  const [notes, setNotes] = useState('');
  const [completedDate, setCompletedDate] = useState('');

  useEffect(() => {
    if (task && student) {
      const current = task.studentProgress?.[student.id];
      if (current) {
        setPercent(current.percent);
        setStatus(current.status);
        setNotes(current.notes || '');
        setCompletedDate(current.completedDate || '');
      } else {
        setPercent(0);
        setStatus('Đang thực hiện');
        setNotes('');
        setCompletedDate('');
      }
    }
  }, [task, student, isOpen]);

  if (!isOpen || !task || !student) return null;

  const handlePercentChange = (newVal: number) => {
    setPercent(newVal);
    if (newVal === 100) {
      setStatus('Hoàn thành');
      if (!completedDate) {
        setCompletedDate(new Date().toISOString().slice(0, 10));
      }
    } else if (status === 'Hoàn thành') {
      setStatus('Đang thực hiện');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProgress(
      task.id,
      student.id,
      percent,
      status,
      notes.trim(),
      percent === 100 ? completedDate || new Date().toISOString().slice(0, 10) : undefined
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-800 text-base">Cập nhật tiến độ học tập</h3>
            <p className="text-xs text-slate-500 mt-0.5 truncate max-w-xs">{task.title}</p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
            <span className="text-xs text-slate-500">Học sinh:</span>
            <p className="text-sm font-bold text-slate-800">
              {student.fullName} <span className="text-slate-500 text-xs font-normal">({student.studentCode})</span>
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Mức độ hoàn thành (%)</label>
              <span className="text-sm font-bold tabular-nums text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                {percent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={percent}
              onChange={(e) => handlePercentChange(Number(e.target.value))}
              className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>0% (Bắt đầu)</span>
              <span>50%</span>
              <span>100% (Hoàn thành)</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Đánh giá trạng thái
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              <option value="Đang thực hiện">Đang thực hiện</option>
              <option value="Hoàn thành">Hoàn thành (100%)</option>
              <option value="Cần hỗ trợ">Cần hỗ trợ (Giáo viên chủ động đánh dấu)</option>
            </select>
          </div>

          {percent === 100 && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày hoàn thành
              </label>
              <input
                type="date"
                value={completedDate}
                onChange={(e) => setCompletedDate(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú nhận xét của giáo viên
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Nhận xét chất lượng bài làm, lỗi sai cần khắc phục..."
              className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-medium text-white bg-[#00897b] hover:bg-[#00796b] rounded-lg shadow-xs transition-colors"
            >
              Lưu tiến độ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ======================== MODAL XÁC NHẬN XÓA (CÓ CẢNH BÁO) ========================
interface ConfirmDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  warningNote?: string;
  confirmButtonText?: string;
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  warningNote,
  confirmButtonText = 'Xác nhận xóa',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-rose-100 text-rose-600 rounded-full shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="space-y-2 flex-1">
              <h3 className="font-semibold text-slate-900 text-base">{title}</h3>
              <p className="text-sm text-slate-600 leading-relaxed">{message}</p>
              {warningNote && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs">
                  {warningNote}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Hủy thao tác
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 rounded-lg shadow-xs transition-colors"
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
