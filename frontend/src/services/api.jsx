import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/attendify/backend',
  withCredentials: true,
  // Axios artık gönderilen veriye göre (JSON veya FormData) başlığı otomatik seçecek.
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error.response?.data || error.message);
  }
);

// Auth APIs
export const authAPI = {
  login: (credentials) => api.post('/index.php/auth?action=login', credentials),
  logout: () => api.post('/index.php/auth?action=logout'),
  checkAuth: () => api.get('/index.php/auth?action=check'),
  changePassword: (data) => api.post('/index.php/auth?action=change-password', data)
};

// Admin APIs
export const adminAPI = {
  getDashboard: () => api.get('/index.php/admin?action=dashboard'),

  // Teachers
  getTeachers: (activeOnly = true) =>
    api.get(`/index.php/admin?action=teachers&active=${activeOnly}`),
  getTeacher: (id) =>
    api.get(`/index.php/admin?action=teachers&id=${id}`),
  createTeacher: (data) =>
    api.post('/index.php/admin?action=teachers', data),
  updateTeacher: (id, data) =>
    api.put(`/index.php/admin?action=teachers&id=${id}`, data),
  deactivateTeacher: (id) =>
    api.delete(`/index.php/admin?action=teachers&id=${id}`),
  activateTeacher: (id) =>
    api.post(`/index.php/admin?action=activate-teacher&id=${id}`),

  // Students
  getStudents: (activeOnly = true) =>
    api.get(`/index.php/admin?action=students&active=${activeOnly}`),
  getStudent: (id) =>
    api.get(`/index.php/admin?action=students&id=${id}`),
  createStudent: (data) =>
    api.post('/index.php/admin?action=students', data),
  updateStudent: (id, data) =>
    api.post(`/index.php/admin?action=students&id=${id}`, data),
  deactivateStudent: (id) =>
    api.delete(`/index.php/admin?action=students&id=${id}`),
  activateStudent: (id) =>
    api.post(`/index.php/admin?action=activate-student&id=${id}`),

  // Classes
  getClasses: (activeOnly = true) =>
    api.get(`/index.php/admin?action=classes&active=${activeOnly}`),
  getClass: (id) =>
    api.get(`/index.php/admin?action=classes&id=${id}`),
  createClass: (data) =>
    api.post('/index.php/admin?action=classes', data),
  updateClass: (id, data) =>
    api.put(`/index.php/admin?action=classes&id=${id}`, data),
  deleteClass: (id) =>
    api.delete(`/index.php/admin?action=classes&id=${id}`),

  // Feedbacks
  getFeedbacks: () =>
    api.get('/index.php/admin?action=feedbacks'),
  
  getRecentFeedbacks: () => 
    api.get('/index.php/admin?action=recent-feedbacks'),

  markFeedbackRead: (id) =>
    api.post(`/index.php/admin?action=mark-feedback&id=${id}`),

  // Export
  exportData: (type) =>
    api.get(`/index.php/admin?action=export&type=${type}`),

  // --- YENİ EKLENEN: Attendance ---
  // Backend'de AttendanceController.php'ye yönlendirecek şekilde
  // Router yapınıza göre endpoint'i buraya ekliyoruz.
  // Not: index.php ana router dosyanızda 'attendance' case'ini tanımlamayı unutmayın!
  getAllAttendances: () =>
    api.get('/index.php/attendance?action=attendances')
};

// Teacher APIs
export const teacherAPI = {
  getProfile: () =>
    api.get('/index.php/teacher?action=profile'),
  updateProfile: (data) =>
    api.put('/index.php/teacher?action=profile', data),
  sendFeedback: (data) =>
    api.post('/index.php/teacher?action=feedback', data),

  getSentFeedbacks: () => 
    api.get('/index.php/teacher?action=feedback-history'),

  // Classes
  getMyClasses: () =>
    api.get('/index.php/teacher?action=classes'),
  getClassDetails: (id) =>
    api.get(`/index.php/teacher?action=classes&id=${id}`),

  // Students
  getMyStudents: () =>
    api.get('/index.php/teacher?action=students'),

  // Attendance
  startAttendance: (classId) =>
    api.post('/index.php/teacher?action=attendance-start', { class_id: classId }),
  submitAttendance: (data) =>
    api.post('/index.php/teacher?action=attendance-submit', data),
  getMyAttendances: (days = 30) =>
    api.get(`/index.php/teacher?action=attendances&days=${days}`),
  getAttendanceDetails: (id) =>
    api.get(`/index.php/teacher?action=attendances&id=${id}`)
};

export default api;