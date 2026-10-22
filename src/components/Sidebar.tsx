import React from 'react';
import { ActiveTab } from '../types';
import {
  LayoutGrid,
  GraduationCap,
  Users,
  TrendingUp,
  Database,
  School,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  isOpen: boolean;
  onCloseMobile: () => void;
  classCount: number;
  studentCount: number;
  taskCount: number;
  onOpenBackupModal: () => void;
  onOpenGoogleWorkspace?: (tab?: 'sheets' | 'drive') => void;
  isGoogleConnected?: boolean;
  teacherName?: string;
  schoolName?: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isOpen,
  onCloseMobile,
  classCount,
  studentCount,
  taskCount,
  onOpenBackupModal,
  onOpenGoogleWorkspace,
  isGoogleConnected = false,
  teacherName = 'Nguyễn Thị Thu',
  schoolName = 'Dự bị Đại học Dân tộc Sầm Sơn',
}) => {
  const navItems = [
    {
      id: 'overview' as ActiveTab,
      label: 'Tổng quan',
      icon: LayoutGrid,
      badge: null,
    },
    {
      id: 'classes' as ActiveTab,
      label: 'Lớp học',
      icon: GraduationCap,
      badge: `${classCount} lớp`,
    },
    {
      id: 'students' as ActiveTab,
      label: 'Học sinh',
      icon: Users,
      badge: `${studentCount} em`,
    },
    {
      id: 'progress' as ActiveTab,
      label: 'Tiến độ học tập',
      icon: TrendingUp,
      badge: `${taskCount} mục`,
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-xs lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container: White background with crisp border */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-50 w-64 bg-white border-r border-slate-200/90 text-slate-800 flex flex-col transition-transform duration-300 ease-in-out shrink-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Area */}
        <div className="p-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#00897b] flex items-center justify-center text-white font-bold shadow-xs shrink-0">
              <School className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-[11px] font-extrabold tracking-wider text-[#00897b] uppercase truncate leading-tight">
                DỰ BỊ ĐH DÂN TỘC
              </h1>
              <span className="text-sm font-bold text-slate-900 block truncate leading-tight">
                Quản Trị Lớp Học
              </span>
            </div>
          </div>
        </div>

        {/* Teacher Profile Card */}
        <div className="px-4 mb-4">
          <div className="bg-[#f8fafc] border border-slate-200/80 rounded-2xl p-3.5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-[#00897b] bg-white text-[#00897b] font-extrabold flex items-center justify-center text-xs shrink-0 shadow-2xs">
              TH
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-900 text-xs truncate leading-snug">
                {teacherName}
              </h3>
              <p className="text-[11px] text-slate-500 truncate leading-snug">
                Giáo viên Chủ nhiệm
              </p>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="px-3 space-y-1 flex-1 overflow-y-auto">
          <div className="px-3 py-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            CHỨC NĂNG CHÍNH
          </div>

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  onTabChange(item.id);
                  onCloseMobile();
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  isActive
                    ? 'bg-[#e6f7f4] text-[#0f766e] font-bold shadow-2xs'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-[#0f766e]' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                  />
                  <span className="text-[13px]">{item.label}</span>
                </div>

                {item.badge !== null && (
                  <span
                    className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-lg tabular-nums ${
                      isActive
                        ? 'bg-white/80 text-[#0f766e] border border-[#b2e2d8]'
                        : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Storage & Google Workspace Quick Actions */}
        <div className="p-4 border-t border-slate-100 space-y-2">
          {onOpenGoogleWorkspace && (
            <button
              onClick={() => {
                onOpenGoogleWorkspace('sheets');
                onCloseMobile();
              }}
              className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                isGoogleConnected
                  ? 'border-teal-200 bg-teal-50/70 hover:bg-teal-100/70'
                  : 'border-slate-200 bg-[#f8fafc] hover:bg-teal-50/50 hover:border-teal-300'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-5 h-5 flex items-center justify-center shrink-0">
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#0F9D58" d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <path fill="#A1D99B" d="M14 2v6h6" />
                    <path fill="#FFF" d="M7 11h10v2H7zm0 4h10v2H7z" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-bold text-slate-800 block truncate group-hover:text-teal-800">
                    Google Drive & Sheets
                  </span>
                  <span className="text-[10px] text-slate-400 block truncate">
                    {isGoogleConnected ? 'Đang kết nối Cloud' : 'Đồng bộ & Bảng tính'}
                  </span>
                </div>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0 border ${
                  isGoogleConnected
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : 'bg-slate-100 text-slate-500 border-slate-200'
                }`}
              >
                {isGoogleConnected ? 'Online' : 'Kết nối'}
              </span>
            </button>
          )}

          <button
            onClick={() => {
              onOpenBackupModal();
              onCloseMobile();
            }}
            className="w-full flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-[#f8fafc] hover:bg-slate-100 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Database className="w-4 h-4 text-slate-500 group-hover:text-[#00897b] shrink-0" />
              <div className="min-w-0">
                <span className="text-xs font-bold text-slate-700 block truncate group-hover:text-[#00897b]">
                  Sao lưu bộ nhớ máy
                </span>
                <span className="text-[10px] text-slate-400 block truncate">File JSON / HTML Offline</span>
              </div>
            </div>
            <span className="text-[10px] font-semibold text-slate-400">Tải về</span>
          </button>

          <div className="text-center text-[10px] text-slate-400 pt-1">
            Hệ thống quản trị lớp học thông minh
          </div>
        </div>
      </aside>
    </>
  );
};
