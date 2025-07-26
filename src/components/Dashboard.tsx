import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Ship, Package, DollarSign, Award } from 'lucide-react';
import { useGameStore } from '../store/gameStore';

export const Dashboard: React.FC = () => {
  const { 
    cash, 
    totalRevenue, 
    totalCosts, 
    completedContracts,
    fleet, 
    activeVoyages,
    formatCurrency 
  } = useGameStore();

  const profit = totalRevenue - totalCosts;
  const profitMargin = totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0;

  // Fleet status data for pie chart
  const fleetStatusData = [
    { name: '待機中', value: fleet.filter(s => s.status === 'idle').length, color: '#10B981' },
    { name: '航行中', value: fleet.filter(s => s.status === 'sailing').length, color: '#3B82F6' },
    { name: '積込中', value: fleet.filter(s => s.status === 'loading').length, color: '#F59E0B' },
    { name: 'メンテ中', value: fleet.filter(s => s.status === 'maintenance').length, color: '#EF4444' },
  ].filter(item => item.value > 0);

  // Sample revenue data (in a real app, this would be historical data)
  const revenueData = [
    { period: '第1週', revenue: totalRevenue * 0.1, costs: totalCosts * 0.1 },
    { period: '第2週', revenue: totalRevenue * 0.2, costs: totalCosts * 0.2 },
    { period: '第3週', revenue: totalRevenue * 0.3, costs: totalCosts * 0.3 },
    { period: '第4週', revenue: totalRevenue * 0.4, costs: totalCosts * 0.4 },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <TrendingUp className="text-blue-600" size={24} />
        <h2 className="text-2xl font-bold text-slate-800">経営ダッシュボード</h2>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-r from-green-50 to-green-100 p-6 rounded-lg border border-green-200">
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="text-green-600" size={24} />
            <span className="text-green-700 font-medium">現在資金</span>
          </div>
          <div className="text-3xl font-bold text-green-800">
            {formatCurrency(cash)}
          </div>
        </div>

        <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="text-blue-600" size={24} />
            <span className="text-blue-700 font-medium">総利益</span>
          </div>
          <div className="text-3xl font-bold text-blue-800">
            {formatCurrency(profit)}
          </div>
          <div className={`text-sm ${profitMargin >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            利益率: {profitMargin.toFixed(1)}%
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 rounded-lg border border-orange-200">
          <div className="flex items-center gap-3 mb-2">
            <Ship className="text-orange-600" size={24} />
            <span className="text-orange-700 font-medium">保有船舶</span>
          </div>
          <div className="text-3xl font-bold text-orange-800">
            {fleet.length}
          </div>
          <div className="text-sm text-orange-600">
            航行中: {activeVoyages.length}
          </div>
        </div>

        <div className="bg-gradient-to-r from-purple-50 to-purple-100 p-6 rounded-lg border border-purple-200">
          <div className="flex items-center gap-3 mb-2">
            <Package className="text-purple-600" size={24} />
            <span className="text-purple-700 font-medium">完了契約</span>
          </div>
          <div className="text-3xl font-bold text-purple-800">
            {completedContracts}
          </div>
          <div className="text-sm text-purple-600">
            総収益: {formatCurrency(totalRevenue)}
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">週次収益推移</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
              <YAxis tickFormatter={(value) => `$${(value / 1000000).toFixed(0)}M`} />
              <Tooltip 
                formatter={(value: number) => [formatCurrency(value), '']}
                labelStyle={{ color: '#1f2937' }}
              />
              <Bar dataKey="revenue" fill="#3B82F6" name="収益" />
              <Bar dataKey="costs" fill="#EF4444" name="コスト" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Fleet Status Chart */}
        <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-4">船舶ステータス</h3>
          {fleetStatusData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={fleetStatusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {fleetStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              <div className="text-center">
                <Ship size={48} className="mx-auto mb-4 opacity-50" />
                <p>船舶データがありません</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg shadow-lg p-6 border border-slate-200">
        <h3 className="text-lg font-bold text-slate-800 mb-4">最近のアクティビティ</h3>
        <div className="space-y-3">
          {activeVoyages.slice(0, 5).map(voyage => {
            const ship = fleet.find(s => s.id === voyage.shipId);
            return (
              <div key={voyage.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Ship className="text-blue-600" size={20} />
                  <div>
                    <div className="font-medium text-slate-800">{ship?.name}</div>
                    <div className="text-sm text-slate-600">
                      航行中 • 進捗 {(voyage.currentProgress * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-green-600">
                    {formatCurrency(voyage.revenue)}
                  </div>
                  <div className="text-sm text-slate-500">
                    予想収益
                  </div>
                </div>
              </div>
            );
          })}
          
          {activeVoyages.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <Package size={48} className="mx-auto mb-4 opacity-50" />
              <p>現在進行中の航海はありません</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};