import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import AdminPortal from './components/AdminPortal';
import LoginModal from './components/LoginModal';
import Home from './pages/Home';
import Events from './pages/Events';
import BibleStudies from './pages/BibleStudies';
import ColdBrew from './pages/ColdBrew';
import People from './pages/People';
// Code-split: the world map pulls in d3-geo, the world atlas and the full
// country/state dataset — heavy deps that only this page needs, so they load
// on demand instead of bloating every other page's initial bundle.
const Community = lazy(() => import('./pages/Community'));
import { AdminProvider } from './context/AdminContext';
import { ToastProvider } from './components/Toast';
import './App.css';

function App() {
  return (
    <ToastProvider>
      <AdminProvider>
        <BrowserRouter>
          <div className="app-wrapper">
            <Navbar />
            <main className="main-content">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/events" element={<Events />} />
                <Route path="/bible-studies" element={<BibleStudies />} />
                <Route path="/cold-brew" element={<ColdBrew />} />
                <Route path="/people" element={<People />} />
                <Route path="/community" element={<Suspense fallback={<div className="page container" style={{ textAlign: 'center', paddingTop: 'calc(var(--nav-h) + 4rem)' }}><span className="badge badge-soft">Loading the map…</span></div>}><Community /></Suspense>} />
              </Routes>
            </main>
            <Footer />
            <AdminPortal />
            <LoginModal />
          </div>
        </BrowserRouter>
      </AdminProvider>
    </ToastProvider>
  );
}

export default App;
