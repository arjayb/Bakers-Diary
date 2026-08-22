import { Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { AuthProvider, useAuth, ProtectedRoute } from './context/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { BottomNav, TopNav } from './components/ui';

import LoginPage from './pages/LoginPage';
import DedicationPage from './pages/DedicationPage';
import Dashboard from './pages/Dashboard';
import RecipeList from './pages/RecipeList';
import RecipeDetail from './pages/RecipeDetail';
import RecipeEditor from './pages/RecipeEditor';
import CookMode from './pages/CookMode';
import Journal from './pages/Journal';
import JournalEntry from './pages/JournalEntry';
import Converter from './pages/Converter';
import Nutrition from './pages/Nutrition';
import Groceries from './pages/Groceries';
import More from './pages/More';

// §26 route concept, adapted to this app's actual shape:
//   /               -> /login (see redirect in LoginRoot below)
//   /login /dedication
//   /dashboard
//   /recipes /recipes/new /recipes/:id /recipes/:id/edit
//   /recipes/:id/nutrition /recipes/:id/bakes
//   /cook/:sessionId
//   /journal /journal/:sessionId
//   /converter /groceries /nutrition /more (houses settings, per §9 nav)
export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </AuthProvider>
  );
}

function AppShell() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const bare = ['/login', '/dedication'].includes(location.pathname); // no nav chrome on auth/dedication screens

  return (
    <div className="page">
      {user && !bare && <TopNav onLogout={signOut} />}
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dedication" element={<ProtectedRoute><DedicationPage /></ProtectedRoute>} />

        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />

        <Route path="/recipes" element={<ProtectedRoute><RecipeList /></ProtectedRoute>} />
        <Route path="/recipes/new" element={<ProtectedRoute><RecipeEditor /></ProtectedRoute>} />
        <Route path="/recipes/:id" element={<ProtectedRoute><RecipeDetail /></ProtectedRoute>} />
        <Route path="/recipes/:id/edit" element={<ProtectedRoute><RecipeEditor /></ProtectedRoute>} />
        <Route path="/recipes/:id/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
        <Route path="/recipes/:id/bakes" element={<ProtectedRoute><RecipeBakesRedirect /></ProtectedRoute>} />

        <Route path="/cook/:sessionId" element={<ProtectedRoute><CookMode /></ProtectedRoute>} />

        <Route path="/journal" element={<ProtectedRoute><Journal /></ProtectedRoute>} />
        <Route path="/journal/:sessionId" element={<ProtectedRoute><JournalEntry /></ProtectedRoute>} />

        <Route path="/converter" element={<ProtectedRoute><Converter /></ProtectedRoute>} />
        <Route path="/nutrition" element={<ProtectedRoute><Nutrition /></ProtectedRoute>} />
        <Route path="/groceries" element={<ProtectedRoute><Groceries /></ProtectedRoute>} />
        <Route path="/more" element={<ProtectedRoute><More /></ProtectedRoute>} />

        <Route path="*" element={<NotFound />} />
      </Routes>
      {user && !bare && <BottomNav />}
    </div>
  );
}

// §26 lists /recipes/:id/bakes as a route; a dedicated Bake History screen
// (distinct from Journal) is not built in v0.1 — this route exists so the
// link from RecipeDetail resolves to something rather than a dead link,
// and forwards into Journal instead. See DEVIATIONS in the handoff.
function RecipeBakesRedirect() {
  const { id } = useParams();
  return <Navigate to={`/journal?recipe=${id}`} replace />;
}

function NotFound() {
  return (
    <div className="page-content">
      <div className="empty-state card">
        <h2>Page not found</h2>
        <p>That page doesn't exist in Baker's Diary.</p>
      </div>
    </div>
  );
}
