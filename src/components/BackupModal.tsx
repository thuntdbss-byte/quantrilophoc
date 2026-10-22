import React, { useRef, useState } from 'react';
import { AppData } from '../types';
import { exportJsonBackup, importJsonBackup, resetAppData } from '../utils/storage';
import { formatDateVN } from '../utils/calculations';
import {
  Download,
  Upload,
  RotateCcw,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  X,
  HardDrive,
  Cloud,
} from 'lucide-react';

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: AppData;
  onDataLoaded: (newData: AppData) => void;
  onShowToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenGoogleWorkspace?: (tab?: 'sheets' | 'drive') => void;
  isGoogleConnected?: boolean;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  isOpen,
  onClose,
  data,
  onDataLoaded,
  onShowToast,
  onOpenGoogleWorkspace,
  isGoogleConnected = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [pendingImportData, setPendingImportData] = useState<AppData | null>(null);

  if (!isOpen) return null;

  const handleExportJson = () => {
    exportJsonBackup(data);
    onShowToast('Đã xuất file sao lưu JSON thành công!', 'success');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const res = await importJsonBackup(file);
    if (!res.success || !res.data) {
      onShowToast(res.message, 'error');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setPendingImportData(res.data);
    setShowImportConfirm(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmImport = () => {
    if (pendingImportData) {
      onDataLoaded(pendingImportData);
      onShowToast('Đã khôi phục dữ liệu từ tệp sao lưu!', 'success');
      setShowImportConfirm(false);
      setPendingImportData(null);
      onClose();
    }
  };

  const handleConfirmReset = () => {
    const fresh = resetAppData();
    onDataLoaded(fresh);
    onShowToast('Đã khôi phục dữ liệu mẫu ban đầu!', 'success');
    setShowResetConfirm(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-600" />
            <h3 className="font-bold text-slate-800 text-base">
              Quản lý sao lưu & Lưu trữ dữ liệu
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
          {/* Important Security Notice required by spec */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl space-y-2 text-amber-900">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Khuyến cáo an toàn thông tin & Bộ nhớ trình duyệt</span>
            </div>
            <p className="leading-relaxed">
              Ứng dụng hiện hoạt động hoàn toàn cục bộ trên trình duyệt thông qua cơ chế <strong>localStorage</strong>.
              Dữ liệu được lưu trữ trực tiếp trên thiết bị này và không tự động đồng bộ sang máy tính khác.
            </p>
            <ul className="list-disc list-inside space-y-1 text-amber-800/90 pl-1">
              <li>Hãy tải tệp sao lưu JSON định kỳ để bảo đảm không mất dữ liệu học sinh.</li>
              <li>Tránh sử dụng trên máy tính công cộng hoặc trình duyệt ở chế độ Ẩn danh (Incognito).</li>
              <li>Trước khi triển khai chính thức trong toàn trường, cần kiểm tra quy định bảo mật hồ sơ học sinh.</li>
            </ul>
          </div>

          {/* Current Storage Summary */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <span className="text-slate-500 font-semibold uppercase tracking-wider block text-[11px]">
              Tình trạng dữ liệu hiện hành
            </span>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Lớp học</span>
                <span className="font-bold text-slate-800 text-sm tabular-nums">
                  {data.classes.length}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Học sinh</span>
                <span className="font-bold text-slate-800 text-sm tabular-nums">
                  {data.students.length}
                </span>
              </div>
              <div className="bg-white p-2 rounded-lg border border-slate-200">
                <span className="text-slate-400 block text-[11px]">Nhiệm vụ</span>
                <span className="font-bold text-slate-800 text-sm tabular-nums">
                  {data.tasks.length}
                </span>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 text-right">
              Cập nhật gần nhất: {formatDateVN(data.lastUpdated)}
            </p>
          </div>

          {/* Action 0: Cloud Backup with Google Drive */}
          {onOpenGoogleWorkspace && (
            <div className="p-4 rounded-xl border border-teal-200 bg-teal-50/40 hover:border-teal-300 transition-colors flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-teal-600" />
                  <h4 className="font-bold text-teal-950 text-xs">
                    Sao lưu & Đồng bộ Google Drive
                  </h4>
                  {isGoogleConnected && (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                      Đã kết nối
                    </span>
                  )}
                </div>
                <p className="text-teal-800/80 text-[11px] mt-0.5">
                  Lưu trữ đám mây tự động, không lo mất dữ liệu khi đổi máy hay dọn dẹp trình duyệt.
                </p>
              </div>
              <button
                onClick={() => {
                  onOpenGoogleWorkspace('drive');
                  onClose();
                }}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg transition-colors shrink-0 shadow-2xs"
              >
                <HardDrive className="w-3.5 h-3.5" />
                <span>{isGoogleConnected ? 'Quản lý trên Drive' : 'Kết nối Drive'}</span>
              </button>
            </div>
          )}

          {/* Action 1: Export JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-xs">Xuất toàn bộ dữ liệu (File JSON)</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Tải xuống tệp sao lưu chứa đầy đủ danh sách lớp, học sinh và lịch sử tiến độ.
              </p>
            </div>
            <button
              onClick={handleExportJson}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file JSON</span>
            </button>
          </div>

          {/* Action 2: Import JSON Backup */}
          <div className="p-4 rounded-xl border border-slate-200 hover:border-blue-200 transition-colors flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-slate-800 text-xs">Nhập dữ liệu từ tệp sao lưu</h4>
              <p className="text-slate-500 text-[11px] mt-0.5">
                Phục hồi dữ liệu từ tệp JSON đã lưu trước đó trên máy tính.
              </p>
            </div>
            <input
              type="file"
              ref={fileInputRef}
              accept=".json"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>Chọn tệp JSON</span>
            </button>
          </div>

          {/* Action 3: Download Standalone Single-File HTML */}
          <div className="p-4 rounded-xl border border-indigo-200 bg-indigo-50/20 hover:border-indigo-300 transition-colors flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-indigo-950 text-xs">Tải file HTML độc lập (Chạy offline 100%)</h4>
              <p className="text-indigo-800/80 text-[11px] mt-0.5">
                Một file HTML duy nhất chứa toàn bộ mã nguồn, mở trực tiếp bằng Chrome/Edge không cần cài đặt hoặc server.
              </p>
            </div>
            <a
              href="/quan_tri_lop_hoc_thong_minh.html"
              download="Quan_Tri_Lop_Hoc_Thong_Minh_Offline.html"
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Tải file .html</span>
            </a>
          </div>

          {/* Action 4: Reset to Mock Data */}
          <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/20 flex items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-rose-900 text-xs">Khôi phục dữ liệu mẫu</h4>
              <p className="text-rose-700/80 text-[11px] mt-0.5">
                Đặt lại toàn bộ về 3 lớp học và 15 học sinh mẫu ban đầu của trường Sầm Sơn.
              </p>
            </div>
            <button
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mẫu</span>
            </button>
          </div>

          {/* Confirm Reset Dialog Inline */}
          {showResetConfirm && (
            <div className="p-4 bg-rose-100/70 border border-rose-300 rounded-xl space-y-3">
              <p className="font-bold text-rose-900 text-xs">
                Bạn có chắc chắn muốn khôi phục về dữ liệu mẫu không?
              </p>
              <p className="text-rose-800 text-[11px]">
                Mọi lớp học, học sinh và nhiệm vụ do bạn thêm mới sẽ bị ghi đè bằng dữ liệu mẫu minh họa.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="px-3 py-1.5 bg-white text-slate-700 rounded text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded text-xs font-semibold hover:bg-rose-700"
                >
                  Xác nhận khôi phục
                </button>
              </div>
            </div>
          )}

          {/* Confirm Import Dialog Inline */}
          {showImportConfirm && pendingImportData && (
            <div className="p-4 bg-blue-100/70 border border-blue-300 rounded-xl space-y-3">
              <p className="font-bold text-blue-900 text-xs">Xác nhận ghi đè dữ liệu?</p>
              <p className="text-blue-800 text-[11px]">
                Tệp sao lưu chứa: {pendingImportData.classes.length} lớp, {pendingImportData.students.length} học sinh, {pendingImportData.tasks.length} nhiệm vụ. Thao tác này sẽ thay thế dữ liệu hiện tại.
              </p>
              <div className="flex items-center gap-2 justify-end">
                <button
                  onClick={() => {
                    setShowImportConfirm(false);
                    setPendingImportData(null);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 rounded text-xs font-medium"
                >
                  Hủy
                </button>
                <button
                  onClick={handleConfirmImport}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold hover:bg-blue-700"
                >
                  Ghi đè dữ liệu
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
          >
            Đóng cửa sổ
          </button>
        </div>
      </div>
    </div>
  );
};
