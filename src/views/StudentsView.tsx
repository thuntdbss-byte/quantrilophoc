import React, { useState, useMemo } from 'react';
import { AppData, Student, StudentStatus, ClassRoom, LearningTask } from '../types';
import { getStudentProgress, formatDateVN } from '../utils/calculations';
import { ProgressBar } from '../components/Charts';
import { exportStudentsCsv } from '../utils/storage';
import { exportStudentsToExcel, downloadStudentExcelTemplate } from '../utils/excelImport';
import { ImportStudentsModal } from '../components/ImportStudentsModal';
import {
  Users,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  Download,
  Edit2,
  Trash2,
  Eye,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  Upload,
} from 'lucide-react';

interface StudentsViewProps {
  data: AppData;
  onAddStudent: () => void;
  onEditStudent: (student: Student) => void;
  onDeleteStudent: (student: Student) => void;
  onSelectStudent: (student: Student) => void;
  onTransferClass: (student: Student) => void;
  onImportStudents?: (
    toAdd: Student[],
    toUpdate: Student[],
    stats: { addedCount: number; updatedCount: number; skippedCount: number }
  ) => void;
  onOpenGoogleWorkspace?: (tab?: 'sheets' | 'drive') => void;
}

export const StudentsView: React.FC<StudentsViewProps> = ({
  data,
  onAddStudent,
  onEditStudent,
  onDeleteStudent,
  onSelectStudent,
  onTransferClass,
  onImportStudents,
  onOpenGoogleWorkspace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'name' | 'code' | 'progress' | 'class'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  // Map of classes for quick lookup
  const classMap = useMemo(() => {
    return new Map(data.classes.map((c) => [c.id, c]));
  }, [data.classes]);

  // Filtered and Sorted Students
  const filteredStudents = useMemo(() => {
    return data.students
      .filter((stu) => {
        const matchesSearch =
          stu.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          stu.studentCode.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesClass = filterClassId === 'all' || stu.classId === filterClassId;
        const matchesStatus = filterStatus === 'all' || stu.status === filterStatus;

        return matchesSearch && matchesClass && matchesStatus;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortBy === 'name') {
          // Compare last name in Vietnamese convention
          const aParts = a.fullName.trim().split(' ');
          const bParts = b.fullName.trim().split(' ');
          const aLast = aParts[aParts.length - 1] || '';
          const bLast = bParts[bParts.length - 1] || '';
          cmp = aLast.localeCompare(bLast, 'vi');
          if (cmp === 0) cmp = a.fullName.localeCompare(b.fullName, 'vi');
        } else if (sortBy === 'code') {
          cmp = a.studentCode.localeCompare(b.studentCode);
        } else if (sortBy === 'class') {
          const aCls = classMap.get(a.classId)?.code || '';
          const bCls = classMap.get(b.classId)?.code || '';
          cmp = aCls.localeCompare(bCls);
        } else if (sortBy === 'progress') {
          const aProg = getStudentProgress(a.id, data.tasks) ?? -1;
          const bProg = getStudentProgress(b.id, data.tasks) ?? -1;
          cmp = aProg - bProg;
        }

        return sortOrder === 'asc' ? cmp : -cmp;
      });
  }, [data.students, data.tasks, searchQuery, filterClassId, filterStatus, sortBy, sortOrder, classMap]);

  // Pagination calculation
  const totalItems = filteredStudents.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedStudents = filteredStudents.slice(startIndex, startIndex + pageSize);

  const handleToggleSort = (field: 'name' | 'code' | 'progress' | 'class') => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCsv = () => {
    exportStudentsCsv(filteredStudents, data.classes, data.tasks);
    setShowExportMenu(false);
  };

  const handleExportExcel = () => {
    exportStudentsToExcel(filteredStudents, data.classes);
    setShowExportMenu(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#00897b]" />
            <h2 className="text-xl font-bold text-slate-900">Quản lý hồ sơ học sinh</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Tổng số: <span className="font-semibold text-slate-700 tabular-nums">{data.students.length}</span> học sinh
            trong hệ thống quản trị
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
              title="Xuất danh sách học sinh"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Xuất danh sách</span>
            </button>

            {showExportMenu && (
              <div
                className="absolute right-0 mt-2 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-30 py-1.5 text-xs animate-in fade-in zoom-in-95"
                onMouseLeave={() => setShowExportMenu(false)}
              >
                {onOpenGoogleWorkspace && (
                  <button
                    onClick={() => {
                      onOpenGoogleWorkspace('sheets');
                      setShowExportMenu(false);
                    }}
                    className="w-full text-left px-3.5 py-2 hover:bg-teal-50/70 flex items-center gap-2 text-teal-800 font-bold border-b border-slate-100 mb-1"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Xuất lên Google Sheets</span>
                  </button>
                )}
                <button
                  onClick={handleExportExcel}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                  <span>Xuất file Excel (.xlsx)</span>
                </button>
                <button
                  onClick={handleExportCsv}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-700 font-medium"
                >
                  <Download className="w-4 h-4 text-blue-600" />
                  <span>Xuất file CSV (UTF-8)</span>
                </button>
                <div className="border-t border-slate-100 my-1"></div>
                <button
                  onClick={() => {
                    downloadStudentExcelTemplate(data.classes);
                    setShowExportMenu(false);
                  }}
                  className="w-full text-left px-3.5 py-2 hover:bg-slate-50 flex items-center gap-2 text-slate-500"
                >
                  <Download className="w-3.5 h-3.5 text-slate-400" />
                  <span>Tải file Excel mẫu</span>
                </button>
              </div>
            )}
          </div>

          {/* Import Excel Button */}
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shrink-0 shadow-2xs"
            title="Thêm danh sách học sinh hàng loạt từ file Excel (.xlsx, .xls, .csv)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Nhập Excel</span>
          </button>

          {/* Google Sheets Quick Button */}
          {onOpenGoogleWorkspace && (
            <button
              onClick={() => onOpenGoogleWorkspace('sheets')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors shrink-0 shadow-2xs"
              title="Đồng bộ hoặc nhập học sinh từ Google Sheets"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path fill="#0F9D58" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                <path fill="#A1D99B" d="M14 2v6h6" />
                <path fill="#FFF" d="M7 11h10v2H7zm0 4h10v2H7z" />
              </svg>
              <span>Google Sheets</span>
            </button>
          )}

          {/* Add Student Button */}
          <button
            onClick={onAddStudent}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00897b] hover:bg-[#00796b] rounded-xl transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm học sinh</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo họ tên, mã học sinh..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter by Class */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 shrink-0">Lớp:</span>
          <select
            value={filterClassId}
            onChange={(e) => {
              setFilterClassId(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer w-full truncate"
          >
            <option value="all">Tất cả lớp học</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-slate-500 shrink-0">Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer w-full"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Hoàn thành">Hoàn thành (Xanh lá)</option>
            <option value="Đang học">Đang học (Xanh dương)</option>
            <option value="Cần hỗ trợ">Cần hỗ trợ (Cam / Đỏ)</option>
          </select>
        </div>

        {/* Sort selector */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span className="text-slate-500 shrink-0">Sắp xếp:</span>
          <select
            value={`${sortBy}-${sortOrder}`}
            onChange={(e) => {
              const [sb, so] = e.target.value.split('-') as [any, any];
              setSortBy(sb);
              setSortOrder(so);
            }}
            className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer w-full"
          >
            <option value="name-asc">Tên (A → Z)</option>
            <option value="name-desc">Tên (Z → A)</option>
            <option value="code-asc">Mã số (Tăng dần)</option>
            <option value="progress-desc">Tiến độ (Cao → Thấp)</option>
            <option value="progress-asc">Tiến độ (Thấp → Cao)</option>
            <option value="class-asc">Theo lớp học</option>
          </select>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredStudents.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">Không tìm thấy học sinh nào</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Không có học sinh nào khớp với bộ lọc hiện tại. Thử thay đổi từ khóa hoặc bộ lọc lớp.
            </p>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                <span>Nhập từ file Excel</span>
              </button>
              <button
                onClick={onAddStudent}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm học sinh mới</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="py-3 px-3.5 w-12 text-center">STT</th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-blue-600 select-none"
                    onClick={() => handleToggleSort('code')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Mã học sinh</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-blue-600 select-none"
                    onClick={() => handleToggleSort('name')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Họ và tên</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 cursor-pointer hover:text-blue-600 select-none"
                    onClick={() => handleToggleSort('class')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Lớp</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    className="py-3 px-3.5 min-w-[160px] cursor-pointer hover:text-blue-600 select-none"
                    onClick={() => handleToggleSort('progress')}
                  >
                    <div className="flex items-center gap-1">
                      <span>Tiến độ</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3 px-3.5">Trạng thái</th>
                  <th className="py-3 px-3.5 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {paginatedStudents.map((student, idx) => {
                  const stt = startIndex + idx + 1;
                  const cls = classMap.get(student.classId);
                  const progress = getStudentProgress(student.id, data.tasks);

                  let statusBadgeClass = 'bg-blue-50 text-blue-700 border-blue-200';
                  if (student.status === 'Hoàn thành') {
                    statusBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                  } else if (student.status === 'Cần hỗ trợ') {
                    statusBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                  }

                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      <td className="py-3 px-3.5 text-center text-slate-400 font-medium tabular-nums">
                        {stt}
                      </td>
                      <td className="py-3 px-3.5 font-bold text-blue-700 whitespace-nowrap">
                        {student.studentCode}
                      </td>
                      <td className="py-3 px-3.5">
                        <div
                          onClick={() => onSelectStudent(student)}
                          className="font-semibold text-slate-900 hover:text-blue-600 transition-colors cursor-pointer"
                        >
                          {student.fullName}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                          <span>{student.gender || '—'}</span>
                          <span>·</span>
                          <span>Sinh: {formatDateVN(student.birthDate)}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        {cls ? (
                          <span
                            className="font-medium text-slate-700 hover:text-blue-600"
                            title={cls.name}
                          >
                            {cls.code}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Chưa phân lớp</span>
                        )}
                      </td>
                      <td className="py-3 px-3.5">
                        <ProgressBar percent={progress} size="sm" />
                      </td>
                      <td className="py-3 px-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadgeClass}`}
                        >
                          {student.status}
                        </span>
                      </td>
                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onSelectStudent(student)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Xem chi tiết hồ sơ"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onTransferClass(student)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Chuyển lớp"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onEditStudent(student)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Chỉnh sửa thông tin"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteStudent(student)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa học sinh"
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
        )}

        {/* Pagination Bar */}
        {filteredStudents.length > 0 && (
          <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span>Hiển thị</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-2 py-1 text-slate-700 font-medium"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
              <span>trên tổng số {totalItems} học sinh</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                title="Trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              <span className="px-2 font-medium text-slate-700 tabular-nums">
                Trang {safeCurrentPage} / {totalPages}
              </span>

              <button
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-white"
                title="Trang sau"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal Nhập danh sách học sinh bằng Excel */}
      <ImportStudentsModal
        isOpen={isImportModalOpen}
        onClose={() => setIsImportModalOpen(false)}
        classes={data.classes}
        existingStudents={data.students}
        onImport={(toAdd, toUpdate, stats) => {
          if (onImportStudents) {
            onImportStudents(toAdd, toUpdate, stats);
          }
        }}
      />
    </div>
  );
};

// ======================== MODAL XEM CHI TIẾT HỒ SƠ HỌC SINH ========================
interface StudentDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null;
  classes: ClassRoom[];
  tasks: LearningTask[];
  onEditStudent: (student: Student) => void;
  onUpdateTaskProgress: (task: LearningTask, student: Student) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  isOpen,
  onClose,
  student,
  classes,
  tasks,
  onEditStudent,
  onUpdateTaskProgress,
}) => {
  if (!isOpen || !student) return null;

  const cls = classes.find((c) => c.id === student.classId);
  const studentTasks = tasks.filter((t) => {
    return (
      t.classId === student.classId &&
      (t.assignedStudentIds.length === 0 || t.assignedStudentIds.includes(student.id))
    );
  });

  const progress = getStudentProgress(student.id, tasks);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-sm shadow-xs">
              {student.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-0.5 rounded uppercase">
                  {student.studentCode}
                </span>
                <span className="text-xs text-slate-500">
                  {cls ? `${cls.code} - ${cls.name}` : 'Chưa phân lớp'}
                </span>
              </div>
              <h3 className="font-bold text-slate-900 text-lg mt-0.5">{student.fullName}</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <XCloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Bio Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[11px]">Ngày sinh</span>
              <p className="font-bold text-slate-800 mt-0.5">{formatDateVN(student.birthDate)}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[11px]">Giới tính</span>
              <p className="font-bold text-slate-800 mt-0.5">{student.gender || '—'}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[11px]">Trạng thái</span>
              <p className="font-bold text-blue-700 mt-0.5">{student.status}</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <span className="text-slate-400 text-[11px]">Tiến độ chung</span>
              <p className="font-bold text-emerald-700 mt-0.5 tabular-nums">
                {progress !== null ? `${progress}%` : 'Chưa có'}
              </p>
            </div>
          </div>

          {/* Teacher Notes */}
          {student.teacherNotes ? (
            <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5">
              <span className="font-bold text-amber-900 block mb-1">
                Ghi chú & Nhận xét của giáo viên:
              </span>
              <p className="text-slate-700 leading-relaxed italic">{student.teacherNotes}</p>
            </div>
          ) : (
            <div className="text-slate-400 italic bg-slate-50 p-3 rounded-xl border border-slate-200">
              Chưa có ghi chú riêng cho học sinh này.
            </div>
          )}

          {/* Assigned Tasks for this student */}
          <div>
            <h4 className="font-bold text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <BookOpen className="w-3.5 h-3.5 text-blue-600" />
              <span>Nhiệm vụ học tập đã giao ({studentTasks.length})</span>
            </h4>

            {studentTasks.length === 0 ? (
              <p className="text-slate-400 italic p-4 text-center border border-slate-200 rounded-xl bg-slate-50">
                Học sinh chưa được phân công nhiệm vụ học tập nào.
              </p>
            ) : (
              <div className="space-y-2.5">
                {studentTasks.map((task) => {
                  const taskProg = task.studentProgress?.[student.id] || {
                    percent: 0,
                    status: 'Đang thực hiện',
                  };

                  return (
                    <div
                      key={task.id}
                      className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-200 bg-white transition-all flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                            {task.subject}
                          </span>
                          <h5 className="font-bold text-slate-800 text-xs mt-1">{task.title}</h5>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              taskProg.percent === 100
                                ? 'bg-emerald-50 text-emerald-700'
                                : taskProg.status === 'Cần hỗ trợ'
                                ? 'bg-rose-50 text-rose-700'
                                : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {taskProg.status}
                          </span>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Hạn: {formatDateVN(task.dueDate)}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-4 pt-1">
                        <div className="flex-1">
                          <ProgressBar percent={taskProg.percent} size="sm" />
                        </div>
                        <button
                          onClick={() => {
                            onClose();
                            onUpdateTaskProgress(task, student);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
                        >
                          Cập nhật tiến độ
                        </button>
                      </div>

                      {taskProg.notes && (
                        <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded border border-slate-100 italic">
                          Nhận xét: {taskProg.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              onEditStudent(student);
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Chỉnh sửa hồ sơ này</span>
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
