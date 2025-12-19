# DIDECO Social Aid Management System - Development Plan

## Design Guidelines
- **Theme**: Professional, Clean, Institutional (Government).
- **Colors**:
  - Primary: #0f172a (Slate 900)
  - Accent: #2563eb (Blue 600)
  - Background: #f8fafc (Slate 50)
- **Typography**: Inter (Default shadcn font).
- **Layout**: Dashboard with Sidebar Navigation.

## Images to Generate
1. **dideco-logo.png** - Official looking logo for DIDECO (Social Community Development Directorate), blue and white, vector style, minimal.
2. **login-bg-community.jpg** - Warm, professional image of community support or social worker helping people, soft focus, suitable for login background, photorealistic.
3. **municipal-seal.png** - A generic municipal seal for the receipt header, vector style, transparent background.

## Data Structure (Mock/LocalStorage)
*Note: Using local state management as backend connection is unavailable.*
- **Stores (Zustand)**:
  - `useAppStore`: Manages all data (Inventory, Professionals, Users, Beneficiaries, Benefits, AidRecords).
  - `useAuthStore`: Manages current user session.

## Development Tasks

1. **Setup & Dependencies**
   - Install `zustand` for state management.
   - Create `src/types/index.ts` defining all interfaces (Product, Professional, User, Beneficiary, Benefit, AidRecord).

2. **State Management**
   - Create `src/store/useAppStore.ts` with initial mock data and CRUD actions.
   - Create `src/store/useAuthStore.ts`.

3. **Core Components**
   - `src/components/layout/MainLayout.tsx` (Sidebar, Header, Mobile Responsive).
   - `src/components/ui/data-table.tsx` (Reusable table with pagination/sorting).
   - `src/components/ui/search-input.tsx` (Standardized search with clear button).

4. **Pages - Administration**
   - `src/pages/Login.tsx`
   - `src/pages/Dashboard.tsx` (Overview)
   - `src/pages/SystemUsers.tsx` (User management with permissions checkboxes).
   - `src/pages/Professionals.tsx` (Staff management).

5. **Pages - Operational**
   - `src/pages/Inventory.tsx` (Stock management, Import simulation).
   - `src/pages/Beneficiaries.tsx` (People management).
   - `src/pages/BenefitsConfig.tsx` (Manage aid types and items).

6. **Pages - Aid Delivery**
   - `src/pages/AidDelivery.tsx` (Form to register aid).
   - `src/components/aid/ReceiptModal.tsx` (Printable receipt view matching requirements).

7. **Pages - Reports**
   - `src/pages/Reports.tsx` (Tabs for Inventory, Critical Stock, History).

8. **Routing & Entry**
   - Update `src/App.tsx` with routes.
   - Update `src/main.tsx`.