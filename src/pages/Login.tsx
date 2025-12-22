import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Estados para recuperación y visualización
  const [showPassword, setShowPassword] = useState(false);
  const [isRecoverOpen, setIsRecoverOpen] = useState(false);
  const [recoverEmail, setRecoverEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  
  // Estado de carga para el login
  const [isLoading, setIsLoading] = useState(false);

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // === LOGIN CONECTADO A SQL ===
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!username || !password) {
        toast.error("Por favor ingrese usuario y contraseña");
        return;
    }

    setIsLoading(true);

    try {
      // Llamada al backend (main.js -> SQL Server)
      await login({ username, password });
      
      // Si no lanza error, es éxito:
      navigate('/'); 
    } catch (error) {
      console.error("Error en login:", error);
      // El toast de error ya lo maneja el store, pero por seguridad:
      // toast.error('Credenciales inválidas o error de servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverPassword = async () => {
    if (!recoverEmail) {
      toast.error("Por favor ingrese un correo electrónico");
      return;
    }

    setIsSending(true);

    try {
      // NOTA: Como ahora usamos SQL, no tenemos la lista de usuarios localmente para buscar la contraseña.
      // Para producción, deberías crear un endpoint '/api/recuperar' en el backend.
      // Aquí mantenemos la lógica de envío IPC si tienes configurado el mailer en Electron,
      // pero enviamos un mensaje genérico por seguridad.

      const message = `Hola,\n\n` +
                      `Hemos recibido una solicitud para recuperar tu acceso al sistema DIDECO.\n` +
                      `Por seguridad, contacta al administrador del sistema para restablecer tu contraseña.\n\n` +
                      `Si no solicitaste esto, ignora este mensaje.`;

      if (window.require) {
        const { ipcRenderer } = window.require('electron');
        const result = await ipcRenderer.invoke('send-email', {
          to: recoverEmail,
          subject: 'Recuperación de Contraseña - Sistema DIDECO',
          text: message
        });

        if (result.success) {
          toast.success(`Correo enviado exitosamente a ${recoverEmail}`);
          setIsRecoverOpen(false);
          setRecoverEmail('');
        } else {
          console.error(result.error);
          toast.error("Error técnico al enviar el correo.");
        }
      } else {
        // Fallback web
        console.log("Simulación de correo:", message);
        toast.success("Solicitud enviada (Simulación)");
        setIsRecoverOpen(false);
      }

    } catch (error) {
      console.error(error);
      toast.error("Ocurrió un error de comunicación.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 relative">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img 
          src="/assets/login-bg-community.jpg" 
          alt="Background" 
          className="w-full h-full object-cover"
          onError={(e) => e.currentTarget.style.display = 'none'} // Fallback si no hay imagen
        />
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      </div>

      <Card className="w-full max-w-md z-10 shadow-2xl border-slate-200">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            {/* Si no tienes el logo, usa un texto o ícono */}
            <img 
                src="/assets/dideco-logo_variant_1.png" 
                alt="DIDECO" 
                className="w-16 h-16 object-contain"
                onError={(e) => {
                    e.currentTarget.style.display = 'none';
                    e.currentTarget.parentElement!.innerText = "D"; // Fallback visual
                    e.currentTarget.parentElement!.className += " text-white text-3xl font-bold";
                }} 
            />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">DIDECO</CardTitle>
          <CardDescription>Gestor de Ayudas Sociales</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                placeholder="Ingrese su usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Ingrese su contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecoverOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                  disabled={isLoading}
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
              {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Conectando...
                  </>
              ) : (
                  "Ingresar"
              )}
            </Button>
            <div className="text-center text-xs text-muted-foreground mt-4">
              <p>Credenciales por defecto: admin / 1234</p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Dialog open={isRecoverOpen} onOpenChange={setIsRecoverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Contraseña</DialogTitle>
            <DialogDescription>
              Ingrese el correo asociado a su cuenta.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="email">Correo Electrónico</Label>
              <div className="relative">
                <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  placeholder="ejemplo@munisanpedro.cl"
                  className="pl-9"
                  value={recoverEmail}
                  onChange={(e) => setRecoverEmail(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRecoverOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleRecoverPassword} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={isSending}
            >
              {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {isSending ? "Enviando..." : "Enviar Correo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}