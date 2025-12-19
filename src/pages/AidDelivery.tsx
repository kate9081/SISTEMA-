import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { useAppStore } from '@/store/useAppStore';
import { useAuthStore } from '@/store/useAuthStore'; // Importar Auth
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
import { Search, Plus, Trash2, ShoppingCart } from 'lucide-react';
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

  // === LÓGICA DE PERMISOS ===
  const p = user?.permissions || { create: false, read: false, update: false, delete: false };
  
  // 1. Puede Ver: Si tiene CUALQUIER permiso.
  const canView = p.read || p.create || p.update || p.delete;
  
  // 2. Puede Crear: Solo si el permiso create es true.
  const canCreate = p.create;
  // ==========================

  const [searchRut, setSearchRut] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastRecord, setLastRecord] = useState<AidRecord | null>(null);

  // ESTADOS DEL FORMULARIO
  const [deliveryDate, setDeliveryDate] = useState(new Date().toISOString().split('T')[0]);
  const [observations, setObservations] = useState('');
  const [receiverName, setReceiverName] = useState('');
  
  // Estado para el nombre corregido del beneficiario
  const [beneficiaryDisplayName, setBeneficiaryDisplayName] = useState('');

  // CARRITO
  const [addedItems, setAddedItems] = useState<TempItem[]>([]);

  // Estado temporal de producto
  const [tempForm, setTempForm] = useState({
    category: '',
    product: '',
    quantity: 1,
    value: 0,
    detail: ''
  });

  // SI NO TIENE PERMISO DE VER, PANTALLA DE BLOQUEO
  if (!canView) {
    return (
        <MainLayout>
            <div className="flex items-center justify-center h-full text-gray-500 font-medium">
                Acceso restringido. No tienes permisos para ver este módulo.
            </div>
        </MainLayout>
    );
  }

  const cleanRut = (rut: string) => rut.replace(/[\.\-\s]/g, '').toLowerCase();

  const handleSearchBeneficiary = () => {
    const term = cleanRut(searchRut);
    const found = beneficiaries.find(b => cleanRut(b.rut) === term);
    
    if (found) {
      setSelectedBeneficiary(found);
      
      // CONSTRUCCIÓN SEGURA DEL NOMBRE
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
    if (!canCreate) {
        toast.error("No tienes permisos para agregar productos.");
        return;
    }

    if (!tempForm.category || !tempForm.product) {
      toast.error("Seleccione categoría y producto");
      return;
    }

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
    
    setTempForm({
      category: '',
      product: '',
      quantity: 1,
      value: 0,
      detail: ''
    });
    toast.success("Producto agregado");
  };

  const handleRemoveItem = (id: string) => {
    if (!canCreate) return;
    setAddedItems(addedItems.filter(i => i.id !== id));
  };

  const handleFinalSubmit = () => {
    if (!canCreate) {
        toast.error("No tienes permisos para registrar ayudas.");
        return;
    }

    if (!selectedBeneficiary) {
      toast.error('Falta el beneficiario');
      return;
    }
    if (addedItems.length === 0) {
      toast.error('Debe agregar al menos un producto');
      return;
    }

    const currentProfessionalName = user 
        ? `${user.firstName} ${user.lastName}` 
        : "Asistente Social Encargado";

    const totalValue = addedItems.reduce((acc, item) => acc + (item.value * item.quantity), 0);
    const mainCategory = addedItems[0].categoryName;

    const finalBeneficiaryName = beneficiaryDisplayName || `${selectedBeneficiary.firstName} ${selectedBeneficiary.paternalLastName}`;

    const newRecord: AidRecord = {
      id: crypto.randomUUID(),
      folio: (aidRecords.length + 1001).toString(),
      beneficiaryRut: selectedBeneficiary.rut,
      
      beneficiaryName: finalBeneficiaryName, 
      
      date: deliveryDate,
      aidType: mainCategory,
      observations: observations,
      receiverName: receiverName || finalBeneficiaryName,
      professionalId: user?.rut || 'admin',
      professionalName: currentProfessionalName,
      beneficiaryId: selectedBeneficiary.id || selectedBeneficiary.rut,
      
      items: addedItems.map(i => ({
        name: i.productName,
        quantity: i.quantity,
        value: i.value,
        detail: i.detail
      })),

      product: addedItems.length > 1 ? "Varios Productos" : addedItems[0].productName,
      quantity: addedItems.length,
      value: totalValue,
      detail: addedItems.length > 1 ? "Ver detalle en recibo" : addedItems[0].detail,
      categoryId: addedItems[0].categoryId,
      itemId: 'multi',
    } as AidRecord;

    addAidRecord(newRecord);
    setLastRecord(newRecord);
    setShowReceipt(true);
    toast.success('Ayuda registrada correctamente');
    
    setAddedItems([]);
    setObservations('');
    setTempForm({ category: '', product: '', quantity: 1, value: 0, detail: '' });
  };

  const selectedCategoryObj = benefitCategories.find(c => c.id === tempForm.category);

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold tracking-tight">Gestión de Entrega de Ayudas</h2>
            {!canCreate && (
                <span className="text-amber-600 font-bold bg-amber-50 px-3 py-1 rounded border border-amber-200 text-sm">
                    MODO LECTURA (Sin permisos para crear)
                </span>
            )}
        </div>

        <div className="grid gap-6 md:grid-cols-12">
          
          {/* COLUMNA IZQUIERDA: BENEFICIARIO */}
          <div className="md:col-span-4 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>1. Beneficiario</CardTitle>
                <CardDescription>Buscar por RUT</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Input 
                    placeholder="12345678" 
                    value={searchRut} 
                    onChange={e => setSearchRut(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleSearchBeneficiary()}
                  />
                  <Button size="icon" onClick={handleSearchBeneficiary}>
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
                      disabled={!canCreate} // Bloqueado si no puede crear
                    />
                    <p className="text-xs text-green-700 ml-1">RUT: {selectedBeneficiary.rut}</p>
                    <p className="text-xs text-green-600 ml-1">{selectedBeneficiary.address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
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
                        disabled={!canCreate} // Bloqueado
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Quien Retira (Nombre y Firma)</Label>
                    <Input 
                        value={receiverName} 
                        onChange={e => setReceiverName(e.target.value)} 
                        placeholder="Edite si retira otra persona"
                        disabled={!canCreate} // Bloqueado
                    />
                 </div>
                 <div className="space-y-2">
                    <Label>Observaciones</Label>
                    <Textarea 
                      placeholder="Escriba aquí (acepta tildes, comas, puntos)..."
                      value={observations}
                      onChange={e => setObservations(e.target.value)}
                      rows={4}
                      disabled={!canCreate} // Bloqueado
                    />
                 </div>
                 <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    size="lg"
                    disabled={!selectedBeneficiary || addedItems.length === 0 || !canCreate} // Bloqueado
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
            <Card className="bg-slate-50 border-slate-200">
              <CardHeader>
                <CardTitle>2. Agregar Productos</CardTitle>
                <CardDescription>Configure y agregue cada producto a la lista.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="space-y-2">
                    <Label>Categoría</Label>
                    <Select 
                      value={tempForm.category} 
                      onValueChange={val => setTempForm({...tempForm, category: val, product: ''})}
                      disabled={!canCreate} // Bloqueado
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
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
                      disabled={!tempForm.category || !canCreate} // Bloqueado
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccione..." />
                      </SelectTrigger>
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
                        disabled={!canCreate} // Bloqueado
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Unit. ($)</Label>
                      <Input 
                        type="number" className="bg-white" 
                        value={tempForm.value} 
                        onChange={e => setTempForm({...tempForm, value: parseInt(e.target.value) || 0})} 
                        disabled={!canCreate} // Bloqueado
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Detalle</Label>
                      <Input 
                        className="bg-white" 
                        placeholder="Ej: N° 38, Marca X..." 
                        value={tempForm.detail} 
                        onChange={e => setTempForm({...tempForm, detail: e.target.value})} 
                        disabled={!canCreate} // Bloqueado
                      />
                    </div>
                </div>

                <div className="flex justify-end">
                   <Button 
                    variant="secondary" 
                    onClick={handleAddItem} 
                    className="gap-2 border bg-white hover:bg-slate-100"
                    disabled={!canCreate} // Bloqueado
                   >
                     <Plus className="h-4 w-4" /> Agregar a la Lista
                   </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
               <CardHeader className="pb-2">
                 <CardTitle className="text-lg">Lista de Entrega</CardTitle>
               </CardHeader>
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
                       <TableRow>
                         <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                           No hay productos agregados.
                         </TableCell>
                       </TableRow>
                     ) : (
                       addedItems.map(item => (
                         <TableRow key={item.id}>
                           <TableCell className="font-medium">{item.productName}</TableCell>
                           <TableCell className="text-xs text-gray-500">{item.detail || '-'}</TableCell>
                           <TableCell className="text-center">{item.quantity}</TableCell>
                           <TableCell className="text-right">${item.value.toLocaleString('es-CL')}</TableCell>
                           <TableCell className="text-right font-bold">${(item.value * item.quantity).toLocaleString('es-CL')}</TableCell>
                           <TableCell>
                             {/* Botón eliminar del carrito solo si puede crear */}
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

        <ReceiptModal 
          isOpen={showReceipt} 
          onClose={() => setShowReceipt(false)} 
          record={lastRecord}
          beneficiary={selectedBeneficiary} 
        />
      </div>
    </MainLayout>
  );
}