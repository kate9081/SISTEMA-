import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/useAuthStore';
import { useAppStore } from '@/store/useAppStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Eye, EyeOff, Mail } from 'lucide-react';
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

  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);
  const systemUsers = useAppStore((state) => state.systemUsers);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    const user = systemUsers.find(
      (u) => u.username === username && u.password === password && u.status === 'Active'
    );

    if (user) {
      login(user);
      toast.success('Bienvenido al sistema DIDECO');
      navigate('/');
    } else {
      toast.error('Credenciales inválidas o usuario inactivo');
    }
  };

  const handleRecoverPassword = async () => {
    if (!recoverEmail) {
      toast.error("Por favor ingrese un correo electrónico");
      return;
    }

    // 1. Buscar si el correo existe en nuestra "base de datos" local
    const userFound = systemUsers.find(u => u.email && u.email.toLowerCase() === recoverEmail.toLowerCase());

    if (!userFound) {
      toast.error("Este correo no está registrado en el sistema.");
      return;
    }

    setIsSending(true);

    // 2. Preparar el mensaje con los datos del usuario encontrado
    const message = `Hola ${userFound.firstName},\n\n` +
                    `Hemos recibido una solicitud para recuperar tu acceso al sistema DIDECO.\n` +
                    `Tus credenciales actuales son:\n\n` +
                    `Usuario: ${userFound.username}\n` +
                    `Contraseña: ${userFound.password}\n\n` +
                    `Te recomendamos cambiar tu contraseña si crees que ha sido vulnerada.`;

    try {
      // 3. Enviar a través de Electron (Backend)
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
          toast.error("Error técnico al enviar el correo. Verifique la consola o conexión.");
        }
      } else {
        // Fallback solo para desarrollo en navegador web puro
        console.log("Simulación de correo (No estás en Electron):", message);
        toast.warning("Modo web: Correo simulado en consola. Usa la app de escritorio para envío real.");
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
        />
        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"></div>
      </div>

      <Card className="w-full max-w-md z-10 shadow-2xl border-slate-200">
        <CardHeader className="space-y-1 flex flex-col items-center text-center">
          <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
            <img src="/assets/dideco-logo_variant_1.png" alt="Logo" className="w-16 h-16 object-contain" />
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
                  className="pr-10"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full px-3 hover:bg-transparent text-slate-400 hover:text-slate-600"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setIsRecoverOpen(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
              Ingresar
            </Button>
            <div className="text-center text-xs text-muted-foreground mt-4">
              <p>Credenciales por defecto: admin / 123</p>
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
              {isSending ? "Enviando..." : "Enviar Correo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}