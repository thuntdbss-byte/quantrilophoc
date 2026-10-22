import * as XLSX from 'xlsx';
import { ClassRoom, Student, StudentStatus } from '../types';

export interface ParsedStudentRow {
  rowNumber: number;
  studentCode: string;
  fullName: string;
  birthDate: string;
  gender: 'Nam' | 'Nữ' | 'Khác' | '';
  classId: string;
  classNameDisplay: string;
  academicYear: string;
  status: StudentStatus;
  teacherNotes: string;
  isValid: boolean;
  isDuplicateExisting: boolean;
  isDuplicateInFile: boolean;
  errors: string[];
  warnings: string[];
}

export interface ExcelImportResult {
  fileName: string;
  totalRows: number;
  validRows: ParsedStudentRow[];
  invalidRows: ParsedStudentRow[];
  duplicateExistingCount: number;
  duplicateInFileCount: number;
  rawRows: ParsedStudentRow[];
}

/**
 * Normalizes text for header comparison (lowercase, trimmed, removed diacritics)
 */
function normalizeHeader(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Converts various date formats (DD/MM/YYYY, YYYY-MM-DD, Excel serial date) to YYYY-MM-DD
 */
export function normalizeDate(val: any): string {
  if (val === null || val === undefined || val === '') return '';

  // If number (Excel date serial number, e.g. 44561)
  if (typeof val === 'number') {
    try {
      const parsedDate = XLSX.SSF.parse_date_code(val);
      if (parsedDate && parsedDate.y && parsedDate.m && parsedDate.d) {
        const y = String(parsedDate.y).padStart(4, '0');
        const m = String(parsedDate.m).padStart(2, '0');
        const d = String(parsedDate.d).padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
    } catch {
      // Fallback calculation for excel serial
      const date = new Date((val - (25567 + 2)) * 86400 * 1000);
      if (!isNaN(date.getTime())) {
        return date.toISOString().slice(0, 10);
      }
    }
  }

  // If Date object
  if (val instanceof Date && !isNaN(val.getTime())) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  const str = String(val).trim();
  if (!str) return '';

  // Match YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(str)) {
    const parts = str.split('-');
    return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = str.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }

  // Try standard parse
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime()) && parsed.getFullYear() > 1900 && parsed.getFullYear() < 2100) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  return str;
}

/**
 * Normalizes gender input
 */
function normalizeGender(val: any): 'Nam' | 'Nữ' | 'Khác' | '' {
  if (!val) return '';
  const s = String(val).trim().toLowerCase();
  if (s === 'nam' || s === 'm' || s === 'male' || s === 'trai') return 'Nam';
  if (s === 'nữ' || s === 'nu' || s === 'f' || s === 'female' || s === 'gái') return 'Nữ';
  if (s === 'khác' || s === 'khac' || s === 'other') return 'Khác';
  return '';
}

/**
 * Normalizes status input
 */
function normalizeStatus(val: any): StudentStatus {
  if (!val) return 'Đang học';
  const s = String(val).trim().toLowerCase();
  if (s.includes('hoàn thành') || s.includes('hoan thanh') || s.includes('completed')) return 'Hoàn thành';
  if (s.includes('hỗ trợ') || s.includes('ho tro') || s.includes('support') || s.includes('yếu')) return 'Cần hỗ trợ';
  return 'Đang học';
}

/**
 * Finds column indexes based on common header names
 */
