import React, { useEffect, Suspense, lazy } from 'react';
import { useAuthStore } from './stores/authStore';
import { usePortfolioStore } from './stores/portfolioStore';
import { useUiStore } from './stores/uiStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { Dashboard } from './components/dashboard/Dashboard';
import { AppModal } from './components/common/AppModal';

const ScorecardPage = lazy(() => import('./components/scorecard/ScorecardPage').then(m => ({ default: m.ScorecardPage })));
const AnalysisPage = lazy(() => import('./components/analysis/AnalysisPage').then(m => ({ default: m.AnalysisPage })));
const PerformanceChartPage = lazy(() => import('./components/PerformanceChartPage'));
const RiskPage = lazy(() => import('./components/risk/RiskPage').then(m => ({ default: m.RiskPage })));
const HealthRiskPage = lazy(() => import('./components/health/HealthRiskPage').then(m => ({ default: m.HealthRiskPage })));
const SmartRebalancePage = lazy(() => import('./components/rebalance/SmartRebalancePage').then(m => ({ default: m.SmartRebalancePage })));
const TransactionTable = lazy(() => import('./components/transactions/TransactionTable').then(m => ({ default: m.TransactionTable })));
const PortfolioList = lazy(() => import('./components/portfolio/PortfolioList').then(m => ({ default: m.PortfolioList })));
const SettingPage = lazy(() => import('./components/settings/SettingPage').then(m => ({ default: m.SettingPage })));

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

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('[App ErrorBoundary caught an error]:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="bg-[#111418] border border-rose-500/30 rounded-3xl p-8 max-w-2xl mx-auto my-12 shadow-[0_8px_32px_rgba(252,45,121,0.15)] text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-xl font-black text-white font-heading">เกิดข้อผิดพลาดในการโหลดโมดูลนี้</h2>
          <p className="text-xs text-[#CBD5E1] font-body">
            {this.state.error?.message || 'ระบบตรวจพบข้อผิดพลาดที่ไม่คาดคิด'}
          </p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="px-5 py-2.5 bg-gradient-to-r from-[#823AFD] to-[#FC2D79] hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-md transition-all font-heading"
          >
            รีโหลดหน้าเว็บ (Refresh)
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const MainLayout = () => {
  const { activeTab } = useUiStore();
  
  return (
    <div className="min-h-screen bg-[#0B1220] flex font-sans">
      <Sidebar />
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-8 scroll-smooth">
          <ErrorBoundary>
            <Suspense fallback={
              <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-12 flex flex-col items-center justify-center min-h-[400px] shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <div className="w-10 h-10 border-4 border-[#823AFD] border-t-transparent rounded-full animate-spin"></div>
                <span className="text-[#CBD5E1] text-sm font-semibold mt-4">Loading module...</span>
              </div>
            }>
            {activeTab === 'dashboard' && <Dashboard />}
            {activeTab === 'analysis' && <AnalysisPage />}
            {activeTab === 'performance' && <AnalysisPage defaultTab="performance" />}
            {activeTab === 'health' && <HealthRiskPage />}
            {activeTab === 'scorecard' && <HealthRiskPage defaultTab="scorecard" />}
            {activeTab === 'risk' && <HealthRiskPage defaultTab="risk" />}
            {activeTab === 'rebalance' && <SmartRebalancePage />}
            {activeTab === 'transactions' && <TransactionTable />}
            {activeTab === 'portfolios' && <PortfolioList />}
            {activeTab === 'settings' && <SettingPage />}
            {activeTab !== 'dashboard' && activeTab !== 'scorecard' && activeTab !== 'risk' && activeTab !== 'health' && activeTab !== 'rebalance' && activeTab !== 'analysis' && activeTab !== 'performance' && activeTab !== 'transactions' && activeTab !== 'portfolios' && activeTab !== 'settings' && (
              <div className="bg-[#111418] border border-[#2A2E45] rounded-3xl p-8 min-h-[500px] flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.2)]">
                <p className="text-[#9898C8] text-lg font-medium">
                  {activeTab} module is under construction.
                </p>
              </div>
            )}
          </Suspense>
          </ErrorBoundary>
        </main>
      </div>
      <AppModal />
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
