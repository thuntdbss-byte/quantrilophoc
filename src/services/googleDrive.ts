import { AppData } from '../types';

export interface DriveBackupItem {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  createdTime?: string;
  modifiedTime?: string;
  webViewLink?: string;
}

/**
 * Saves a full AppData JSON backup file directly to the user's Google Drive
 */
export async function saveBackupToDrive(
  token: string,
  data: AppData
): Promise<{ fileId: string; name: string; webViewLink?: string }> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const timeStr = new Date().toTimeString().slice(0, 5).replace(':', 'h');
  const fileName = `SaoLuu_QuanTriLopHoc_DBSS_${dateStr}_${timeStr}.json`;

  const metadata = {
    name: fileName,
    description: `Bản sao lưu tự động hệ thống Quản Trị Lớp Học Thông Minh - Trường Dự bị Đại học Dân tộc Sầm Sơn (GV ${
      data.teacherProfile?.fullName || 'Nguyễn Thị Thu'
    }). Gồm ${data.classes.length} lớp, ${data.students.length} học sinh, ${data.tasks.length} nhiệm vụ.`,
    mimeType: 'application/json',
  };

  const fileContent = JSON.stringify(data, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    fileContent +
    closeDelimiter;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body: multipartRequestBody,
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Lỗi tải tệp lên Google Drive: HTTP ${res.status}`);
  }

  const result = await res.json();
  return {
    fileId: result.id,
    name: result.name || fileName,
    webViewLink: result.webViewLink,
  };
}

/**
 * Lists backup files created on user's Google Drive
 */
export async function listDriveBackups(token: string): Promise<DriveBackupItem[]> {
  const query = "trashed = false and name contains 'SaoLuu_QuanTriLopHoc'";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&orderBy=createdTime desc&pageSize=30&fields=files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Không thể liệt kê danh sách tệp từ Google Drive.');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Downloads and restores AppData from a Google Drive file
 */
export async function downloadBackupFromDrive(token: string, fileId: string): Promise<AppData> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Không thể tải tệp sao lưu từ Google Drive.');
  }

  const rawJson = await res.json();

  if (!rawJson || typeof rawJson !== 'object') {
    throw new Error('Dữ liệu trên Google Drive không đúng định dạng JSON hợp lệ.');
  }

  if (
    !Array.isArray(rawJson.classes) ||
    !Array.isArray(rawJson.students) ||
    !Array.isArray(rawJson.tasks)
  ) {
    throw new Error(
      'Tệp sao lưu này thiếu các danh mục dữ liệu cần thiết (classes, students, tasks).'
    );
  }

  return rawJson as AppData;
}

/**
 * Deletes a backup file from Google Drive (Mandatory user confirmation required in UI before invoking this)
 */
export async function deleteBackupFromDrive(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Không thể xóa tệp trên Google Drive: HTTP ${res.status}`);
  }
}

/**
 * Lists Google Spreadsheets accessible by the user on Google Drive
 */
export async function listDriveSpreadsheets(token: string): Promise<DriveBackupItem[]> {
  const query = "trashed = false and mimeType = 'application/vnd.google-apps.spreadsheet'";
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    query
  )}&orderBy=modifiedTime desc&pageSize=25&fields=files(id,name,mimeType,createdTime,modifiedTime,webViewLink)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'Không thể lấy danh sách Google Sheets từ Google Drive.');
  }

  const data = await res.json();
  return data.files || [];
}
