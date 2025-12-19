import { useState } from "react";
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
import { Plus, Search, Trash2, Edit, ChevronLeft, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
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
import { BulkImportButton } from "@/components/ui/BulkImportButton";

export default function Beneficiaries() {
  const { 
    beneficiaries, 
    deleteBeneficiary, 
    addBeneficiary, 
    updateBeneficiary, 
    clearBeneficiaries 
  } = useAppStore();
  
  const { user } = useAuthStore();

  // === LÓGICA DE PERMISOS ESTRICTA ===
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  
  // 1. Si tiene CUALQUIER permiso, puede ver el módulo.
  const canView = p.read || p.create || p.update || p.delete;
  
  // 2. Permisos específicos para botones
  const canCreate = p.create;
  const canUpdate = p.update;
  const canDelete = p.delete;
  // ====================================

  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editingBeneficiary, setEditingBeneficiary] = useState<Beneficiary | null>(null);
  const [formData, setFormData] = useState<Partial<Beneficiary>>({});
  
  // PAGINACIÓN
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50; 

  // SI NO TIENE PERMISO DE VER, RETORNA PANTALLA DE BLOQUEO
  if (!canView) {
    return (
        <MainLayout>
            <div className="flex items-center justify-center h-full text-gray-500 font-medium">
                Acceso restringido. No tienes permisos para ver este módulo.
            </div>
        </MainLayout>
    );
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };
  
  // === LÓGICA DE BÚSQUEDA INTELIGENTE ===
  const cleanString = (str: string) => (str || '').replace(/[\.\-\s]/g, '').toLowerCase();

  const filteredBeneficiaries = beneficiaries.filter((b) => {
    const term = cleanString(searchTerm);
    const rutClean = cleanString(b.rut);
    const nameClean = cleanString(`${b.firstName} ${b.lastName}`);
    
    return rutClean.includes(term) || nameClean.includes(term);
  });
  // ========================================

  const totalPages = Math.ceil(filteredBeneficiaries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentBeneficiaries = filteredBeneficiaries.slice(startIndex, endIndex);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); 
  };

  const handleClearAll = () => {
    // PROTECCIÓN LÓGICA
    if (!canDelete) return;

    if (confirm(`¿Estás SEGURO de eliminar todos los ${beneficiaries.length} beneficiarios? Esta acción no se puede deshacer.`)) {
      // @ts-ignore
      clearBeneficiaries(); 
      toast.success("Base de datos de beneficiarios vaciada correctamente.");
      setCurrentPage(1);
    }
  };

  const handleOpenDialog = (beneficiary?: Beneficiary) => {
    if (beneficiary) {
        if (!canUpdate) return; // Protección
        setEditingBeneficiary(beneficiary);
        setFormData(beneficiary);
    } else {
        if (!canCreate) return; // Protección
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
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Beneficiarios</h1>
            <p className="text-gray-500 mt-2">
              Gestión del padrón ({beneficiaries.length} registros totales)
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            
            {/* BOTÓN VACIAR: SOLO SI PUEDE ELIMINAR */}
            {canDelete && beneficiaries.length > 0 && (
              <Button 
                variant="destructive" 
                onClick={handleClearAll}
                className="gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Vaciar Tabla
              </Button>
            )}

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
            onChange={handleSearch}
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
                {/* COLUMNA ACCIONES: SOLO SI PUEDE EDITAR O ELIMINAR */}
                {(canUpdate || canDelete) && <TableHead className="text-right">Acciones</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentBeneficiaries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    {searchTerm ? "No se encontraron resultados" : "No hay beneficiarios registrados"}
                  </TableCell>
                </TableRow>
              ) : (
                currentBeneficiaries.map((beneficiary) => (
                  <TableRow key={beneficiary.id}>
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
                            {/* BOTÓN EDITAR */}
                            {canUpdate && (
                                <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleOpenDialog(beneficiary)}
                                >
                                <Edit className="h-4 w-4 text-gray-500" />
                                </Button>
                            )}
                            
                            {/* BOTÓN ELIMINAR */}
                            {canDelete && (
                                <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => {
                                    if(confirm('¿Estás seguro de eliminar este beneficiario?')) {
                                    deleteBeneficiary(beneficiary.rut);
                                    toast.success('Beneficiario eliminado');
                                    }
                                }}
                                >
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
              Mostrando {startIndex + 1} a {Math.min(endIndex, filteredBeneficiaries.length)} de {filteredBeneficiaries.length} resultados
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
                disabled={currentPage === totalPages || totalPages === 0}
              >
                Siguiente
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        <Dialog open={isCreateModalOpen} onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            setEditingBeneficiary(null);
            setFormData({});
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBeneficiary ? 'Editar Beneficiario' : 'Nuevo Beneficiario'}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="rut">RUT</Label>
                  <Input id="rut" name="rut" value={formData.rut || ''} onChange={handleInputChange} placeholder="12.345.678-9" />
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
              <Button onClick={() => {
                if (!formData.rut || !formData.firstName || !formData.lastName) {
                  toast.error("Faltan datos obligatorios");
                  return;
                }
                
                const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
                    ? crypto.randomUUID() 
                    : `ben-${Date.now()}`;

                if (editingBeneficiary) {
                  updateBeneficiary(editingBeneficiary.rut, formData); 
                  toast.success("Beneficiario actualizado");
                } else {
                  addBeneficiary({
                    id: uniqueId,
                    ...formData,
                    registrationDate: new Date().toISOString()
                  } as any);
                  toast.success("Beneficiario creado");
                }
                setIsCreateModalOpen(false);
              }}>Guardar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}