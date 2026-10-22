import React, { useState, useRef, useMemo } from 'react';
import { ClassRoom, Student } from '../types';
import {
  parseStudentExcelFile,
  downloadStudentExcelTemplate,
  ParsedStudentRow,
  ExcelImportResult,
} from '../utils/excelImport';
import {
  FileSpreadsheet,
  Upload,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  Search,
  Filter,
  Check,
  ChevronRight,
  Info,
  Calendar,
  Layers,
} from 'lucide-react';
import { formatDateVN } from '../utils/calculations';

interface ImportStudentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: ClassRoom[];
  existingStudents: Student[];
  onImport: (
    studentsToAdd: Student[],
    studentsToUpdate: Student[],
    stats: { addedCount: number; updatedCount: number; skippedCount: number }
  ) => void;
}

type DuplicateHandlingStrategy = 'skip' | 'overwrite' | 'error';
type PreviewFilterTab = 'all' | 'valid' | 'duplicate' | 'error';

export const ImportStudentsModal: React.FC<ImportStudentsModalProps> = ({
  isOpen,
  onClose,
  classes,
  existingStudents,
  onImport,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<ExcelImportResult | null>(null);

  // Settings
  const [defaultClassId, setDefaultClassId] = useState<string>(classes[0]?.id || '');
  const [duplicateStrategy, setDuplicateStrategy] = useState<DuplicateHandlingStrategy>('skip');
  const [defaultYear, setDefaultYear] = useState<string>('2025 - 2026');

  // Preview filtering & search
  const [previewTab, setPreviewTab] = useState<PreviewFilterTab>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset when closing or reopening
  const handleReset = () => {
    setFile(null);
    setParseError(null);
    setParseResult(null);
    setPreviewTab('all');
    setPreviewSearch('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleProcessFile = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseError(null);
    setIsParsing(true);

    try {
      const result = await parseStudentExcelFile(
        selectedFile,
        classes,
        existingStudents,
        defaultClassId,
        defaultYear
      );
      setParseResult(result);
    } catch (err: any) {
      setParseError(err.message || 'Lỗi khi đọc file Excel. Vui lòng kiểm tra định dạng file.');
      setParseResult(null);
    } finally {
      setIsParsing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected) {
      handleProcessFile(selected);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) {
      handleProcessFile(droppedFile);
    }
  };

  // Re-run parse if default class changes while file is loaded
  const handleDefaultClassChange = async (newClassId: string) => {
    setDefaultClassId(newClassId);
    if (file) {
      setIsParsing(true);
      try {
        const result = await parseStudentExcelFile(
          file,
          classes,
          existingStudents,
          newClassId,
          defaultYear
        );
        setParseResult(result);
      } catch (err: any) {
        setParseError(err.message);
      } finally {
        setIsParsing(false);
      }
    }
  };

  // Filter preview rows
  const filteredRows = useMemo(() => {
    if (!parseResult) return [];

    return parseResult.rawRows.filter((row) => {
      // Tab filter
      if (previewTab === 'valid' && (!row.isValid || row.isDuplicateExisting)) return false;
      if (previewTab === 'duplicate' && !row.isDuplicateExisting) return false;
      if (previewTab === 'error' && row.isValid) return false;

      // Search query
      if (previewSearch.trim()) {
        const q = previewSearch.toLowerCase();
        const matches =
          row.fullName.toLowerCase().includes(q) ||
          row.studentCode.toLowerCase().includes(q) ||
          row.classNameDisplay.toLowerCase().includes(q);
        if (!matches) return false;
      }

      return true;
    });
  }, [parseResult, previewTab, previewSearch]);

  // Determine what would actually be imported based on duplicate strategy
  const computedImportPlan = useMemo(() => {
    if (!parseResult) {
      return { toAdd: [], toUpdate: [], skipped: [], canImport: false };
    }

    const toAdd: Student[] = [];
    const toUpdate: Student[] = [];
    const skipped: ParsedStudentRow[] = [];

    const existingStudentMap = new Map(
      existingStudents.map((s) => [s.studentCode.toUpperCase(), s])
    );

    for (const r of parseResult.rawRows) {
      // Skip invalid rows (missing required name or duplicated inside the file)
      if (!r.isValid || r.isDuplicateInFile) {
        continue;
      }

      if (r.isDuplicateExisting) {
        if (duplicateStrategy === 'skip') {
          skipped.push(r);
        } else if (duplicateStrategy === 'overwrite') {
          const existing = existingStudentMap.get(r.studentCode.toUpperCase());
          if (existing) {
            toUpdate.push({
              ...existing,
              fullName: r.fullName,
              birthDate: r.birthDate || existing.birthDate,
              gender: r.gender || existing.gender,
              classId: r.classId || existing.classId,
              academicYear: r.academicYear || existing.academicYear,
              status: r.status || existing.status,
              teacherNotes: r.teacherNotes || existing.teacherNotes,
            });
          }
        } else if (duplicateStrategy === 'error') {
          // Cannot import if duplicate exists
          return { toAdd: [], toUpdate: [], skipped: [], canImport: false, hasErrorBlocked: true };
        }
      } else {
        // Brand new student
        toAdd.push({
          id: `stu-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          studentCode: r.studentCode,
          fullName: r.fullName,
          birthDate: r.birthDate,
          gender: r.gender,
          classId: r.classId,
          academicYear: r.academicYear,
          status: r.status,
          teacherNotes: r.teacherNotes,
          createdAt: new Date().toISOString(),
        });
      }
    }

    const canImport = toAdd.length > 0 || toUpdate.length > 0;
    return { toAdd, toUpdate, skipped, canImport, hasErrorBlocked: false };
  }, [parseResult, duplicateStrategy, existingStudents]);

  const handleConfirmImport = () => {
    if (!computedImportPlan.canImport) return;

    onImport(computedImportPlan.toAdd, computedImportPlan.toUpdate, {
      addedCount: computedImportPlan.toAdd.length,
      updatedCount: computedImportPlan.toUpdate.length,
      skippedCount: computedImportPlan.skipped.length,
    });

    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[92vh]">
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shadow-xs">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-900 text-base">Thêm danh sách học sinh từ file Excel</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  .xlsx / .xls / .csv
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Tải lên bảng danh sách học sinh để tự động tạo hồ sơ hàng loạt vào hệ thống
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Download Sample Template & Options Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            {/* Step 1: Download Template */}
            <div className="flex flex-col justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">1. Chưa có file mẫu?</span>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-3">
                  Tải tệp Excel mẫu chuẩn đã định dạng sẵn các cột thông tin và danh mục lớp.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadStudentExcelTemplate(classes)}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-semibold rounded-lg border border-emerald-200 transition-colors w-full"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Tải file Excel mẫu (.xlsx)</span>
              </button>
            </div>

            {/* Step 2: Target Class Setting */}
            <div className="flex flex-col justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  2. Lớp học mặc định:
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                  Áp dụng cho học sinh nếu trong file Excel để trống cột Lớp.
                </p>
              </div>
              <select
                value={defaultClassId}
                onChange={(e) => handleDefaultClassChange(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.code} - {cls.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Step 3: Duplicate Resolution */}
            <div className="flex flex-col justify-between p-3 bg-white rounded-lg border border-slate-200 shadow-2xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  3. Xử lý khi trùng Mã học sinh:
                </label>
                <p className="text-[11px] text-slate-500 leading-relaxed mb-2">
                  Chọn hành động khi phát hiện mã học sinh đã có trên hệ thống.
                </p>
              </div>
              <select
                value={duplicateStrategy}
                onChange={(e) => setDuplicateStrategy(e.target.value as DuplicateHandlingStrategy)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="skip">Bỏ qua mã trùng (Chỉ thêm học sinh mới)</option>
                <option value="overwrite">Cập nhật / Ghi đè thông tin học sinh cũ</option>
                <option value="error">Báo lỗi và không nhập mã trùng</option>
              </select>
            </div>
          </div>

          {/* Upload Dropzone */}
          {!parseResult && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx, .xls, .csv"
                onChange={handleFileChange}
                className="hidden"
              />

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                  isDragOver
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-emerald-500 hover:bg-slate-50/80 bg-white'
                }`}
              >
                <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
                  <Upload className="w-7 h-7" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">
                  Kéo thả file Excel vào đây hoặc click để chọn tệp
                </h4>
                <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                  Hỗ trợ định dạng Microsoft Excel <span className="font-semibold">.xlsx, .xls</span> và file dữ liệu <span className="font-semibold">.csv</span>.
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Chọn tệp từ máy tính</span>
                </div>
              </div>

              {parseError && (
                <div className="mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block">Không thể phân tích file:</span>
                    <span>{parseError}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Parsing Spinner */}
          {isParsing && (
            <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200">
              <RefreshCw className="w-6 h-6 text-emerald-600 animate-spin mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">Đang đọc và phân tích cấu trúc bảng tính Excel...</p>
            </div>
          )}

          {/* Parse Result Summary & Preview Table */}
          {parseResult && (
            <div className="space-y-4">
              {/* File Info & Stats Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-700 shrink-0" />
                  <div>
                    <h5 className="font-bold text-emerald-900 text-xs">{parseResult.fileName}</h5>
                    <p className="text-[11px] text-emerald-700">
                      Đã nhận diện <span className="font-bold">{parseResult.totalRows}</span> dòng dữ liệu học sinh
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleReset}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Chọn tệp khác</span>
                  </button>
                </div>
              </div>

              {/* Status Badges Filter Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => setPreviewTab('all')}
                    className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                      previewTab === 'all'
                        ? 'bg-slate-800 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Tất cả ({parseResult.totalRows})
                  </button>

                  <button
                    onClick={() => setPreviewTab('valid')}
                    className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                      previewTab === 'valid'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Hợp lệ mới ({computedImportPlan.toAdd.length})</span>
                  </button>

                  {parseResult.duplicateExistingCount > 0 && (
                    <button
                      onClick={() => setPreviewTab('duplicate')}
                      className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                        previewTab === 'duplicate'
                          ? 'bg-amber-600 text-white shadow-2xs'
                          : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Trùng mã ({parseResult.duplicateExistingCount})</span>
                    </button>
                  )}

                  {parseResult.invalidRows.length > 0 && (
                    <button
                      onClick={() => setPreviewTab('error')}
                      className={`px-3 py-1.5 rounded-lg font-semibold flex items-center gap-1 transition-all ${
                        previewTab === 'error'
                          ? 'bg-rose-600 text-white shadow-2xs'
                          : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Lỗi ({parseResult.invalidRows.length})</span>
                    </button>
                  )}
                </div>

                {/* Filter Search */}
                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Lọc tên, mã học sinh..."
                    value={previewSearch}
                    onChange={(e) => setPreviewSearch(e.target.value)}
                    className="w-full pl-8 pr-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Execution Summary Notification */}
              {computedImportPlan.hasErrorBlocked ? (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    Đang chọn tùy chọn "Báo lỗi khi trùng mã". File có{' '}
                    <strong>{parseResult.duplicateExistingCount} học sinh</strong> trùng mã với hệ thống,
                    vui lòng đổi cách xử lý hoặc sửa file.
                  </span>
                </div>
              ) : (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0 text-blue-600" />
                    <span>
                      Dự kiến nhập:{' '}
                      <strong className="text-emerald-700">+{computedImportPlan.toAdd.length} học sinh mới</strong>
                      {computedImportPlan.toUpdate.length > 0 && (
                        <span>
                          , cập nhật <strong className="text-amber-700">{computedImportPlan.toUpdate.length} hồ sơ cũ</strong>
                        </span>
                      )}
                      {computedImportPlan.skipped.length > 0 && (
                        <span>
                          , bỏ qua <strong className="text-slate-600">{computedImportPlan.skipped.length} mã trùng</strong>
                        </span>
                      )}
                      .
                    </span>
                  </div>
                </div>
              )}

              {/* Preview Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white max-h-64 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 text-slate-600 font-semibold">
                    <tr>
                      <th className="py-2 px-3 w-10 text-center">Dòng</th>
                      <th className="py-2 px-3">Trạng thái kiểm tra</th>
                      <th className="py-2 px-3">Mã HS</th>
                      <th className="py-2 px-3">Họ và tên</th>
                      <th className="py-2 px-3">Ngày sinh</th>
                      <th className="py-2 px-3">Giới tính</th>
                      <th className="py-2 px-3">Lớp học</th>
                      <th className="py-2 px-3">Năm học</th>
                      <th className="py-2 px-3">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    {filteredRows.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-8 text-center text-slate-400">
                          Không có dòng dữ liệu nào khớp với bộ lọc hiện tại.
                        </td>
                      </tr>
                    ) : (
                      filteredRows.map((row) => {
                        let statusBadge = (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Hợp lệ (Mới)</span>
                          </span>
                        );

                        if (!row.isValid) {
                          statusBadge = (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200"
                              title={row.errors.join('; ')}
                            >
                              <AlertCircle className="w-3 h-3" />
                              <span>Lỗi dữ liệu</span>
                            </span>
                          );
                        } else if (row.isDuplicateExisting) {
                          statusBadge = (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                                duplicateStrategy === 'overwrite'
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : duplicateStrategy === 'skip'
                                  ? 'bg-amber-50 text-amber-700 border-amber-200'
                                  : 'bg-rose-50 text-rose-700 border-rose-200'
                              }`}
                              title={row.warnings.join('; ')}
                            >
                              <AlertTriangle className="w-3 h-3" />
                              <span>
                                {duplicateStrategy === 'overwrite'
                                  ? 'Sẽ cập nhật'
                                  : duplicateStrategy === 'skip'
                                  ? 'Sẽ bỏ qua'
                                  : 'Trùng mã'}
                              </span>
                            </span>
                          );
                        }

                        return (
                          <tr
                            key={row.rowNumber}
                            className={`hover:bg-slate-50 transition-colors ${
                              !row.isValid
                                ? 'bg-rose-50/20'
                                : row.isDuplicateExisting
                                ? 'bg-amber-50/10'
                                : ''
                            }`}
                          >
                            <td className="py-2 px-3 text-center text-slate-400 font-mono text-[11px]">
                              {row.rowNumber}
                            </td>
                            <td className="py-2 px-3 whitespace-nowrap">{statusBadge}</td>
                            <td className="py-2 px-3 font-semibold text-blue-700 font-mono whitespace-nowrap">
                              {row.studentCode}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900">
                              {row.fullName}
                              {row.errors.length > 0 && (
                                <span className="block text-[10px] text-rose-600 font-normal">
                                  {row.errors.join(', ')}
                                </span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {formatDateVN(row.birthDate)}
                            </td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {row.gender || '—'}
                            </td>
                            <td className="py-2 px-3 text-slate-700 whitespace-nowrap">
                              <span className="font-medium">{row.classNameDisplay}</span>
                            </td>
                            <td className="py-2 px-3 text-slate-600 whitespace-nowrap">
                              {row.academicYear}
                            </td>
                            <td className="py-2 px-3 text-slate-500 max-w-xs truncate" title={row.teacherNotes}>
                              {row.teacherNotes || '—'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {parseResult ? (
              <span>
                Tổng số hàng xử lý: <strong>{parseResult.totalRows}</strong>
              </span>
            ) : (
              <span>Có thể xem trước và kiểm tra tính hợp lệ trước khi ghi vào hệ thống.</span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors"
            >
              Hủy bỏ
            </button>

            {parseResult && (
              <button
                type="button"
                disabled={!computedImportPlan.canImport}
                onClick={handleConfirmImport}
                className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold text-white bg-[#00897b] hover:bg-[#00796b] disabled:opacity-40 disabled:pointer-events-none rounded-xl shadow-xs transition-colors"
              >
                <Check className="w-4 h-4" />
                <span>
                  Tiến hành nhập (
                  {computedImportPlan.toAdd.length + computedImportPlan.toUpdate.length} học sinh)
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
