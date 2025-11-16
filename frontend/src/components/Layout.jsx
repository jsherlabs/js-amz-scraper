import { Outlet, NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Settings
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Products', href: '/products', icon: Package },
  { name: 'Price Tracker', href: '/tracker', icon: TrendingUp },
  { name: 'Reviews', href: '/reviews', icon: MessageSquare },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-lg">
        <div className="flex h-16 items-center px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-primary-600">
            Amazon Scraper
          </h1>
        </div>

        <nav className="mt-6 px-3">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.href}
              end={item.href === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg mb-1 transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-medium'
                    : 'text-gray-700 hover:bg-gray-100'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </NavLink>
          ))}
        </nav>
      </div>

      {/* Main content */}
      <div className="pl-64">
        <header className="h-16 bg-white border-b border-gray-200 flex items-center px-8">
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-gray-800">
              Welcome back
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">API Connected</span>
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
