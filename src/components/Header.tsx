import React, { useState, useEffect } from 'react';
import { Menu, Bell, Download, Search, Check } from 'lucide-react';

interface HeaderProps {
  onToggleSidebar: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onOpenBackupModal: () => void;
  onOpenGoogleWorkspace?: (tab?: 'sheets' | 'drive') => void;
  isGoogleConnected?: boolean;
  googleUserEmail?: string | null;
  teacherName?: string;
  schoolName?: string;
  pendingNotificationCount?: number;
  onOpenNotifications?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  searchQuery,
  onSearchChange,
  onOpenBackupModal,
  onOpenGoogleWorkspace,
  isGoogleConnected = false,
  googleUserEmail = null,
  teacherName = 'Nguyễn Thị Thu',
  schoolName = 'Dự bị Đại học Dân tộc Sầm Sơn',
  pendingNotificationCount = 4,
  onOpenNotifications,
}) => {
  const [showNotificationPopup, setShowNotificationPopup] = useState(false);

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-slate-200/90 px-4 sm:px-6 py-3.5">
      <div className="flex items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        {/* Left Zone: School Badge + Big Title */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleSidebar}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors shrink-0 lg:hidden"
            title="Mở thanh điều hướng"
          >
            <Menu className="w-5 h-5" />
          </button>

          <div className="min-w-0">
            <div className="inline-block bg-[#e6f7f4] text-[#0f766e] text-[10px] sm:text-[11px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wider mb-0.5 border border-[#c1ebe2]">
              {schoolName}
            </div>
            <h1 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight leading-snug">
              TRỢ LÝ QUẢN TRỊ LỚP HỌC
            </h1>
          </div>
        </div>

        {/* Right Zone: Google Workspace Button, Teacher label, Bell badge, Avatar lockup */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          {/* Google Workspace Drive & Sheets Status Button */}
          {onOpenGoogleWorkspace && (
            <button
              onClick={() => onOpenGoogleWorkspace('sheets')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border shadow-2xs ${
                isGoogleConnected
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                  : 'bg-white text-slate-700 border-slate-200 hover:border-teal-300 hover:bg-teal-50/50'
              }`}
              title="Mở bảng điều khiển kết nối Google Drive và Google Sheets"
            >
              {/* Google Drive / Sheet multi-color icon */}
              <div className="flex items-center -space-x-1">
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                  <path fill="#0F9D58" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                  <path fill="#A1D99B" d="M14 2v6h6" />
                  <path fill="#FFF" d="M7 11h10v2H7zm0 4h10v2H7z" />
                </svg>
              </div>
              <span className="hidden sm:inline">
                {isGoogleConnected ? 'Google Sheets & Drive' : 'Kết nối Google Drive'}
              </span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isGoogleConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
                }`}
              />
            </button>
          )}

          {/* Subtle Teacher Text label */}
          <div className="hidden lg:block text-right">
            <span className="text-xs font-bold text-slate-700 block">GV {teacherName}</span>
          </div>

          <div className="h-6 w-px bg-slate-200 hidden sm:block"></div>

          {/* Notification Bell with Orange Badge */}
          <div className="relative">
            <button
              onClick={() => setShowNotificationPopup(!showNotificationPopup)}
              className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors"
              title="Thông báo học tập & nhiệm vụ quá hạn"
            >
              <Bell className="w-5 h-5" />
              {pendingNotificationCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-[#f59e0b] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs">
                  {pendingNotificationCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotificationPopup && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-xs">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="font-bold text-slate-800">Cảnh báo & Nhắc nhở ({pendingNotificationCount})</span>
                  <span className="text-[10px] text-blue-600 font-semibold cursor-pointer" onClick={() => setShowNotificationPopup(false)}>Đóng</span>
                </div>
                <div className="space-y-2">
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl">
                    <p className="font-bold text-rose-800">2 học sinh quá hạn bài tập:</p>
                    <p className="text-rose-700 text-[11px] mt-0.5">Thào A Dũng (K21-DB01), Nông Thị Thuận (K21-DB02)</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl">
                    <p className="font-bold text-amber-800">Cần bổ sung phụ đạo:</p>
                    <p className="text-amber-700 text-[11px] mt-0.5">Học sinh Phan Văn Đức nợ bài thu hoạch từ vựng.</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Teacher Profile Avatar */}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#00897b] text-white font-extrabold flex items-center justify-center text-xs shadow-xs shrink-0">
              TH
            </div>
            <div className="hidden sm:block text-left text-xs leading-tight">
              <p className="font-bold text-slate-900 leading-tight">Cô {teacherName}</p>
              <p className="text-[11px] text-slate-400 leading-tight">Dự bị ĐH Sầm Sơn</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
