import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchInput } from '@/components/ui/search-input';
import { Label } from '@/components/ui/label';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from 'sonner';
import { Plus, Trash2, Edit, Settings, Save } from 'lucide-react';

// Interfaces para manejo de datos
interface BenefitItem {
  id: number | string;
  nombre: string;
}

interface Category {
  id: string;
  name: string;
  items: { id: string; name: string }[];
}

export default function BenefitsConfig() {
  const { user } = useAuthStore();
  
  // PERMISOS
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  const canView = p.read || p.create || p.update || p.delete;
  const canCreate = p.create;
  const canUpdate = p.update;
  const canDelete = p.delete;

  // ESTADOS
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // ESTADOS DEL MODAL
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{id: string, name: string} | null>(null);
  const [itemName, setItemName] = useState('');

  // 1. CARGAR DATOS REALES DEL SERVIDOR
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('http://localhost:3001/api/ayudas');
      if (!response.ok) throw new Error("Error de conexión");
      
      const data = await response.json();
      
      // Transformar datos del backend al formato visual
      const formatted: Category[] = Object.entries(data).map(([catName, items]: [string, any]) => ({
        id: catName,
        name: catName,
        items: items.map((i: BenefitItem) => ({ 
            id: String(i.id), 
            name: i.nombre 
        }))
      }));
      setCategories(formatted);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo conectar con la base de datos local");
    } finally {
      setIsLoading(false);
    }
  };

  // 2. FUNCIÓN PARA GUARDAR CAMBIOS MASIVOS (Editar/Eliminar)
  const syncWithServer = async (newCategories: Category[]) => {
    // Convertir de vuelta al formato de base de datos
    const payload: Record<string, any[]> = {};
    newCategories.forEach(cat => {
        payload[cat.name] = cat.items.map(i => ({
            id: Number(i.id) || Date.now(),
            nombre: i.name
        }));
    });

    try {
        await fetch('http://localhost:3001/api/ayudas/guardar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        setCategories(newCategories);
        return true;
    } catch (error) {
        toast.error("Error al guardar en disco");
        return false;
    }
  };

  // 3. ABRIR MODAL
  const handleOpenDialog = (categoryId: string, item?: {id: string, name: string}) => {
    if (item && !canUpdate) return;
    if (!item && !canCreate) return;

    setEditingCategory(categoryId);
    if (item) {
      setEditingItem(item);
      setItemName(item.name);
    } else {
      setEditingItem(null);
      setItemName('');
    }
    setIsDialogOpen(true);
  };

  // 4. GUARDAR (NUEVO O EDITAR)
  const handleSave = async () => {
    if (!itemName || !editingCategory) return;

    // A) SI ES NUEVO ITEM -> Usamos /api/ayudas/agregar
    if (!editingItem) {
        try {
            const res = await fetch('http://localhost:3001/api/ayudas/agregar', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ categoria: editingCategory, nombreItem: itemName })
            });
            if (res.ok) {
                toast.success('Guardado correctamente');
                fetchData(); // Recargar datos
                setIsDialogOpen(false);
            } else {
                toast.error('Error al guardar');
            }
        } catch (e) { toast.error('Error de conexión'); }
        return;
    }

    // B) SI ES EDITAR -> Modificamos local y sincronizamos todo
    const updatedCategories = [...categories];
    const catIndex = updatedCategories.findIndex(c => c.id === editingCategory);
    if (catIndex === -1) return;

    const cat = { ...updatedCategories[catIndex] };
    cat.items = cat.items.map(i => i.id === editingItem.id ? { ...i, name: itemName } : i);
    updatedCategories[catIndex] = cat;

    if (await syncWithServer(updatedCategories)) {
        toast.success('Actualizado');
        setIsDialogOpen(false);
    }
  };

  // 5. ELIMINAR
  const handleDelete = async (categoryId: string, itemId: string) => {
    if (!canDelete) return;
    if (!confirm('¿Eliminar permanentemente?')) return;

    const updatedCategories = [...categories];
    const catIndex = updatedCategories.findIndex(c => c.id === categoryId);
    if (catIndex === -1) return;

    const cat = { ...updatedCategories[catIndex] };
    cat.items = cat.items.filter(i => i.id !== itemId);
    updatedCategories[catIndex] = cat;

    if (await syncWithServer(updatedCategories)) {
        toast.success('Eliminado');
    }
  };

  if (!canView) return <MainLayout><div className="center h-full">Acceso denegado</div></MainLayout>;

  // Filtrado visual
  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(cat => cat.items.length > 0 || searchTerm === '');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Mantenedor de Ayudas (Beneficios)</h2>
        </div>

        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <SearchInput 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar beneficio..." 
          />
        </div>

        <div className="bg-white rounded-lg border p-4">
          {isLoading ? <div className="p-10 text-center text-gray-500">Cargando datos...</div> : (
          <Accordion type="multiple" className="w-full">
            {filteredCategories.map((category) => (
              <AccordionItem key={category.id} value={category.id}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Settings className="h-4 w-4 text-slate-500" />
                    <span className="font-semibold text-lg">{category.name}</span>
                    <span className="text-xs bg-slate-100 px-2 py-1 rounded-full text-slate-500 ml-2">
                      {category.items.length} items
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 pl-4 pr-2">
                    
                    {/* BOTÓN AGREGAR ITEM (VISUALMENTE DISPONIBLE EN CADA CATEGORIA) */}
                    {canCreate && (
                        <div className="flex justify-end mb-2 pt-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(category.id)} className="border-blue-200 text-blue-700 hover:bg-blue-50">
                            <Plus className="h-3 w-3 mr-1" /> Agregar a {category.name}
                        </Button>
                        </div>
                    )}

                    {category.items.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded border group hover:bg-slate-100 transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-mono text-xs w-6">{index + 1}</span>
                          <span className="text-sm font-medium">{item.name}</span>
                        </div>
                        
                        {(canUpdate || canDelete) && (
                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canUpdate && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600" onClick={() => handleOpenDialog(category.id, item)}>
                                    <Edit className="h-3 w-3" />
                                </Button>
                            )}
                            {canDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:bg-red-50" onClick={() => handleDelete(category.id, item.id)}>
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            )}
                            </div>
                        )}
                      </div>
                    ))}
                    {category.items.length === 0 && <div className="text-xs text-gray-400 italic p-2">Sin items.</div>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          )}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Beneficio' : `Agregar a ${editingCategory}`}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                  <Label>Nombre del Beneficio</Label>
                  <Input 
                    value={itemName} 
                    onChange={e => setItemName(e.target.value)} 
                    placeholder="Escribe el nombre aquí..."
                    autoFocus
                  />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save className="w-4 h-4 mr-2" /> Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}