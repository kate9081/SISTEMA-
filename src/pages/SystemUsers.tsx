import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/useAuthStore'; 
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchInput } from '@/components/ui/search-input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
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
import { Plus, Trash2, Edit, RefreshCw, Loader2 } from 'lucide-react';

export default function SystemUsers() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // === CANDADO EXCLUSIVO PARA ADMIN ===
  // Verificamos por ROL (que viene de la base de datos)
  const isAdmin = user?.role === 'ADMIN';

  useEffect(() => {
    // Si no hay usuario o no es admin, fuera.
    if (user && !isAdmin) {
      toast.error("Acceso denegado: Solo Administrador.");
      navigate('/'); 
    }
  }, [user, isAdmin, navigate]);

  // Si no es admin, no renderizamos nada (o null)
  if (!isAdmin) return null;
  // ====================================

  // ESTADOS LOCALES (DATOS DE SQL)
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any | null>(null);

  // Estado del formulario
  const [formData, setFormData] = useState({
    rut: '',
    firstName: '',
    lastName: '',
    position: '',
    email: '',
    status: 'Active',
    username: '',
    password: '',
    role: 'USER', // Agregamos Rol para que coincida con SQL
    permissions: { create: false, read: true, update: false, delete: false }
  });

  // 1. CARGAR USUARIOS DESDE SQL
  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/usuarios');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      } else {
        toast.error("Error al obtener usuarios");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error de conexión con el servidor");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const resetForm = () => {
    setFormData({
      rut: '',
      firstName: '',
      lastName: '',
      position: '',
      email: '',
      status: 'Active',
      username: '',
      password: '',
      role: 'USER',
      permissions: { create: false, read: true, update: false, delete: false }
    });
    setEditingItem(null);
  };

  const handleOpenDialog = (item?: any) => {
    if (item) {
      setEditingItem(item);
      setFormData(item);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  // 2. GUARDAR (CREAR / EDITAR EN SQL)
  const handleSave = async () => {
    // Validar campos obligatorios
    if (!formData.rut || !formData.username || !formData.password || !formData.email) {
      toast.error('RUT, Usuario, Email y Contraseña son obligatorios');
      return;
    }

    try {
      let url = 'http://localhost:3001/api/usuarios/agregar';
      let method = 'POST';
      let payload: any = { ...formData };

      if (editingItem) {
        url = 'http://localhost:3001/api/usuarios/editar';
        method = 'PUT';
        // Para editar necesitamos el ID numérico de SQL
        payload = { ...formData, id: editingItem.id };
      }

      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toast.success(editingItem ? 'Usuario actualizado' : 'Usuario creado');
        setIsDialogOpen(false);
        resetForm();
        fetchUsers(); // Recargar la tabla
      } else {
        const err = await res.json();
        toast.error("Error: " + (err.error || "No se pudo guardar"));
      }
    } catch (error) {
      toast.error("Error de conexión al guardar");
    }
  };

  // 3. ELIMINAR (EN SQL)
  const handleDelete = async (userToDelete: any) => {
    // Protección para no borrar al propio admin logueado o al superadmin base
    if (userToDelete.username === 'admin' || userToDelete.id === user?.id) {
      toast.error('No se puede eliminar este usuario administrador');
      return;
    }

    if (confirm('¿Está seguro de eliminar este usuario?')) {
      try {
        const res = await fetch(`http://localhost:3001/api/usuarios/borrar/${userToDelete.id}`, { method: 'DELETE' });
        if (res.ok) {
          toast.success('Usuario eliminado');
          fetchUsers();
        } else {
          toast.error("Error al eliminar");
        }
      } catch (error) {
        toast.error("Error de conexión");
      }
    }
  };

  const filteredData = users.filter(item => 
    item.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.username.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Gestor de Usuarios (SQL)</h2>
            <p className="text-gray-500 text-sm">Administración de acceso al sistema.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchUsers} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                Recargar
            </Button>
            <Button onClick={() => handleOpenDialog()}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo
            </Button>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <SearchInput 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar por RUT, Nombre o Usuario..." 
          />
        </div>

        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUT</TableHead>
                <TableHead>Usuario</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>Cargo/Rol</TableHead>
                <TableHead>Permisos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                 <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando datos...</TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No se encontraron usuarios
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.rut}</TableCell>
                    <TableCell>{item.username}</TableCell>
                    <TableCell>{item.email}</TableCell>
                    <TableCell>{item.firstName} {item.lastName}</TableCell>
                    <TableCell>
                        {item.role === 'ADMIN' ? 
                            <Badge variant="default" className="bg-slate-800">Admin</Badge> : 
                            <span className="text-gray-600">{item.position || 'Usuario'}</span>
                        }
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1 flex-wrap">
                        {item.permissions.read && <Badge variant="secondary" className="text-xs">Ver</Badge>}
                        {item.permissions.create && <Badge variant="outline" className="text-green-600 bg-green-50 text-xs border-green-200">Crear</Badge>}
                        {item.permissions.update && <Badge variant="outline" className="text-amber-600 bg-amber-50 text-xs border-amber-200">Edit</Badge>}
                        {item.permissions.delete && <Badge variant="outline" className="text-red-600 bg-red-50 text-xs border-red-200">Elim</Badge>}
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
                          <Edit className="h-4 w-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600" onClick={() => handleDelete(item)}>
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
                  <Input value={formData.rut} onChange={e => setFormData({...formData, rut: e.target.value})} disabled={!!editingItem} placeholder="12.345.678-9"/>
                </div>
                <div className="space-y-2">
                  <Label>Usuario (Login)</Label>
                  <Input value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Correo Electrónico</Label>
                <Input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="ejemplo@munisanpedro.cl" />
              </div>

              <div className="space-y-2">
                <Label>Contraseña</Label>
                <Input type="text" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} placeholder="Ingrese contraseña" />
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cargo</Label>
                  <Input value={formData.position} onChange={e => setFormData({...formData, position: e.target.value})} />
                </div>
                <div className="space-y-2">
                    <Label>Rol del Sistema</Label>
                    <Select value={formData.role} onValueChange={val => setFormData({...formData, role: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="USER">Usuario Estándar</SelectItem>
                            <SelectItem value="ADMIN">Administrador</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
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
                    <Label htmlFor="perm-delete" className="text-red-600">ELIMINAR</Label>
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