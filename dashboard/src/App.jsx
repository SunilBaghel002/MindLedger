import React, { useEffect, useState } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardHome from './pages/DashboardHome';
import ApplicationsPage from './pages/ApplicationsPage';
import BrowserPage from './pages/BrowserPage';
import YoutubePage from './pages/YoutubePage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';
import { api } from './services/api';
import './styles/variables.css';
import './styles/main.css';
import './styles/components.css';

const TITLES = {
  dashboard: 'Dashboard',
  apps: 'Applications',
  browser: 'Browser',
  youtube: 'YouTube Analytics',
  reports: 'Reports',
  settings: 'Settings',
};

export default function App() {
  const [activeSection, setActiveSection] = useState('dashboard');
  const [dashboardData, setDashboardData] = useState(null);
  const [dashboardError, setDashboardError] = useState(null);

  const fetchDashboard = (isInitial = false) => {
    if (isInitial && !dashboardData) {
      setDashboardError(null);
    }
    api
      .getTodayDashboard()
      .then((data) => {
        setDashboardData(data);
        setDashboardError(null);
      })
      .catch((err) => {
        console.warn('Dashboard data fetch failed:', err);
        if (!dashboardData) {
          setDashboardError(err.message || 'Failed to fetch dashboard data');
        }
      });
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
            onRetry={fetchDashboard}
          />
        );
      case 'apps':
        return <ApplicationsPage />;
      case 'browser':
        return <BrowserPage />;
      case 'youtube':
        return <YoutubePage />;
      case 'reports':
        return <ReportsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <DashboardHome
            data={dashboardData}
            error={dashboardError}
            onRetry={fetchDashboard}
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
        <Header title={TITLES[activeSection] || 'Dashboard'} />
        <main className="content-body">{renderContent()}</main>
      </div>
    </div>
  );
}
