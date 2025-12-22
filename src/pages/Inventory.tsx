import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Trash2, Edit, Search, Database, ChevronLeft, ChevronRight, Eraser, RefreshCw, Plus, Activity } from 'lucide-react';

interface InventoryItem {
  id: number;
  code: string;
  description: string;
  department: string;
  stock: number;
  purchasePrice: number;
  internalOC: string;
  year: number;
  manualStatus: string; // 'AUTO', 'CRITICO', 'NORMAL'
}

export default function Inventory() {
  const { user } = useAuthStore();
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  const canView = p.read || p.create || p.update || p.delete;
  const canCreate = p.create;
  const canUpdate = p.update;
  const canDelete = p.delete;

  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filterYear, setFilterYear] = useState<string>('all'); 
  const [filterOC, setFilterOC] = useState<string>(''); 
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState({
    code: '', description: '', department: '', stock: 0, purchasePrice: 0, internalOC: '',
    status: 'AUTO'
  });

  if (!canView) return <MainLayout><div className="flex justify-center h-full items-center">Acceso denegado</div></MainLayout>;

  const fetchInventory = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/inventario');
      const data = await res.json();
      if (data.success) {
        const mappedItems: InventoryItem[] = data.data.map((i: any) => ({
          id: i.id,
          code: i.code,
          description: i.name,
          department: i.category,
          stock: i.quantity,
          purchasePrice: i.price,
          internalOC: i.oc_limpia,
          year: i.purchaseDate ? new Date(i.purchaseDate).getFullYear() : new Date().getFullYear(),
          manualStatus: i.manualStatus || 'AUTO'
        }));
        setItems(mappedItems);
      }
    } catch (error) { toast.error("Error al conectar con SQL"); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchInventory(); }, []);
  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterYear, filterOC]);

  const clearAllFilters = () => { setSearchTerm(''); setFilterYear('all'); setFilterOC(''); };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) { 
      if(!canUpdate) return; 
      setEditingItem(item); 
      setFormData({
        code: item.code,
        description: item.description,
        department: item.department,
        stock: item.stock,
        purchasePrice: item.purchasePrice,
        internalOC: item.internalOC,
        status: item.manualStatus || 'AUTO'
      });
    } else {
      if(!canCreate) return;
      setEditingItem(null);
      setFormData({
        code: '', description: '', department: '24', stock: 0, purchasePrice: 0, internalOC: '',
        status: 'AUTO'
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.description) return toast.error("Falta la descripción");

    try {
        let url = 'http://localhost:3001/api/inventario/agregar';
        let method = 'POST';
        let body = { 
            code: formData.code,
            description: formData.description,
            department: formData.department,
            stock: formData.stock,
            price: formData.purchasePrice,
            oc: formData.internalOC,
            status: formData.status
        };

        if (editingItem) {
            url = 'http://localhost:3001/api/inventario/editar';
            method = 'PUT';
            body = { 
                id: editingItem.id, 
                nombre: formData.description,
                cantidad: formData.stock,
                precio: formData.purchasePrice,
                oc: formData.internalOC,
                status: formData.status
            } as any;
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            toast.success('Guardado correctamente');
            setIsDialogOpen(false);
            fetchInventory();
        } else { toast.error('Error al guardar'); }
    } catch (error) { toast.error('Error de conexión'); }
  };

  const handleDelete = async (id: number) => {
    if (!canDelete) return;
    if (confirm('¿Eliminar?')) {
        try {
            const res = await fetch(`http://localhost:3001/api/inventario/borrar/${id}`, { method: 'DELETE' });
            if (res.ok) { toast.success('Eliminado'); fetchInventory(); }
        } catch (error) { toast.error('Error al borrar'); }
    }
  };

  const filteredInventory = items.filter(item => {
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    const itemData = `${item.code} ${item.description} ${item.internalOC} ${item.department}`.toLowerCase();
    const matchesSearch = searchTerms.every(term => itemData.includes(term));
    const matchesYear = filterYear === 'all' || item.year.toString() === filterYear;
    const matchesOC = filterOC === '' || item.internalOC.includes(filterOC);
    return matchesSearch && matchesYear && matchesOC;
  });

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({length: 6}, (_, i) => (currentYear - i).toString());

  // Lógica de Color
  const getStockColor = (stock: number, status: string) => {
    if (status === 'CRITICO') return 'bg-red-100 text-red-700 border-red-200';
    if (status === 'NORMAL') return 'bg-green-100 text-green-700 border-green-200';
    // AUTO:
    return stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';
  };
  
  const getStockLabel = (status: string) => {
      if (status === 'CRITICO') return ' (M)';
      if (status === 'NORMAL') return ' (M)';
      return '';
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inventario (Base Social)</h2>
            <p className="text-gray-500 text-sm mt-1">Registros: {filteredInventory.length} / {items.length}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={fetchInventory} disabled={isLoading}><RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Recargar</Button>
            {canCreate && (<Button onClick={() => handleOpenDialog()} className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Nuevo Manual</Button>)}
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-slate-50 border p-4 rounded-xl shadow-sm space-y-4">
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* 1. BÚSQUEDA RÁPIDA (AHORA A LA IZQUIERDA) */}
            <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2"><Search className="h-4 w-4 text-gray-600" /><Label className="text-xs font-bold text-gray-700 uppercase">Búsqueda Rápida</Label></div>
               <div className="flex gap-2 items-end">
                  <div className="flex-1"><Label className="text-[10px] text-gray-500 mb-1 block">Descripción / Código</Label><Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Escriba para buscar..." className="bg-white h-9"/></div>
                  <Button variant="ghost" onClick={clearAllFilters} className="h-9 text-red-500 hover:bg-red-50"><Eraser className="h-4 w-4 mr-2" />Limpiar</Button>
               </div>
            </div>

            <div className="hidden lg:block w-px bg-gray-200 self-stretch mx-2"></div>

            {/* 2. FILTROS SQL (AHORA A LA DERECHA) */}
            <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2"><Database className="h-4 w-4 text-blue-600" /><Label className="text-xs font-bold text-blue-900 uppercase">Filtros SQL</Label></div>
               <div className="flex gap-2 items-end">
                  <div className="w-[110px]">
                      <Label className="text-[10px] text-gray-500 mb-1 block">Año</Label>
                      <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="all">Todos</SelectItem>{yearsList.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
                      </Select>
                  </div>
                  <div className="flex-1"><Label className="text-[10px] text-gray-500 mb-1 block">OC</Label><Input placeholder="Buscar OC..." className="bg-white h-9" value={filterOC} onChange={(e) => setFilterOC(e.target.value)} /></div>
               </div>
            </div>

          </div>
        </div>

        {/* Tabla */}
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Depto</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>OC</TableHead>
                {(canUpdate || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? <TableRow><TableCell colSpan={8} className="text-center py-8">Cargando...</TableCell></TableRow> : 
               currentItems.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin resultados.</TableCell></TableRow> :
                currentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">{item.code}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs" title={item.description}>{item.description}</TableCell>
                    <TableCell className="text-xs font-semibold text-blue-600">{item.department}</TableCell>
                    <TableCell>${item.purchasePrice?.toLocaleString()}</TableCell>
                    <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold border ${getStockColor(item.stock, item.manualStatus)}`}>
                            {item.stock} {getStockLabel(item.manualStatus)}
                        </span>
                    </TableCell>
                    <TableCell className="text-xs">{item.internalOC}</TableCell>
                    {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            {canUpdate && <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4 text-blue-600" /></Button>}
                            {canDelete && <Button variant="ghost" size="icon" className="text-red-500" onClick={() => handleDelete(item.id)}><Trash2 className="h-4 w-4" /></Button>}
                        </div>
                        </TableCell>
                    )}
                  </TableRow>
                ))
              }
            </TableBody>
          </Table>
        </div>
        
        {/* Paginación */}
        <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-gray-500">Página {currentPage} de {totalPages || 1}</div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
        </div>

        {/* Modal */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editingItem ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle></DialogHeader>
            <div className="space-y-4 py-4">
              
              <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                      <Label>Código</Label>
                      <Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} disabled={!!editingItem} placeholder="Ej: MAN-001" />
                  </div>
                  <div className="space-y-2">
                      <Label>Departamento</Label>
                      <Input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} disabled={!!editingItem} />
                  </div>
              </div>

              <div className="space-y-2">
                  <Label>Descripción</Label>
                  <Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                    <Label>Stock</Label>
                    <Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                    <Label>Precio</Label>
                    <Input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: parseInt(e.target.value) || 0})} />
                </div>
                <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Activity className="w-3 h-3"/> Estado</Label>
                    <Select value={formData.status} onValueChange={(val) => setFormData({...formData, status: val})}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="AUTO">Automático (0-5)</SelectItem>
                            <SelectItem value="NORMAL">Siempre Normal</SelectItem>
                            <SelectItem value="CRITICO">Siempre Crítico</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
              </div>
              
              <div className="space-y-2">
                  <Label>Orden de Compra</Label>
                  <Input value={formData.internalOC} onChange={e => setFormData({...formData, internalOC: e.target.value})} placeholder="Ej: OC-12345" />
              </div>

            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}