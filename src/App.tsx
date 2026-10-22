import React, { useState, useEffect } from 'react';
import { AppData, ActiveTab, ClassRoom, Student, LearningTask } from './types';
import { loadAppData, saveAppData, resetAppData } from './utils/storage';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewView } from './views/OverviewView';
import { ClassesView, ClassDetailModal } from './views/ClassesView';
import { StudentsView, StudentDetailModal } from './views/StudentsView';
import { ProgressView } from './views/ProgressView';
import {
  ClassModal,
  StudentModal,
  TransferClassModal,
  TaskModal,
  UpdateProgressModal,
  ConfirmDeleteModal,
} from './components/Modals';
import { BackupModal } from './components/BackupModal';
import { GoogleWorkspaceModal } from './components/GoogleWorkspaceModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { initAuth, subscribeToAuth } from './services/googleAuth';
import { User } from 'firebase/auth';

export default function App() {
  const [data, setData] = useState<AppData>(() => loadAppData());
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');

  // Google Workspace integration state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleModalInitialTab, setGoogleModalInitialTab] = useState<'sheets' | 'drive'>('sheets');
  const [googleUser, setGoogleUser] = useState<User | null>(null);
  const [googleToken, setGoogleToken] = useState<string | null>(null);

  useEffect(() => {
    const unsubInit = initAuth();
    const unsubSub = subscribeToAuth((user, token) => {
      setGoogleUser(user);
      setGoogleToken(token);
    });
    return () => {
      unsubInit();
      unsubSub();
    };
  }, []);

  const handleOpenGoogleWorkspace = (tab: 'sheets' | 'drive' = 'sheets') => {
    setGoogleModalInitialTab(tab);
    setIsGoogleModalOpen(true);
  };

  // Toast state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now().toString() + Math.random().toString().slice(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync state to localStorage whenever data changes
  const updateData = (updater: (prev: AppData) => AppData) => {
    setData((prev) => {
      const next = updater(prev);
      saveAppData(next);
      return next;
    });
  };

  // Modals state
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassRoom | null>(null);

  const [isClassDetailOpen, setIsClassDetailOpen] = useState(false);
  const [detailClass, setDetailClass] = useState<ClassRoom | null>(null);

  const [isStudentModalOpen, setIsStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [targetStudentClassId, setTargetStudentClassId] = useState<string | null>(null);

  const [isStudentDetailOpen, setIsStudentDetailOpen] = useState(false);
  const [detailStudent, setDetailStudent] = useState<Student | null>(null);

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStudent, setTransferStudent] = useState<Student | null>(null);

  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<LearningTask | null>(null);

  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [progressTargetTask, setProgressTargetTask] = useState<LearningTask | null>(null);
  const [progressTargetStudent, setProgressTargetStudent] = useState<Student | null>(null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);

  // Generic confirmation modal state
  const [confirmDeleteState, setConfirmDeleteState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    warningNote?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // ==================== CLASS ACTIONS ====================
  const handleOpenAddClass = () => {
    setEditingClass(null);
    setIsClassModalOpen(true);
  };

  const handleOpenEditClass = (cls: ClassRoom) => {
    setEditingClass(cls);
    setIsClassModalOpen(true);
  };

  const handleSaveClass = (classData: Omit<ClassRoom, 'id' | 'createdAt'> & { id?: string }) => {
    if (classData.id) {
      // Edit
      updateData((prev) => ({
        ...prev,
        classes: prev.classes.map((c) =>
          c.id === classData.id ? { ...c, ...classData } : c
        ),
      }));
      addToast(`Đã cập nhật thông tin lớp "${classData.name}"!`);
    } else {
      // Add
      const newClass: ClassRoom = {
        ...classData,
        id: `cls-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updateData((prev) => ({
        ...prev,
        classes: [...prev.classes, newClass],
      }));
      addToast(`Đã thêm lớp học mới: "${newClass.code} - ${newClass.name}"!`);
    }
  };

  const handleDeleteClass = (cls: ClassRoom) => {
    const studentCount = data.students.filter((s) => s.classId === cls.id).length;
    setConfirmDeleteState({
      isOpen: true,
      title: `Xác nhận xóa lớp ${cls.code}?`,
      message: `Bạn có chắc chắn muốn xóa lớp học "${cls.name}" không?`,
      warningNote:
        studentCount > 0
          ? `LƯU Ý QUAN TRỌNG: Lớp hiện có ${studentCount} học sinh. Các học sinh sẽ được chuyển sang trạng thái "Chưa phân lớp" để bảo toàn toàn bộ hồ sơ và tiến độ học tập.`
          : undefined,
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          // Unlink students from this class
          students: prev.students.map((s) => (s.classId === cls.id ? { ...s, classId: '' } : s)),
          // Remove class
          classes: prev.classes.filter((c) => c.id !== cls.id),
        }));
        addToast(`Đã xóa lớp "${cls.code}" thành công.`);
      },
    });
  };

  // ==================== STUDENT ACTIONS ====================
  const handleOpenAddStudent = (preselectedClassId?: string) => {
    setEditingStudent(null);
    setTargetStudentClassId(preselectedClassId || null);
    setIsStudentModalOpen(true);
  };

  const handleOpenEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsStudentModalOpen(true);
  };

  const handleSaveStudent = (
    studentData: Omit<Student, 'id' | 'createdAt'> & { id?: string }
  ) => {
    if (studentData.id) {
      // Edit
      updateData((prev) => ({
        ...prev,
        students: prev.students.map((s) =>
          s.id === studentData.id ? { ...s, ...studentData } : s
        ),
      }));
      addToast(`Đã cập nhật hồ sơ học sinh "${studentData.fullName}"!`);
    } else {
      // Add
      const newStudent: Student = {
        ...studentData,
        classId: targetStudentClassId || studentData.classId,
        id: `stu-${Date.now()}`,
        createdAt: new Date().toISOString(),
      };
      updateData((prev) => ({
        ...prev,
        students: [...prev.students, newStudent],
      }));
      addToast(`Đã thêm học sinh mới: ${newStudent.fullName} (${newStudent.studentCode})!`);
      setTargetStudentClassId(null);
    }
  };

  const handleDeleteStudent = (student: Student) => {
    setConfirmDeleteState({
      isOpen: true,
      title: `Xác nhận xóa học sinh?`,
      message: `Bạn có chắc chắn muốn xóa học sinh "${student.fullName}" (Mã: ${student.studentCode}) khỏi hệ thống không?`,
      warningNote: 'Dữ liệu tiến độ học tập của học sinh này trong các nhiệm vụ cũng sẽ được dọn dẹp.',
      onConfirm: () => {
        updateData((prev) => {
          // Remove student from tasks progress
          const updatedTasks = prev.tasks.map((task) => {
            const newProgress = { ...task.studentProgress };
            delete newProgress[student.id];
            const newAssigned = task.assignedStudentIds.filter((id) => id !== student.id);
            return {
              ...task,
              studentProgress: newProgress,
              assignedStudentIds: newAssigned,
            };
          });

          return {
            ...prev,
            students: prev.students.filter((s) => s.id !== student.id),
            tasks: updatedTasks,
          };
        });
        addToast(`Đã xóa hồ sơ học sinh ${student.fullName}.`);
      },
    });
  };

  const handleTransferStudent = (studentId: string, targetClassId: string) => {
    const student = data.students.find((s) => s.id === studentId);
    const targetClass = data.classes.find((c) => c.id === targetClassId);

    updateData((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.id === studentId ? { ...s, classId: targetClassId } : s
      ),
    }));

    addToast(
      `Đã chuyển học sinh ${student?.fullName} sang lớp ${targetClass?.code || 'mới'}!`,
      'success'
    );
  };

  const handleBatchImportStudents = (
    studentsToAdd: Student[],
    studentsToUpdate: Student[],
    stats: { addedCount: number; updatedCount: number; skippedCount: number }
  ) => {
    updateData((prev) => {
      let nextStudents = [...prev.students];

      // Update existing students if overwrite was selected
      if (studentsToUpdate.length > 0) {
        const updateMap = new Map(studentsToUpdate.map((s) => [s.id, s]));
        nextStudents = nextStudents.map((s) => updateMap.get(s.id) || s);
      }

      // Append new students
      if (studentsToAdd.length > 0) {
        nextStudents = [...nextStudents, ...studentsToAdd];
      }

      return {
        ...prev,
        students: nextStudents,
      };
    });

    const summaryParts: string[] = [];
    if (stats.addedCount > 0) summaryParts.push(`thêm ${stats.addedCount} học sinh mới`);
    if (stats.updatedCount > 0) summaryParts.push(`cập nhật ${stats.updatedCount} hồ sơ`);
    if (stats.skippedCount > 0) summaryParts.push(`bỏ qua ${stats.skippedCount} mã trùng`);

    addToast(
      summaryParts.length > 0
        ? `Nhập file Excel thành công: Đã ${summaryParts.join(', ')}!`
        : 'Đã hoàn tất xử lý file Excel.',
      'success'
    );
  };

  // ==================== TASK ACTIONS ====================
  const handleOpenAddTask = (preselectedClassId?: string) => {
    setEditingTask(null);
    if (preselectedClassId) {
      // Find class and set
      const found = data.classes.find((c) => c.id === preselectedClassId);
      if (found) {
        setEditingTask({
          id: '',
          title: '',
          subject: 'Ngữ văn',
          description: '',
          classId: found.id,
          assignedStudentIds: [],
          assignedDate: new Date().toISOString().slice(0, 10),
          dueDate: '',
          studentProgress: {},
          createdAt: '',
        });
      }
    }
    setIsTaskModalOpen(true);
  };

  const handleOpenEditTask = (task: LearningTask) => {
    setEditingTask(task);
    setIsTaskModalOpen(true);
  };

  const handleSaveTask = (
    taskData: Omit<LearningTask, 'id' | 'createdAt' | 'studentProgress'> & { id?: string }
  ) => {
    if (taskData.id) {
      // Edit
      updateData((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskData.id ? { ...t, ...taskData } : t
        ),
      }));
      addToast(`Đã cập nhật nhiệm vụ "${taskData.title}"!`);
    } else {
      // Add
      // Populate initial progress for assigned students
      const targetIds =
        taskData.assignedStudentIds.length > 0
          ? taskData.assignedStudentIds
          : data.students.filter((s) => s.classId === taskData.classId).map((s) => s.id);

      const initialProgress: Record<string, any> = {};
      targetIds.forEach((sid) => {
        initialProgress[sid] = {
          percent: 0,
          status: 'Đang thực hiện',
        };
      });

      const newTask: LearningTask = {
        ...taskData,
        id: `task-${Date.now()}`,
        studentProgress: initialProgress,
        createdAt: new Date().toISOString(),
      };

      updateData((prev) => ({
        ...prev,
        tasks: [...prev.tasks, newTask],
      }));
      addToast(`Đã giao nhiệm vụ mới: "${newTask.title}"!`);
    }
  };

  const handleDeleteTask = (task: LearningTask) => {
    setConfirmDeleteState({
      isOpen: true,
      title: 'Xác nhận xóa nhiệm vụ?',
      message: `Bạn có chắc muốn xóa nhiệm vụ "${task.title}" không? Dữ liệu tiến độ liên quan sẽ bị xóa vĩnh viễn.`,
      onConfirm: () => {
        updateData((prev) => ({
          ...prev,
          tasks: prev.tasks.filter((t) => t.id !== task.id),
        }));
        addToast(`Đã xóa nhiệm vụ "${task.title}".`);
      },
    });
  };

  const handleSaveStudentTaskProgress = (
    taskId: string,
    studentId: string,
    percent: number,
    status: 'Đang thực hiện' | 'Hoàn thành' | 'Cần hỗ trợ',
    notes: string,
    completedDate?: string
  ) => {
    updateData((prev) => {
      const updatedTasks = prev.tasks.map((t) => {
        if (t.id !== taskId) return t;
        const currentProg = t.studentProgress?.[studentId] || {};
        return {
          ...t,
          studentProgress: {
            ...t.studentProgress,
            [studentId]: {
              ...currentProg,
              percent,
              status,
              notes,
              completedDate,
            },
          },
        };
      });

      // Also update student status if marked 'Cần hỗ trợ'
      let updatedStudents = prev.students;
      if (status === 'Cần hỗ trợ') {
        updatedStudents = prev.students.map((s) =>
          s.id === studentId ? { ...s, status: 'Cần hỗ trợ' } : s
        );
      }

      return {
        ...prev,
        tasks: updatedTasks,
        students: updatedStudents,
      };
    });

    addToast(`Đã lưu tiến độ học tập (${percent}%)!`);
  };

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-800 font-sans">
      {/* Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isOpen={sidebarOpen}
        onCloseMobile={() => setSidebarOpen(false)}
        classCount={data.classes.length}
        studentCount={data.students.length}
        taskCount={data.tasks.length}
        onOpenBackupModal={() => setIsBackupModalOpen(true)}
        onOpenGoogleWorkspace={handleOpenGoogleWorkspace}
        isGoogleConnected={Boolean(googleToken)}
        teacherName={data.teacherProfile?.fullName || 'Nguyễn Thị Thu'}
        schoolName={data.teacherProfile?.schoolName || 'Dự bị Đại học Dân tộc Sầm Sơn'}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Header */}
        <Header
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          searchQuery={globalSearch}
          onSearchChange={(q) => {
            setGlobalSearch(q);
            // If typing in global search and not on a search-friendly tab, switch to students
            if (q.trim() && activeTab === 'overview') {
              setActiveTab('students');
            }
          }}
          onOpenBackupModal={() => setIsBackupModalOpen(true)}
          onOpenGoogleWorkspace={handleOpenGoogleWorkspace}
          isGoogleConnected={Boolean(googleToken)}
          googleUserEmail={googleUser?.email}
          teacherName={data.teacherProfile?.fullName || 'Nguyễn Thị Thu'}
          schoolName={data.teacherProfile?.schoolName || 'Dự bị Đại học Dân tộc Sầm Sơn'}
          pendingNotificationCount={
            data.students.filter((s) => s.status === 'Cần hỗ trợ').length + 1
          }
        />

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'overview' && (
            <OverviewView
              data={data}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onSelectStudent={(stu) => {
                setDetailStudent(stu);
                setIsStudentDetailOpen(true);
              }}
              onSelectClass={(cls) => {
                setDetailClass(cls);
                setIsClassDetailOpen(true);
              }}
              onAddNewTask={() => handleOpenAddTask()}
              onAddNewStudent={() => handleOpenAddStudent()}
            />
          )}

          {activeTab === 'classes' && (
            <ClassesView
              data={data}
              onAddClass={handleOpenAddClass}
              onEditClass={handleOpenEditClass}
              onDeleteClass={handleDeleteClass}
              onViewClassDetail={(cls) => {
                setDetailClass(cls);
                setIsClassDetailOpen(true);
              }}
              onAddStudentToClass={(classId) => handleOpenAddStudent(classId)}
              onAssignTaskToClass={(classId) => handleOpenAddTask(classId)}
            />
          )}

          {activeTab === 'students' && (
            <StudentsView
              data={data}
              onAddStudent={() => handleOpenAddStudent()}
              onEditStudent={handleOpenEditStudent}
              onDeleteStudent={handleDeleteStudent}
              onSelectStudent={(stu) => {
                setDetailStudent(stu);
                setIsStudentDetailOpen(true);
              }}
              onTransferClass={(stu) => {
                setTransferStudent(stu);
                setIsTransferModalOpen(true);
              }}
              onImportStudents={handleBatchImportStudents}
              onOpenGoogleWorkspace={handleOpenGoogleWorkspace}
            />
          )}

          {activeTab === 'progress' && (
            <ProgressView
              data={data}
              onAddTask={() => handleOpenAddTask()}
              onEditTask={handleOpenEditTask}
              onDeleteTask={handleDeleteTask}
              onUpdateStudentProgress={(task, student) => {
                setProgressTargetTask(task);
                setProgressTargetStudent(student);
                setIsProgressModalOpen(true);
              }}
              onSelectStudent={(stu) => {
                setDetailStudent(stu);
                setIsStudentDetailOpen(true);
              }}
            />
          )}
        </main>
      </div>

      {/* ==================== ALL SYSTEM MODALS ==================== */}
      {/* 1. Class Add / Edit Modal */}
      <ClassModal
        isOpen={isClassModalOpen}
        onClose={() => setIsClassModalOpen(false)}
        onSave={handleSaveClass}
        initialData={editingClass}
        existingCodes={data.classes.map((c) => c.code)}
      />

      {/* 2. Class Detail View Modal */}
      <ClassDetailModal
        isOpen={isClassDetailOpen}
        onClose={() => setIsClassDetailOpen(false)}
        cls={detailClass}
        students={data.students}
        data={data}
        onSelectStudent={(stu) => {
          setDetailStudent(stu);
          setIsStudentDetailOpen(true);
        }}
        onAddStudent={(classId) => handleOpenAddStudent(classId)}
        onAssignTask={(classId) => handleOpenAddTask(classId)}
      />

      {/* 3. Student Add / Edit Modal */}
      <StudentModal
        isOpen={isStudentModalOpen}
        onClose={() => setIsStudentModalOpen(false)}
        onSave={handleSaveStudent}
        initialData={editingStudent}
        classes={data.classes}
        existingStudentCodes={data.students.map((s) => s.studentCode)}
      />

      {/* 4. Student Detail View Modal */}
      <StudentDetailModal
        isOpen={isStudentDetailOpen}
        onClose={() => setIsStudentDetailOpen(false)}
        student={detailStudent}
        classes={data.classes}
        tasks={data.tasks}
        onEditStudent={handleOpenEditStudent}
        onUpdateTaskProgress={(task, stu) => {
          setProgressTargetTask(task);
          setProgressTargetStudent(stu);
          setIsProgressModalOpen(true);
        }}
      />

      {/* 5. Transfer Student Class Modal */}
      <TransferClassModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onTransfer={handleTransferStudent}
        student={transferStudent}
        classes={data.classes}
      />

      {/* 6. Learning Task Add / Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialData={editingTask}
        classes={data.classes}
        students={data.students}
      />

      {/* 7. Update Student Progress Modal */}
      <UpdateProgressModal
        isOpen={isProgressModalOpen}
        onClose={() => setIsProgressModalOpen(false)}
        task={progressTargetTask}
        student={progressTargetStudent}
        onSaveProgress={handleSaveStudentTaskProgress}
      />

      {/* 8. Generic Confirmation / Delete Modal */}
      <ConfirmDeleteModal
        isOpen={confirmDeleteState.isOpen}
        onClose={() => setConfirmDeleteState((p) => ({ ...p, isOpen: false }))}
        onConfirm={confirmDeleteState.onConfirm}
        title={confirmDeleteState.title}
        message={confirmDeleteState.message}
        warningNote={confirmDeleteState.warningNote}
      />

      {/* 9. Backup & Restore Data Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        data={data}
        onDataLoaded={(newData) => setData(newData)}
        onShowToast={addToast}
        onOpenGoogleWorkspace={handleOpenGoogleWorkspace}
        isGoogleConnected={Boolean(googleToken)}
      />

      {/* 10. Google Workspace Modal (Google Sheets & Google Drive) */}
      <GoogleWorkspaceModal
        isOpen={isGoogleModalOpen}
        onClose={() => setIsGoogleModalOpen(false)}
        data={data}
        onDataLoaded={(newData) => setData(newData)}
        onShowToast={addToast}
        initialTab={googleModalInitialTab}
      />

      {/* Global Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}
