import React, { useState, useMemo } from 'react';
import { AppData, LearningTask, Student, ClassRoom } from '../types';
import {
  isTaskOverdue,
  formatDateVN,
  getStudentProgress,
  getClassAverageProgress,
} from '../utils/calculations';
import { ProgressBar, SimpleBarChart, DonutChart } from '../components/Charts';
import { exportTasksCsv } from '../utils/storage';
import {
  TrendingUp,
  Plus,
  Search,
  Filter,
  Download,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Trash2,
  Sliders,
  ChevronDown,
  ChevronUp,
  BookOpen,
  UserCheck,
  AlertCircle,
} from 'lucide-react';

interface ProgressViewProps {
  data: AppData;
  onAddTask: () => void;
  onEditTask: (task: LearningTask) => void;
  onDeleteTask: (task: LearningTask) => void;
  onUpdateStudentProgress: (task: LearningTask, student: Student) => void;
  onSelectStudent: (student: Student) => void;
}

export const ProgressView: React.FC<ProgressViewProps> = ({
  data,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onUpdateStudentProgress,
  onSelectStudent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterClassId, setFilterClassId] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Quick lookup maps
  const classMap = useMemo(() => new Map(data.classes.map((c) => [c.id, c])), [data.classes]);
  const studentMap = useMemo(() => new Map(data.students.map((s) => [s.id, s])), [data.students]);

  // Unique subjects
  const subjects = useMemo(() => {
    return Array.from(new Set(data.tasks.map((t) => t.subject)));
  }, [data.tasks]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return data.tasks.filter((task) => {
      const matchesSearch =
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        task.description.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesClass = filterClassId === 'all' || task.classId === filterClassId;
      const matchesSubject = filterSubject === 'all' || task.subject === filterSubject;

      // Check overdue across this task
      const isAnyOverdue = Object.entries(task.studentProgress || {}).some(([_, prog]) =>
        isTaskOverdue(task.dueDate, prog.percent)
      );

      if (onlyOverdue && !isAnyOverdue) return false;

      if (filterStatus !== 'all') {
        const hasStatus = Object.values(task.studentProgress || {}).some(
          (p) => p.status === filterStatus
        );
        if (!hasStatus) return false;
      }

      return matchesSearch && matchesClass && matchesSubject;
    });
  }, [data.tasks, searchQuery, filterClassId, filterSubject, filterStatus, onlyOverdue]);

  // Aggregate stats for Progress charts
  // 1. Completion distribution across all student-task assignments
  const taskProgressStats = useMemo(() => {
    let completed = 0;
    let inProgress = 0;
    let needSupport = 0;
    let overdueCount = 0;

    data.tasks.forEach((task) => {
      Object.values(task.studentProgress || {}).forEach((prog) => {
        if (prog.percent === 100) {
          completed++;
        } else if (prog.status === 'Cần hỗ trợ') {
          needSupport++;
        } else {
          inProgress++;
        }
        if (isTaskOverdue(task.dueDate, prog.percent)) {
          overdueCount++;
        }
      });
    });

    return { completed, inProgress, needSupport, overdueCount };
  }, [data.tasks]);

  // 2. Bar chart: Class Average Progress
  const classProgressChartData = data.classes.map((cls) => {
    const avg = getClassAverageProgress(cls.id, data.students, data.tasks);
    return {
      label: cls.code,
      sublabel: cls.name.split('(')[0].trim(),
      value: avg ?? 0,
      color: avg && avg >= 80 ? '#16A34A' : avg && avg >= 50 ? '#2563EB' : '#F59E0B',
    };
  });

  // 3. Student Progress Comparison (top 8 or sample)
  const studentComparisonChartData = data.students.slice(0, 8).map((stu) => {
    const prog = getStudentProgress(stu.id, data.tasks) ?? 0;
    return {
      label: stu.fullName.split(' ').slice(-2).join(' '),
      sublabel: stu.studentCode,
      value: prog,
      color: prog >= 90 ? '#16A34A' : prog >= 60 ? '#2563EB' : '#E11D48',
    };
  });

  const handleExportCsv = () => {
    exportTasksCsv(filteredTasks, data.classes, data.students);
  };

  const toggleExpandTask = (taskId: string) => {
    setExpandedTaskId(expandedTaskId === taskId ? null : taskId);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#00897b]" />
            <h2 className="text-xl font-bold text-slate-900">Theo dõi tiến độ học tập</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Đánh giá mức độ hoàn thành nhiệm vụ, phát hiện quá hạn và phân công bài tập rèn luyện
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors shrink-0"
            title="Xuất báo cáo tiến độ chi tiết ra file CSV UTF-8"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Xuất báo cáo tiến độ</span>
          </button>

          <button
            onClick={onAddTask}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#00897b] hover:bg-[#00796b] rounded-xl transition-colors shadow-xs shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo nhiệm vụ mới</span>
          </button>
        </div>
      </div>

      {/* Progress Metric & Charts Strip */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart 1: Donut tỷ lệ hoàn thành nhiệm vụ */}
        <div className="lg:col-span-1">
          <DonutChart
            data={[
              { label: 'Hoàn thành (100%)', value: taskProgressStats.completed, color: '#16A34A' },
              { label: 'Đang thực hiện', value: taskProgressStats.inProgress, color: '#2563EB' },
              { label: 'Cần hỗ trợ', value: taskProgressStats.needSupport, color: '#E11D48' },
            ]}
            title="Tỷ lệ hoàn thành nhiệm vụ"
            subTitle="Tổng hợp lượt nộp bài của học sinh"
            totalLabel="Lượt nhiệm vụ"
          />
        </div>

        {/* Chart 2: Tiến độ trung bình theo từng lớp */}
        <div className="lg:col-span-1">
          <SimpleBarChart
            data={classProgressChartData}
            title="Tiến độ trung bình theo lớp"
            unit="%"
            maxValue={100}
          />
        </div>

        {/* Chart 3: So sánh tiến độ của học sinh */}
        <div className="lg:col-span-1">
          <SimpleBarChart
            data={studentComparisonChartData}
            title="So sánh tiến độ học sinh tiêu biểu"
            unit="%"
            maxValue={100}
          />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 bg-white p-4 rounded-xl border border-slate-200">
        {/* Search */}
        <div className="relative lg:col-span-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo tên nhiệm vụ, nội dung..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Filter by Class */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-slate-500 shrink-0">Lớp:</span>
          <select
            value={filterClassId}
            onChange={(e) => setFilterClassId(e.target.value)}
            className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer w-full truncate"
          >
            <option value="all">Tất cả lớp</option>
            {data.classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.code}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Subject */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-slate-500 shrink-0">Môn học:</span>
          <select
            value={filterSubject}
            onChange={(e) => setFilterSubject(e.target.value)}
            className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer w-full"
          >
            <option value="all">Tất cả môn</option>
            {subjects.map((sub) => (
              <option key={sub} value={sub}>
                {sub}
              </option>
            ))}
          </select>
        </div>

        {/* Filter by Status */}
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs">
          <span className="text-slate-500 shrink-0">Trạng thái:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="bg-transparent font-semibold text-slate-700 focus:outline-none cursor-pointer w-full"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="Hoàn thành">Hoàn thành</option>
            <option value="Đang thực hiện">Đang thực hiện</option>
            <option value="Cần hỗ trợ">Cần hỗ trợ</option>
          </select>
        </div>

        {/* Overdue Checkbox */}
        <label className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            checked={onlyOverdue}
            onChange={(e) => setOnlyOverdue(e.target.checked)}
            className="rounded text-rose-600 focus:ring-rose-500"
          />
          <span className="font-medium text-rose-700">Chỉ nhiệm vụ quá hạn</span>
        </label>
      </div>

      {/* Task List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 border border-slate-200 text-center">
            <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-semibold text-slate-700">
              Không có nhiệm vụ học tập nào phù hợp
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Thử xóa bớt bộ lọc hoặc bấm tạo nhiệm vụ mới để giao bài tập cho học sinh.
            </p>
            <button
              onClick={onAddTask}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Giao nhiệm vụ ngay</span>
            </button>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const cls = classMap.get(task.classId);
            const isExpanded = expandedTaskId === task.id;

            // Student IDs assigned to this task
            const targetStudentIds =
              task.assignedStudentIds.length > 0
                ? task.assignedStudentIds
                : data.students.filter((s) => s.classId === task.classId).map((s) => s.id);

            // Calculate overall progress of this task
            let totalPct = 0;
            let completedInTask = 0;
            let needSupportInTask = 0;
            let overdueInTask = 0;

            targetStudentIds.forEach((sid) => {
              const prog = task.studentProgress?.[sid] || { percent: 0, status: 'Đang thực hiện' };
              totalPct += prog.percent;
              if (prog.percent === 100) completedInTask++;
              if (prog.status === 'Cần hỗ trợ') needSupportInTask++;
              if (isTaskOverdue(task.dueDate, prog.percent)) overdueInTask++;
            });

            const avgTaskProgress =
              targetStudentIds.length > 0 ? Math.round(totalPct / targetStudentIds.length) : 0;

            return (
              <div
                key={task.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-blue-300 transition-all overflow-hidden"
              >
                {/* Task Summary Header */}
                <div className="p-5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded border border-blue-100 uppercase">
                          {cls?.code || 'Chung'}
                        </span>
                        <span className="text-xs font-semibold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded border border-indigo-100">
                          {task.subject}
                        </span>
                        {overdueInTask > 0 && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 animate-pulse">
                            <AlertCircle className="w-3 h-3 text-rose-600" />
                            <span>{overdueInTask} học sinh quá hạn</span>
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900">{task.title}</h3>

                      {task.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                          {task.description}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>Giao: {formatDateVN(task.assignedDate)}</span>
                        </div>
                        {task.dueDate && (
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span>Hạn: {formatDateVN(task.dueDate)}</span>
                          </div>
                        )}
                        <div>
                          <span>Phân công: </span>
                          <span className="font-semibold text-slate-700 tabular-nums">
                            {targetStudentIds.length} học sinh
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Progress Bar & Actions */}
                    <div className="w-full lg:w-72 shrink-0 flex flex-col justify-between gap-3 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100">
                      <div>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500 font-medium">Tiến độ chung nhiệm vụ:</span>
                          <span className="font-bold text-slate-800 tabular-nums">
                            {avgTaskProgress}% ({completedInTask}/{targetStudentIds.length})
                          </span>
                        </div>
                        <ProgressBar percent={avgTaskProgress} size="md" showText={false} />
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <button
                          onClick={() => toggleExpandTask(task.id)}
                          className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50/70 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <span>{isExpanded ? 'Thu gọn danh sách' : 'Chi tiết học sinh'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => onEditTask(task)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors"
                            title="Sửa nhiệm vụ"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteTask(task)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa nhiệm vụ"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Expanded Student Progress Roster */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/60 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                        Danh sách tiến độ từng học sinh ({targetStudentIds.length})
                      </h4>
                      <span className="text-[11px] text-slate-400">
                        Bấm "Cập nhật" để điều chỉnh % hoặc trạng thái
                      </span>
                    </div>

                    <div className="space-y-2">
                      {targetStudentIds.map((sid) => {
                        const student = studentMap.get(sid);
                        if (!student) return null;

                        const prog = task.studentProgress?.[sid] || {
                          percent: 0,
                          status: 'Đang thực hiện',
                        };
                        const isOverdue = isTaskOverdue(task.dueDate, prog.percent);

                        return (
                          <div
                            key={sid}
                            className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div className="flex items-center gap-3 min-w-[200px]">
                              <div
                                onClick={() => onSelectStudent(student)}
                                className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0 cursor-pointer hover:bg-blue-100 hover:text-blue-700"
                              >
                                {student.fullName.charAt(0)}
                              </div>
                              <div>
                                <span
                                  onClick={() => onSelectStudent(student)}
                                  className="font-bold text-slate-800 hover:text-blue-600 cursor-pointer"
                                >
                                  {student.fullName}
                                </span>
                                <span className="text-slate-400 text-[11px] ml-1.5">
                                  ({student.studentCode})
                                </span>
                              </div>
                            </div>

                            {/* Progress bar */}
                            <div className="flex-1 max-w-xs">
                              <ProgressBar percent={prog.percent} size="sm" />
                            </div>

                            {/* Status tag */}
                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  prog.percent === 100
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : prog.status === 'Cần hỗ trợ'
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-blue-50 text-blue-700 border-blue-200'
                                }`}
                              >
                                {prog.status}
                              </span>

                              {isOverdue && (
                                <span className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                                  Quá hạn
                                </span>
                              )}
                            </div>

                            {/* Teacher Note preview & Update button */}
                            <div className="flex items-center justify-end gap-2 shrink-0">
                              {prog.notes && (
                                <span
                                  className="text-[11px] text-slate-400 italic truncate max-w-[140px]"
                                  title={prog.notes}
                                >
                                  "{prog.notes}"
                                </span>
                              )}
                              <button
                                onClick={() => onUpdateStudentProgress(task, student)}
                                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-blue-600 hover:text-white hover:bg-blue-600 border border-blue-200 hover:border-blue-600 rounded-lg transition-colors"
                              >
                                <Sliders className="w-3 h-3" />
                                <span>Cập nhật</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
