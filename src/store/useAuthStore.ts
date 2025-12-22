import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { toast } from 'sonner';

interface AuthState {
  user: User | null;
  login: (data: any) => Promise<void>; // Ahora es asíncrono
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      
      login: async (credentials) => {
        try {
          // CONEXIÓN A SQL PARA LOGIN
          const res = await fetch('http://localhost:3001/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials)
          });
          
          const data = await res.json();
          
          if (data.success) {
            set({ user: data.user });
            toast.success(`Bienvenido, ${data.user.firstName}`);
            
            // Opcional: Redirigir aquí si usas useNavigate dentro de un componente
          } else {
            toast.error(data.message || "Error de credenciales");
            throw new Error("Login failed");
          }
        } catch (error) {
          console.error(error);
          toast.error("Error al conectar con el servidor");
          throw error;
        }
      },

      logout: () => {
        set({ user: null });
        toast.info("Sesión cerrada");
      },
    }),
    {
      name: 'auth-storage',
    }
  )
);