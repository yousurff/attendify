// Authentication utilities

export const setUser = (user) => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const removeUser = () => {
  localStorage.removeItem('user');
};

export const isAuthenticated = () => {
  return getUser() !== null;
};

export const isAdmin = () => {
  const user = getUser();
  return user?.role === 'admin';
};

export const isTeacher = () => {
  const user = getUser();
  return user?.role === 'teacher';
};

export const getUserRole = () => {
  const user = getUser();
  return user?.role || null;
};