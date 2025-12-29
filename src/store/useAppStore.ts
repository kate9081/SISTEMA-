import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  InventoryItem,
  Professional,
  SystemUser,
  Beneficiary,
  BenefitCategory,
  AidRecord,
} from "@/types";

interface AppState {
  inventory: InventoryItem[];
  professionals: Professional[];
  systemUsers: SystemUser[];
  beneficiaries: Beneficiary[];
  benefitCategories: BenefitCategory[];
  aidRecords: AidRecord[];

  // Inventory
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  setInventoryBulk: (items: InventoryItem[]) => void;

  // Professionals
  addProfessional: (prof: Professional) => void;
  updateProfessional: (rut: string, prof: Partial<Professional>) => void;
  deleteProfessional: (rut: string) => void;

  // Users
  addSystemUser: (user: SystemUser) => void;
  updateSystemUser: (rut: string, user: Partial<SystemUser>) => void;
  deleteSystemUser: (rut: string) => void;

  // Beneficiaries
  addBeneficiary: (beneficiary: Beneficiary) => void;
  updateBeneficiary: (rut: string, ben: Partial<Beneficiary>) => void;
  deleteBeneficiary: (rut: string) => void;
  clearBeneficiaries: () => void;
  addBeneficiariesBulk: (beneficiaries: Beneficiary[]) => void;

  // Categories
  addBenefitCategory: (cat: BenefitCategory) => void;
  updateBenefitCategory: (id: string, cat: Partial<BenefitCategory>) => void;
  deleteBenefitCategory: (id: string) => void;

  // Aid Records
  addAidRecord: (record: AidRecord) => void;
  updateAidRecord: (id: string, record: Partial<AidRecord>) => void;
  removeAidRecord: (id: string) => void;
}

/* =======================
   DATOS INICIALES
======================= */

const initialAdmin: SystemUser = {
  rut: "11111111-1",
  firstName: "Admin",
  lastName: "Sistema",
  position: "Administrador",
  status: "Active",
  username: "admin",
  password: "123",
  email: "informatica@munisanpedro.cl", //
  permissions: { create: true, read: true, update: true, delete: true },
};

const initialBenefitCategories: BenefitCategory[] = [
  {
    id: "1",
    name: "Aporte Económico",
    items: [{ id: "1-1", name: "Ahorro para la vivienda" }],
  },
];

/* =======================
   STORE
======================= */

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      inventory: [],
      professionals: [],
      systemUsers: [initialAdmin],
      beneficiaries: [],
      benefitCategories: initialBenefitCategories,
      aidRecords: [],

      /* ===== INVENTORY ===== */

      addInventoryItem: (item) =>
        set((state) => ({
          inventory: [
            ...state.inventory,
            {
              ...item,
              department: Number(item.department),
              category: Number(item.category),
            },
          ],
        })),

      updateInventoryItem: (id, item) =>
        set((state) => ({
          inventory: state.inventory.map((i) =>
            i.id === id
              ? {
                  ...i,
                  ...item,
                  department:
                    item.department !== undefined
                      ? Number(item.department)
                      : i.department,
                  category:
                    item.category !== undefined
                      ? Number(item.category)
                      : i.category,
                }
              : i
          ),
        })),

      deleteInventoryItem: (id) =>
        set((state) => ({
          inventory: state.inventory.filter((i) => i.id !== id),
        })),

      // 🔴 CLAVE: normalización TOTAL
      setInventoryBulk: (items) =>
        set({
          inventory: items.map((i) => ({
            ...i,
            department: Number(i.department),
            category: Number(i.category),
          })),
        }),

      /* ===== PROFESSIONALS ===== */

      addProfessional: (prof) =>
        set((state) => ({
          professionals: [...state.professionals, prof],
        })),

      updateProfessional: (rut, prof) =>
        set((state) => ({
          professionals: state.professionals.map((p) =>
            p.rut === rut ? { ...p, ...prof } : p
          ),
        })),

      deleteProfessional: (rut) =>
        set((state) => ({
          professionals: state.professionals.filter((p) => p.rut !== rut),
        })),

      /* ===== USERS ===== */

      addSystemUser: (user) =>
        set((state) => ({
          systemUsers: [...state.systemUsers, user],
        })),

      updateSystemUser: (rut, user) =>
        set((state) => ({
          systemUsers: state.systemUsers.map((u) =>
            u.rut === rut ? { ...u, ...user } : u
          ),
        })),

      deleteSystemUser: (rut) =>
        set((state) => ({
          systemUsers: state.systemUsers.filter((u) => u.rut !== rut),
        })),

      /* ===== BENEFICIARIES ===== */

      addBeneficiary: (ben) =>
        set((state) => ({
          beneficiaries: [...state.beneficiaries, ben],
        })),

      updateBeneficiary: (rut, ben) =>
        set((state) => ({
          beneficiaries: state.beneficiaries.map((b) =>
            b.rut === rut ? { ...b, ...ben } : b
          ),
        })),

      deleteBeneficiary: (rut) =>
        set((state) => ({
          beneficiaries: state.beneficiaries.filter((b) => b.rut !== rut),
        })),

      clearBeneficiaries: () => set({ beneficiaries: [] }),

      addBeneficiariesBulk: (newBeneficiaries) =>
        set((state) => ({
          beneficiaries: [...state.beneficiaries, ...newBeneficiaries],
        })),

      /* ===== CATEGORIES ===== */

      addBenefitCategory: (cat) =>
        set((state) => ({
          benefitCategories: [...state.benefitCategories, cat],
        })),

      updateBenefitCategory: (id, cat) =>
        set((state) => ({
          benefitCategories: state.benefitCategories.map((c) =>
            c.id === id ? { ...c, ...cat } : c
          ),
        })),

      deleteBenefitCategory: (id) =>
        set((state) => ({
          benefitCategories: state.benefitCategories.filter(
            (c) => c.id !== id
          ),
        })),

      /* ===== AID RECORDS ===== */

      addAidRecord: (record) =>
        set((state) => ({
          aidRecords: [...state.aidRecords, record],
        })),

      updateAidRecord: (id, record) =>
        set((state) => ({
          aidRecords: state.aidRecords.map((r) =>
            r.id === id ? { ...r, ...record } : r
          ),
        })),

      removeAidRecord: (id) =>
        set((state) => ({
          aidRecords: state.aidRecords.filter((r) => r.id !== id),
        })),
    }),
    {
      name: "dideco-storage",

      // 🔥 LIMPIA DATOS VIEJOS MAL FORMATEADOS
      onRehydrateStorage: () => (state) => {
        if (state?.inventory) {
          state.inventory = state.inventory.map((i) => ({
            ...i,
            department: Number(i.department),
            category: Number(i.category),
          }));
        }
      },
    }
  )
);
