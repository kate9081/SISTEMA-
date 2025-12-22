import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
// Nota: Removemos useAppStore porque ahora usamos SQL directo
// import { useAppStore } from '@/store/useAppStore'; 
import { useAuthStore } from '@/store/useAuthStore'; // AUTH
import { Professional } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/search-input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from 'sonner';
import { Plus, Trash2, Edit, RefreshCw } from 'lucide-react';

export default function Professionals() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // === CANDADO DE SEGURIDAD EXCLUSIVO PARA ADMIN ===
  // Solo los usuarios con permiso de creación (como admin) pueden entrar aquí
  const isAdmin = user?.permissions?.create === true;

  useEffect(() => {
    if (!isAdmin) {
        toast.error("Acceso denegado: Solo Administrador.");
        navigate('/'); // Expulsado
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  // =================================================

  // ESTADOS LOCALES (Datos desde SQL)
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Professional>>({
    rut: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    position: 'Asistente Social',
    status: 'Active'
  });

  // 1. CARGAR DATOS DESDE SQL
  const fetchProfessionals = async () => {
    setIsLoading(true);
    try {
        const res = await fetch('http://localhost:3001/api/profesionales');
        const data = await res.json();
        
        if (data.success) {
            // Mapeamos lo que llega de SQL a tu interfaz Professional
            // Asumimos que tu API devuelve columnas: Rut, Nombre, Cargo, Activo
            const mapped = data.data.map((p: any) => ({
                id: p.Id,
                rut: p.Rut,
                firstName: p.Nombre, // Si en SQL guardas nombre completo, tendrás que ajustar esto o separar en SQL
                lastName: '', // SQL simple tenía solo "Nombre", ajusta si creaste columnas separadas
                position: p.Cargo,
                status: p.Activo ? 'Active' : 'Inactive',
                // Campos opcionales si los agregaste a SQL
                email: '', 
                phone: ''
            }));
            setProfessionals(mapped);
        }
    } catch (error) {
        console.error(error);
        toast.error("Error al conectar con el servidor");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfessionals();
  }, []);

  const resetForm = () => {
    setFormData({
      rut: '',
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      position: 'Asistente Social',
      status: 'Active'
    });
    setEditingId(null);
  };

  const handleOpenDialog = (prof?: Professional) => {
    if (prof) {
      setEditingId(prof.rut);
      setFormData(prof);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // 2. GUARDAR (INSERT / UPDATE)
  const handleSave = async () => {
    if (!formData.rut || !formData.firstName) {
      toast.error('RUT y Nombre son obligatorios');
      return;
    }

    try {
        // Adaptamos los datos para que coincidan con lo que espera tu API SQL
        // NOTA: Tu API SQL actual espera { rut, nombre, cargo }
        const payload = {
            rut: formData.rut,
            nombre: `${formData.firstName} ${formData.lastName || ''}`.trim(),
            cargo: formData.position
        };

        // Si tuvieras un endpoint de editar, usarías PUT aquí.
        // Como en el main.js anterior solo creamos "agregar" y "borrar",
        // usaremos "agregar" para nuevos. 
        // Si necesitas editar, deberás agregar el endpoint PUT en main.js primero.
        
        if (editingId) {
             // Lógica de edición (Pendiente de implementar en backend si no existe)
             toast.warning("Edición no implementada en backend aún. Borre y cree de nuevo.");
             return;
        } 

        const res = await fetch('http://localhost:3001/api/profesionales/agregar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            toast.success('Profesional creado en SQL');
            setIsDialogOpen(false);
            resetForm();
            fetchProfessionals();
        } else {
            const err = await res.json();
            toast.error("Error: " + (err.error || "No se pudo guardar"));
        }
    } catch (error) {
        toast.error("Error de conexión");
    }
  };

  // 3. ELIMINAR (Soft Delete o Hard Delete según tu backend)
  const handleDelete = async (idOrRut: string) => {
    if (!confirm('¿Está seguro de eliminar este profesional?')) return;
    
    // Necesitamos el ID numérico para borrar según tu endpoint actual (/borrar/:id)
    // Buscamos el objeto completo para obtener su ID real de SQL
    const prof = professionals.find(p => p.rut === idOrRut);
    if (!prof || !prof.id) {
        toast.error("Error: No se encontró ID del profesional");
        return;
    }

    try {
        const res = await fetch(`http://localhost:3001/api/profesionales/borrar/${prof.id}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Profesional eliminado');
            fetchProfessionals();
        } else {
            toast.error("Error al eliminar");
        }
    } catch (error) {
        toast.error("Error de conexión");
    }
  };

  const filteredProfessionals = professionals.filter(p => 
    (p.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.rut || '').includes(searchTerm)
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Profesionales (SQL)</h2>
            <p className="text-gray-500 text-sm mt-1">
              Administración del equipo de DIDECO. ({professionals.length} registros)
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchProfessionals} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Recargar
            </Button>
            <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" /> Nuevo Profesional
            </Button>
          </div>
        </div>

        <div className="flex items-center bg-white p-4 rounded-lg border shadow-sm">
          <SearchInput 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar por nombre o RUT..." 
          />
        </div>

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUT</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando...</TableCell></TableRow>
              ) : filteredProfessionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No se encontraron profesionales.
                  </TableCell>
                </TableRow>
              ) : (
                filteredProfessionals.map((prof) => (
                  <TableRow key={prof.rut}>
                    <TableCell className="font-medium">{prof.rut}</TableCell>
                    <TableCell>{prof.firstName} {prof.lastName}</TableCell>
                    <TableCell>{prof.position}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        prof.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {prof.status === 'Active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {/* Botón editar deshabilitado temporalmente si no hay endpoint PUT */}
                        {/* <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(prof)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button> 
                        */}
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(prof.rut)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Profesional' : 'Nuevo Profesional'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>RUT</Label>
                <Input 
                    value={formData.rut} 
                    onChange={e => setFormData({...formData, rut: e.target.value})} 
                    disabled={!!editingId} 
                    placeholder="12.345.678-9"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>Nombre</Label>
                    <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Apellido</Label>
                    <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
              </div>
              
              {/* Campos opcionales no guardados en SQL actualmente, pero mantenidos en UI */}
              {/* <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div> */}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}