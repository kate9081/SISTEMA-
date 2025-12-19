import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { InventoryItem } from '@/types';
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
import { Plus, Trash2, Edit, Search, Database, ChevronLeft, ChevronRight, Eraser, FileText } from 'lucide-react';
import { SyncButton } from '@/components/ui/SyncButton';

export default function Inventory() {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppStore();
  const { user } = useAuthStore();

  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  const canView = p.read || p.create || p.update || p.delete;
  const canCreate = p.create;
  const canUpdate = p.update;
  const canDelete = p.delete;

  // Estados
  const [searchTerm, setSearchTerm] = useState(''); 
  const [filterYear, setFilterYear] = useState<string>('all'); 
  const [filterOC, setFilterOC] = useState<string>(''); 

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const [formData, setFormData] = useState<Partial<InventoryItem>>({
    code: '', year: new Date().getFullYear(), process: '', description: '', address: '', department: '', section: '', purchasePrice: 0, internalOC: '', publicMarketOC: '', uploadDate: new Date().toISOString().split('T')[0], quantityPurchased: 0, stock: 0,
  });

  if (!canView) return <MainLayout><div className="flex justify-center h-full items-center">Acceso denegado</div></MainLayout>;

  useEffect(() => { setCurrentPage(1); }, [searchTerm, filterYear, filterOC]);

  const resetForm = () => {
    setFormData({ code: '', year: new Date().getFullYear(), process: '', description: '', address: '', department: '', section: '', purchasePrice: 0, internalOC: '', publicMarketOC: '', uploadDate: new Date().toISOString().split('T')[0], quantityPurchased: 0, stock: 0, });
    setEditingItem(null);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterYear('all');
    setFilterOC('');
    toast.info("Filtros limpios");
  };

  const handleOpenDialog = (item?: InventoryItem) => {
    if (item) { if(!canUpdate) return; setEditingItem(item); setFormData(item); } 
    else { if(!canCreate) return; resetForm(); }
    setIsDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.code || !formData.description) { toast.error('Datos incompletos'); return; }
    const itemData = formData as InventoryItem;
    if (editingItem) { updateInventoryItem(editingItem.id, itemData); toast.success('Actualizado'); } 
    else { addInventoryItem({ ...itemData, id: crypto.randomUUID() }); toast.success('Creado'); }
    setIsDialogOpen(false); resetForm();
  };

  const handleDelete = (id: string) => {
    if (!canDelete) return;
    if (confirm('¿Eliminar?')) { deleteInventoryItem(id); toast.success('Eliminado'); }
  };

  const filteredInventory = inventory.filter(item => {
    const searchTerms = searchTerm.toLowerCase().trim().split(/\s+/);
    const itemData = `${item.code} ${item.name} ${item.description} ${item.internalOC} ${item.department}`.toLowerCase();
    const matchesSearch = searchTerms.every(term => itemData.includes(term));
    const matchesYear = filterYear === 'all' || item.year.toString() === filterYear;
    return matchesSearch && matchesYear;
  });

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredInventory.slice(startIndex, startIndex + itemsPerPage);
  
  const currentYear = new Date().getFullYear();
  const yearsList = Array.from({length: 6}, (_, i) => (currentYear - i).toString());

  return (
    <MainLayout>
      <div className="space-y-6">
        {/* === ENCABEZADO SUPERIOR === */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Inventario</h2>
            <p className="text-gray-500 text-sm mt-1">Registros: {filteredInventory.length} / {inventory.length}</p>
          </div>
          <div className="flex gap-2">
            {canCreate && (
                <>
                    {/* BOTÓN 1: SINCRONIZAR GENERAL (Ubicado arriba) */}
                    <SyncButton yearFilter={filterYear} ocFilter={filterOC} isSearchBtn={false} />
                    
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="mr-2 h-4 w-4" /> Nuevo Manual
                    </Button>
                </>
            )}
          </div>
        </div>

        {/* === BARRA DE FILTROS === */}
        <div className="bg-slate-50 border p-4 rounded-xl shadow-sm space-y-4">
          
          <div className="flex flex-col lg:flex-row gap-6">
            
            {/* GRUPO 1: FILTROS SQL */}
            <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-blue-600" />
                  <Label className="text-xs font-bold text-blue-900 uppercase">Filtros SQL</Label>
               </div>
               
               <div className="flex flex-wrap gap-2 items-end">
                  {/* Selector Año */}
                  <div className="w-[110px]">
                      <Label className="text-[10px] text-gray-500 mb-1 block">Año</Label>
                      <Select value={filterYear} onValueChange={setFilterYear}>
                          <SelectTrigger className="bg-white h-9"><SelectValue /></SelectTrigger>
                          <SelectContent>
                              <SelectItem value="all">Todos</SelectItem>
                              {yearsList.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                          </SelectContent>
                      </Select>
                  </div>

                  {/* Input OC */}
                  <div className="flex-1 min-w-[150px]">
                      <Label className="text-[10px] text-gray-500 mb-1 block">N° Orden de Compra</Label>
                      <Input 
                          placeholder="Ej: 450" 
                          className="bg-white h-9"
                          value={filterOC}
                          onChange={(e) => setFilterOC(e.target.value)} 
                      />
                  </div>

                  {/* BOTÓN 2: BUSCAR OC (Ubicado junto al input OC) */}
                  <SyncButton yearFilter={filterYear} ocFilter={filterOC} isSearchBtn={true} />
               </div>
            </div>

            <div className="hidden lg:block w-px bg-gray-200 self-stretch mx-2"></div>

            {/* GRUPO 2: BUSCADOR LOCAL */}
            <div className="flex-1 space-y-2">
               <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-gray-600" />
                  <Label className="text-xs font-bold text-gray-700 uppercase">Filtros Locales</Label>
               </div>
               
               <div className="flex gap-2 items-end">
                  <div className="flex-1">
                      <Label className="text-[10px] text-gray-500 mb-1 block">Buscador Rápido (Texto)</Label>
                      <Input 
                          value={searchTerm} 
                          onChange={(e) => setSearchTerm(e.target.value)} 
                          placeholder="Nombre, código..." 
                          className="bg-white h-9"
                      />
                  </div>
                  
                  {/* BOTÓN LIMPIAR */}
                  <Button 
                    variant="ghost" 
                    onClick={clearAllFilters} 
                    className="h-9 text-red-500 hover:bg-red-50"
                    title="Limpiar filtros"
                  >
                    <Eraser className="h-4 w-4 mr-2" />
                    Limpiar
                  </Button>
               </div>
            </div>

          </div>
        </div>

        {/* TABLA */}
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>Depto</TableHead>
                <TableHead>Año</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>OC</TableHead>
                {(canUpdate || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length === 0 ? <TableRow><TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Sin datos. Use "Buscar" o "Sincronizar SQL".</TableCell></TableRow> : 
                currentItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-xs">{item.code}</TableCell>
                    <TableCell className="max-w-[300px] truncate text-xs" title={item.description}>{item.description}</TableCell>
                    <TableCell className="text-xs font-semibold text-blue-600">{item.department ? `Depto ${item.department}` : '-'}</TableCell>
                    <TableCell>{item.year}</TableCell>
                    <TableCell>${item.purchasePrice ? item.purchasePrice.toLocaleString('es-CL') : 0}</TableCell>
                    <TableCell><span className={`px-2 py-1 rounded-full text-xs font-semibold ${item.stock <= 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>{item.stock}</span></TableCell>
                    <TableCell className="text-xs">{item.internalOC || '-'}</TableCell>
                    {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            {canUpdate && <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(item)}><Edit className="h-4 w-4" /></Button>}
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

        <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-gray-500">Página {currentPage} de {totalPages || 1}</div>
            <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1}><ChevronLeft className="h-4 w-4 mr-1" /></Button>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages || totalPages === 0}><ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editingItem ? 'Editar' : 'Nuevo'} Producto</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-2"><Label>Código</Label><Input value={formData.code} onChange={e => setFormData({...formData, code: e.target.value})} /></div>
              <div className="space-y-2"><Label>Año</Label><Input type="number" value={formData.year} onChange={e => setFormData({...formData, year: parseInt(e.target.value) || 0})} /></div>
              <div className="space-y-2 md:col-span-2"><Label>Descripción</Label><Input value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} /></div>
              <div className="space-y-2"><Label>Departamento</Label><Input value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} /></div>
              <div className="space-y-2"><Label>Sección</Label><Input value={formData.section} onChange={e => setFormData({...formData, section: e.target.value})} /></div>
              <div className="space-y-2"><Label>Precio Compra</Label><Input type="number" value={formData.purchasePrice} onChange={e => setFormData({...formData, purchasePrice: parseInt(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>OC Interna</Label><Input value={formData.internalOC} onChange={e => setFormData({...formData, internalOC: e.target.value})} /></div>
              <div className="space-y-2"><Label>OC MP</Label><Input value={formData.publicMarketOC} onChange={e => setFormData({...formData, publicMarketOC: e.target.value})} /></div>
              <div className="space-y-2"><Label>Fecha Subida</Label><Input type="date" value={formData.uploadDate} onChange={e => setFormData({...formData, uploadDate: e.target.value})} /></div>
              <div className="space-y-2"><Label>Cant. Comprada</Label><Input type="number" value={formData.quantityPurchased} onChange={e => setFormData({...formData, quantityPurchased: parseInt(e.target.value) || 0})} /></div>
              <div className="space-y-2"><Label>Stock Actual</Label><Input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: parseInt(e.target.value) || 0})} /></div>
            </div>
            <DialogFooter><Button onClick={handleSave}>Guardar</Button></DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}