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

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
          <Route path="/professionals" element={<ProtectedRoute><Professionals /></ProtectedRoute>} />
          <Route path="/users" element={<ProtectedRoute><SystemUsers /></ProtectedRoute>} />
          <Route path="/beneficiaries" element={<ProtectedRoute><Beneficiaries /></ProtectedRoute>} />
          <Route path="/benefits-config" element={<ProtectedRoute><BenefitsConfig /></ProtectedRoute>} />
          <Route path="/aid-delivery" element={<ProtectedRoute><AidDelivery /></ProtectedRoute>} />
          <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;