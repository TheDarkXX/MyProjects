import React, { useEffect } from 'react';
import { useAuthStore } from './stores/authStore';
import { usePortfolioStore } from './stores/portfolioStore';
import { useUiStore } from './stores/uiStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { AnalysisPage } from './components/analysis/AnalysisPage';
import { TransactionTable } from './components/transactions/TransactionTable';
import { PortfolioList } from './components/portfolio/PortfolioList';
import { SettingPage } from './components/settings/SettingPage';
import PerformanceChartPage from './components/PerformanceChartPage';
import { ScorecardPage } from './components/scorecard/ScorecardPage';

// Temporary placeholder components until Phase 5 UI Revamp
const Login = () => {
  const login = useAuthStore((s) => s.login);
  const [password, setPassword] = React.useState('');
  
  return (
    <div className="min-h-screen bg-[#0B1220] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-[#111418] rounded-2xl p-8 shadow-[0_8px_32px_rgba(130,58,253,0.15)] border border-[#2A2E45]">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#823AFD] via-[#FC2D79] to-[#FD5514] flex items-center justify-center shadow-[0_4px_24px_rgba(130,58,253,0.35)]">
            <span className="text-white font-bold text-2xl">SP</span>
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white mb-8 text-center tracking-tight">Access Portfolio</h1>
        <form onSubmit={(e) => { e.preventDefault(); login(password); }}>
          <div className="mb-6">
            <input 
              type="password" 
              placeholder="Enter Master Password"
              className="w-full bg-[#0F111A] text-white px-5 py-4 rounded-xl border border-[#2A2E45] focus:border-[#823AFD] focus:ring-1 focus:ring-[#823AFD] focus:outline-none transition-all placeholder-[#9898C8]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="w-full bg-gradient-to-r from-[#823AFD] to-[#FC2D79] hover:opacity-90 text-white font-bold py-4 rounded-xl shadow-[0_4px_16px_rgba(252,45,121,0.3)] transition-all">
            Secure Login
          </button>
        </form>
      </div>
    </div>
  );
};

const MainLayout = () => {
  const { activeTab } = useUiStore();
  
  return (
    <div className="min-h-screen bg-[#0B1220] flex font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          {activeTab === 'dashboard' && <Dashboard />}
          {activeTab === 'scorecard' && <ScorecardPage />}
          {activeTab === 'analysis' && <AnalysisPage />}
          {activeTab === 'performance' && <PerformanceChartPage />}
          {activeTab === 'transactions' && <TransactionTable />}
          {activeTab === 'portfolios' && <PortfolioList />}
          {activeTab === 'settings' && <SettingPage />}
          {activeTab !== 'dashboard' && activeTab !== 'scorecard' && activeTab !== 'analysis' && activeTab !== 'performance' && activeTab !== 'transactions' && activeTab !== 'portfolios' && activeTab !== 'settings' && (
            <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 min-h-[500px] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
              <p className="text-[#9898C8] text-lg font-medium">
                {activeTab} module is under construction.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export const App = () => {
  const { isAuthenticated, verify } = useAuthStore();
  const fetchPortfolios = usePortfolioStore((s) => s.fetchPortfolios);

  useEffect(() => {
    if (isAuthenticated) {
      verify();
      fetchPortfolios();
    }
  }, [isAuthenticated, verify, fetchPortfolios]);

  if (!isAuthenticated) return <Login />;
  
  return <MainLayout />;
};