function mapHeaderColumns(headerRow: any[]) {
  const mapping: {
    studentCodeIdx: number;
    fullNameIdx: number;
    birthDateIdx: number;
    genderIdx: number;
    classIdx: number;
    academicYearIdx: number;
    statusIdx: number;
    notesIdx: number;
  } = {
    studentCodeIdx: -1,
    fullNameIdx: -1,
    birthDateIdx: -1,
    genderIdx: -1,
    classIdx: -1,
    academicYearIdx: -1,
    statusIdx: -1,
    notesIdx: -1,
  };

  headerRow.forEach((col, idx) => {
    if (!col) return;
    const norm = normalizeHeader(String(col));

    // Student code
    if (
      mapping.studentCodeIdx === -1 &&
      (norm.includes('mahocsinh') ||
        norm.includes('mahs') ||
        norm.includes('masv') ||
        norm.includes('masohs') ||
        norm.includes('studentcode') ||
        norm.includes('masohocsinh') ||
        norm === 'ma' ||
        norm === 'code' ||
        norm === 'id')
    ) {
      mapping.studentCodeIdx = idx;
      return;
    }

    // Full name
    if (
      mapping.fullNameIdx === -1 &&
      (norm.includes('hovaten') ||
        norm.includes('hoten') ||
        norm.includes('tenhocsinh') ||
        norm.includes('fullname') ||
        norm.includes('tenhs') ||
        norm === 'ten' ||
        norm === 'name')
    ) {
      mapping.fullNameIdx = idx;
      return;
    }

    // Birth date
    if (
      mapping.birthDateIdx === -1 &&
      (norm.includes('ngaysinh') ||
        norm.includes('namsinh') ||
        norm.includes('birthdate') ||
        norm.includes('dob') ||
        norm.includes('dateofbirth'))
    ) {
      mapping.birthDateIdx = idx;
      return;
    }

    // Gender
    if (
      mapping.genderIdx === -1 &&
      (norm.includes('gioitinh') || norm.includes('phai') || norm.includes('gender') || norm === 'sex')
    ) {
      mapping.genderIdx = idx;
      return;
    }

    // Class
    if (
      mapping.classIdx === -1 &&
      (norm.includes('malop') ||
        norm.includes('lophoc') ||
        norm.includes('tenlop') ||
        norm.includes('class') ||
        norm === 'lop')
    ) {
      mapping.classIdx = idx;
      return;
    }

    // Academic year
    if (
      mapping.academicYearIdx === -1 &&
      (norm.includes('namhoc') ||
        norm.includes('nienkhoa') ||
        norm.includes('khoahoc') ||
        norm.includes('academicyear') ||
        norm.includes('schoolyear'))
    ) {
      mapping.academicYearIdx = idx;
      return;
    }

    // Status
    if (
      mapping.statusIdx === -1 &&
      (norm.includes('trangthai') || norm.includes('tinhtrang') || norm.includes('status'))
    ) {
      mapping.statusIdx = idx;
      return;
    }

    // Notes
    if (
      mapping.notesIdx === -1 &&
      (norm.includes('ghichu') ||
        norm.includes('nhanxet') ||
        norm.includes('danhgia') ||
        norm.includes('notes') ||
        norm.includes('note'))
    ) {
      mapping.notesIdx = idx;
      return;
    }
  });

  return mapping;
}

/**
 * Parses an Excel or CSV file into verified Student records
 */
