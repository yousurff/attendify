import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost/attendify/backend',
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

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

export const authAPI = {
  login: (credentials) => api.post('/index.php/auth?action=login', credentials),
  logout: () => api.post('/index.php/auth?action=logout'),
  checkAuth: () => api.get('/index.php/auth?action=check'),
  changePassword: (data) => api.post('/index.php/auth?action=change-password', data)
};

export const adminAPI = {
  getDashboard: () => api.get('/index.php/admin?action=dashboard'),
  getTeachers: (activeOnly = true) => api.get(`/index.php/admin?action=teachers&active=${activeOnly}`),
  getTeacher: (id) => api.get(`/index.php/admin?action=teachers&id=${id}`),
  createTeacher: (data) => api.post('/index.php/admin?action=teachers', data),
  updateTeacher: (id, data) => api.put(`/index.php/admin?action=teachers&id=${id}`, data),
  deactivateTeacher: (id) => api.delete(`/index.php/admin?action=teachers&id=${id}`),
  activateTeacher: (id) => api.post(`/index.php/admin?action=activate-teacher&id=${id}`),
  getStudents: (activeOnly = true) => api.get(`/index.php/admin?action=students&active=${activeOnly}`),
  getStudent: (id) => api.get(`/index.php/admin?action=students&id=${id}`),
  createStudent: (data) => api.post('/index.php/admin?action=students', data),
  updateStudent: (id, data) => api.post(`/index.php/admin?action=students&id=${id}`, data),
  deactivateStudent: (id) => api.delete(`/index.php/admin?action=students&id=${id}`),
  activateStudent: (id) => api.post(`/index.php/admin?action=activate-student&id=${id}`),
  getClasses: (activeOnly = true) => api.get(`/index.php/admin?action=classes&active=${activeOnly}`),
  getClass: (id) => api.get(`/index.php/admin?action=classes&id=${id}`),
  createClass: (data) => api.post('/index.php/admin?action=classes', data),
  updateClass: (id, data) => api.put(`/index.php/admin?action=classes&id=${id}`, data),
  deleteClass: (id) => api.delete(`/index.php/admin?action=classes&id=${id}`),
  getFeedbacks: () => api.get('/index.php/admin?action=feedbacks'),
  getRecentFeedbacks: () => api.get('/index.php/admin?action=recent-feedbacks'),
  markFeedbackRead: (id) => api.post(`/index.php/admin?action=mark-feedback&id=${id}`),
  exportData: (type) => api.get(`/index.php/admin?action=export&type=${type}`),
  getAllAttendances: () => api.get('/index.php/attendance?action=attendances'),
  getExams: (showPast = false) => api.get(`/index.php/admin?action=exams&past=${showPast}`),
  createExam: (data) => api.post('/index.php/admin?action=exams', data),
  deleteExam: (id) => api.delete(`/index.php/admin?action=exams&id=${id}`),
  getExamDetails: (id) => api.get(`/index.php/admin?action=exam-details&id=${id}`),
};

export const teacherAPI = {
  getProfile: () => api.get('/index.php/teacher?action=profile'),
  updateProfile: (data) => api.put('/index.php/teacher?action=profile', data),
  sendFeedback: (data) => api.post('/index.php/teacher?action=feedback', data),
  getSentFeedbacks: () => api.get('/index.php/teacher?action=feedback-history'),
  getMyClasses: () => api.get('/index.php/teacher?action=classes'),
  getClassDetails: (id) => api.get(`/index.php/teacher?action=classes&id=${id}`),
  getMyStudents: () => api.get('/index.php/teacher?action=students'),
  startAttendance: (classId) => api.post('/index.php/teacher?action=attendance-start', { class_id: classId }),
  submitAttendance: (data) => api.post('/index.php/teacher?action=attendance-submit', data),
  getMyAttendances: (days = 30) => api.get(`/index.php/teacher?action=attendances&days=${days}`),
  getAttendanceDetails: (id) => api.get(`/index.php/teacher?action=attendances&id=${id}`),

  getMyExams: () => 
    api.get('/index.php/teacher?action=exams'),
    
  getExamDetails: (examId) => 
    api.get(`/index.php/teacher?action=exam-details&id=${examId}`),
    
  // --- KRİTİK DÜZELTME BURADA YAPILDI ---
  // Headers kısmını kaldırdık, Axios otomatik halledecek.
  checkExamPresence: (formData) =>
    axios.post('http://localhost:8000/recognize', formData)
};

export default api;