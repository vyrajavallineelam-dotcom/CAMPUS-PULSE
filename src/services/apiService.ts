import { apiClient } from './apiClient';
import { tokenStorage } from './tokenStorage';
import { storageService } from './storageService';
import {
  Building,
  Floor,
  Room,
  Department,
  AcademicYear,
  Semester,
  Section,
  Subject,
  Faculty,
  Student,
  TimetableEntry,
  TimetableChange,
  UserNotification,
  UserSession,
  Role,
  DayOfWeek
} from '../types';

export interface LoginResponse {
  token: string;
  user: UserSession;
  expiresIn?: number;
}

export const apiService = {
  // ==================== AUTHENTICATION ====================
  async login(credentials: { email: string; password?: string; role?: Role }): Promise<UserSession> {
    const res = await apiClient.post<LoginResponse>('/api/auth/login', credentials, {
      requiresAuth: false
    });

    if (res.token) {
      await tokenStorage.setToken(res.token);
    }
    const session: UserSession = {
      ...res.user,
      token: res.token
    };
    await tokenStorage.setSession(session);
    window.dispatchEvent(new Event('campus_pulse_auth_change'));
    return session;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/api/auth/logout', {}, { timeoutMs: 3000 });
    } catch {
      // Ignore network errors on logout
    }
    await tokenStorage.clearAll();
    window.dispatchEvent(new Event('campus_pulse_auth_change'));
  },

  async getCurrentSession(): Promise<UserSession | null> {
    const session = await tokenStorage.getSession();
    return session;
  },

  // ==================== CAMPUS BLOCKS & FLOORS ====================
  async getBuildings(): Promise<Building[]> {
    return apiClient.get<Building[]>('/api/buildings', { requiresAuth: false });
  },

  async getBuildingById(id: string): Promise<Building> {
    return apiClient.get<Building>(`/api/buildings/${id}`, { requiresAuth: false });
  },

  async getFloors(buildingId?: string): Promise<Floor[]> {
    const query = buildingId ? `?buildingId=${encodeURIComponent(buildingId)}` : '';
    return apiClient.get<Floor[]>(`/api/floors${query}`, { requiresAuth: false });
  },

  async getRooms(params?: { buildingId?: string; floorId?: string; type?: string }): Promise<Room[]> {
    const query = new URLSearchParams();
    if (params?.buildingId) query.append('buildingId', params.buildingId);
    if (params?.floorId) query.append('floorId', params.floorId);
    if (params?.type) query.append('type', params.type);
    const qs = query.toString() ? `?${query.toString()}` : '';
    return apiClient.get<Room[]>(`/api/rooms${qs}`, { requiresAuth: false });
  },

  // ==================== TIMETABLES ====================
  async getTimetables(params?: {
    departmentId?: string;
    academicYearId?: string;
    semesterId?: string;
    sectionId?: string;
    facultyId?: string;
    day?: string;
  }): Promise<TimetableEntry[]> {
    try {
      const query = new URLSearchParams();
      if (params?.departmentId) query.append('departmentId', params.departmentId);
      if (params?.academicYearId) query.append('academicYearId', params.academicYearId);
      if (params?.semesterId) query.append('semesterId', params.semesterId);
      if (params?.sectionId) query.append('sectionId', params.sectionId);
      if (params?.facultyId) query.append('facultyId', params.facultyId);
      if (params?.day) query.append('day', params.day);
      const qs = query.toString() ? `?${query.toString()}` : '';
      const remote = await apiClient.get<TimetableEntry[]>(`/api/timetables${qs}`, { requiresAuth: false });
      if (remote && Array.isArray(remote) && remote.length > 0) {
        return remote;
      }
    } catch {
      // Backend offline or returned error
    }

    // Seamless fallback to integrated ACSE and local storage
    let local = storageService.getTimetables();
    if (params?.sectionId) {
      const sId = params.sectionId.trim().toLowerCase();
      local = local.filter(t => t.sectionId.trim().toLowerCase() === sId);
    }
    if (params?.facultyId) {
      const fId = params.facultyId.trim().toLowerCase();
      local = local.filter(t => t.facultyId.trim().toLowerCase() === fId);
    }
    if (params?.day) {
      const d = params.day.trim().toLowerCase();
      local = local.filter(t => t.day.trim().toLowerCase() === d);
    }
    if (params?.departmentId) {
      const dept = params.departmentId.trim().toLowerCase();
      local = local.filter(t => t.departmentId.trim().toLowerCase() === dept);
    }
    return local;
  },

  async getStudentSchedule(sectionId: string): Promise<TimetableEntry[]> {
    return apiClient.get<TimetableEntry[]>(`/api/timetables?sectionId=${encodeURIComponent(sectionId)}`, {
      requiresAuth: true
    });
  },

  async getFacultySchedule(facultyId: string): Promise<TimetableEntry[]> {
    return apiClient.get<TimetableEntry[]>(`/api/timetables?facultyId=${encodeURIComponent(facultyId)}`, {
      requiresAuth: true
    });
  },

  async addTimetableEntry(entry: Partial<TimetableEntry>): Promise<TimetableEntry> {
    return apiClient.post<TimetableEntry>('/api/timetables', entry);
  },

  async updateTimetableEntry(entry: TimetableEntry): Promise<TimetableEntry> {
    return apiClient.put<TimetableEntry>(`/api/timetables/${entry.id}`, entry);
  },

  async deleteTimetableEntry(id: string): Promise<{ success: boolean }> {
    return apiClient.delete(`/api/timetables/${id}`);
  },

  // ==================== LIVE AVAILABILITY ====================
  async getAvailability(day: DayOfWeek, time: string, type?: string): Promise<any[]> {
    const query = new URLSearchParams({ day, time });
    if (type) query.append('type', type);
    return apiClient.get<any[]>(`/api/availability?${query.toString()}`, { requiresAuth: false });
  },

  // ==================== ACADEMIC STRUCTURE ====================
  async getDepartments(): Promise<Department[]> {
    try {
      const remote = await apiClient.get<Department[]>('/api/departments', { requiresAuth: false });
      if (remote && Array.isArray(remote) && remote.length > 0) {
        const local = storageService.getDepartments();
        const existingCodes = new Set(remote.map(d => d.code?.toUpperCase()));
        const missing = local.filter(d => !existingCodes.has(d.code?.toUpperCase()));
        return [...remote, ...missing];
      }
    } catch {}
    return storageService.getDepartments();
  },

  async getAcademicYears(): Promise<AcademicYear[]> {
    return apiClient.get<AcademicYear[]>('/api/academic-years', { requiresAuth: false });
  },

  async getSemesters(): Promise<Semester[]> {
    return apiClient.get<Semester[]>('/api/semesters', { requiresAuth: false });
  },

  async getSections(): Promise<Section[]> {
    try {
      const remote = await apiClient.get<Section[]>('/api/sections', { requiresAuth: false });
      if (remote && Array.isArray(remote) && remote.length > 0) {
        const local = storageService.getSections();
        const existingNames = new Set(remote.map(s => s.name?.toUpperCase()));
        const missing = local.filter(s => !existingNames.has(s.name?.toUpperCase()));
        return [...remote, ...missing];
      }
    } catch {}
    return storageService.getSections();
  },

  async getSubjects(): Promise<Subject[]> {
    return apiClient.get<Subject[]>('/api/subjects', { requiresAuth: false });
  },

  async getFaculty(): Promise<Faculty[]> {
    try {
      const remote = await apiClient.get<Faculty[]>('/api/faculty', { requiresAuth: false });
      if (remote && Array.isArray(remote) && remote.length > 0) {
        const local = storageService.getFaculty();
        const existingNames = new Set(remote.map(f => f.name?.toUpperCase()));
        const missing = local.filter(f => !existingNames.has(f.name?.toUpperCase()));
        return [...remote, ...missing];
      }
    } catch {}
    return storageService.getFaculty();
  },

  async getStudents(): Promise<Student[]> {
    return apiClient.get<Student[]>('/api/students', { requiresAuth: false });
  },

  async getChanges(): Promise<TimetableChange[]> {
    return apiClient.get<TimetableChange[]>('/api/changes', { requiresAuth: true });
  },

  async getNotifications(): Promise<UserNotification[]> {
    return apiClient.get<UserNotification[]>('/api/notifications', { requiresAuth: true });
  }
};
