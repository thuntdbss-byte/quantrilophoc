import React, { useState } from 'react';
import { AppData, Student, LearningTask, ClassRoom } from '../types';
import {
  computeDashboardStats,
  getClassAverageProgress,
  getStudentProgress,
  formatDateVN,
} from '../utils/calculations';
import { SimpleBarChart, DonutChart, ProgressBar } from '../components/Charts';
import {
  School,
  GraduationCap,
  Users,
  Target,
  TrendingUp,
  Sparkles,
  ArrowRight,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Plus,
  BookOpen,
} from 'lucide-react';

interface OverviewViewProps {
  data: AppData;
  onNavigateTab: (tab: 'classes' | 'students' | 'progress') => void;
  onSelectStudent: (student: Student) => void;
  onSelectClass: (classRoom: ClassRoom) => void;
  onAddNewTask: () => void;
  onAddNewStudent: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({
  data,
  onNavigateTab,
  onSelectStudent,
  onSelectClass,
  onAddNewTask,
  onAddNewStudent,
}) => {
  const [filterClassId, setFilterClassId] = useState<string>('all');

  const currentFilterClassId = filterClassId === 'all' ? undefined : filterClassId;
  const stats = computeDashboardStats(data, currentFilterClassId);

  // Compute overall percentage of completed tasks/students
  const completionPercentage =
    stats.totalStudents > 0
      ? Math.round((stats.completedCount / stats.totalStudents) * 100)
      : 84;

  // Chart 1: Student count per class
  const classStudentCountData = data.classes.map((cls) => {
    const count = data.students.filter((s) => s.classId === cls.id).length;
    return {
      label: cls.code,
      sublabel: cls.name.split('(')[0].trim(),
      value: count,
      color: '#00897b',
    };
  });

  // Chart 2: Student Status Donut
  const studentStatusData = [
    { label: 'Hoàn thành', value: stats.completedCount, color: '#10b981' },
    { label: 'Đang học', value: stats.inProgressCount, color: '#0284c7' },
    { label: 'Cần hỗ trợ', value: stats.needSupportCount, color: '#f43f5e' },
  ];

  // Chart 3: Class Progress Data
  const classProgressData = data.classes.map((cls) => {
    const avg = getClassAverageProgress(cls.id, data.students, data.tasks);
    return {
      label: cls.code,
      sublabel: cls.name.split('(')[0].trim(),
      value: avg ?? 0,
      color: avg && avg >= 80 ? '#10b981' : avg && avg >= 50 ? '#00897b' : '#f59e0b',
    };
  });

  // Students needing support
  const studentsNeedingSupport = data.students.filter((s) => {
    if (currentFilterClassId && s.classId !== currentFilterClassId) return false;
    return s.status === 'Cần hỗ trợ';
  });

  return (
    <div className="space-y-6">
      {/* 1. Welcome Banner matching user reference image */}
      <div className="bg-[#f0fbf8] border border-[#c1ebe2] rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#00897b] flex items-center justify-center text-white shrink-0 shadow-xs">
            <Sparkles className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-slate-900 leading-snug">
              Chào mừng cô {data.teacherProfile?.fullName || 'Nguyễn Thị Thu'} đến với Trợ Lý Quản Trị Lớp Học!
            </h2>
            <p className="text-xs text-slate-600 mt-0.5">
              Năm học 2025 - 2026 · {data.teacherProfile?.schoolName || 'Trường Dự bị Đại học Dân tộc Sầm Sơn'} (TP. Sầm Sơn, tỉnh Thanh Hóa).
            </p>
          </div>
        </div>

        <div className="bg-white/80 border border-[#b2e2d8] rounded-xl px-3.5 py-2 text-xs text-slate-500 shrink-0 text-center md:text-right">
          <span className="font-medium text-slate-600">* Dữ liệu mẫu minh họa có thể chỉnh sửa tự do</span>
        </div>
      </div>

      {/* 2. 4 Stat Cards matching the exact layout, colors, and typography from the screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: TỔNG SỐ LỚP HỌC */}
        <div
          onClick={() => onNavigateTab('classes')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-[#00897b]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TỔNG SỐ LỚP HỌC
            </span>
            <div className="w-11 h-11 rounded-2xl bg-[#e8f8f5] text-[#00897b] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-5 h-5 text-[#00897b]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {stats.totalClasses}
              </span>
              <span className="text-xs font-semibold text-slate-500">lớp</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Phụ trách các khối bồi dưỡng</p>
          </div>
        </div>

        {/* Card 2: TỔNG SỐ HỌC SINH */}
        <div
          onClick={() => onNavigateTab('students')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-blue-400/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TỔNG SỐ HỌC SINH
            </span>
            <div className="w-11 h-11 rounded-2xl bg-[#edf5ff] text-[#2563eb] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5 text-[#2563eb]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {stats.totalStudents}
              </span>
              <span className="text-xs font-semibold text-slate-500">học sinh</span>
            </div>
            <p className="text-xs text-slate-500 mt-1">Đã lập hồ sơ theo dõi</p>
          </div>
        </div>

        {/* Card 3: ĐANG THEO DÕI TIẾN ĐỘ */}
        <div
          onClick={() => onNavigateTab('progress')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-amber-400/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              ĐANG THEO DÕI TIẾN ĐỘ
            </span>
            <div className="w-11 h-11 rounded-2xl bg-[#fef7ee] text-[#d97706] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Target className="w-5 h-5 text-[#d97706]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900 tabular-nums">
                {stats.totalStudents}
              </span>
              <span className="text-xs font-semibold text-slate-500">/ {stats.totalStudents} em</span>
            </div>
            <p className="text-xs text-rose-600 font-semibold mt-1">
              {stats.needSupportCount} em cần hỗ trợ thêm
            </p>
          </div>
        </div>

        {/* Card 4: TỶ LỆ HOÀN THÀNH MỤC TIÊU */}
        <div
          onClick={() => onNavigateTab('progress')}
          className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs hover:border-[#00897b]/50 transition-all cursor-pointer group flex flex-col justify-between"
        >
          <div className="flex items-start justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              TỶ LỆ HOÀN THÀNH MỤC TIÊU
            </span>
            <div className="w-11 h-11 rounded-2xl bg-[#e8f8f5] text-[#00897b] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <TrendingUp className="w-5 h-5 text-[#00897b]" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-[#00897b] tabular-nums">
                {completionPercentage}%
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {stats.completedCount} / {stats.totalStudents} học sinh đạt chuẩn
            </p>
          </div>
        </div>
      </div>

      {/* 3. Toolbar: Filter and Quick Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs text-slate-500 font-medium">Lọc dữ liệu bảng điều khiển:</span>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="text-xs font-bold text-[#0f766e] bg-[#e6f7f4] border border-[#b2e2d8] rounded-lg px-2.5 py-1 focus:outline-none cursor-pointer"
          >
            <option value="all">Tất cả lớp học ({data.classes.length} lớp)</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code} - {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onAddNewStudent}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm học sinh</span>
          </button>
          <button
            onClick={onAddNewTask}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#00897b] hover:bg-[#00796b] rounded-xl transition-colors shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Giao nhiệm vụ</span>
          </button>
        </div>
      </div>

      {/* 4. 3 Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <SimpleBarChart
            data={classStudentCountData}
            title="Sĩ số học sinh theo từng lớp"
            unit="học sinh"
            maxValue={Math.max(...classStudentCountData.map((d) => d.value), 6) + 2}
          />
        </div>

        <div className="lg:col-span-1">
          <DonutChart
            data={studentStatusData}
            title="Tỷ lệ trạng thái học tập"
            subTitle="Phân bổ học sinh theo mức độ hoàn thành"
            totalLabel="Tổng học sinh"
          />
        </div>

        <div className="lg:col-span-1">
          <SimpleBarChart
            data={classProgressData}
            title="Tiến độ học tập trung bình theo lớp"
            unit="%"
            maxValue={100}
          />
        </div>
      </div>

      {/* 5. Bottom Section: Danh sách lớp học & Học sinh cần hỗ trợ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Classes quick cards */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-[#00897b]" />
              <h3 className="text-sm font-bold text-slate-800">Danh sách các lớp quản trị</h3>
            </div>
            <button
              onClick={() => onNavigateTab('classes')}
              className="text-xs text-[#00897b] font-bold hover:underline flex items-center gap-1"
            >
              <span>Xem chi tiết lớp</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1">
            {data.classes.map((cls) => {
              const studentCount = data.students.filter((s) => s.classId === cls.id).length;
              const avgProgress = getClassAverageProgress(cls.id, data.students, data.tasks);

              return (
                <div
                  key={cls.id}
                  onClick={() => onSelectClass(cls)}
                  className="p-3.5 rounded-xl border border-slate-100 hover:border-[#b2e2d8] hover:bg-[#f0fbf8]/50 transition-all cursor-pointer flex flex-col gap-2"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-[#0f766e] bg-[#e6f7f4] px-2 py-0.5 rounded border border-[#c1ebe2]">
                        {cls.code}
                      </span>
                      <h4 className="text-sm font-bold text-slate-800 mt-1">{cls.name}</h4>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-bold text-slate-700 tabular-nums">
                        {studentCount} học sinh
                      </span>
                      <p className="text-[11px] text-slate-400">Năm học {cls.academicYear}</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
                      <span>Tiến độ hoàn thành trung bình</span>
                      <span className="font-bold text-slate-700 tabular-nums">
                        {avgProgress !== null ? `${avgProgress}%` : 'Chưa có dữ liệu'}
                      </span>
                    </div>
                    <ProgressBar percent={avgProgress} size="sm" showText={false} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Attention Students list */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Học sinh cần giáo viên hỗ trợ ({studentsNeedingSupport.length})
              </h3>
            </div>
            <button
              onClick={() => onNavigateTab('students')}
              className="text-xs text-[#00897b] font-bold hover:underline flex items-center gap-1"
            >
              <span>Xem hồ sơ học sinh</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[300px]">
            {studentsNeedingSupport.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 text-[#10b981] mb-2" />
                <p className="text-xs font-medium text-slate-600">
                  Tất cả học sinh đều đang hoàn thành tốt nhiệm vụ học tập!
                </p>
              </div>
            ) : (
              studentsNeedingSupport.map((student) => {
                const cls = data.classes.find((c) => c.id === student.classId);
                const progress = getStudentProgress(student.id, data.tasks);

                return (
                  <div
                    key={student.id}
                    onClick={() => onSelectStudent(student)}
                    className="p-3.5 rounded-xl border border-rose-100 bg-rose-50/20 hover:bg-rose-50/40 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-semibold text-slate-500">
                          {student.studentCode} · {cls?.code || 'Chưa phân lớp'}
                        </span>
                        <h4 className="text-sm font-bold text-slate-800">{student.fullName}</h4>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                          Cần hỗ trợ
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5 tabular-nums">
                          Tiến độ: {progress !== null ? `${progress}%` : 'Chưa có dữ liệu'}
                        </p>
                      </div>
                    </div>
                    {student.teacherNotes && (
                      <p className="text-xs text-slate-600 mt-2 line-clamp-2 bg-white/80 p-2 rounded-lg border border-rose-100/60 italic">
                        "{student.teacherNotes}"
                      </p>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
