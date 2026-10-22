import React, { useState } from 'react';
import { AppData, ClassRoom, Student } from '../types';
import { getClassAverageProgress } from '../utils/calculations';
import { ProgressBar } from '../components/Charts';
import {
  School,
  Plus,
  Search,
  Filter,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Users,
  Eye,
  Calendar,
  UserCheck,
  CheckCircle2,
  BookOpen,
} from 'lucide-react';

interface ClassesViewProps {
  data: AppData;
  onAddClass: () => void;
  onEditClass: (cls: ClassRoom) => void;
  onDeleteClass: (cls: ClassRoom) => void;
  onViewClassDetail: (cls: ClassRoom) => void;
  onAddStudentToClass: (classId: string) => void;
  onAssignTaskToClass: (classId: string) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  data,
  onAddClass,
  onEditClass,
  onDeleteClass,
  onViewClassDetail,
  onAddStudentToClass,
  onAssignTaskToClass,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Unique academic years
  const academicYears = Array.from(new Set(data.classes.map((c) => c.academicYear)));

  // Filtered classes
  const filteredClasses = data.classes.filter((cls) => {
    const matchesSearch =
      cls.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cls.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (cls.teacherName && cls.teacherName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesYear = selectedYear === 'all' || cls.academicYear === selectedYear;

    return matchesSearch && matchesYear;
  });

  return (
    <div className="space-y-6">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <School className="w-5 h-5 text-[#00897b]" />
            <h2 className="text-xl font-bold text-slate-900">Quản lý danh sách lớp học</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng cộng {data.classes.length} lớp học được phân công cho giáo viên phụ trách
          </p>
        </div>

        <button
          onClick={onAddClass}
          className="flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#00897b] hover:bg-[#00796b] rounded-xl transition-colors shadow-xs shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm lớp học mới</span>
        </button>
      </div>

      {/* Filter and View Mode Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <div className="flex flex-1 flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm theo mã lớp, tên lớp, giáo viên..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Filter by Academic Year */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-500">Năm học:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả năm học</option>
              {academicYears.map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg shrink-0 self-end md:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Hiển thị dạng thẻ (Card)"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-blue-700 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Hiển thị dạng bảng (Table)"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Classes Content */}
      {filteredClasses.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
          <School className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-700">Không tìm thấy lớp học nào</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Không có kết quả khớp với điều kiện tìm kiếm hoặc chưa có lớp học nào được tạo.
          </p>
          <button
            onClick={onAddClass}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm lớp ngay</span>
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid / Card View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredClasses.map((cls) => {
            const studentCount = data.students.filter((s) => s.classId === cls.id).length;
            const avgProgress = getClassAverageProgress(cls.id, data.students, data.tasks);

            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all flex flex-col overflow-hidden"
              >
                {/* Card Top */}
                <div className="p-5 flex-1">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-wide">
                      {cls.code}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Năm học: {cls.academicYear}
                    </span>
                  </div>

                  <h3
                    onClick={() => onViewClassDetail(cls)}
                    className="text-base font-bold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer line-clamp-1"
                    title={cls.name}
                  >
                    {cls.name}
                  </h3>

                  <p className="text-xs text-slate-500 mt-2 line-clamp-2 min-h-[32px]">
                    {cls.description || 'Chưa có mô tả chi tiết cho lớp học này.'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Giáo viên phụ trách:</span>
                      <span className="font-semibold text-slate-800">{cls.teacherName || 'Nguyễn Thị Thu'}</span>
                    </div>

                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Sĩ số học sinh:</span>
                      <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded tabular-nums">
                        {studentCount} học sinh
                      </span>
                    </div>

                    <div className="pt-1">
                      <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                        <span>Tiến độ học tập:</span>
                        <span className="font-semibold text-slate-700 tabular-nums">
                          {avgProgress !== null ? `${avgProgress}%` : 'Chưa có dữ liệu'}
                        </span>
                      </div>
                      <ProgressBar percent={avgProgress} size="sm" showText={false} />
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                <div className="px-5 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => onViewClassDetail(cls)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết lớp</span>
                  </button>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditClass(cls)}
                      className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-200/60 rounded-lg transition-colors"
                      title="Chỉnh sửa thông tin lớp"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteClass(cls)}
                      className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Xóa lớp học"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mã lớp</th>
                  <th className="py-3.5 px-4">Tên lớp học</th>
                  <th className="py-3.5 px-4">Năm học</th>
                  <th className="py-3.5 px-4">Giáo viên</th>
                  <th className="py-3.5 px-4 text-center">Sĩ số</th>
                  <th className="py-3.5 px-4 min-w-[140px]">Tiến độ TB</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredClasses.map((cls) => {
                  const studentCount = data.students.filter((s) => s.classId === cls.id).length;
                  const avgProgress = getClassAverageProgress(cls.id, data.students, data.tasks);

                  return (
                    <tr key={cls.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-bold text-blue-700 whitespace-nowrap">
                        {cls.code}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          onClick={() => onViewClassDetail(cls)}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {cls.name}
                        </span>
                        {cls.description && (
                          <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                            {cls.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">{cls.academicYear}</td>
                      <td className="py-3 px-4 whitespace-nowrap font-medium">{cls.teacherName}</td>
                      <td className="py-3 px-4 text-center font-bold tabular-nums">
                        {studentCount}
                      </td>
                      <td className="py-3 px-4">
                        <ProgressBar percent={avgProgress} size="sm" />
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onViewClassDetail(cls)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditClass(cls)}
                            className="p-1 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteClass(cls)}
                            className="p-1 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded"
                            title="Xóa"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

// ======================== MODAL XEM CHI TIẾT LỚP HỌC ========================
interface ClassDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: ClassRoom | null;
  students: Student[];
  data: AppData;
  onSelectStudent: (s: Student) => void;
  onAddStudent: (classId: string) => void;
  onAssignTask: (classId: string) => void;
}

export const ClassDetailModal: React.FC<ClassDetailModalProps> = ({
  isOpen,
  onClose,
  cls,
  students,
  data,
  onSelectStudent,
  onAddStudent,
  onAssignTask,
}) => {
  if (!isOpen || !cls) return null;

  const classStudents = students.filter((s) => s.classId === cls.id);
  const avgProgress = getClassAverageProgress(cls.id, data.students, data.tasks);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded uppercase">
                {cls.code}
              </span>
              <span className="text-xs text-slate-500">Năm học {cls.academicYear}</span>
            </div>
            <h3 className="font-bold text-slate-900 text-lg mt-1">{cls.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XCloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Metadata Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Giáo viên phụ trách</span>
              <p className="text-sm font-bold text-slate-800 mt-0.5">{cls.teacherName}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Sĩ số hiện tại</span>
              <p className="text-sm font-bold text-blue-700 mt-0.5 tabular-nums">
                {classStudents.length} học sinh
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Tiến độ trung bình</span>
              <p className="text-sm font-bold text-emerald-700 mt-0.5 tabular-nums">
                {avgProgress !== null ? `${avgProgress}%` : 'Chưa có dữ liệu'}
              </p>
            </div>
          </div>

          {cls.description && (
            <div className="text-xs text-slate-600 bg-blue-50/40 p-3 rounded-xl border border-blue-100/60 leading-relaxed">
              <span className="font-semibold text-blue-900">Mô tả lớp:</span> {cls.description}
            </div>
          )}

          {/* Students list in this class */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span>Danh sách học sinh ({classStudents.length})</span>
              </h4>
              <button
                onClick={() => {
                  onClose();
                  onAddStudent(cls.id);
                }}
                className="text-xs font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm học sinh vào lớp</span>
              </button>
            </div>

            {classStudents.length === 0 ? (
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                Lớp này hiện chưa có học sinh nào. Bấm nút phía trên để thêm học sinh.
              </div>
            ) : (
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-medium">
                    <tr>
                      <th className="py-2.5 px-3">Mã số</th>
                      <th className="py-2.5 px-3">Họ và tên</th>
                      <th className="py-2.5 px-3">Trạng thái</th>
                      <th className="py-2.5 px-3 text-right">Chi tiết</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classStudents.map((st) => (
                      <tr key={st.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-3 font-semibold text-blue-700">{st.studentCode}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{st.fullName}</td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              st.status === 'Hoàn thành'
                                ? 'bg-emerald-50 text-emerald-700'
                                : st.status === 'Cần hỗ trợ'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {st.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => {
                              onClose();
                              onSelectStudent(st);
                            }}
                            className="text-xs text-blue-600 hover:underline font-medium"
                          >
                            Xem hồ sơ
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onAssignTask(cls.id);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>Giao nhiệm vụ cho lớp này</span>
          </button>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200/60 rounded-lg transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

function XCloseIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      className={props.className}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
