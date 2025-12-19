import { useRef, useState } from 'react';
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import * as XLSX from 'xlsx';
import { useAppStore } from '@/store/useAppStore';
import { toast } from "sonner";
import { Beneficiary } from '@/types';

export function BulkImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { addBeneficiariesBulk } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  // FUNCIÓN: Formatea el RUT (pone puntos y guión)
  const formatRut = (run: string | number, dv: string | number) => {
    const runStr = String(run).replace(/\D/g, ''); // Solo números del cuerpo
    const dvStr = String(dv).toUpperCase();
    
    // Pone los puntos de miles
    const runConPuntos = runStr.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    
    return `${runConPuntos}-${dvStr}`;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLoading(true);

    setTimeout(async () => {
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[worksheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        const batchBeneficiaries: Beneficiary[] = [];
        let errors = 0;

        jsonData.forEach((row: any) => {
          try {
            if (!row['run']) return; 

            // CORRECCIÓN CRÍTICA: 
            // Usamos una validación estricta para el DV. 
            // Si row['dv'] es 0, ahora sí lo toma (antes lo borraba).
            const rawDv = row['dv'];
            const dv = (rawDv !== undefined && rawDv !== null) ? rawDv : '';

            // Formateamos el RUT antes de guardarlo
            const formattedRut = formatRut(row['run'], dv);

            // Generamos ID
            const uniqueId = typeof crypto !== 'undefined' && crypto.randomUUID 
              ? crypto.randomUUID() 
              : `ben-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

            const newBeneficiary: Beneficiary = {
              id: uniqueId,
              rut: formattedRut, // Guardamos ej: 12.345.678-0
              firstName: row['nombres'] || '',
              lastName: `${row['apellidopaterno'] || ''} ${row['apellidomaterno'] || ''}`.trim(),
              birthDate: row['fechanacimiento'] ? String(row['fechanacimiento']) : undefined,
              address: `${row['numdomicilio'] === 'SN' ? '' : row['numdomicilio']} ${row['calle_fps'] || row['localidad'] || ''}`.trim() || 'Dirección no especificada',
              phone: row['telefono'] ? String(row['telefono']) : '',
              email: row['email'] || '',
              registrationDate: new Date().toISOString()
            };

            batchBeneficiaries.push(newBeneficiary);
          } catch (error) {
            errors++;
          }
        });

        if (batchBeneficiaries.length > 0) {
          addBeneficiariesBulk(batchBeneficiaries);
          toast.success("Carga Masiva Exitosa", {
            description: `Se han añadido ${batchBeneficiaries.length} beneficiarios.`
          });
        } else {
          toast.warning("No se encontraron datos válidos");
        }

      } catch (error: any) {
        console.error(error);
        toast.error("Error al procesar archivo");
      } finally {
        setIsLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }, 100);
  };

  return (
    <>
      <input
        type="file"
        accept=".xlsx, .xls, .csv"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
      />
      <Button 
        variant="outline" 
        onClick={handleClick} 
        disabled={isLoading}
        className="gap-2"
      >
        <Upload className="h-4 w-4" />
        {isLoading ? 'Procesando...' : 'Cargar Excel'}
      </Button>
    </>
  );
}