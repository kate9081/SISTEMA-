import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore';
import { AidRecord, Beneficiary } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Plus, Trash2, ShoppingCart, FileSpreadsheet, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { ReceiptModal } from '@/components/aid/ReceiptModal';

interface TempItem {
  id: string;
  categoryId: string;
  categoryName: string;
  productName: string;
  quantity: number;
  value: number;
  detail: string;
}

export default function AidDelivery() {
  const { 
    beneficiaries, 
    benefitCategories, 
    inventory, 
    addAidRecord,
    aidRecords
  } = useAppStore();
  
  const { user } = useAuthStore();

  // === 1. LÓGICA DE PERMISOS ESTRICTA ===
  // Si user es null o permissions es null, asumimos FALSE.
  const canCreate = user?.permissions?.create === true;
  
  // Para ver el módulo, debe tener al menos un permiso activo
  const canView = user?.permissions && (
      user.permissions.read === true || 
      user.permissions.create === true || 
      user.permissions.update === true || 
      user.permissions.delete === true
  );

  // === 2. DEPURACIÓN ===
  useEffect(() => {
    console.log("=== DEBUG PERMISOS AIDDELIVERY ===");
    console.log("Usuario:", user?.email);
    console.log("Permisos:", user?.permissions);
    console.log("Puede Crear:", canCreate);
  }, [user, canCreate]);

  const [searchRut, setSearchRut] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastRecord, setLastRecord] = useState<AidRecord | null>(null);

  // Estados del formulario
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [receiverName, setReceiverName] = useState('');
  const [beneficiaryDisplayName, setBeneficiaryDisplayName] = useState('');

  // Carrito
  const [addedItems, setAddedItems] = useState<TempItem[]>([]);
  const [tempForm, setTempForm] = useState({
    category: '', product: '', quantity: 1, value: 0, detail: ''
  });

  // BLOQUEO TOTAL SI NO TIENE PERMISO DE VER
  if (!canView) {
    return (
        <MainLayout>
            <div className="flex flex-col items-center justify-center h-full text-gray-500 font-medium gap-2">
                <Lock className="h-10 w-10 text-red-400" />
                <span className="text-lg">Acceso Denegado</span>
                <span className="text-sm">No tienes permisos para ver este módulo.</span>
            </div>
        </MainLayout>
    );
  }

  const cleanRut = (rut: string) => rut.replace(/[\.\-\s]/g, '').toLowerCase();

  // --- FUNCIONES BLINDADAS ---

  const handleExportReport = () => {
      if (canCreate !== true) {
          toast.error("SEGURIDAD: No tiene permiso para exportar.");
          return;
      }
      toast.success("Generando reporte Excel...");
  };

  const handleSearchBeneficiary = () => {
    if (canCreate !== true) {
        toast.error("Modo Lectura: Búsqueda deshabilitada.");
        return;
    }
    const term = cleanRut(searchRut);
    const found = beneficiaries.find(b => cleanRut(b.rut) === term);
    
    if (found) {
      setSelectedBeneficiary(found);
      const rawName = [
        found.firstName, 
        found.paternalLastName, 
        found.maternalLastName
      ].filter(Boolean).join(" "); 

      setBeneficiaryDisplayName(rawName); 
      setReceiverName(rawName);
      toast.success('Beneficiario encontrado');
    } else {
      setSelectedBeneficiary(null);
      setBeneficiaryDisplayName('');
      setReceiverName('');
      toast.error('Beneficiario no encontrado');
    }
  };

  const handleProductChange = (value: string) => {
    const inventoryItem = inventory.find(i => i.description === value || i.name === value);
    if (inventoryItem) {
      setTempForm(prev => ({ 
        ...prev, 
        product: value,
        value: inventoryItem.purchasePrice || inventoryItem.price || 0
      }));
    } else {
      setTempForm(prev => ({ ...prev, product: value }));
    }
  };

  const handleAddItem = () => {
    if (!canCreate) return;
    if (!tempForm.category || !tempForm.product) { toast.error("Seleccione categoría y producto"); return; }
    
    const catObj = benefitCategories.find(c => c.id === tempForm.category);
    const newItem: TempItem = {
      id: crypto.randomUUID(),
      categoryId: tempForm.category,
      categoryName: catObj?.name || 'General',
      productName: tempForm.product,
      quantity: tempForm.quantity,
      value: tempForm.value,
      detail: tempForm.detail
    };
    setAddedItems([...addedItems, newItem]);
    setTempForm({ category: '', product: '', quantity: 1, value: 0, detail: '' });
    toast.success("Producto agregado");
  };

  const handleRemoveItem = (id: string) => {
    if (!canCreate) return;
    setAddedItems(addedItems.filter(i => i.id !== id));
  };

  // === AQUÍ ESTABA EL ERROR: AHORA ES ASYNC ===
  const handleFinalSubmit = async () => {
    if (!canCreate) return;
    if (!selectedBeneficiary) { toast.error('Falta el beneficiario'); return; }
    if (addedItems.length === 0) { toast.error('Agregue productos'); return; }

    const currentProfessionalName = user ? `${user.firstName} ${user.lastName}` : "Asistente Social Encargado";
    const totalValue = addedItems.reduce((acc, item) => acc + (item.value * item.quantity), 0);
    const mainCategory = addedItems[0].categoryName;
    const finalBeneficiaryName = beneficiaryDisplayName || `${selectedBeneficiary.firstName} ${selectedBeneficiary.paternalLastName}`;
    
    // Generar folio único basado en tiempo
    const uniqueFolio = (Date.now()).toString().slice(-8);

    const newRecord: AidRecord = {
      id: crypto.randomUUID(),
      folio: uniqueFolio,
      beneficiaryRut: selectedBeneficiary.rut,
      beneficiaryName: finalBeneficiaryName, 
      date: deliveryDate,
      aidType: mainCategory,
      observations: observations,
      receiverName: receiverName || finalBeneficiaryName,
      professionalId: user?.rut || 'admin',
      professionalName: currentProfessionalName,
      beneficiaryId: selectedBeneficiary.id || selectedBeneficiary.rut,
      items: addedItems.map(i => ({ name: i.productName, quantity: i.quantity, value: i.value, detail: i.detail })),
      product: addedItems.length > 1 ? "Varios Productos" : addedItems[0].productName,
      quantity: addedItems.length,
      value: totalValue,
      detail: addedItems.length > 1 ? "Ver detalle en recibo" : addedItems[0].detail,
      categoryId: addedItems[0].categoryId,
      itemId: 'multi',
    } as AidRecord;

    // --- ENVIAR A SQL SERVER ---
    const loadingToast = toast.loading("Guardando en base de datos...");
    try {
        // AHORA SÍ PUEDES USAR AWAIT PORQUE LA FUNCIÓN ES ASYNC
        const response = await fetch('http://localhost:3001/api/entregas/agregar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newRecord)
        });

        if (!response.ok) throw new Error("Error del servidor");

        toast.dismiss(loadingToast);
        addAidRecord(newRecord); // Actualizar estado local
        setLastRecord(newRecord);
        setShowReceipt(true);
        toast.success('Ayuda registrada correctamente en SQL');
        
        // Limpiar
        setAddedItems([]);
        setObservations('');
        setTempForm({ category: '', product: '', quantity: 1, value: 0, detail: '' });

    } catch (error) {
        toast.dismiss(loadingToast);
        console.error(error);
        toast.error("Error al guardar en SQL");
    }
  };

  const selectedCategoryObj = benefitCategories.find(c => c.id === tempForm.category);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Entrega de Ayudas</h2>
            
            {canCreate === true ? (
                <Button variant="outline" onClick={handleExportReport} className="text-green-700 border-green-200 bg-green-50 hover:bg-green-100 gap-2">
                    <FileSpreadsheet className="h-4 w-4" /> Exportar Reporte
                </Button>
            ) : (
                <div className="flex items-center gap-2 text-amber-700 font-bold bg-amber-50 px-3 py-1 rounded border border-amber-200 text-sm shadow-sm">
                    <Lock className="w-4 h-4" />
                    <span>MODO LECTURA</span>
                </div>
            )}
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          
          {/* COLUMNA IZQUIERDA: BENEFICIARIO */}
          <div className="md:col-span-4 space-y-4">
            <Card className={!canCreate ? "bg-gray-50 border-gray-200" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    1. Beneficiario
                    {!canCreate && <Lock className="w-3 h-3 text-gray-400"/>}
                </CardTitle>
                <CardDescription>Buscar por RUT</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="12345678" 
                    value={searchRut} 
                    onChange={e => setSearchRut(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSearchBeneficiary()}
                    disabled={!canCreate} // BLOQUEO FÍSICO
                    className={!canCreate ? "bg-gray-100 text-gray-400 cursor-not-allowed" : ""}
                  />
                  <Button size="icon" onClick={handleSearchBeneficiary} disabled={!canCreate} className={!canCreate ? "opacity-50" : ""}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {selectedBeneficiary && (
                  <div className="space-y-2 pt-2 border-t">
                    <Label className="text-xs text-gray-500">Nombre en Ficha</Label>
                    <Input 
                      value={beneficiaryDisplayName} 
                      onChange={e => setBeneficiaryDisplayName(e.target.value)} 
                      className="font-bold border-green-200 bg-green-50"
                      disabled={!canCreate}
                    />
                    <p className="text-xs text-green-700 ml-1">RUT: {selectedBeneficiary.rut}</p>
                    <p className="text-xs text-green-600 ml-1">{selectedBeneficiary.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className={!canCreate ? "bg-gray-50 border-gray-200" : ""}>
              <CardHeader>
                <CardTitle>3. Datos Finales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                 <div className="space-y-2">
                    <Label>Fecha Entrega</Label>
                    <Input 
                        type="date" 
                        value={deliveryDate} 
                        onChange={e => setDeliveryDate(e.target.value)} 
                        disabled={!canCreate}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Quien Retira (Nombre y Firma)</Label>
                    <Input 
                        value={receiverName} 
                        onChange={e => setReceiverName(e.target.value)} 
                        placeholder="Edite si retira otra persona"
                        disabled={!canCreate}
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea 
                      placeholder="Escriba aquí..."
                      value={observations}
                      onChange={e => setObservations(e.target.value)}
                      rows={4}
                      disabled={!canCreate}
                    />
                 </div>
                 <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    size="lg"
                    disabled={!selectedBeneficiary || addedItems.length === 0 || !canCreate}
                    onClick={handleFinalSubmit}
                 >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    GENERAR FOLIO
                 </Button>
              </CardContent>
            </Card>
          </div>

          {/* COLUMNA DERECHA: AGREGAR PRODUCTOS */}
          <div className="md:col-span-8 space-y-6">
            <Card className={`border-slate-200 ${!canCreate ? "bg-gray-50" : "bg-slate-50"}`}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                    2. Agregar Productos
                    {!canCreate && <Lock className="w-3 h-3 text-gray-400"/>}
                </CardTitle>
                <CardDescription>Configure y agregue cada producto a la lista.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select 
                      value={tempForm.category} 
                      onValueChange={val => setTempForm({...tempForm, category: val, product: ''})}
                      disabled={!canCreate} // BLOQUEO
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        {benefitCategories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Producto</Label>
                    <Select 
                      value={tempForm.product} 
                      onValueChange={handleProductChange}
                      disabled={!tempForm.category || !canCreate} // BLOQUEO
                    >
                      <SelectTrigger className="bg-white"><SelectValue placeholder="Seleccione..." /></SelectTrigger>
                      <SelectContent>
                        {selectedCategoryObj?.items.map(item => (
                          <SelectItem key={item.id} value={item.name}>{item.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input 
                        type="number" min="1" className="bg-white" 
                        value={tempForm.quantity} 
                        onChange={e => setTempForm({...tempForm, quantity: parseInt(e.target.value) || 1})} 
                        disabled={!canCreate} // BLOQUEO
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Unit. ($)</Label>
                      <Input 
                        type="number" className="bg-white" 
                        value={tempForm.value} 
                        onChange={e => setTempForm({...tempForm, value: parseInt(e.target.value) || 0})} 
                        disabled={!canCreate} // BLOQUEO
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Detalle</Label>
                      <Input 
                        className="bg-white" 
                        placeholder="Ej: N° 38..." 
                        value={tempForm.detail} 
                        onChange={e => setTempForm({...tempForm, detail: e.target.value})} 
                        disabled={!canCreate} // BLOQUEO
                      />
                    </div>
                </div>

                <div className="flex justify-end">
                   <Button variant="secondary" onClick={handleAddItem} className="gap-2 border bg-white hover:bg-slate-100" disabled={!canCreate}>
                      <Plus className="h-4 w-4" /> Agregar a la Lista
                   </Button>
                </div>
              </CardContent>
            </Card>

            <Card className={!canCreate ? "opacity-80" : ""}>
               <CardHeader className="pb-2"><CardTitle className="text-lg">Lista de Entrega</CardTitle></CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Producto</TableHead>
                       <TableHead>Detalle</TableHead>
                       <TableHead className="text-center">Cant.</TableHead>
                       <TableHead className="text-right">Valor</TableHead>
                       <TableHead className="text-right">Total</TableHead>
                       <TableHead className="w-[50px]"></TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {addedItems.length === 0 ? (
                       <TableRow><TableCell colSpan={6} className="text-center py-8 text-gray-500">No hay productos agregados.</TableCell></TableRow>
                     ) : (
                       addedItems.map(item => (
                         <TableRow key={item.id}>
                           <TableCell className="font-medium">{item.productName}</TableCell>
                           <TableCell className="text-xs text-gray-500">{item.detail || '-'}</TableCell>
                           <TableCell className="text-center">{item.quantity}</TableCell>
                           <TableCell className="text-right">${item.value.toLocaleString('es-CL')}</TableCell>
                           <TableCell className="text-right font-bold">${(item.value * item.quantity).toLocaleString('es-CL')}</TableCell>
                           <TableCell>
                             {canCreate && (
                                <Button variant="ghost" size="icon" onClick={() => handleRemoveItem(item.id)} className="text-red-500 hover:bg-red-50">
                                   <Trash2 className="h-4 w-4" />
                                </Button>
                             )}
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
                 
                 {addedItems.length > 0 && (
                    <div className="mt-4 flex justify-end items-center gap-2 text-lg font-bold border-t pt-4">
                       <span>Total Estimado:</span>
                       <span>${addedItems.reduce((acc, i) => acc + (i.value * i.quantity), 0).toLocaleString('es-CL')}</span>
                    </div>
                 )}
               </CardContent>
            </Card>
          </div>
        </div>

        <ReceiptModal isOpen={showReceipt} onClose={() => setShowReceipt(false)} record={lastRecord} beneficiary={selectedBeneficiary} />
      </div>
    </MainLayout>
  );
}