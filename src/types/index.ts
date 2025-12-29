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
  price?: number;          // Alias de purchasePrice
  criticalStock?: number;  // Para alertas
  
  // Campos auxiliares para compatibilidad con el código
  name?: string;           // Alias de description
  quantity?: number;       // Alias de stock
}

export interface Professional {
  rut: string;
  firstName: string;
  lastName: string;
  position: string;
  status: 'Active' | 'Inactive';
  email: string;
  
  // Campos opcionales requeridos por el código
  id?: string | number;
  phone?: string;
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
  password: string;
  email: string; 
  permissions: SystemUserPermissions;
  
  // Campos opcionales
  id?: string | number;
  role?: string;
}

// Alias para compatibilidad con AuthStore
export type User = SystemUser;

export interface Beneficiary {
  rut: string;
  firstName: string;
  
  // Unificamos apellidos en uno solo para simplificar
  lastName: string; 
  
  // Mantenemos estos opcionales por si acaso
  paternalLastName?: string;
  maternalLastName?: string;
  
  address: string;
  phone: string;
  email: string;
  
  birthDate?: string;
  registrationDate?: string;
  
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
  id: string;              
  folio: string;           
  beneficiaryRut: string;
  beneficiaryName: string; 
  date: string;
  
  aidType: string;         
  product: string;         

  quantity: number;
  value: number;
  detail: string;
  observations?: string;   
  
  receiverName: string;
  
  professionalId: string;
  professionalName: string; 

  items?: {
    name: string;
    quantity: number;
    value: number;
    detail: string;
  }[];
  
  notes?: string;          
  categoryName?: string;   
  itemName?: string;       
  beneficiaryId?: string;
  categoryId?: string;
  itemId?: string;
}