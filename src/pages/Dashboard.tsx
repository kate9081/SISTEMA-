import { useState, useEffect } from 'react';
import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore'; // Mantenemos esto para Beneficiarios/Ayudas por ahora
import { Package, Users, HeartHandshake, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  // 1. Mantenemos Beneficiarios y Ayudas del Store (hasta que migremos eso también)
  const { beneficiaries, aidRecords } = useAppStore();

  // 2. Estado local para los datos que vienen de SQL (Inventario)
  const [inventoryStats, setInventoryStats] = useState({
    totalProducts: 0,
    criticalCount: 0,
    criticalList: [] as any[]
  });
  const [isLoading, setIsLoading] = useState(true);

  // 3. Conectar al Backend al cargar la página
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const res = await fetch('http://localhost:3001/api/dashboard/metricas');
        const data = await res.json();
        
        if (data.success) {
          setInventoryStats({
            totalProducts: data.resumen.totalProductos,
            criticalCount: data.resumen.totalCriticos,
            criticalList: data.criticos
          });
        }
      } catch (error) {
        console.error("Error cargando dashboard:", error);
        toast.error("No se pudo actualizar el stock desde el servidor");
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();
  }, []);

  const totalAidValue = aidRecords.reduce((acc, curr) => acc + curr.value, 0);

  const stats = [
    {
      title: "Beneficiarios Registrados",
      value: beneficiaries.length,
      icon: Users,
      color: "text-blue-600",
      bg: "bg-blue-100"
    },
    {
      title: "Ayudas Entregadas",
      value: aidRecords.length,
      icon: HeartHandshake,
      color: "text-green-600",
      bg: "bg-green-100"
    },
    {
      title: "Productos en Inventario",
      value: isLoading ? "..." : inventoryStats.totalProducts, // Viene de SQL
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-100"
    },
    {
      title: "Stock Crítico",
      value: isLoading ? "..." : inventoryStats.criticalCount, // Viene de SQL
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100"
    }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
        
        {/* TARJETAS SUPERIORES */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                  <div className={`p-2 rounded-full ${stat.bg}`}>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* SECCIÓN CENTRAL */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          
          {/* COLUMNA IZQUIERDA: RESUMEN FINANCIERO */}
          <Card className="col-span-4">
            <CardHeader>
              <CardTitle>Resumen de Ayudas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-slate-500 mb-4">
                Total invertido en ayudas sociales:
                <span className="text-2xl font-bold text-slate-900 block mt-1">
                  ${totalAidValue.toLocaleString('es-CL')}
                </span>
              </div>
              
              {/* LISTA DE ALERTAS DE STOCK (NUEVO) */}
              {inventoryStats.criticalList.length > 0 && (
                <div className="mt-6">
                    <h4 className="text-sm font-semibold text-red-600 mb-2 flex items-center">
                        <AlertTriangle className="h-4 w-4 mr-1"/> Alertas de Stock Bajo
                    </h4>
                    <div className="bg-red-50 border border-red-100 rounded-md p-3 max-h-[150px] overflow-y-auto">
                        <ul className="space-y-2">
                            {inventoryStats.criticalList.map((item: any) => (
                                <li key={item.id} className="text-xs flex justify-between items-center text-red-800 border-b border-red-100 pb-1 last:border-0">
                                    <span className="truncate max-w-[200px] font-medium">{item.name}</span>
                                    <span className="bg-white px-2 py-0.5 rounded border border-red-200 font-bold">
                                        Stock: {item.stock}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* COLUMNA DERECHA: ÚLTIMAS ENTREGAS */}
          <Card className="col-span-3">
            <CardHeader>
              <CardTitle>Últimas Entregas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {aidRecords.slice(-5).reverse().map((record) => (
                  <div key={record.folio} className="flex items-center">
                    <div className="ml-4 space-y-1">
                      <p className="text-sm font-medium leading-none">{record.beneficiaryName}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.aidType} - {record.product}
                      </p>
                    </div>
                    <div className="ml-auto font-medium text-sm">
                      {new Date(record.date).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {aidRecords.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay registros recientes</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
}