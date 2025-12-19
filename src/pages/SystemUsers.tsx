import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore'; 
import { SystemUser } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
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

export default function SystemUsers() {
  const { systemUsers, addSystemUser, updateSystemUser, deleteSystemUser } = useAppStore();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // === CANDADO EXCLUSIVO PARA ADMIN ===
  const isAdmin = user?.username === 'admin' || user?.rut === 'admin';

  useEffect(() => {
    if (!isAdmin) {
      navigate('/'); 
      toast.error("Acceso denegado: Solo Administrador.");
    }
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;
  // ====================================

  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SystemUser | null>(null);

  const [formData, setFormData] = useState<SystemUser>({
    rut: '',
    firstName: '',
    lastName: '',
    position: '',
    email: '', // <--- INICIALIZADO
    status: 'Active',
    username: '',
    password: '',
    permissions: { create: false, read: true, update: false, delete: false }
  });

  const resetForm = () => {
    setFormData({
      rut: '',
      firstName: '',
      lastName: '',
      position: '',
      email: '', // <--- RESET
      status: 'Active',
      username: '',
      password: '',
      permissions: { create: false, read: true, update: false, delete: false }
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: SystemUser) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    // Validar que el email no esté vacío
    if (!formData.rut || !formData.username || !formData.password || !formData.email) {
      toast.error('RUT, Usuario, Email y Contraseña son obligatorios');
      return;
    }

    if (editingItem) {
      updateSystemUser(editingItem.rut, formData);
      toast.success('Usuario actualizado');
    } else {
      if (systemUsers.some(u => u.rut === formData.rut || u.username === formData.username)) {
        toast.error('RUT o Usuario ya existe');
        return;
      }
      addSystemUser(formData);
      toast.success('Usuario creado');
    }
    setIsDialogOpen(false);
    resetForm();
  };

  const handleDelete = (rut: string) => {
    if (rut === '11111111-1' || rut === 'admin') {
      toast.error('No se puede eliminar al administrador principal');
      return;
    }
    if (confirm('¿Está seguro de eliminar este usuario?')) {
      deleteSystemUser(rut);
      toast.success('Usuario eliminado');
    }
  };

  const filteredData = systemUsers.filter(item => 
    item.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lastName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Gestor de Usuarios del Sistema</h2>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo
          </Button>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <SearchInput 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar por RUT o Nombre..." 
          />
        </div>

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUT</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead> {/* <--- COLUMNA EMAIL */}
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.rut}>
                    <TableCell className="font-medium">{item.rut}</TableCell>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>{item.email}</TableCell> {/* <--- DATO EMAIL */}
                    <TableCell>{item.firstName} {item.lastName}</TableCell>
                    <TableCell>{item.position}</TableCell>
                    <TableCell>
                      <div className="flex gap-1 text-xs">
                        {item.permissions.read && <span className="bg-blue-100 text-blue-700 px-1 rounded">Ver</span>}
                        {item.permissions.create && <span className="bg-green-100 text-green-700 px-1 rounded">Crear</span>}
                        {item.permissions.update && <span className="bg-yellow-100 text-yellow-700 px-1 rounded">Edit</span>}
                        {item.permissions.delete && <span className="bg-red-100 text-red-700 px-1 rounded">Elim</span>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        item.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                      }`}>
                        {item.status === 'Active' ? 'Activo' : 'Inactivo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item.rut)}>
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
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Usuario' : 'Nuevo Usuario'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>RUT</Label>
                  <Input value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} disabled={!!editingItem} />
                </div>
                <div className="space-y-2">
                  <Label>Usuario</Label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>
              
              {/* <--- INPUT EMAIL AGREGADO */}
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="ejemplo@munisanpedro.cl" />
              </div>

              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombres</Label>
                  <Input value={formData.firstName} onChange={e => setFormData({...formData, firstName: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Apellidos</Label>
                  <Input value={formData.lastName} onChange={e => setFormData({...formData, lastName: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Cargo</Label>
                <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
              </div>
              
              <div className="space-y-2">
                <Label className="mb-2 block">Permisos</Label>
                <div className="grid grid-cols-2 gap-2 border p-3 rounded-md">
                  <div className="flex items-center space-x-2">
                    <Checkbox id="perm-read" checked={formData.permissions.read} onCheckedChange={(c) => setFormData({...formData, permissions: {...formData.permissions, read: !!c}})} />
                    <Label htmlFor="perm-read">LEER (VER)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="perm-create" checked={formData.permissions.create} onCheckedChange={(c) => setFormData({...formData, permissions: {...formData.permissions, create: !!c}})} />
                    <Label htmlFor="perm-create">NUEVO (AGREGAR)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="perm-update" checked={formData.permissions.update} onCheckedChange={(c) => setFormData({...formData, permissions: {...formData.permissions, update: !!c}})} />
                    <Label htmlFor="perm-update">ACTUALIZAR (EDITAR)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="perm-delete" checked={formData.permissions.delete} onCheckedChange={(c) => setFormData({...formData, permissions: {...formData.permissions, delete: !!c}})} />
                    <Label htmlFor="perm-delete">ELIMINAR</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={formData.status} onValueChange={(val: 'Active' | 'Inactive') => setFormData({...formData, status: val})}>
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