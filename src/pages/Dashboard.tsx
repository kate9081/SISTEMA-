import MainLayout from '@/components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useAppStore } from '@/store/useAppStore';
import { Package, Users, HeartHandshake, AlertTriangle } from 'lucide-react';

export default function Dashboard() {
  const { inventory, beneficiaries, aidRecords } = useAppStore();

  const criticalStockCount = inventory.filter(i => i.stock <= 5).length; // Assuming 5 is critical threshold
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
      value: inventory.length,
      icon: Package,
      color: "text-purple-600",
      bg: "bg-purple-100"
    },
    {
      title: "Stock Crítico",
      value: criticalStockCount,
      icon: AlertTriangle,
      color: "text-red-600",
      bg: "bg-red-100"
    }
  ];

  return (
    <MainLayout>
      <div className="space-y-6">
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

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
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
              <div className="h-[200px] flex items-center justify-center bg-slate-50 rounded-md border border-dashed border-slate-300">
                <p className="text-slate-400">Gráfico de ayudas por mes (Próximamente)</p>
              </div>
            </CardContent>
          </Card>
          
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