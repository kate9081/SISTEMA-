import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAppStore } from '@/store/useAppStore';
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
import { Plus, Trash2, Edit } from 'lucide-react';

export default function Professionals() {
  const { professionals, addProfessional, updateProfessional, deleteProfessional } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // === CANDADO DE SEGURIDAD EXCLUSIVO PARA ADMIN ===
  const isAdmin = user?.username === 'admin' || user?.rut === 'admin';

  useEffect(() => {
    if (!isAdmin) {
        toast.error("Acceso denegado: Solo Administrador.");
        navigate('/'); // Expulsado
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  // =================================================

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

  const handleSave = () => {
    if (!formData.rut || !formData.firstName || !formData.lastName) {
      toast.error('RUT, Nombre y Apellido son obligatorios');
      return;
    }

    const profData = formData as Professional;

    if (editingId) {
      updateProfessional(editingId, profData);
      toast.success('Profesional actualizado');
    } else {
      if (professionals.some(p => p.rut === profData.rut)) {
        toast.error('Ya existe un profesional con este RUT');
        return;
      }
      addProfessional(profData);
      toast.success('Profesional creado');
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (rut: string) => {
    if (confirm('¿Está seguro de eliminar este profesional?')) {
      deleteProfessional(rut);
      toast.success('Profesional eliminado');
    }
  };

  const filteredProfessionals = professionals.filter(p => 
    p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.rut.includes(searchTerm)
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Profesionales</h2>
            <p className="text-gray-500 text-sm mt-1">
              Administración del equipo de DIDECO.
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Profesional
          </Button>
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
                <TableHead>Contacto</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProfessionals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
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
                      <div className="flex flex-col text-xs">
                        <span>{prof.email}</span>
                        <span className="text-gray-500">{prof.phone}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        prof.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {prof.status === 'Active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(prof)}>
                          <Edit className="h-4 w-4 text-blue-600" />
                        </Button>
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
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select 
                    value={formData.status} 
                    onValueChange={(val: any) => setFormData({...formData, status: val})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Active">Activo</SelectItem>
                    <SelectItem value="Inactive">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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