export async function parseStudentExcelFile(
  file: File,
  existingClasses: ClassRoom[],
  existingStudents: Student[],
  defaultClassId?: string,
  defaultAcademicYear: string = '2025 - 2026'
): Promise<ExcelImportResult> {
  const arrayBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(arrayBuffer, { type: 'array', cellDates: true });

  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) {
    throw new Error('Tệp Excel không có trang tính (sheet) nào.');
  }

  const worksheet = workbook.Sheets[firstSheetName];
  // Read as array of rows
  const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: '',
    blankrows: false,
  });

  if (!rawData || rawData.length === 0) {
    throw new Error('Tệp Excel trống, không có dữ liệu để nhập.');
  }

  // Find header row (usually row 0, but could be row 1 or 2 if there's a title header)
  let headerRowIdx = -1;
  let colMap = mapHeaderColumns([]);

  for (let r = 0; r < Math.min(rawData.length, 5); r++) {
    const row = rawData[r];
    if (Array.isArray(row)) {
      const testMap = mapHeaderColumns(row);
      // If we matched at least fullName or studentCode or class
      if (testMap.fullNameIdx !== -1 || (testMap.studentCodeIdx !== -1 && testMap.birthDateIdx !== -1)) {
        headerRowIdx = r;
        colMap = testMap;
        break;
      }
    }
  }

  // Fallback to row 0 if no header recognized
  if (headerRowIdx === -1) {
    headerRowIdx = 0;
    colMap = mapHeaderColumns(rawData[0] || []);
    // If still no fullNameIdx, assume standard default columns:
    // [0: STT, 1: Mã HS, 2: Họ tên, 3: Ngày sinh, 4: Giới tính, 5: Lớp, 6: Năm học, 7: Trạng thái, 8: Ghi chú]
    if (colMap.fullNameIdx === -1) {
      colMap = {
        studentCodeIdx: 1,
        fullNameIdx: 2,
        birthDateIdx: 3,
        genderIdx: 4,
        classIdx: 5,
        academicYearIdx: 6,
        statusIdx: 7,
        notesIdx: 8,
      };
    }
  }

  // Maps for class lookup
  const classByCode = new Map<string, ClassRoom>();
  const classByName = new Map<string, ClassRoom>();
  existingClasses.forEach((c) => {
    classByCode.set(c.code.trim().toUpperCase(), c);
    classByName.set(c.name.trim().toLowerCase(), c);
  });

  const existingCodesSet = new Set(
    existingStudents.map((s) => s.studentCode.trim().toUpperCase())
  );

  const seenInFileCodes = new Set<string>();

  const parsedRows: ParsedStudentRow[] = [];
  const validRows: ParsedStudentRow[] = [];
  const invalidRows: ParsedStudentRow[] = [];
  let duplicateExistingCount = 0;
  let duplicateInFileCount = 0;

  // Process rows starting after headerRowIdx
  for (let r = headerRowIdx + 1; r < rawData.length; r++) {
    const row = rawData[r];
    if (!row || !Array.isArray(row) || row.every((c) => c === '' || c === null || c === undefined)) {
      continue; // skip completely empty row
    }

    const rowNumber = r + 1;
    const errors: string[] = [];
    const warnings: string[] = [];

    // Extract raw values
    const rawCode = colMap.studentCodeIdx !== -1 ? String(row[colMap.studentCodeIdx] ?? '').trim() : '';
    const rawName = colMap.fullNameIdx !== -1 ? String(row[colMap.fullNameIdx] ?? '').trim() : '';
    const rawBirthDate = colMap.birthDateIdx !== -1 ? row[colMap.birthDateIdx] : '';
    const rawGender = colMap.genderIdx !== -1 ? row[colMap.genderIdx] : '';
    const rawClass = colMap.classIdx !== -1 ? String(row[colMap.classIdx] ?? '').trim() : '';
    const rawYear = colMap.academicYearIdx !== -1 ? String(row[colMap.academicYearIdx] ?? '').trim() : '';
    const rawStatus = colMap.statusIdx !== -1 ? row[colMap.statusIdx] : '';
    const rawNotes = colMap.notesIdx !== -1 ? String(row[colMap.notesIdx] ?? '').trim() : '';

    // If both name and code are empty, skip row (could be empty trailing line)
    if (!rawName && !rawCode) {
      continue;
    }

    // Validate Full Name
    if (!rawName) {
      errors.push('Thiếu họ và tên học sinh.');
    }

    // Auto-generate or validate code
    let studentCode = rawCode.toUpperCase();
    if (!studentCode) {
      // Auto-assign code based on row
      const autoNum = existingStudents.length + parsedRows.length + 1;
      studentCode = `DBSS26-${String(autoNum).padStart(3, '0')}`;
      warnings.push(`Chưa có mã HS, tự động sinh mã: ${studentCode}`);
    }

    // Duplicate check
    const isDuplicateExisting = existingCodesSet.has(studentCode);
    const isDuplicateInFile = seenInFileCodes.has(studentCode);

    if (isDuplicateExisting) {
      duplicateExistingCount++;
      warnings.push(`Mã học sinh "${studentCode}" đã tồn tại trong hệ thống.`);
    }

    if (isDuplicateInFile) {
      duplicateInFileCount++;
      errors.push(`Mã học sinh "${studentCode}" bị lặp lại nhiều lần trong file.`);
    } else {
      seenInFileCodes.add(studentCode);
    }

    // Validate & Normalize Date
    const birthDate = normalizeDate(rawBirthDate);
    if (!birthDate) {
      warnings.push('Chưa có ngày sinh (mặc định để trống).');
    }

    // Gender
    const gender = normalizeGender(rawGender);

    // Resolve Class
    let classId = '';
    let classNameDisplay = 'Chưa phân lớp';

    if (rawClass) {
      const upperClass = rawClass.toUpperCase();
      const lowerClass = rawClass.toLowerCase();
      // Match by code
      if (classByCode.has(upperClass)) {
        const matched = classByCode.get(upperClass)!;
        classId = matched.id;
        classNameDisplay = `${matched.code} - ${matched.name}`;
      } else if (classByName.has(lowerClass)) {
        const matched = classByName.get(lowerClass)!;
        classId = matched.id;
        classNameDisplay = `${matched.code} - ${matched.name}`;
      } else {
        // Try partial match
        const found = existingClasses.find(
          (c) =>
            c.code.toUpperCase().includes(upperClass) ||
            upperClass.includes(c.code.toUpperCase()) ||
            c.name.toLowerCase().includes(lowerClass)
        );
        if (found) {
          classId = found.id;
          classNameDisplay = `${found.code} - ${found.name}`;
        } else if (defaultClassId) {
          const def = existingClasses.find((c) => c.id === defaultClassId);
          classId = defaultClassId;
          classNameDisplay = def ? `${def.code} - ${def.name}` : 'Lớp mặc định';
          warnings.push(`Không tìm thấy lớp "${rawClass}", dùng lớp mặc định.`);
        } else {
          warnings.push(`Không tìm thấy lớp "${rawClass}", để trạng thái chưa phân lớp.`);
        }
      }
    } else if (defaultClassId) {
      const def = existingClasses.find((c) => c.id === defaultClassId);
      classId = defaultClassId;
      classNameDisplay = def ? `${def.code} - ${def.name}` : 'Lớp mặc định';
    }

    // Academic Year
    const academicYear = rawYear || defaultAcademicYear || '2025 - 2026';

    // Status
    const status = normalizeStatus(rawStatus);

    const isValid = errors.length === 0;

    const parsedItem: ParsedStudentRow = {
      rowNumber,
      studentCode,
      fullName: rawName,
      birthDate,
      gender,
      classId,
      classNameDisplay,
      academicYear,
      status,
      teacherNotes: rawNotes,
      isValid,
      isDuplicateExisting,
      isDuplicateInFile,
      errors,
      warnings,
    };

    parsedRows.push(parsedItem);
    if (isValid) {
      validRows.push(parsedItem);
    } else {
      invalidRows.push(parsedItem);
    }
  }

  return {
    fileName: file.name,
    totalRows: parsedRows.length,
    validRows,
    invalidRows,
    duplicateExistingCount,
    duplicateInFileCount,
    rawRows: parsedRows,
  };
}

