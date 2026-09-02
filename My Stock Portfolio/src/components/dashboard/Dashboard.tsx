import React from 'react';
import { usePortfolioStore } from '../../stores/portfolioStore';
import { TrendingUp, Wallet, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import clsx from 'clsx';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const mockChartData = [
  { name: 'Jan', value: 105000 },
  { name: 'Feb', value: 108000 },
  { name: 'Mar', value: 102000 },
  { name: 'Apr', value: 112000 },
  { name: 'May', value: 118000 },
  { name: 'Jun', value: 116000 },
  { name: 'Jul', value: 124500 },
];

const StatCard = ({ title, value, change, isPositive, icon: Icon, gradient }: any) => (
  <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 relative overflow-hidden group">
    {/* Neumorphic Glow */}
    <div className={clsx("absolute -top-24 -right-24 w-48 h-48 rounded-full blur-[64px] opacity-20 group-hover:opacity-40 transition-opacity", gradient)}></div>
    
    <div className="flex justify-between items-start mb-4 relative z-10">
      <div className="w-12 h-12 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] flex items-center justify-center">
        <Icon className={clsx("w-6 h-6", isPositive ? "text-[#FC2D79]" : "text-[#823AFD]")} />
      </div>
      <div className={clsx("flex items-center gap-1 text-sm font-medium px-2 py-1 rounded-lg", 
        isPositive ? "text-[#FC2D79] bg-[#FC2D79]/10" : "text-[#823AFD] bg-[#823AFD]/10"
      )}>
        {isPositive ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
        <span>{change}%</span>
      </div>
    </div>
    
    <div className="relative z-10">
      <h3 className="text-[#9898C8] font-medium mb-1">{title}</h3>
      <div className="text-3xl font-bold text-white tabular-nums tracking-tight">
        {value}
      </div>
    </div>
  </div>
);

export const Dashboard = () => {
  const portfolios = usePortfolioStore(s => s.portfolios);
  
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Net Worth" 
          value="$124,500.00" 
          change="+12.5" 
          isPositive={true}
          icon={TrendingUp}
          gradient="bg-[#FC2D79]"
        />
        <StatCard 
          title="Cash Balance" 
          value="$14,200.00" 
          change="-2.4" 
          isPositive={false}
          icon={Wallet}
          gradient="bg-[#823AFD]"
        />
        <div className="bg-gradient-to-br from-[#823AFD] via-[#FC2D79] to-[#FD5514] rounded-3xl p-6 relative overflow-hidden shadow-[0_8px_32px_rgba(130,58,253,0.3)] flex flex-col justify-between">
          <div className="relative z-10">
            <h3 className="text-white/80 font-medium mb-1">Today's Profit</h3>
            <div className="text-4xl font-bold text-white tabular-nums tracking-tight">
              +$450.00
            </div>
          </div>
          <div className="relative z-10 mt-6">
            <button className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-medium py-3 rounded-xl transition-colors">
              View Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Area */}
        <div className="lg:col-span-2 bg-[#111418] border border-[#2A2E45] rounded-3xl p-6 min-h-[400px]">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-xl font-bold text-white">Performance Overview</h3>
            <select className="bg-[#1A1D2D] border border-[#2A2E45] text-[#9898C8] px-3 py-1.5 rounded-lg focus:outline-none focus:border-[#823AFD]">
              <option>1M</option>
              <option>3M</option>
              <option>1Y</option>
              <option>ALL</option>
            </select>
          </div>
          <div className="w-full h-72 mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={mockChartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#823AFD" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#823AFD" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2E45" vertical={false} />
                <XAxis dataKey="name" stroke="#9898C8" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                <YAxis stroke="#9898C8" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} tickFormatter={(val) => `$${val/1000}k`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#111418', borderColor: '#2A2E45', borderRadius: '12px', color: '#fff' }}
                  itemStyle={{ color: '#823AFD', fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="value" stroke="#823AFD" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-6">
          <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-[#1A1D2D] border border-[#2A2E45] hover:border-[#823AFD] transition-colors cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#0F111A] flex items-center justify-center border border-[#2A2E45]">
                    <span className="text-[#9898C8] text-xs font-bold">AAPL</span>
                  </div>
                  <div>
                    <p className="text-white font-medium group-hover:text-[#823AFD] transition-colors">Bought Apple Inc.</p>
                    <p className="text-[#9898C8] text-xs">Today, 10:45 AM</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-white font-bold tabular-nums">-$1,450</p>
                  <p className="text-[#823AFD] text-xs font-medium">10 Shares</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
