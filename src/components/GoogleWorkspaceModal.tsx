import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { AppData, Student, ClassRoom, StudentStatus } from '../types';
import {
  googleSignIn,
  googleSignOut,
  getAccessToken,
  getCurrentUser,
  subscribeToAuth,
} from '../services/googleAuth';
import {
  createClassroomSpreadsheet,
  writeDataToSpreadsheet,
  readStudentsFromGoogleSheet,
  extractSpreadsheetId,
} from '../services/googleSheets';
import {
  saveBackupToDrive,
  listDriveBackups,
  downloadBackupFromDrive,
  deleteBackupFromDrive,
  listDriveSpreadsheets,
  DriveBackupItem,
} from '../services/googleDrive';
import { GoogleSignInButton } from './GoogleSignInButton';
import { formatDateVN } from '../utils/calculations';
import {
  FileSpreadsheet,
  HardDrive,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Download,
  ExternalLink,
  RefreshCw,
  Trash2,
  X,
  FileCheck,
  Cloud,
  LogOut,
  ArrowRight,
  ShieldCheck,
  Search,
} from 'lucide-react';

interface GoogleWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onDataLoaded: (newData: AppData) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  initialTab?: 'sheets' | 'drive';
}

export const GoogleWorkspaceModal: React.FC<GoogleWorkspaceModalProps> = ({
  isOpen,
  onClose,
  data,
  onDataLoaded,
  onShowToast,
  initialTab = 'sheets',
}) => {
  const [currentUser, setCurrentUser] = useState<User | null>(getCurrentUser());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'sheets' | 'drive'>(initialTab);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Sheets state
  const [isExportingSheet, setIsExportingSheet] = useState(false);
  const [isSyncingSheet, setIsSyncingSheet] = useState(false);
  const [lastExportedSheet, setLastExportedSheet] = useState<{
    id: string;
    url: string;
    title: string;
    date: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('DBSS_LAST_GOOGLE_SHEET_REF');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Sheet Import state
  const [isBrowsingSheets, setIsBrowsingSheets] = useState(false);
  const [driveSheetsList, setDriveSheetsList] = useState<DriveBackupItem[]>([]);
  const [manualSheetInput, setManualSheetInput] = useState('');
  const [isLoadingSheetData, setIsLoadingSheetData] = useState(false);
  const [sheetPreviewData, setSheetPreviewData] = useState<{
    spreadsheetId: string;
    title: string;
    tabNames: string[];
    currentTab: string;
    rows: any[][];
  } | null>(null);

  // Drive Backup state
  const [isBackingUpDrive, setIsBackingUpDrive] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [driveBackups, setDriveBackups] = useState<DriveBackupItem[]>([]);

  // Confirmation dialogs for destructive/mutating actions (Mandatory as per Workspace skill)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    warningNote?: string;
    actionLabel: string;
    actionColor?: 'red' | 'blue' | 'emerald';
    onConfirm: () => void;
  } | null>(null);

  // Subscribe to auth changes
  useEffect(() => {
    const unsub = subscribeToAuth((user, token) => {
      setCurrentUser(user);
      setAccessToken(token);
    });
    return unsub;
  }, []);

  // Sync tab with initialTab when opening
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      if (accessToken) {
        if (initialTab === 'drive') {
          fetchDriveBackups();
        } else {
          fetchDriveSheets();
        }
      }
    }
  }, [isOpen, initialTab, accessToken]);

  if (!isOpen) return null;

  // Handle Google Login
  const handleLogin = async () => {
    setIsSigningIn(true);
    try {
      const res = await googleSignIn();
      if (res?.accessToken) {
        setAccessToken(res.accessToken);
        setCurrentUser(res.user);
        onShowToast('Đã kết nối tài khoản Google thành công!', 'success');
        // Fetch drive data immediately
        fetchDriveBackups(res.accessToken);
        fetchDriveSheets(res.accessToken);
      }
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      onShowToast(err?.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.', 'error');
    } finally {
      setIsSigningIn(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Ngắt kết nối tài khoản Google?',
      description: `Bạn có muốn đăng xuất khỏi tài khoản ${
        currentUser?.email || 'Google'
      }? Sau khi đăng xuất, các tính năng Google Drive và Google Sheets sẽ tạm dừng.`,
      actionLabel: 'Đăng xuất',
      actionColor: 'red',
      onConfirm: async () => {
        await googleSignOut();
        setAccessToken(null);
        setCurrentUser(null);
        setDriveBackups([]);
        setDriveSheetsList([]);
        setSheetPreviewData(null);
        setConfirmModal(null);
        onShowToast('Đã ngắt kết nối Google thành công.', 'info');
      },
    });
  };

  // ==================== GOOGLE SHEETS ACTIONS ====================

  const handleExportNewSpreadsheet = async () => {
    if (!accessToken) {
      onShowToast('Vui lòng kết nối tài khoản Google trước khi xuất dữ liệu.', 'error');
      return;
    }

    setIsExportingSheet(true);
    try {
      const res = await createClassroomSpreadsheet(accessToken, data);
      const sheetRef = {
        id: res.spreadsheetId,
        url: res.spreadsheetUrl,
        title: res.title,
        date: new Date().toISOString(),
      };
      setLastExportedSheet(sheetRef);
      localStorage.setItem('DBSS_LAST_GOOGLE_SHEET_REF', JSON.stringify(sheetRef));
      onShowToast(
        `Đã tạo thành công Google Sheet: ${res.title} (${data.students.length} học sinh)!`,
        'success'
      );
      // Refresh sheet list
      fetchDriveSheets(accessToken);
    } catch (err: any) {
      console.error('Error creating spreadsheet:', err);
      onShowToast(err?.message || 'Lỗi khi tạo Google Sheet.', 'error');
    } finally {
      setIsExportingSheet(false);
    }
  };

  const handleSyncToCurrentSpreadsheet = () => {
    if (!lastExportedSheet || !accessToken) return;

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận đồng bộ cập nhật lên Google Sheets?',
      description: `Hành động này sẽ ghi đè và làm mới toàn bộ dữ liệu (gồm ${data.classes.length} lớp học, ${data.students.length} học sinh và ${data.tasks.length} nhiệm vụ) lên bảng tính "${lastExportedSheet.title}".`,
      warningNote: 'Dữ liệu trên Google Sheet hiện tại sẽ được thay thế bằng thông tin mới nhất trên hệ thống.',
      actionLabel: 'Xác nhận đồng bộ',
      actionColor: 'blue',
      onConfirm: async () => {
        setConfirmModal(null);
        setIsSyncingSheet(true);
        try {
          await writeDataToSpreadsheet(accessToken, lastExportedSheet.id, data);
          onShowToast('Đã cập nhật đồng bộ dữ liệu lên Google Sheets thành công!', 'success');
        } catch (err: any) {
          console.error('Sync error:', err);
          onShowToast(err?.message || 'Lỗi khi đồng bộ lên Google Sheet.', 'error');
        } finally {
          setIsSyncingSheet(false);
        }
      },
    });
  };

  const fetchDriveSheets = async (tokenOverride?: string) => {
    const token = tokenOverride || accessToken;
    if (!token) return;

    setIsBrowsingSheets(true);
    try {
      const sheets = await listDriveSpreadsheets(token);
      setDriveSheetsList(sheets);
    } catch (err: any) {
      console.warn('Lỗi lấy danh sách Google Sheets từ Drive:', err);
    } finally {
      setIsBrowsingSheets(false);
    }
  };

  const handleLoadSheetPreview = async (urlOrId: string, tabName?: string) => {
    const token = accessToken;
    if (!token) {
      onShowToast('Vui lòng kết nối Google trước.', 'error');
      return;
    }

    const spreadsheetId = extractSpreadsheetId(urlOrId);
    if (!spreadsheetId) {
      onShowToast('Vui lòng nhập đường link Google Sheet hoặc ID hợp lệ.', 'error');
      return;
    }

    setIsLoadingSheetData(true);
    try {
      const res = await readStudentsFromGoogleSheet(token, spreadsheetId, tabName);
      setSheetPreviewData({
        spreadsheetId,
        title: res.sheetTitle,
        tabNames: res.tabNames,
        currentTab: tabName || res.tabNames[0] || 'Sheet1',
        rows: res.rawRows,
      });
      onShowToast(`Đã nạp ${res.rawRows.length} dòng dữ liệu từ Google Sheet!`, 'info');
    } catch (err: any) {
      console.error('Error previewing sheet:', err);
      onShowToast(err?.message || 'Không thể đọc dữ liệu từ Google Sheet này.', 'error');
    } finally {
      setIsLoadingSheetData(false);
    }
  };

  const handleImportStudentsFromPreview = () => {
    if (!sheetPreviewData || sheetPreviewData.rows.length === 0) return;

    const rows = sheetPreviewData.rows;
    if (rows.length < 2) {
      onShowToast('Bảng tính không có đủ dữ liệu hàng để nhập.', 'error');
      return;
    }

    // Try finding header row index
    let headerRowIdx = 0;
    let foundHeader = false;
    for (let i = 0; i < Math.min(5, rows.length); i++) {
      const rowStr = rows[i].join(' ').toLowerCase();
      if (
        rowStr.includes('họ và tên') ||
        rowStr.includes('họ tên') ||
        rowStr.includes('mã học sinh') ||
        rowStr.includes('mã hs')
      ) {
        headerRowIdx = i;
        foundHeader = true;
        break;
      }
    }

    const headers = rows[headerRowIdx].map((h: any) => String(h || '').trim().toLowerCase());
    const findCol = (...keywords: string[]) => {
      return headers.findIndex((h) => keywords.some((kw) => h.includes(kw)));
    };

    const codeCol = findCol('mã học sinh', 'mã hs', 'mshs', 'mã');
    const nameCol = findCol('họ và tên', 'họ tên', 'tên học sinh', 'tên');
    const dobCol = findCol('ngày sinh', 'năm sinh', 'dob');
    const genderCol = findCol('giới tính', 'phái');
    const classCol = findCol('lớp', 'lớp học', 'chi đoàn');
    const statusCol = findCol('trạng thái');
    const noteCol = findCol('ghi chú', 'nhận xét');

    const dataRows = rows.slice(headerRowIdx + 1);
    const newStudents: Student[] = [];
    const classMapByCode = new Map(data.classes.map((c) => [c.code.toLowerCase().trim(), c.id]));
    const classMapByName = new Map(data.classes.map((c) => [c.name.toLowerCase().trim(), c.id]));

    let countSkipped = 0;

    dataRows.forEach((row, idx) => {
      const name = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
      if (!name) {
        countSkipped++;
        return;
      }

      const codeRaw = codeCol !== -1 ? String(row[codeCol] || '').trim() : '';
      const code =
        codeRaw ||
        `DBSS-${new Date().getFullYear().toString().slice(2)}-${String(
          data.students.length + newStudents.length + 1
        ).padStart(4, '0')}`;

      // Match class
      let targetClassId = data.classes[0]?.id || '';
      if (classCol !== -1 && row[classCol]) {
        const rawClass = String(row[classCol]).trim().toLowerCase();
        // check code
        if (classMapByCode.has(rawClass)) {
          targetClassId = classMapByCode.get(rawClass)!;
        } else if (classMapByName.has(rawClass)) {
          targetClassId = classMapByName.get(rawClass)!;
        } else {
          // Check substring
          const found = data.classes.find(
            (c) =>
              rawClass.includes(c.code.toLowerCase()) ||
              rawClass.includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(rawClass)
          );
          if (found) targetClassId = found.id;
        }
      }

      let genderVal: 'Nam' | 'Nữ' | 'Khác' | '' = '';
      if (genderCol !== -1 && row[genderCol]) {
        const g = String(row[genderCol]).trim().toLowerCase();
        if (g.startsWith('nam')) genderVal = 'Nam';
        else if (g.startsWith('nữ') || g.startsWith('nu')) genderVal = 'Nữ';
        else genderVal = 'Khác';
      }

      let statusVal: StudentStatus = 'Đang học';
      if (statusCol !== -1 && row[statusCol]) {
        const s = String(row[statusCol]).trim().toLowerCase();
        if (s.includes('hoàn thành')) statusVal = 'Hoàn thành';
        else if (s.includes('hỗ trợ') || s.includes('yếu')) statusVal = 'Cần hỗ trợ';
      }

      const studentItem: Student = {
        id: `stu-gsheet-${Date.now()}-${idx}`,
        studentCode: code,
        fullName: name,
        birthDate: dobCol !== -1 ? String(row[dobCol] || '').trim() : '',
        gender: genderVal,
        classId: targetClassId,
        academicYear: '2025 - 2026',
        status: statusVal,
        teacherNotes:
          noteCol !== -1 && row[noteCol]
            ? String(row[noteCol]).trim()
            : 'Nhập từ Google Sheets',
        createdAt: new Date().toISOString(),
      };

      newStudents.push(studentItem);
    });

    if (newStudents.length === 0) {
      onShowToast('Không tìm thấy học sinh hợp lệ nào từ bảng tính đã chọn.', 'error');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận nhập học sinh từ Google Sheet?',
      description: `Đã trích xuất ${newStudents.length} học sinh từ bảng tính "${sheetPreviewData.title}". Bạn có muốn thêm số lượng học sinh này vào danh sách lớp không?`,
      actionLabel: `Nhập ${newStudents.length} học sinh`,
      actionColor: 'emerald',
      onConfirm: () => {
        setConfirmModal(null);
        // Merge without duplicate codes
        const existingCodes = new Set(data.students.map((s) => s.studentCode.toLowerCase()));
        const uniqueToAdd: Student[] = [];
        let dupCount = 0;

        newStudents.forEach((st) => {
          if (existingCodes.has(st.studentCode.toLowerCase())) {
            dupCount++;
          } else {
            uniqueToAdd.push(st);
            existingCodes.add(st.studentCode.toLowerCase());
          }
        });

        const nextData: AppData = {
          ...data,
          students: [...data.students, ...uniqueToAdd],
          lastUpdated: new Date().toISOString(),
        };

        onDataLoaded(nextData);
        setSheetPreviewData(null);
        onShowToast(
          `Đã nhập thành công ${uniqueToAdd.length} học sinh từ Google Sheet!${
            dupCount > 0 ? ` (Bỏ qua ${dupCount} mã trùng lặp)` : ''
          }`,
          'success'
        );
      },
    });
  };

  // ==================== GOOGLE DRIVE ACTIONS ====================

  const handleBackupToDrive = async () => {
    if (!accessToken) {
      onShowToast('Vui lòng kết nối Google trước.', 'error');
      return;
    }

    setIsBackingUpDrive(true);
    try {
      const res = await saveBackupToDrive(accessToken, data);
      onShowToast(`Đã lưu bản sao lưu thành công lên Google Drive: ${res.name}`, 'success');
      // Refresh list
      fetchDriveBackups(accessToken);
    } catch (err: any) {
      console.error('Error backing up to drive:', err);
      onShowToast(err?.message || 'Lỗi khi lưu bản sao lưu lên Google Drive.', 'error');
    } finally {
      setIsBackingUpDrive(false);
    }
  };

  const fetchDriveBackups = async (tokenOverride?: string) => {
    const token = tokenOverride || accessToken;
    if (!token) return;

    setIsLoadingBackups(true);
    try {
      const files = await listDriveBackups(token);
      setDriveBackups(files);
    } catch (err: any) {
      console.warn('Lỗi lấy danh sách sao lưu từ Drive:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleRestoreFromDrive = (backup: DriveBackupItem) => {
    if (!accessToken) return;

    setConfirmModal({
      isOpen: true,
      title: 'Xác nhận khôi phục dữ liệu từ Google Drive?',
      description: `Bạn có chắc muốn phục hồi hệ thống từ bản sao lưu "${backup.name}" không?`,
      warningNote:
        'CẢNH BÁO: Thao tác này sẽ thay thế toàn bộ dữ liệu hiện tại (lớp học, học sinh, điểm danh, nhiệm vụ) bằng dữ liệu được lưu trong bản sao lưu này.',
      actionLabel: 'Xác nhận khôi phục ngay',
      actionColor: 'emerald',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          const restored = await downloadBackupFromDrive(accessToken, backup.id);
          onDataLoaded(restored);
          onShowToast('Đã khôi phục toàn bộ dữ liệu thành công từ Google Drive!', 'success');
          onClose();
        } catch (err: any) {
          console.error('Restore error:', err);
          onShowToast(err?.message || 'Không thể phục hồi dữ liệu từ bản sao lưu này.', 'error');
        }
      },
    });
  };

  const handleDeleteDriveBackup = (backup: DriveBackupItem) => {
    if (!accessToken) return;

    setConfirmModal({
      isOpen: true,
      title: 'Xóa bản sao lưu trên Google Drive?',
      description: `Bạn có chắc chắn muốn xóa bản sao lưu "${backup.name}" khỏi tài khoản Google Drive của mình?`,
      warningNote: 'Hành động này không thể hoàn tác.',
      actionLabel: 'Xóa vĩnh viễn tệp',
      actionColor: 'red',
      onConfirm: async () => {
        setConfirmModal(null);
        try {
          await deleteBackupFromDrive(accessToken, backup.id);
          onShowToast(`Đã xóa bản sao lưu "${backup.name}" khỏi Google Drive.`, 'info');
          fetchDriveBackups();
        } catch (err: any) {
          console.error('Delete error:', err);
          onShowToast(err?.message || 'Không thể xóa tệp trên Google Drive.', 'error');
        }
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-slate-100 bg-slate-50/90">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700 shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-800 text-base sm:text-lg flex items-center gap-2">
                Kết Nối Google Sheets & Google Drive
              </h3>
              <p className="text-[11px] text-slate-500">
                Đồng bộ dữ liệu lớp học, bảng tính và lưu trữ đám mây cho GV Nguyễn Thị Thu
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Auth State Banner */}
        <div className="px-5 sm:px-6 py-3.5 bg-gradient-to-r from-teal-50/60 to-emerald-50/40 border-b border-teal-100 flex flex-wrap items-center justify-between gap-3">
          {currentUser && accessToken ? (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-teal-600 text-white font-bold text-xs flex items-center justify-center ring-2 ring-teal-200">
                {currentUser.displayName ? currentUser.displayName.slice(0, 2).toUpperCase() : 'GV'}
              </div>
              <div className="text-xs">
                <div className="flex items-center gap-1.5 font-bold text-slate-800">
                  <span>{currentUser.displayName || 'Tài khoản Google'}</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đã kết nối
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-mono">{currentUser.email}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 text-xs text-slate-600">
              <ShieldCheck className="w-5 h-5 text-teal-600 shrink-0" />
              <span>Chưa kết nối tài khoản Google. Hãy đăng nhập để kích hoạt Google Sheets và Google Drive.</span>
            </div>
          )}

          <div>
            {currentUser && accessToken ? (
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Ngắt kết nối</span>
              </button>
            ) : (
              <GoogleSignInButton
                onClick={handleLogin}
                isLoading={isSigningIn}
                text="Kết nối với Google"
              />
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center border-b border-slate-200 bg-slate-50/60 px-5 sm:px-6">
          <button
            onClick={() => setActiveTab('sheets')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-colors ${
              activeTab === 'sheets'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Google Sheets (Bảng tính & Đồng bộ)</span>
          </button>
          <button
            onClick={() => {
              setActiveTab('drive');
              if (accessToken) fetchDriveBackups();
            }}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs border-b-2 transition-colors ${
              activeTab === 'drive'
                ? 'border-teal-600 text-teal-700 bg-white'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <HardDrive className="w-4 h-4 text-blue-600" />
            <span>Google Drive (Sao lưu đám mây)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1 text-xs text-slate-700">
          {!accessToken ? (
            /* Unauthenticated Prompt */
            <div className="text-center py-8 px-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-700 shadow-xs">
                <Cloud className="w-7 h-7" />
              </div>
              <div className="max-w-md mx-auto space-y-1.5">
                <h4 className="font-bold text-slate-900 text-sm">
                  Ủy quyền kết nối với Google Workspace
                </h4>
                <p className="text-slate-500 text-xs leading-relaxed">
                  Đăng nhập tài khoản Google để ứng dụng có quyền truy cập Google Sheets và Google Drive với sự cho phép của bạn, giúp tự động lưu trữ, xuất sổ điểm và phục hồi hồ sơ an toàn.
                </p>
              </div>
              <div className="pt-2">
                <GoogleSignInButton
                  onClick={handleLogin}
                  isLoading={isSigningIn}
                  text="Đăng nhập tài khoản Google của bạn"
                />
              </div>
            </div>
          ) : activeTab === 'sheets' ? (
            /* ================= TAB 1: GOOGLE SHEETS ================= */
            <div className="space-y-6">
              {/* Feature 1: Export to Google Sheets */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Xuất sổ quản lý ra Google Sheets mới</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Tự động tạo bảng tính trên Google Drive với 3 sheet chuẩn: Danh Sách Học Sinh, Tiến Độ Nhiệm Vụ, và Danh Sách Lớp.
                    </p>
                  </div>
                  <button
                    onClick={handleExportNewSpreadsheet}
                    disabled={isExportingSheet}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isExportingSheet ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isExportingSheet ? 'Đang tạo bảng tính...' : 'Xuất ra Google Sheet mới'}</span>
                  </button>
                </div>

                {/* Show created/linked spreadsheet status */}
                {lastExportedSheet && (
                  <div className="mt-3 p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-bold text-emerald-950 truncate max-w-xs sm:max-w-md">
                          {lastExportedSheet.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <a
                          href={lastExportedSheet.url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-50 transition-colors shadow-2xs"
                        >
                          <span>Mở trên Google Sheets</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={handleSyncToCurrentSpreadsheet}
                          disabled={isSyncingSheet}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors shadow-2xs disabled:opacity-50"
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${isSyncingSheet ? 'animate-spin' : ''}`} />
                          <span>Đồng bộ đè cập nhật</span>
                        </button>
                      </div>
                    </div>
                    <p className="text-[11px] text-emerald-800">
                      Xuất gần nhất: {formatDateVN(lastExportedSheet.date)}. Nhấn "Đồng bộ đè cập nhật" để đẩy dữ liệu điểm danh, hồ sơ mới nhất vào bảng tính này.
                    </p>
                  </div>
                )}
              </div>

              {/* Feature 2: Import from Google Sheets */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div>
                  <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                    <Download className="w-4 h-4 text-blue-600" />
                    <span>Nhập danh sách học sinh từ Google Sheet có sẵn</span>
                  </div>
                  <p className="text-slate-500 text-xs mt-0.5">
                    Dán link Google Sheet hoặc chọn từ các bảng tính gần đây trong Google Drive của bạn.
                  </p>
                </div>

                {/* Input URL/ID directly */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    value={manualSheetInput}
                    onChange={(e) => setManualSheetInput(e.target.value)}
                    placeholder="Dán link Google Sheet (https://docs.google.com/spreadsheets/d/...)"
                    className="flex-1 px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-teal-500 bg-slate-50"
                  />
                  <button
                    onClick={() => handleLoadSheetPreview(manualSheetInput)}
                    disabled={isLoadingSheetData || !manualSheetInput.trim()}
                    className="px-4 py-2 font-bold text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors disabled:opacity-50 shrink-0 flex items-center justify-center gap-1.5"
                  >
                    {isLoadingSheetData ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                    <span>Đọc dữ liệu</span>
                  </button>
                </div>

                {/* Recent Drive Sheets list */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-slate-700 text-xs">
                      Các bảng tính Google Sheets gần đây trên Drive của bạn:
                    </span>
                    <button
                      onClick={() => fetchDriveSheets()}
                      disabled={isBrowsingSheets}
                      className="text-teal-700 hover:text-teal-900 text-[11px] font-semibold flex items-center gap-1"
                    >
                      <RefreshCw className={`w-3 h-3 ${isBrowsingSheets ? 'animate-spin' : ''}`} />
                      <span>Làm mới danh sách</span>
                    </button>
                  </div>

                  {driveSheetsList.length === 0 ? (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center text-slate-500 text-xs">
                      {isBrowsingSheets
                        ? 'Đang tìm kiếm Google Sheets trên Google Drive...'
                        : 'Chưa tìm thấy bảng tính Google Sheet nào hoặc bạn có thể dán link trực tiếp ở ô trên.'}
                    </div>
                  ) : (
                    <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-2 bg-slate-50/50">
                      {driveSheetsList.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 hover:border-teal-300 transition-colors"
                        >
                          <div className="min-w-0 pr-2">
                            <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                            <p className="text-[10px] text-slate-400">
                              Cập nhật: {item.modifiedTime ? formatDateVN(item.modifiedTime) : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {item.webViewLink && (
                              <a
                                href={item.webViewLink}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-slate-400 hover:text-slate-600 rounded"
                                title="Xem trên Drive"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button
                              onClick={() => {
                                setManualSheetInput(item.id);
                                handleLoadSheetPreview(item.id);
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-teal-700 bg-teal-50 hover:bg-teal-100 rounded-md transition-colors"
                            >
                              Chọn nạp
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Sheet Preview & Tab Selector */}
                {sheetPreviewData && (
                  <div className="p-4 bg-slate-50 border border-teal-200 rounded-xl space-y-3 mt-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-extrabold text-slate-900 text-xs block">
                          Bảng tính: {sheetPreviewData.title}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          Tìm thấy {sheetPreviewData.rows.length} dòng dữ liệu
                        </span>
                      </div>
                      {/* Tab selector */}
                      {sheetPreviewData.tabNames.length > 1 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-semibold text-slate-600">Chọn Tab:</span>
                          <select
                            value={sheetPreviewData.currentTab}
                            onChange={(e) =>
                              handleLoadSheetPreview(sheetPreviewData.spreadsheetId, e.target.value)
                            }
                            className="text-xs bg-white border border-slate-300 rounded-lg px-2 py-1"
                          >
                            {sheetPreviewData.tabNames.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Table snippet preview */}
                    <div className="max-h-48 overflow-auto border border-slate-200 rounded-lg bg-white">
                      <table className="w-full text-[11px] text-left border-collapse">
                        <tbody>
                          {sheetPreviewData.rows.slice(0, 5).map((row, rIdx) => (
                            <tr
                              key={rIdx}
                              className={rIdx === 0 ? 'bg-teal-50/70 font-bold text-teal-900' : 'border-t border-slate-100'}
                            >
                              {row.slice(0, 6).map((cell: any, cIdx: number) => (
                                <td key={cIdx} className="p-2 border-r border-slate-100 truncate max-w-[120px]">
                                  {String(cell || '')}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end pt-1">
                      <button
                        onClick={handleImportStudentsFromPreview}
                        className="px-4 py-2 font-bold text-xs text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Xác nhận nhập học sinh vào hệ thống</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            /* ================= TAB 2: GOOGLE DRIVE BACKUP ================= */
            <div className="space-y-6">
              {/* Feature 1: One-click backup to Drive */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-extrabold text-slate-900 text-sm">
                      <HardDrive className="w-4 h-4 text-blue-600" />
                      <span>Tạo bản sao lưu tức thì lên Google Drive</span>
                    </div>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Lưu trữ an toàn toàn bộ dữ liệu ({data.classes.length} lớp, {data.students.length} học sinh, {data.tasks.length} nhiệm vụ) vào tài khoản Google cá nhân của bạn.
                    </p>
                  </div>
                  <button
                    onClick={handleBackupToDrive}
                    disabled={isBackingUpDrive}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs transition-colors shrink-0 disabled:opacity-50"
                  >
                    {isBackingUpDrive ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    <span>{isBackingUpDrive ? 'Đang tải lên Drive...' : 'Sao lưu lên Google Drive'}</span>
                  </button>
                </div>
              </div>

              {/* Feature 2: List of Backups on Drive */}
              <div className="p-4 sm:p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Danh sách bản sao lưu trên Google Drive
                    </h4>
                    <p className="text-slate-500 text-xs mt-0.5">
                      Các tệp sao lưu JSON do hệ thống quản trị lớp tạo trên Google Drive của bạn.
                    </p>
                  </div>
                  <button
                    onClick={() => fetchDriveBackups()}
                    disabled={isLoadingBackups}
                    className="text-teal-700 hover:text-teal-900 text-xs font-semibold flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                    <span>Làm mới</span>
                  </button>
                </div>

                {isLoadingBackups ? (
                  <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-teal-600" />
                    <span>Đang nạp danh sách sao lưu từ Google Drive...</span>
                  </div>
                ) : driveBackups.length === 0 ? (
                  <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center space-y-2">
                    <FileCheck className="w-8 h-8 text-slate-400 mx-auto" />
                    <p className="font-bold text-slate-700 text-xs">Chưa có bản sao lưu nào trên Google Drive</p>
                    <p className="text-slate-400 text-[11px]">
                      Bấm nút "Sao lưu lên Google Drive" ở trên để tạo bản lưu trữ đầu tiên của bạn.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {driveBackups.map((item) => (
                      <div
                        key={item.id}
                        className="p-3 bg-slate-50/80 border border-slate-200 hover:border-blue-200 rounded-xl transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate">{item.name}</p>
                          <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-0.5">
                            <span>Ngày tạo: {item.createdTime ? formatDateVN(item.createdTime) : 'N/A'}</span>
                            {item.size && (
                              <span>Dung lượng: {(parseInt(item.size, 10) / 1024).toFixed(1)} KB</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {item.webViewLink && (
                            <a
                              href={item.webViewLink}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1.5 text-slate-500 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition-colors"
                              title="Xem tệp trên Google Drive"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            onClick={() => handleRestoreFromDrive(item)}
                            className="px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-1 shadow-2xs"
                          >
                            <Download className="w-3 h-3" />
                            <span>Khôi phục</span>
                          </button>
                          <button
                            onClick={() => handleDeleteDriveBackup(item)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Xóa bản sao lưu này trên Drive"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-400">
            Dữ liệu được xử lý trực tiếp qua API an toàn của Google Workspace.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Destructive/Mutating Operations (MANDATORY REQUIREMENT) */}
      {confirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div
                className={`p-2 rounded-xl shrink-0 ${
                  confirmModal.actionColor === 'red'
                    ? 'bg-rose-100 text-rose-700'
                    : confirmModal.actionColor === 'emerald'
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="font-extrabold text-slate-900 text-sm">{confirmModal.title}</h4>
                <p className="text-xs text-slate-600 leading-relaxed">{confirmModal.description}</p>
                {confirmModal.warningNote && (
                  <p className="text-[11px] font-semibold text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                    {confirmModal.warningNote}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setConfirmModal(null)}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg transition-colors shadow-xs ${
                  confirmModal.actionColor === 'red'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : confirmModal.actionColor === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {confirmModal.actionLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
