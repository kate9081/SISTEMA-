import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Professionals from './pages/Professionals';
import SystemUsers from './pages/SystemUsers';
import Beneficiaries from './pages/Beneficiaries';
import BenefitsConfig from './pages/BenefitsConfig';
import AidDelivery from './pages/AidDelivery';
import Reports from './pages/Reports';
import NotFound from './pages/NotFound';

const queryClient = new QueryClient();

// === 1. PROTECCIÓN DE RUTAS PRIVADAS ===
// Si NO hay usuario, manda al login.
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((state) => state.user);
  // Verificamos si existe el objeto usuario (así sabemos si está logueado)
  return user ? <>{children}</> : <Navigate to="/login" replace />;
};

// === 2. PROTECCIÓN DE RUTA PÚBLICA (LOGIN) ===
// Si YA hay usuario, manda al dashboard (para que no vea el login de nuevo)
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const user = useAuthStore((state) => state.user);
  return user ? <Navigate to="/" replace /> : <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      {/* RichColors hace que los mensajes de éxito/error se vean mejor */}
      <Toaster richColors position="top-center" />
      
      <BrowserRouter>
        <Routes>
          {/* Ruta de Login (Envuelt en PublicRoute) */}
          <Route 
            path="/login" 
            element={
              <PublicRoute>
                <Login />
              </PublicRoute>
            } 
          />
          
          {/* Rutas Protegidas */}
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/professionals" element={<ProtectedRoute><Professionals /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><SystemUsers /></ProtectedRoute>} />
          <Route path="/beneficiaries" element={<ProtectedRoute><Beneficiaries /></ProtectedRoute>} />
          <Route path="/benefits-config" element={<ProtectedRoute><BenefitsConfig /></ProtectedRoute>} />
          <Route path="/aid-delivery" element={<ProtectedRoute><AidDelivery /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          
          {/* Ruta 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;