import { AppData, ClassRoom, Student, LearningTask } from '../types';
import { getStudentProgress } from '../utils/calculations';

export interface GoogleSpreadsheetSummary {
  id: string;
  name: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Creates a formatted Google Spreadsheet on user's Google Drive with complete classroom data
 */
export async function createClassroomSpreadsheet(
  token: string,
  data: AppData,
  customTitle?: string
): Promise<{ spreadsheetId: string; spreadsheetUrl: string; title: string }> {
  const dateStr = new Date().toLocaleDateString('vi-VN');
  const title =
    customTitle ||
    `Sổ Quản Trị Lớp Học DBSS - GV ${data.teacherProfile?.fullName || 'Nguyễn Thị Thu'} (${dateStr})`;

  // 1. Create Spreadsheet with 3 tabs
  const createRes = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title,
      },
      sheets: [
        {
          properties: {
            title: 'Danh Sách Học Sinh',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Tiến Độ & Nhiệm Vụ',
            gridProperties: { frozenRowCount: 1 },
          },
        },
        {
          properties: {
            title: 'Danh Sách Lớp Học',
            gridProperties: { frozenRowCount: 1 },
          },
        },
      ],
    }),
  });

  if (!createRes.ok) {
    const errData = await createRes.json().catch(() => ({}));
    throw new Error(errData?.error?.message || `Lỗi khi tạo Google Sheet: HTTP ${createRes.status}`);
  }

  const created = await createRes.json();
  const spreadsheetId = created.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate values for all 3 sheets
  await writeDataToSpreadsheet(token, spreadsheetId, data);

  // 3. Apply professional styles (Teal headers, bold white text)
  try {
    await styleSpreadsheetHeaders(token, spreadsheetId, created.sheets);
  } catch (err) {
    console.warn('Lỗi định dạng giao diện Google Sheets (bỏ qua):', err);
  }

  return {
    spreadsheetId,
    spreadsheetUrl,
    title,
  };
}

/**
 * Writes/Updates classroom data to an existing Google Spreadsheet
 */
export async function writeDataToSpreadsheet(
  token: string,
  spreadsheetId: string,
  data: AppData
): Promise<void> {
  const classMap = new Map(data.classes.map((c) => [c.id, `${c.code} - ${c.name}`]));
  const studentMap = new Map(data.students.map((s) => [s.id, s]));

  // Sheet 1: Students
  const studentHeaders = [
    'STT',
    'Mã học sinh',
    'Họ và tên',
    'Ngày sinh',
    'Giới tính',
    'Lớp học',
    'Năm học',
    'Tiến độ (%)',
    'Trạng thái',
    'Ghi chú của giáo viên',
  ];

  const studentRows = data.students.map((s, idx) => {
    const prog = getStudentProgress(s.id, data.tasks);
    const progText = prog !== null ? `${prog}%` : 'Chưa có bài';
    const className = classMap.get(s.classId) || (s.classId ? s.classId : 'Chưa phân lớp');
    return [
      idx + 1,
      s.studentCode,
      s.fullName,
      s.birthDate || '',
      s.gender || '',
      className,
      s.academicYear || '',
      progText,
      s.status,
      s.teacherNotes || '',
    ];
  });

  // Sheet 2: Tasks & Progress
  const taskHeaders = [
    'Mã nhiệm vụ',
    'Môn học',
    'Tiêu đề nhiệm vụ',
    'Lớp học',
    'Mã học sinh',
    'Họ và tên học sinh',
    'Ngày giao',
    'Hạn hoàn thành',
    'Tiến độ (%)',
    'Trạng thái',
    'Nhận xét của giáo viên',
  ];

  const taskRows: any[][] = [];
  data.tasks.forEach((task) => {
    const className = classMap.get(task.classId) || 'N/A';
    const assignedIds =
      task.assignedStudentIds.length > 0
        ? task.assignedStudentIds
        : data.students.filter((s) => s.classId === task.classId).map((s) => s.id);

    assignedIds.forEach((sid) => {
      const student = studentMap.get(sid);
      if (!student) return;
      const prog = task.studentProgress?.[sid] || { percent: 0, status: 'Đang thực hiện' };
      taskRows.push([
        task.id,
        task.subject || 'Ngữ văn',
        task.title,
        className,
        student.studentCode,
        student.fullName,
        task.assignedDate || '',
        task.dueDate || '',
        `${prog.percent || 0}%`,
        prog.status || 'Đang thực hiện',
        prog.notes || '',
      ]);
    });
  });

  // Sheet 3: Classes
  const classHeaders = [
    'STT',
    'Mã lớp',
    'Tên lớp học',
    'Năm học',
    'Giáo viên chủ nhiệm',
    'Sĩ số học sinh',
    'Mô tả / Mục tiêu',
  ];

  const classRows = data.classes.map((c, idx) => {
    const count = data.students.filter((s) => s.classId === c.id).length;
    return [
      idx + 1,
      c.code,
      c.name,
      c.academicYear || '',
      c.teacherName || data.teacherProfile?.fullName || 'Nguyễn Thị Thu',
      count,
      c.description || '',
    ];
  });

  // Batch update values
  const payload = {
    valueInputOption: 'USER_ENTERED',
    data: [
      {
        range: "'Danh Sách Học Sinh'!A1:J" + (studentRows.length + 10),
        values: [studentHeaders, ...studentRows],
      },
      {
        range: "'Tiến Độ & Nhiệm Vụ'!A1:K" + (taskRows.length + 10),
        values: [taskHeaders, ...taskRows],
      },
      {
        range: "'Danh Sách Lớp Học'!A1:G" + (classRows.length + 10),
        values: [classHeaders, ...classRows],
      },
    ],
  };

  const updateRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }
  );

  if (!updateRes.ok) {
    const errData = await updateRes.json().catch(() => ({}));
    throw new Error(
      errData?.error?.message || `Lỗi khi đồng bộ dữ liệu vào Google Sheet: HTTP ${updateRes.status}`
    );
  }
}

