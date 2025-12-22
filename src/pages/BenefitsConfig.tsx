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

// Interfaces para los datos que vienen de SQL
interface BenefitItem {
  id: number; // ID real de SQL (int)
  nombre: string;
}

interface Category {
  id: string; // Nombre de la categoría (ej: "Aporte Economico")
  name: string;
  items: BenefitItem[];
}

export default function BenefitsConfig() {
  const { user } = useAuthStore();
  
  // Permisos del usuario
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  const canCreate = p.create;
  const canUpdate = p.update;
  const canDelete = p.delete;

  // Estados
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para el Modal (Agregar/Editar)
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<BenefitItem | null>(null);
  const [itemName, setItemName] = useState('');

  // 1. CARGAR DATOS (SELECT * FROM SQL)
  const fetchFromSQL = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('http://localhost:3001/api/ayudas'); // Tu API
      if (!res.ok) throw new Error("Error al cargar");
      
      const data = await res.json();
      
      // Transformar el objeto { "Categoria": [items] } al formato de la lista
      const formatted: Category[] = Object.entries(data).map(([catName, items]: [string, any]) => ({
        id: catName,
        name: catName,
        items: items.map((i: any) => ({ 
            id: i.id,      // ID numérico de SQL
            nombre: i.nombre 
        }))
      }));
      setCategories(formatted);
    } catch (e) {
      console.error(e);
      toast.error("No se pudo cargar la base de datos.");
    } finally {
      setIsLoading(false);
    }
  };

  // Cargar al iniciar
  useEffect(() => {
    fetchFromSQL();
  }, []);

  // 2. ABRIR MODAL
  const handleOpenDialog = (categoryName: string, item?: BenefitItem) => {
    // Verificación de permisos antes de abrir el diálogo
    if (item && !canUpdate) {
        toast.error("No tienes permiso para editar.");
        return;
    }
    if (!item && !canCreate) {
        toast.error("No tienes permiso para crear.");
        return;
    }

    setEditingCategory(categoryName);
    if (item) {
      // Modo Edición
      setEditingItem(item);
      setItemName(item.nombre);
    } else {
      // Modo Crear
      setEditingItem(null);
      setItemName('');
    }
    setIsDialogOpen(true);
  };

  // 3. GUARDAR (INSERT O UPDATE EN SQL)
  const handleSave = async () => {
    if (!itemName.trim() || !editingCategory) return;

    // Doble verificación de permisos al intentar guardar
    if (editingItem && !canUpdate) return;
    if (!editingItem && !canCreate) return;

    try {
      if (editingItem) {
        // === MODO EDITAR (UPDATE) ===
        const response = await fetch('http://localhost:3001/api/ayudas/editar', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: editingItem.id,     // Enviamos el ID real
            nombreItem: itemName    // Enviamos el nuevo nombre
          })
        });

        if (response.ok) {
          toast.success("Beneficio actualizado correctamente");
        } else {
          throw new Error("Error al actualizar");
        }

      } else {
        // === MODO CREAR (INSERT) ===
        const response = await fetch('http://localhost:3001/api/ayudas/agregar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            categoria: editingCategory, 
            nombreItem: itemName 
          })
        });

        if (response.ok) {
          toast.success("Beneficio agregado correctamente");
        } else {
          throw new Error("Error al agregar");
        }
      }

      // Cerrar modal y recargar lista real
      setIsDialogOpen(false);
      fetchFromSQL();

    } catch (error) {
      console.error(error);
      toast.error("Error al guardar en la base de datos");
    }
  };

  // 4. ELIMINAR (DELETE EN SQL)
  const handleDelete = async (itemId: number) => {
    if (!canDelete) {
        toast.error("No tienes permiso para eliminar.");
        return;
    }

    if (!confirm('¿Estás seguro de eliminar este beneficio permanentemente?')) return;

    try {
      const response = await fetch(`http://localhost:3001/api/ayudas/borrar/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success("Beneficio eliminado");
        fetchFromSQL(); // Recargar lista
      } else {
        throw new Error("Error al eliminar");
      }
    } catch (error) {
      console.error(error);
      toast.error("No se pudo eliminar el registro");
    }
  };

  // Filtrado visual (Buscador)
  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(item => item.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
  })).filter(cat => cat.items.length > 0 || searchTerm === '');

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold tracking-tight">Mantenedor de Ayudas (SQL Server)</h2>
        </div>

        {/* Buscador */}
        <div className="bg-white p-4 rounded-lg border shadow-sm">
          <SearchInput 
            value={searchTerm} 
            onChange={setSearchTerm} 
            placeholder="Buscar beneficio..." 
          />
        </div>

        {/* Lista de Categorías */}
        <div className="bg-white rounded-lg border p-4">
          {isLoading ? <div className="p-8 text-center text-gray-500">Cargando datos desde SQL...</div> : (
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
                  <div className="space-y-2 pl-4 pr-2 pt-2">
                    
                    {/* Botón Agregar - Solo visible si canCreate es true */}
                    {canCreate && (
                        <div className="flex justify-end mb-2">
                        <Button size="sm" variant="outline" onClick={() => handleOpenDialog(category.name)} className="text-blue-600 border-blue-200 hover:bg-blue-50">
                            <Plus className="h-3 w-3 mr-1" /> Agregar Item
                        </Button>
                        </div>
                    )}

                    {/* Lista de Items */}
                    {category.items.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-3 bg-slate-50 rounded border group hover:bg-white hover:shadow-sm transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-slate-400 font-mono text-xs w-6">{index + 1}</span>
                          <span className="font-medium text-slate-700">{item.nombre}</span>
                        </div>
                        
                        {/* Botones de Acción (Editar / Borrar) */}
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {canUpdate && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-blue-600 hover:bg-blue-50" onClick={() => handleOpenDialog(category.name, item)}>
                                    <Edit className="h-4 w-4" />
                                </Button>
                            )}
                            
                            {canDelete && (
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                      </div>
                    ))}
                    {category.items.length === 0 && <div className="text-sm text-gray-400 italic text-center py-2">Sin items registrados.</div>}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          )}
        </div>

        {/* Modal (Dialogo) */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? 'Editar Beneficio' : `Agregar a ${editingCategory}`}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Label>Nombre del Beneficio</Label>
              <Input 
                value={itemName} 
                onChange={e => setItemName(e.target.value)} 
                className="mt-2"
                placeholder="Ej: Subsidio de arriendo..."
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save className="mr-2 h-4 w-4" /> Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}