import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminPortal from './components/AdminPortal';
import Home from './pages/Home';
import Events from './pages/Events';
import BibleStudies from './pages/BibleStudies';
import ColdBrew from './pages/ColdBrew';
import People from './pages/People';
import { AdminProvider } from './context/AdminContext';
import './App.css'; // Will be empty

function App() {
  return (
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
            </Routes>
          </main>
          <AdminPortal />
        </div>
      </BrowserRouter>
    </AdminProvider>
  );
}

export default App;