/**
 * Adds beautiful teal header styling and frozen rows to created sheets
 */
async function styleSpreadsheetHeaders(token: string, spreadsheetId: string, sheets: any[]) {
  if (!sheets || sheets.length === 0) return;

  const requests: any[] = [];

  sheets.forEach((sheet) => {
    const sheetId = sheet.properties?.sheetId ?? 0;

    // Header styling: Background #0F766E (RGB: 15/255, 118/255, 110/255), white bold text
    requests.push({
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 15 / 255,
              green: 118 / 255,
              blue: 110 / 255,
            },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 10,
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
          },
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)',
      },
    });

    // Auto-resize columns
    requests.push({
      autoResizeDimensions: {
        dimensions: {
          sheetId,
          dimension: 'COLUMNS',
          startIndex: 0,
          endIndex: 12,
        },
      },
    });
  });

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });
}

/**
 * Reads a Google Sheet and parses student rows for import
 */
export async function readStudentsFromGoogleSheet(
  token: string,
  spreadsheetId: string,
  tabName?: string
): Promise<{
  sheetTitle: string;
  tabNames: string[];
  rawRows: any[][];
}> {
  // First get metadata to know tabs
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=properties.title,sheets.properties`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!metaRes.ok) {
    const err = await metaRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Không thể truy cập Google Sheet này. Hãy kiểm tra quyền truy cập.');
  }

  const meta = await metaRes.json();
  const sheetTitle = meta.properties?.title || 'Google Sheet';
  const tabNames = (meta.sheets || []).map((s: any) => s.properties?.title).filter(Boolean);

  const selectedTab = tabName || tabNames[0] || 'Sheet1';

  // Read data from the tab
  const range = `'${selectedTab}'!A1:Z500`;
  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );

  if (!valRes.ok) {
    const err = await valRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Không thể đọc dữ liệu từ tab được chọn.');
  }

  const valData = await valRes.json();
  return {
    sheetTitle,
    tabNames,
    rawRows: valData.values || [],
  };
}

/**
 * Extracts spreadsheet ID from either a direct ID or a full Google Sheets URL
 */
export function extractSpreadsheetId(urlOrId: string): string {
  const trimmed = urlOrId.trim();
  // If it's a full URL e.g. https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0
  const match = trimmed.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  // Otherwise check if it looks like a clean ID
  return trimmed;
}
