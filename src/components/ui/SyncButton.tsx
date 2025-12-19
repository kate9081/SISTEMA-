import { useState, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { RefreshCw, Search, XCircle } from "lucide-react"; 
import { useAppStore } from '@/store/useAppStore';
import { toast } from "sonner";
import { InventoryItem } from '@/types';

interface SyncButtonProps {
  yearFilter: string;
  ocFilter: string;
  isSearchBtn?: boolean; // Nueva propiedad para decidir el estilo
}

export function SyncButton({ yearFilter, ocFilter, isSearchBtn = false }: SyncButtonProps) {
  const { setInventoryBulk } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      toast.info("Detenido.");
    }
  };

  const handleSync = async () => {
    setIsLoading(true);
    // Mensaje diferente según el botón que uses
    const actionName = isSearchBtn ? "Buscando OC..." : "Sincronizando...";
    const toastId = toast.loading(actionName);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = `http://localhost:3001/api/sincronizar?year=${yearFilter}&oc=${encodeURIComponent(ocFilter)}`;
      const response = await fetch(url, { signal: controller.signal });
      
      if (!response.ok) throw new Error("Error de conexión.");
      
      const result = await response.json();
      if (!result.success) throw new Error(result.error || "Error SQL.");

      const mappedItems: InventoryItem[] = result.data.map((item: any) => ({
            id: String(item.id),
            code: String(item.code),
            name: item.name, 
            description: item.name || 'Sin Descripción', 
            year: item.purchaseDate ? new Date(item.purchaseDate).getFullYear() : new Date().getFullYear(),
            process: 'Compra Ágil',
            address: 'DIDECO',
            department: String(item.category),
            section: '',
            purchasePrice: Number(item.price),
            internalOC: item.oc_limpia, 
            publicMarketOC: '', 
            uploadDate: item.purchaseDate ? new Date(item.purchaseDate).toISOString() : new Date().toISOString(),
            quantityPurchased: Number(item.quantity),
            stock: Number(item.quantity),
            category: String(item.category),
            quantity: Number(item.quantity),
            price: Number(item.price),
            criticalStock: 5
      }));

      setInventoryBulk(mappedItems);
      toast.success("Éxito", { id: toastId, description: `${mappedItems.length} registros cargados.` });

    } catch (error: any) {
      if (error.name === 'AbortError') toast.dismiss(toastId);
      else { console.error(error); toast.error("Error", { id: toastId, description: error.message }); }
    } finally {
      if (abortControllerRef.current === controller) { setIsLoading(false); abortControllerRef.current = null; }
    }
  };

  if (isLoading) {
    return (
      <Button variant="destructive" onClick={handleStop} className="h-9 gap-2">
        <XCircle className="h-4 w-4"/> Cancelar
      </Button>
    );
  }

  // Si es modo BUSCAR (Azul sólido, icono lupa)
  if (isSearchBtn) {
    return (
      <Button 
        variant="default" 
        onClick={handleSync} 
        className="h-9 bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-2"
      >
        <Search className="h-4 w-4" />
        BUSCAR
      </Button>
    );
  }

  // Si es modo SINCRONIZAR (Borde gris, icono recargar) - Por defecto
  return (
    <Button 
      variant="outline" 
      onClick={handleSync} 
      className="h-9 gap-2 border-blue-600 text-blue-700 hover:bg-blue-50 font-medium"
    >
      <RefreshCw className="h-4 w-4" />
      Sincronizar SQL
    </Button>
  );
}