/**
 * Generates and downloads a standard Excel (.xlsx) template for importing students
 */
export function downloadStudentExcelTemplate(classes: ClassRoom[]): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Mẫu nhập danh sách học sinh
  const sampleData = [
    [
      'STT',
      'Mã học sinh',
      'Họ và tên',
      'Ngày sinh',
      'Giới tính',
      'Lớp học (Mã lớp)',
      'Năm học',
      'Trạng thái',
      'Ghi chú của giáo viên',
    ],
    [
      1,
      'DBSS26-001',
      'Nguyễn Văn An',
      '2008-03-15',
      'Nam',
      classes[0]?.code || 'K21-DB01',
      '2025 - 2026',
      'Đang học',
      'Chăm chỉ, tích cực phát biểu',
    ],
    [
      2,
      'DBSS26-002',
      'Trần Thị Mai Phương',
      '2008-07-22',
      'Nữ',
      classes[0]?.code || 'K21-DB01',
      '2025 - 2026',
      'Đang học',
      'Cần rèn luyện thêm kỹ năng viết',
    ],
    [
      3,
      'DBSS26-003',
      'Lò Văn Thao',
      '2007-11-05',
      'Nam',
      classes[1]?.code || classes[0]?.code || 'K21-DB02',
      '2025 - 2026',
      'Cần hỗ trợ',
      'Cần phụ đạo thêm môn Toán và Tin học',
    ],
    [
      4,
      'DBSS26-004',
      'Hà Thị Thảo Nguyên',
      '2008-09-18',
      'Nữ',
      classes[1]?.code || classes[0]?.code || 'K21-DB02',
      '2025 - 2026',
      'Hoàn thành',
      'Cán sự học tập môn Ngoại ngữ',
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // Mã học sinh
    { wch: 25 }, // Họ và tên
    { wch: 14 }, // Ngày sinh
    { wch: 10 }, // Giới tính
    { wch: 18 }, // Lớp học
    { wch: 14 }, // Năm học
    { wch: 15 }, // Trạng thái
    { wch: 35 }, // Ghi chú
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');

  // Sheet 2: Danh mục mã lớp học để tham khảo
  const classGuideData = [
    ['Mã lớp', 'Tên lớp học', 'Năm học', 'Giáo viên phụ trách'],
    ...classes.map((c) => [c.code, c.name, c.academicYear, c.teacherName || 'Nguyễn Thị Thu']),
  ];
  const wsClass = XLSX.utils.aoa_to_sheet(classGuideData);
  wsClass['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 15 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, wsClass, 'DanhMucLopHoc');

  // Write and trigger download
  XLSX.writeFile(wb, 'Mau_Nhap_DanhSach_HocSinh_DBSS.xlsx');
}

/**
 * Exports current students list to a polished Excel (.xlsx) workbook
 */
export function exportStudentsToExcel(
  students: Student[],
  classes: ClassRoom[],
  academicYearFilter?: string
): void {
  const wb = XLSX.utils.book_new();
  const classMap = new Map(classes.map((c) => [c.id, c]));

  const headers = [
    'STT',
    'Mã học sinh',
    'Họ và tên',
    'Ngày sinh',
    'Giới tính',
    'Mã lớp',
    'Tên lớp học',
    'Năm học',
    'Trạng thái',
    'Ghi chú của giáo viên',
    'Ngày tạo hồ sơ',
  ];

  const rows = students.map((s, idx) => {
    const cls = classMap.get(s.classId);
    return [
      idx + 1,
      s.studentCode,
      s.fullName,
      s.birthDate || '',
      s.gender || '',
      cls ? cls.code : 'Chưa phân lớp',
      cls ? cls.name : '',
      s.academicYear || '',
      s.status,
      s.teacherNotes || '',
      s.createdAt ? s.createdAt.slice(0, 10) : '',
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  ws['!cols'] = [
    { wch: 6 },  // STT
    { wch: 16 }, // Mã học sinh
    { wch: 25 }, // Họ và tên
    { wch: 14 }, // Ngày sinh
    { wch: 10 }, // Giới tính
    { wch: 14 }, // Mã lớp
    { wch: 30 }, // Tên lớp
    { wch: 14 }, // Năm học
    { wch: 15 }, // Trạng thái
    { wch: 35 }, // Ghi chú
    { wch: 14 }, // Ngày tạo
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'DanhSachHocSinh');

  const dateStr = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `DanhSach_HocSinh_DBSS_${dateStr}.xlsx`);
}
