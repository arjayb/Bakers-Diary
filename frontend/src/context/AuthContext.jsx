import { createContext, useContext, useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import * as api from '../api/client';

const AuthContext = createContext(null);
export function AuthProvider({ children }) {
  const [user,setUser]=useState(null); const [checked,setChecked]=useState(false);
  useEffect(()=>{
    if(api.isOfflineEdition()) { api.getMe().then(r=>setUser(r.user)).finally(()=>setChecked(true)); return; }
    if(!api.hasToken()){setChecked(true);return}
    api.getMe().then(r=>setUser(r.user)).catch(()=>{api.clearToken();setUser(null)}).finally(()=>setChecked(true));
  },[]);
  async function signIn(password){const res=await api.login(password);api.setToken(res.token);setUser(res.user);return res.user}
  function signOut(){if(api.isOfflineEdition())return;api.clearToken();setUser(null)}
  return <AuthContext.Provider value={{user,checked,signIn,signOut,offlineEdition:api.isOfflineEdition()}}>{children}</AuthContext.Provider>;
}
export function useAuth(){const ctx=useContext(AuthContext);if(!ctx)throw new Error('useAuth must be used inside AuthProvider');return ctx}
export function ProtectedRoute({children}){const{user,checked}=useAuth();const location=useLocation();if(!checked)return <div className="center-loading"><div className="spinner" /></div>;if(!user)return <Navigate to="/login" state={{from:location}} replace/>;return children}
