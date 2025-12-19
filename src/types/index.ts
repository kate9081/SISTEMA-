export interface InventoryItem {
  id: string;
  code: string;
  year: number;
  process: string;
  description: string; // Obs_Linea
  address: string;
  department: number;
  section: string;
  purchasePrice: number;
  internalOC: string;
  publicMarketOC: string;
  uploadDate: string;
  quantityPurchased: number;
  stock: number;
  
  // Nuevos campos para Sincronización y Alertas
  category?: number;       
  price?: number;          // Alias de purchasePrice para compatibilidad
  criticalStock?: number;  // Para saber cuándo alertar (rojo)
}


export interface Professional {
  rut: string;
  firstName: string;
  lastName: string;
  position: string;
  status: 'Active' | 'Inactive';
  email: string;
}

export interface SystemUserPermissions {
  create: boolean;
  read: boolean;
  update: boolean;
  delete: boolean;
}

export interface SystemUser {
  rut: string;
  firstName: string;
  lastName: string;
  position: string;
  status: 'Active' | 'Inactive';
  username: string;
  password: string; // En una app real esto iría hasheado
  email: string; // <--- CAMPO AGREGADO
  permissions: SystemUserPermissions;
}

export interface Beneficiary {
  rut: string;
  firstName: string;
  paternalLastName: string;
  maternalLastName: string;
  address: string;
  phone: string;
  email: string;
  // Campos opcionales por si la base de datos crece
  id?: string;
}

export interface BenefitItem {
  id: string;
  name: string;
}

export interface BenefitCategory {
  id: string;
  name: string;
  items: BenefitItem[];
}

export interface AidRecord {
  id: string;              // Único para poder eliminar/editar
  folio: string;           // Cambiado a String para búsquedas flexibles
  beneficiaryRut: string;
  beneficiaryName: string; 
  date: string;
  
  aidType: string;         // Nombre de Categoría
  product: string;         // Nombre del Item

  
  quantity: number;
  value: number;
  detail: string;
  observations?: string;   // NUEVO: Para observaciones en el recibo
  
  receiverName: string;
  
  professionalId: string;
  professionalName: string; // Para mostrar en reportes sin hacer join

  items?: {
    name: string;
    quantity: number;
    value: number;
    detail: string;
  }[];
  
  // Campos opcionales para compatibilidad con Reportes y Filtros
  notes?: string;          // Alias de observations o detail
  categoryName?: string;   // Alias de aidType
  itemName?: string;       // Alias de product
  beneficiaryId?: string;
  categoryId?: string;
  itemId?: string;
}