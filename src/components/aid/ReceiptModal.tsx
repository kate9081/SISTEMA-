import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import {
  Dialog,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, X } from "lucide-react";
import { AidRecord, Beneficiary } from "@/types";

interface ReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AidRecord | null;
  beneficiary: Beneficiary | null;
}

export function ReceiptModal({ isOpen, onClose, record, beneficiary }: ReceiptModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: contentRef,
    documentTitle: `Recibo_Ayuda_${record?.folio || 'SN'}`,
  });

  if (!record) return null;

  // CORRECCIÓN CRÍTICA: Usamos el nombre guardado en el registro (record.beneficiaryName)
  // porque ese es el que pudiste editar y corregir en el formulario.
  // Solo usamos 'beneficiary' como fallback de datos extras como dirección.
  const benName = record.beneficiaryName || "Nombre no registrado";
  const benRut = record.beneficiaryRut;
  const benAddress = beneficiary?.address || "Dirección no disponible";

  const fechaObj = new Date(record.date);
  const fechaVisual = new Date(fechaObj.valueOf() + fechaObj.getTimezoneOffset() * 60000);
  const formattedDate = fechaVisual.toLocaleDateString('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  // Lista de productos
  const itemsToDisplay = record.items && record.items.length > 0 
    ? record.items 
    : [ { name: record.product || record.itemName, quantity: record.quantity, value: record.value, detail: record.detail } ];

  const emptyRows = Math.max(0, 5 - itemsToDisplay.length);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[850px] p-0 overflow-hidden bg-gray-200">
        
        <div className="max-h-[85vh] overflow-y-auto p-6 flex justify-center">
            
            <div 
                ref={contentRef} 
                className="bg-white text-black shadow-lg"
                style={{ 
                    width: '210mm',
                    minHeight: '297mm',
                    padding: '40px',
                    fontFamily: 'Arial, sans-serif' 
                }}
            >
                {/* Header */}
                <div className="flex justify-between items-start mb-8">
                  <div className="flex gap-4 items-center">
                     <img 
                        src="/assets/municipal-seal.png" 
                        alt="Logo Municipal" 
                        className="h-24 w-auto object-contain"
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                     />
                     <div className="text-sm leading-tight">
                        <p className="font-bold text-lg uppercase">Municipalidad</p>
                        <p className="font-bold text-xl uppercase">San Pedro</p>
                        <p className="italic font-medium">Crecemos Todos</p>
                        <p className="mt-2 text-[10px] font-bold tracking-wide">DIRECCIÓN DESARROLLO COMUNITARIO</p>
                     </div>
                  </div>
                  <div className="border border-black px-2 py-1">
                     <p className="text-xs font-bold">FOLIO: {record.folio}</p>
                  </div>
                </div>

                <h1 className="text-center text-3xl font-bold mb-2 uppercase underline decoration-2 underline-offset-4">
                    RECIBO DE AYUDA
                </h1>
                <div className="mb-8"></div>

                <table className="w-full border-collapse border border-black text-sm mb-1">
                  <tbody>
                    <tr>
                        <td className="border border-black w-1/3 p-2 font-bold bg-gray-50">Nombre Beneficiario/a</td>
                        {/* AQUÍ SALDRÁ EL NOMBRE CORREGIDO */}
                        <td className="border border-black p-2 uppercase pl-4">{benName}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50">Cédula de Identidad</td>
                        <td className="border border-black p-2 uppercase pl-4">{benRut}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50">Dirección</td>
                        <td className="border border-black p-2 uppercase pl-4">{benAddress}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50">Tipo de Ayuda</td>
                        <td className="border border-black p-2 uppercase pl-4">{record.aidType || record.categoryName}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50">Fecha</td>
                        <td className="border border-black p-2 pl-4 capitalize">{formattedDate}</td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50">Respaldo de la Ayuda Otorgada</td>
                        <td className="border border-black p-2 uppercase pl-4"></td>
                    </tr>
                    <tr>
                        <td className="border border-black p-2 font-bold bg-gray-50 align-top">Declaración</td>
                        <td className="border border-black p-2 text-justify italic">
                            "El(la) Beneficiaria(o) antes identificado(a) declara que la
                            situación informada es verídica y recibe de la I. Municipalidad
                            de San Pedro lo siguiente:"
                        </td>
                    </tr>
                  </tbody>
                </table>

                <div className="h-4"></div>

                <table className="w-full border-collapse border border-black text-sm mb-6">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black w-1/4 p-2 font-bold">Cantidad</th>
                      <th className="border border-black p-2 font-bold">Valor y Detalle del Producto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {itemsToDisplay.map((item, index) => (
                        <tr key={index}>
                            <td className="border border-black h-10 p-2 text-center align-middle text-lg font-medium">
                                {item.quantity}
                            </td>
                            <td className="border border-black p-2 align-middle uppercase pl-4">
                                {item.name || "Producto"} 
                                {item.detail ? ` - ${item.detail}` : ''}
                                {item.value > 0 ? ` ($${item.value.toLocaleString('es-CL')})` : ''}
                            </td>
                        </tr>
                    ))}
                    {Array.from({ length: emptyRows }).map((_, i) => (
                        <tr key={`empty-${i}`}>
                            <td className="border border-black h-8"></td>
                            <td className="border border-black"></td>
                        </tr>
                    ))}
                  </tbody>
                </table>

                <div className="mb-12">
                   <p className="font-bold text-sm mb-1 ml-1">OBSERVACIONES:</p>
                   <div className="border border-black min-h-[80px] p-2 text-sm uppercase">
                      {record.observations || ""}
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-16 text-sm mb-16 mt-auto px-4">
                  <div className="text-center">
                    <div className="h-20"></div>
                    <div className="border-t border-black pt-2">
                      <p className="font-bold uppercase mb-1">{record.professionalName || 'Asistente Social'}</p>Trabajadora Social
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="h-20"></div>
                    <div className="border-t border-black pt-2">
                        <p className="font-bold uppercase mb-1">
                            {record.receiverName || benName}
                        </p>
                        Firma Beneficiario(a)
                    </div>
                  </div>
                </div>

                <div className="text-center text-sm">
                  <div className="border-t border-black inline-block px-20 pt-2 font-bold">
                    Firma DIDECO
                  </div>
                </div>
            </div>
        </div>

        <DialogFooter className="bg-gray-100 p-4 border-t flex justify-end gap-3 z-50">
          <Button variant="outline" onClick={onClose} className="gap-2">
            <X className="h-4 w-4" /> Cerrar
          </Button>
          <Button onClick={() => handlePrint && handlePrint()} className="gap-2 bg-blue-600 text-white hover:bg-blue-700 shadow-sm">
            <Printer className="h-4 w-4" /> IMPRIMIR RECIBO
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}