import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import TopBar from './components/TopBar';
import DashboardHome from './pages/DashboardHome';
import ApplicationsPage from './pages/ApplicationsPage';
import BrowserPage from './pages/BrowserPage';
import YoutubePage from './pages/YoutubePage';
import ProcessesPage from './pages/ProcessesPage';
import BatteryPage from './pages/BatteryPage';
import HydrationPage from './pages/HydrationPage';
import LimitsPage from './pages/LimitsPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './services/api';
import './styles/tokens.css';
import './styles/variables.css';
import './styles/main.css';
import './styles/components.css';

const TITLES = {
  dashboard: 'Dashboard',
  apps: 'Applications',
  browser: 'Browser',
  youtube: 'YouTube Analytics',
  processes: 'Process Supervisor',
  battery: 'Battery & Power',
  hydration: 'Hydration & Wellness',
  limits: 'App & Website Limits',
  reports: 'Reports',
  settings: 'Settings',
};

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = async (isInitial = false) => {
    if (isInitial && !dashboardData) {
      setDashboardError(null);
    }
    try {
      const data = await api.getTodayDashboard();
      setDashboardData(data);
      setDashboardError(null);
    } catch (err) {
      console.warn('Dashboard data fetch failed:', err);
      if (!dashboardData) {
        setDashboardError(err.message || 'Failed to fetch dashboard data');
      }
    }
  };

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchDashboard(false);
      // Brief artificial delay for smooth visual feedback
      await new Promise((res) => setTimeout(res, 400));
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboard(true);
    const interval = setInterval(() => {
      if (!document.hidden) {
        fetchDashboard(false);
      }
    }, 5000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchDashboard(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <DashboardHome
            data={dashboardData}
            error={dashboardError}
            onRetry={handleManualRefresh}
            isRefreshing={isRefreshing}
          />
        );
      case 'apps':
        return <ApplicationsPage />;
      case 'browser':
        return <BrowserPage />;
      case 'youtube':
        return <YoutubePage />;
      case 'processes':
        return <ProcessesPage />;
      case 'battery':
        return <BatteryPage />;
      case 'hydration':
        return <HydrationPage />;
      case 'limits':
        return <LimitsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardHome
            data={dashboardData}
            error={dashboardError}
            onRetry={handleManualRefresh}
            isRefreshing={isRefreshing}
          />
        );
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activeSection={activeSection}
        onSelectSection={setActiveSection}
      />
      <div className="main-wrapper">
        <TopBar />
        <Header
          title={TITLES[activeSection] || 'Dashboard'}
          onRefresh={handleManualRefresh}
          isRefreshing={isRefreshing}
        />
        <main className="content-body">{renderContent()}</main>
      </div>
    </div>
  );
}
