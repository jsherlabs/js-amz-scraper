import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import PriceTracker from './pages/PriceTracker';
import Reviews from './pages/Reviews';
import Analytics from './pages/Analytics';
import Settings from './pages/Settings';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="tracker" element={<PriceTracker />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
