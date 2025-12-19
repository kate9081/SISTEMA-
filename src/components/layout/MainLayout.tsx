import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Package,
  Users,
  UserCog,
  HeartHandshake,
  FileText,
  LogOut,
  Menu,
  X,
  Settings,
  ShieldCheck
} from 'lucide-react';

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();

  const isAdmin = user?.username === 'admin' || user?.rut === 'admin';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // 1. Items Generales (Arriba)
  const generalItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/inventory', label: 'Inventario', icon: Package },
    { path: '/beneficiaries', label: 'Beneficiarios', icon: Users },
    { path: '/benefits-config', label: 'Mantenedor Ayudas', icon: Settings },
    { path: '/aid-delivery', label: 'Gestión Ayudas', icon: HeartHandshake },
    { path: '/reports', label: 'Reportes', icon: FileText },
  ];

  // 2. Items de Admin (Abajo)
  const adminItems = [
    { path: '/professionals', label: 'Profesionales', icon: UserCog },
    { path: '/users', label: 'Usuarios Sistema', icon: Users },
  ];

  // Lista completa solo para el título del header
  const allNavItems = [...generalItems, ...adminItems];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white 
          transition-transform duration-300 ease-in-out flex flex-col
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} 
          lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen
        `}
      >
        {/* HEADER DEL SIDEBAR */}
        <div className="flex items-center justify-between h-16 px-4 bg-slate-950 shrink-0">
          <div className="flex items-center gap-2 font-bold text-xl">
            <img src="/assets/dideco-logo.png" alt="Logo" className="h-8 w-8 object-contain bg-white rounded-full p-0.5" />
            <span>DIDECO</span>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400 hover:text-white">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* INFO USUARIO */}
        <div className="p-4 border-b border-slate-800 shrink-0">
          <p className="text-sm text-slate-400">Bienvenido,</p>
          <p className="font-medium truncate">{user?.firstName} {user?.lastName}</p>
          <p className="text-xs text-slate-500">{isAdmin ? 'Administrador' : (user?.position || 'Usuario')}</p>
        </div>

        {/* NAVEGACIÓN PRINCIPAL (OCUPA EL ESPACIO DISPONIBLE) */}
        <nav className="p-4 space-y-1 flex-1 overflow-y-auto custom-scrollbar">
          {generalItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsSidebarOpen(false)} 
                className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* ZONA INFERIOR (PEGA AL FONDO SIEMPRE) */}
        <div className="shrink-0 bg-slate-900 z-10">
          
          {/* MÓDULOS ADMIN */}
          {isAdmin && (
            <div className="px-4 pb-2 pt-4 border-t border-slate-800">
              <div className="flex items-center gap-2 mb-2 px-2 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <ShieldCheck className="h-3 w-3" />
                <span>Administración</span>
              </div>
              
              <div className="space-y-1">
                {adminItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                    <Link
                        key={item.path}
                        to={item.path}
                        onClick={() => setIsSidebarOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-sm ${
                        isActive
                            ? 'bg-slate-800 text-white'
                            : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                        }`}
                    >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                    </Link>
                    );
                })}
              </div>
            </div>
          )}

          {/* BOTÓN CERRAR SESIÓN */}
          <div className="p-4 border-t border-slate-800 mt-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-red-400 hover:text-red-300 hover:bg-slate-800"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5 mr-2" />
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <header className="bg-white border-b border-slate-200 h-16 flex items-center px-6 shadow-sm shrink-0">
          <button
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden mr-4 text-slate-600"
          >
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-xl font-semibold text-slate-800 truncate">
            {allNavItems.find((i) => i.path === location.pathname)?.label || 'DIDECO'}
          </h1>
        </header>

        {/* El contenido hace scroll independientemente del sidebar */}
        <main className="flex-1 overflow-auto p-6 scroll-smooth">
          {children}
        </main>
      </div>
    </div>
  );
}