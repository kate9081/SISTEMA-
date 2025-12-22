import { useState, useEffect } from "react";
import MainLayout from "@/components/layout/MainLayout"; 
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Beneficiary } from "@/types";
// Nota: BulkImportButton requeriría lógica backend propia para funcionar con SQL.
import { BulkImportButton } from "@/components/ui/BulkImportButton";

export default function Beneficiaries() {
  const { user } = useAuthStore();

  // === LÓGICA DE PERMISOS ===
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  const canView = p.read || p.create || p.update || p.delete;
  const canCreate = p.create;
  const canUpdate = p.update;
  const canDelete = p.delete;

  // === ESTADOS (Datos desde SQL) ===
  const [beneficiaries, setBeneficiaries] = useState<Beneficiary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [formData, setFormData] = useState<Partial<Beneficiary>>({});
  
  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 

  // === 1. CARGAR DATOS DESDE SQL ===
  const fetchBeneficiaries = async () => {
    setIsLoading(true);
    try {
        const res = await fetch('http://localhost:3001/api/beneficiarios');
        const data = await res.json();
        if (data.success) {
            setBeneficiaries(data.data);
        } else {
            toast.error("Error al cargar datos");
        }
    } catch (error) {
        console.error(error);
        toast.error("Error de conexión con el servidor");
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
    if (canView) fetchBeneficiaries();
  }, [canView]);

  // SI NO TIENE PERMISO DE VER
  if (!canView) {
    return (
        <MainLayout>
            <div className="flex items-center justify-center h-full text-gray-500 font-medium">
                Acceso restringido. No tienes permisos para ver este módulo.
            </div>
        </MainLayout>
    );
  }

  // === 2. GUARDAR (INSERT / UPDATE) ===
  const handleSave = async () => {
    if (!formData.rut || !formData.firstName || !formData.lastName) {
        toast.error("Faltan datos obligatorios (RUT, Nombre, Apellido)");
        return;
    }

    try {
        let url = 'http://localhost:3001/api/beneficiarios/agregar';
        let method = 'POST';

        if (editingBeneficiary) {
            url = 'http://localhost:3001/api/beneficiarios/editar';
            method = 'PUT';
        }

        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            toast.success(editingBeneficiary ? "Beneficiario actualizado" : "Beneficiario creado");
            setIsCreateModalOpen(false);
            fetchBeneficiaries(); // Recargar tabla
        } else {
            const err = await res.json();
            toast.error("Error: " + (err.error || "No se pudo guardar"));
        }
    } catch (error) {
        toast.error("Error de conexión");
    }
  };

  // === 3. ELIMINAR ===
  const handleDelete = async (rut: string) => {
    if (!canDelete) return;
    if (!confirm('¿Estás seguro de eliminar este beneficiario de la base de datos?')) return;
    
    try {
        const res = await fetch(`http://localhost:3001/api/beneficiarios/borrar/${rut}`, { method: 'DELETE' });
        if (res.ok) {
            toast.success('Beneficiario eliminado');
            fetchBeneficiaries();
        } else {
            toast.error("Error al eliminar");
        }
    } catch (error) {
        toast.error("Error de conexión");
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // === LÓGICA DE BÚSQUEDA ===
  const cleanString = (str: string) => (str || '').replace(/[\.\-\s]/g, '').toLowerCase();
  
  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const term = cleanString(searchTerm);
    const rutClean = cleanString(b.rut);
    const nameClean = cleanString(`${b.firstName} ${b.lastName}`);
    return rutClean.includes(term) || nameClean.includes(term);
  });

  const totalPages = Math.ceil(filteredBeneficiaries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentBeneficiaries = filteredBeneficiaries.slice(startIndex, startIndex + itemsPerPage);

  const handleOpenDialog = (beneficiary?: Beneficiary) => {
    if (beneficiary) {
        if (!canUpdate) return;
        setEditingBeneficiary(beneficiary);
        setFormData(beneficiary);
    } else {
        if (!canCreate) return;
        setEditingBeneficiary(null);
        setFormData({});
    }
    setIsCreateModalOpen(true);
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Beneficiarios (SQL)</h1>
            <p className="text-gray-500 mt-2">
              Gestión del padrón ({beneficiaries.length} registros)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            
            <Button variant="outline" onClick={fetchBeneficiaries} disabled={isLoading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Recargar
            </Button>

            {/* BOTONES CREAR: SOLO SI PUEDE CREAR */}
            {canCreate && (
                <>
                    <BulkImportButton />
                    <Button onClick={() => handleOpenDialog()} className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4" />
                    Nuevo Beneficiario
                    </Button>
                </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 bg-white p-2 rounded-lg border shadow-sm max-w-md">
          <Search className="h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar RUT (ej: 12345678) o nombre..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="border-0 focus-visible:ring-0"
          />
        </div>

        <div className="rounded-md border bg-white shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>RUT</TableHead>
                <TableHead>Nombre</TableHead>
                <TableHead>Dirección</TableHead>
                <TableHead>Teléfono</TableHead>
                {/* COLUMNA ACCIONES */}
                {(canUpdate || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8">Cargando datos desde SQL...</TableCell></TableRow>
              ) : currentBeneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm ? "No se encontraron resultados" : "No hay beneficiarios registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                currentBeneficiaries.map((beneficiary) => (
                  <TableRow key={beneficiary.id || beneficiary.rut}>
                    <TableCell className="font-medium">{beneficiary.rut}</TableCell>
                    <TableCell>{beneficiary.firstName} {beneficiary.lastName}</TableCell>
                    <TableCell className="max-w-[200px] truncate" title={beneficiary.address}>
                        {beneficiary.address}
                    </TableCell>
                    <TableCell>{beneficiary.phone || "-"}</TableCell>
                    
                    {/* BOTONES DE ACCIÓN */}
                    {(canUpdate || canDelete) && (
                        <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                            {/* EDITAR */}
                            {canUpdate && (
                                <Button variant="ghost" size="icon" onClick={() => handleOpenDialog(beneficiary)}>
                                <Edit className="h-4 w-4 text-gray-500" />
                                </Button>
                            )}
                            
                            {/* ELIMINAR */}
                            {canDelete && (
                                <Button variant="ghost" size="icon" onClick={() => handleDelete(beneficiary.rut)}>
                                <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                            )}
                        </div>
                        </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {filteredBeneficiaries.length > 0 && (
          <div className="flex items-center justify-between px-2 py-4">
            <div className="text-sm text-gray-500">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBeneficiary ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  {/* Deshabilitamos RUT si editamos (llave primaria) */}
                  <Input id="rut" name="rut" value={formData.rut || ''} onChange={handleInputChange} placeholder="12.345.678-9" disabled={!!editingBeneficiary} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nombres</Label>
                  <Input id="firstName" name="firstName" value={formData.firstName || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Apellidos</Label>
                  <Input id="lastName" name="lastName" value={formData.lastName || ''} onChange={handleInputChange} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input id="phone" name="phone" value={formData.phone || ''} onChange={handleInputChange} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="address">Dirección</Label>
                  <Input id="address" name="address" value={formData.address || ''} onChange={handleInputChange} />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" name="email" value={formData.email || ''} onChange={handleInputChange} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}