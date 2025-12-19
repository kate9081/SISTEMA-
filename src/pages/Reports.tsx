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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileSpreadsheet, 
  Search, 
  Edit, 
  Trash2, 
  Save, 
  AlertTriangle,
  Package,
  User,
  Briefcase,
  XCircle,
  Printer, 
  Eye 
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { useAuthStore } from "@/store/useAuthStore"; // AUTH
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AidRecord, Beneficiary } from "@/types";
import * as XLSX from 'xlsx';
import { ReceiptModal } from "@/components/aid/ReceiptModal";

export default function Reports() {
  const { 
    aidRecords, 
    inventory,
    beneficiaries, 
    removeAidRecord, 
    updateAidRecord 
  } = useAppStore();

  const { user } = useAuthStore();

  // === LÓGICA DE PERMISOS ===
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  const canView = p.read || p.create || p.update || p.delete;
  
  // Para reportes, solo importa si puede editar o borrar el historial
  const canUpdate = p.update;
  const canDelete = p.delete;
  // ==========================
  
  const [filterPerson, setFilterPerson] = useState("");
  const [filterProfessional, setFilterProfessional] = useState("");
  const [filterDateStart, setFilterDateStart] = useState("");
  const [filterDateEnd, setFilterDateEnd] = useState("");

  const [filterInventory, setFilterInventory] = useState("");
  
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<AidRecord | null>(null);
  const [editFormData, setEditFormData] = useState<Partial<AidRecord>>({});

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentRecord, setDocumentRecord] = useState<AidRecord | null>(null);
  const [documentBeneficiary, setDocumentBeneficiary] = useState<Beneficiary | null>(null);

  // SI NO TIENE PERMISO DE VER, BLOQUEO
  if (!canView) {
    return (
        <MainLayout>
            <div className="flex items-center justify-center h-full text-gray-500 font-medium">
                Acceso restringido. No tienes permisos para ver Reportes.
            </div>
        </MainLayout>
    );
  }

  // --- LÓGICA DE FILTRADO: AYUDAS ENTREGADAS ---
  const filteredRecords = aidRecords.filter((record) => {
    const matchPerson = filterPerson === "" || 
      record.beneficiaryName.toLowerCase().includes(filterPerson.toLowerCase()) ||
      record.beneficiaryRut.toLowerCase().includes(filterPerson.toLowerCase());

    const matchProf = filterProfessional === "" ||
      (record.professionalName || "").toLowerCase().includes(filterProfessional.toLowerCase());

    const recordDate = record.date.split('T')[0]; 
    const matchStart = filterDateStart === "" || recordDate >= filterDateStart;
    const matchEnd = filterDateEnd === "" || recordDate <= filterDateEnd;

    return matchPerson && matchProf && matchStart && matchEnd;
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // --- LÓGICA DE FILTRADO: INVENTARIO GENERAL ---
  const filteredInventory = inventory.filter(item => 
    (item.name || item.description).toLowerCase().includes(filterInventory.toLowerCase())
  );

  // --- LÓGICA DE FILTRADO: STOCK CRÍTICO ---
  const criticalStockItems = inventory.filter(i => i.quantity <= (i.criticalStock || 5));

  // --- FUNCIONES DE ACCIÓN ---
  const handleClearFilters = () => {
    setFilterPerson("");
    setFilterProfessional("");
    setFilterDateStart("");
    setFilterDateEnd("");
  };

  const handleExportExcel = () => {
    const dataToExport = filteredRecords.map(r => ({
      'Folio': r.folio,
      'Fecha': new Date(r.date).toLocaleDateString('es-CL'),
      'RUT Beneficiario': r.beneficiaryRut,
      'Nombre Beneficiario': r.beneficiaryName,
      'Categoría': r.categoryName || r.aidType,
      'Producto / Detalle': r.itemName || r.product,
      'Cantidad': r.quantity,
      'Valor ($)': r.value,
      'Profesional': r.professionalName,
      'Observaciones': r.notes || r.detail || '' 
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte Filtrado");
    XLSX.writeFile(wb, `Reporte_Ayudas_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success("Excel generado correctamente");
  };

  const handleDelete = (id: string, folio: string) => {
    if (!canDelete) return; // PROTECCIÓN
    if (confirm(`¿Eliminar registro Folio ${folio}?`)) {
      removeAidRecord(id);
      toast.success("Registro eliminado");
    }
  };

  const handleEditClick = (record: AidRecord) => {
    if (!canUpdate) return; // PROTECCIÓN
    setEditingRecord(record);
    setEditFormData({
      date: record.date,
      quantity: record.quantity,
      value: record.value,
      notes: record.notes || record.detail || '',
      categoryName: record.categoryName || record.aidType
    });
    setIsEditModalOpen(true);
  };

  const handleViewDocument = (record: AidRecord) => {
    const ben = beneficiaries.find(b => b.rut === record.beneficiaryRut) || null;
    
    setDocumentRecord(record);
    setDocumentBeneficiary(ben);
    setShowDocumentModal(true);
  };

  const handleSaveChanges = () => {
    if (editingRecord && editFormData) {
      updateAidRecord(editingRecord.id, editFormData);
      toast.success("Registro actualizado");
      setIsEditModalOpen(false);
      setEditingRecord(null);
    }
  };

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reportes y Estadísticas</h1>
            <p className="text-gray-500 mt-2">
              Gestión de listados, inventarios y entregas históricas.
            </p>
          </div>
          <Button variant="outline" onClick={handleExportExcel} className="gap-2 bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
            <FileSpreadsheet className="h-4 w-4" />
            Exportar Listado Actual
          </Button>
        </div>

        <Tabs defaultValue="history" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3 lg:w-[600px]">
            <TabsTrigger value="history">Ayudas Entregadas</TabsTrigger>
            <TabsTrigger value="inventory">Productos General</TabsTrigger>
            <TabsTrigger value="critical">Stock Crítico</TabsTrigger>
          </TabsList>

          {/* === 1. AYUDAS ENTREGADAS === */}
          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Historial de Entregas</CardTitle>
                <CardDescription>Utilice los filtros para buscar registros específicos.</CardDescription>
              </CardHeader>
              <CardContent>
                {/* BARRA DE FILTROS */}
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6 p-4 bg-gray-50 rounded-lg border">
                  <div className="md:col-span-1">
                    <Label className="text-xs text-gray-500 mb-1 block">Beneficiario</Label>
                    <div className="relative">
                      <User className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input className="pl-8" value={filterPerson} onChange={(e) => setFilterPerson(e.target.value)} />
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs text-gray-500 mb-1 block">Profesional</Label>
                    <div className="relative">
                      <Briefcase className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input className="pl-8" value={filterProfessional} onChange={(e) => setFilterProfessional(e.target.value)} />
                    </div>
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs text-gray-500 mb-1 block">Desde</Label>
                    <Input type="date" value={filterDateStart} onChange={(e) => setFilterDateStart(e.target.value)} />
                  </div>
                  <div className="md:col-span-1">
                    <Label className="text-xs text-gray-500 mb-1 block">Hasta</Label>
                    <Input type="date" value={filterDateEnd} onChange={(e) => setFilterDateEnd(e.target.value)} />
                  </div>
                  <div className="md:col-span-1 flex items-end">
                    <Button variant="ghost" onClick={handleClearFilters} className="w-full text-gray-500 hover:text-red-500 hover:bg-red-50">
                      <XCircle className="h-4 w-4 mr-2" /> Limpiar Filtros
                    </Button>
                  </div>
                </div>

                {/* TABLA */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Folio</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Beneficiario</TableHead>
                        <TableHead>Ayuda Entregada</TableHead>
                        <TableHead>Profesional</TableHead>
                        <TableHead className="text-right">Acciones</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No se encontraron registros.</TableCell></TableRow>
                      ) : (
                        filteredRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell className="font-medium">{record.folio}</TableCell>
                            <TableCell>{new Date(record.date).toLocaleDateString('es-CL')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium uppercase">{record.beneficiaryName}</span>
                                <span className="text-xs text-gray-500">{record.beneficiaryRut}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col">
                                <span className="font-medium">{record.itemName || record.product}</span>
                                <span className="text-xs text-gray-500">{record.categoryName || record.aidType}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs uppercase">{record.professionalName}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-1">
                                {/* VER / IMPRIMIR (Disponible para todos con permiso de vista) */}
                                <Button variant="ghost" size="icon" onClick={() => handleViewDocument(record)} title="Ver e Imprimir" className="text-gray-500 hover:text-green-600">
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleViewDocument(record)} title="Imprimir" className="text-gray-500 hover:text-blue-600">
                                  <Printer className="h-4 w-4" />
                                </Button>
                                
                                {/* EDITAR / BORRAR (Protegidos) */}
                                {canUpdate && (
                                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(record)} title="Editar">
                                    <Edit className="h-4 w-4 text-gray-500 hover:text-blue-600" />
                                    </Button>
                                )}
                                {canDelete && (
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id, record.folio)} title="Eliminar">
                                    <Trash2 className="h-4 w-4 text-gray-500 hover:text-red-600" />
                                    </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === 2. PRODUCTOS GENERAL === */}
          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Package className="h-5 w-5" /> Listado General de Productos</CardTitle></CardHeader>
              <CardContent>
                <div className="mb-4 w-full max-w-sm">
                   <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
                      <Input placeholder="Buscar producto..." className="pl-8" value={filterInventory} onChange={(e) => setFilterInventory(e.target.value)} />
                   </div>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                        <TableHead>Estado</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {filteredInventory.map((item) => (
                         <TableRow key={item.id}>
                           <TableCell className="font-medium">{item.name || item.description}</TableCell>
                           <TableCell>{item.category}</TableCell>
                           <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                           <TableCell className="text-right">${(item.price || item.purchasePrice || 0).toLocaleString('es-CL')}</TableCell>
                           <TableCell>
                             {item.quantity <= (item.criticalStock || 5) ? (
                               <span className="text-red-600 font-bold text-xs">CRÍTICO</span>
                             ) : (
                               <span className="text-green-600 font-bold text-xs">NORMAL</span>
                             )}
                           </TableCell>
                         </TableRow>
                       ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* === 3. STOCK CRÍTICO === */}
          <TabsContent value="critical" className="space-y-4">
            <Card className="border-red-200 bg-red-50/10">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-600"><AlertTriangle className="h-5 w-5" /> Alerta de Stock Crítico</CardTitle>
                <CardDescription>Mostrando solo productos que están por agotarse o sin stock.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border border-red-100 bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Producto</TableHead>
                        <TableHead>Categoría</TableHead>
                        <TableHead className="text-right">Stock Actual</TableHead>
                        <TableHead className="text-right">Déficit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                       {criticalStockItems.length === 0 ? (
                         <TableRow><TableCell colSpan={4} className="text-center py-8 text-green-600 font-medium">Excelente. No hay productos críticos.</TableCell></TableRow>
                       ) : (
                           criticalStockItems.map((item) => (
                             <TableRow key={item.id} className="hover:bg-red-50">
                               <TableCell className="font-medium text-red-900">{item.name || item.description}</TableCell>
                               <TableCell>{item.category}</TableCell>
                               <TableCell className="text-right font-bold text-red-600">{item.quantity}</TableCell>
                               <TableCell className="text-right text-gray-500">Faltan al menos {10 - item.quantity} un.</TableCell>
                             </TableRow>
                           ))
                       )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* MODAL DE EDICIÓN */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Registro - Folio {editingRecord?.folio}</DialogTitle></DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha Entrega</Label>
                  <Input type="date" value={editFormData.date ? String(editFormData.date).split('T')[0] : ''} onChange={(e) => setEditFormData({...editFormData, date: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Valor ($)</Label>
                  <Input type="number" value={editFormData.value} onChange={(e) => setEditFormData({...editFormData, value: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                  <Label>Cantidad</Label>
                  <Input type="number" value={editFormData.quantity} onChange={(e) => setEditFormData({...editFormData, quantity: Number(e.target.value)})} />
                </div>
                <div className="space-y-2">
                   <Label>Tipo Ayuda</Label>
                   <Input value={editFormData.categoryName} disabled className="bg-gray-100" />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Observaciones / Notas</Label>
                  <Textarea value={editFormData.notes} onChange={(e) => setEditFormData({...editFormData, notes: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancelar</Button>
              <Button onClick={handleSaveChanges} className="gap-2 bg-blue-600 hover:bg-blue-700"><Save className="h-4 w-4" /> Guardar Cambios</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* MODAL PARA VER EL RECIBO DESDE EL HISTORIAL */}
        <ReceiptModal isOpen={showDocumentModal} onClose={() => setShowDocumentModal(false)} record={documentRecord} beneficiary={documentBeneficiary} />
      </div>
    </MainLayout>
  );
}