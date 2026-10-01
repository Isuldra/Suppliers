import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import LanguageSelector from './LanguageSelector';
import SettingsModal from './SettingsModal';
import { KPICard } from './dashboard/KPICard';
import { TopSuppliersChart } from './dashboard/TopSuppliersChart';
import { OrderTimelineChart } from './dashboard/OrderTimelineChart';
import { TopItemsTable } from './dashboard/TopItemsTable';
import type { DashboardStats, SupplierStat, WeekStat } from '../types/Dashboard';
import {
  ChartBarIcon,
  ClockIcon,
  CalendarIcon,
  Cog6ToothIcon,
  HomeIcon,
  PresentationChartBarIcon,
} from '@heroicons/react/24/outline';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topSuppliers, setTopSuppliers] = useState<SupplierStat[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeekStat[]>([]);
  const [topItems, setTopItems] = useState<
    Array<{
      itemNo: string;
      description: string;
      productName: string;
      totalOutstandingQty: number;
      orderCount: number;
      supplierCount: number;
    }>
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [appVersion, setAppVersion] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [activeTab, setActiveTab] = useState<'oversikt' | 'varenummer' | 'timeline'>('oversikt');

  useEffect(() => {
    loadDashboardData();
    const fetchVersion = async () => {
      try {
        const version = await window.electron.getAppVersion();
        setAppVersion(version);
        document.title = `Pulse v${version} - Dashboard`;
      } catch (error) {
        console.error('Failed to fetch app version:', error);
      }
    };

    fetchVersion();
  }, []);

  const loadDashboardData = async () => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    try {
      setIsLoading(true);
      setError(null);
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000);
      });
      const [statsResponse, suppliersResponse, weeksResponse, topItemsResponse] =
        await Promise.race([
          Promise.all([
            window.electron.getDashboardStats(),
            window.electron.getTopSuppliers(10),
            window.electron.getOrdersByWeek(8, 2),
            window.electron.getTopItems(200),
          ]),
          timeoutPromise,
        ]);
      if (!statsResponse.success) {
        throw new Error(statsResponse.error || 'Failed to load dashboard stats');
      }
      if (!suppliersResponse.success) {
        throw new Error(suppliersResponse.error || 'Failed to load suppliers');
      }
      if (!weeksResponse.success) {
        throw new Error(weeksResponse.error || 'Failed to load weekly data');
      }
      if (!topItemsResponse.success) {
        throw new Error(topItemsResponse.error || 'Failed to load top items');
      }
      setStats(statsResponse.data!);
      setTopSuppliers(suppliersResponse.data!);
      setWeeklyData(weeksResponse.data!);
      setTopItems(topItemsResponse.data || []);

      console.log('Dashboard data loaded successfully');
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      clearTimeout(timeout);
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadDashboardData();
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-glass">
      <div className="bg-gradient-to-r from-primary via-primary to-primary-dark text-neutral-white shadow-lg backdrop-blur-lg">
        <div className="container-app py-4 px-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              {appVersion && (
                <span className="text-xs text-neutral-white/70 bg-white/10 backdrop-blur-sm border border-white/20 px-2 py-1 rounded">
                  v{appVersion}
                </span>
              )}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleRefresh}
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
                disabled={isLoading}
                aria-label="Oppdater dashboard"
              >
                {isLoading ? 'Laster...' : 'Oppdater'}
              </button>
              <Link
                to="/"
                className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
              >
                <HomeIcon className="w-5 h-5" />
                Tilbake til hovedside
              </Link>
              <LanguageSelector mode="compact" />
              <button
                onClick={() => setShowSettings(true)}
                className="bg-white/10 backdrop-blur-sm border border-white/20 hover:bg-white/20 px-3 py-2 rounded transition-all text-sm"
                title="Innstillinger"
                aria-label="Innstillinger"
              >
                <Cog6ToothIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-1 flex items-center justify-center gap-3">
              <PresentationChartBarIcon className="w-8 h-8" />
              Pulse Dashboard
              <PresentationChartBarIcon className="w-8 h-8" />
            </h1>
            <p className="text-sm text-neutral-white/80">
              Oversikt over leverandører og utestående ordre
            </p>
          </div>
        </div>
      </div>
      <div className="flex-1 p-6 container-app mx-auto">
        <div className="bg-white/30 backdrop-blur-xl rounded-3xl border border-white/40 shadow-2xl p-8">
          {error && (
            <div className="text-center py-8">
              <h2 className="text-xl font-bold text-neutral mb-4">Feil ved lasting av dashboard</h2>
              <p className="text-neutral-secondary mb-4">{error}</p>
              <button onClick={handleRefresh} className="btn btn-primary">
                Prøv igjen
              </button>
            </div>
          )}
          {isLoading && !error && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 animate-pulse rounded-xl"></div>
                ))}
              </div>
            </div>
          )}
          {!isLoading && !error && stats && (
            <>
              <div className="flex gap-2 mb-6 border-b border-neutral-light">
                <button
                  onClick={() => setActiveTab('oversikt')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'oversikt'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-neutral-secondary hover:text-neutral'
                  }`}
                >
                  Oversikt
                </button>
                <button
                  onClick={() => setActiveTab('varenummer')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'varenummer'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-neutral-secondary hover:text-neutral'
                  }`}
                >
                  Varenummer
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`px-4 py-2 font-medium transition-colors ${
                    activeTab === 'timeline'
                      ? 'border-b-2 border-primary text-primary'
                      : 'text-neutral-secondary hover:text-neutral'
                  }`}
                >
                  Timeline
                </button>
              </div>
              {activeTab === 'oversikt' && (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <KPICard
                      title="Totalt restlinjer"
                      value={stats.totalOutstandingLines}
                      icon={<ChartBarIcon className="w-6 h-6 text-blue-600" />}
                      formatType="number"
                      loading={isLoading}
                    />
                    <KPICard
                      title="Gjennomsnittlig forsinkelse"
                      value={stats.averageDelayDays}
                      icon={<ClockIcon className="w-6 h-6 text-orange-600" />}
                      formatType="number"
                      suffix=" dager"
                      loading={isLoading}
                    />
                    <KPICard
                      title="Over 30 dager forsinket"
                      value={stats.criticallyDelayedOrders}
                      icon={<ClockIcon className="w-6 h-6 text-red-600" />}
                      formatType="number"
                      loading={isLoading}
                    />
                    <KPICard
                      title="Innen leveringsfrist"
                      value={stats.onTimeDeliveryRate}
                      icon={<ChartBarIcon className="w-6 h-6 text-green-600" />}
                      formatType="number"
                      suffix="%"
                      loading={isLoading}
                    />
                    <KPICard
                      title="Forfalte restlinjer"
                      value={stats.overdueOrders}
                      icon={<ClockIcon className="w-6 h-6 text-red-600" />}
                      formatType="number"
                      loading={isLoading}
                    />
                    <KPICard
                      title="Tidligste leveringsdato"
                      value={stats.oldestOutstandingOrderDate}
                      icon={<CalendarIcon className="w-6 h-6 text-yellow-600" />}
                      formatType="date"
                      loading={isLoading}
                    />
                  </div>
                  <div className="space-y-6 mb-6">
                    <TopSuppliersChart data={topSuppliers} loading={isLoading} />
                  </div>
                  {stats.dataSource === 'cache' && (
                    <div className="text-center text-sm text-neutral-secondary mt-4">
                      Data fra cache (sist oppdatert:{' '}
                      {new Date(stats.lastUpdated).toLocaleString('nb-NO')})
                    </div>
                  )}
                </>
              )}
              {activeTab === 'varenummer' && <TopItemsTable data={topItems} loading={isLoading} />}
              {activeTab === 'timeline' && (
                <div className="space-y-6">
                  <OrderTimelineChart data={weeklyData} loading={isLoading} />
                  {stats.dataSource === 'cache' && (
                    <div className="text-center text-sm text-neutral-secondary mt-4">
                      Data fra cache (sist oppdatert:{' '}
                      {new Date(stats.lastUpdated).toLocaleString('nb-NO')})
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
};

export default Dashboard;
