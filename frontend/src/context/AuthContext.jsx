import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import * as api from '../api/client';

const AuthContext = createContext(null);

// §7: real backend authentication, protected application routes, explicit
// logout. `user` is null until /auth/me resolves, so ProtectedRoute can
// distinguish "still checking" from "definitely not authenticated" and
// avoid a flash-redirect on refresh.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!api.hasToken()) { setChecked(true); return; }
    api.getMe()
      .then((res) => setUser(res.user))
      .catch(() => { api.clearToken(); setUser(null); })
      .finally(() => setChecked(true));
  }, []);

  async function signIn(password) {
    const res = await api.login(password);
    api.setToken(res.token);
    setUser(res.user);
    return res.user;
  }

  function signOut() {
    api.clearToken();
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, checked, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

export function ProtectedRoute({ children }) {
  const { user, checked } = useAuth();
  const location = useLocation();

  if (!checked) {
    return <div className="center-loading"><div className="spinner" /></div>;
  }
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
