// App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import axios from 'axios';
import Dashboard from './components/Dashboard';
import MotionList from './components/MotionList';
import MotionDetail from './components/MotionDetail';
import Analytics from './components/Analytics';
import Settings from './components/Settings';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

function App() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshDate, setRefreshDate] = useState(null);

  const handleRefresh = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await axios.post(`${API_URL}/refresh`, { days_back: 1 });
      
      if (response.data.success) {
        setRefreshDate(new Date());
        alert(`Refresh successful. Found ${response.data.motions_found} new motions.`);
      } else {
        setError(response.data.error || 'An error occurred during refresh');
      }
    } catch (err) {
      setError(err.message || 'An error occurred during refresh');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Get last refresh date from local storage
    const storedDate = localStorage.getItem('lastRefresh');
    if (storedDate) {
      setRefreshDate(new Date(storedDate));
    }
  }, []);

  useEffect(() => {
    // Save refresh date to local storage
    if (refreshDate) {
      localStorage.setItem('lastRefresh', refreshDate.toISOString());
    }
  }, [refreshDate]);

  return (
    <Router>
      <div className="app">
        <header className="app-header">
          <div className="logo">
            <h1>LegalMotion Tracker</h1>
          </div>
          <nav>
            <ul>
              <li><Link to="/">Dashboard</Link></li>
              <li><Link to="/motions">Motions</Link></li>
              <li><Link to="/analytics">Analytics</Link></li>
              <li><Link to="/settings">Settings</Link></li>
            </ul>
          </nav>
          <div className="refresh-section">
            <button 
              onClick={handleRefresh} 
              disabled={isLoading}
              className="refresh-button"
            >
              {isLoading ? 'Refreshing...' : 'Refresh Motions'}
            </button>
            {refreshDate && (
              <div className="last-refresh">
                Last refreshed: {refreshDate.toLocaleString()}
              </div>
            )}
          </div>
        </header>
        
        {error && (
          <div className="error-banner">
            Error: {error}
            <button onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}
        
        <main className="app-content">
          <Routes>
            <Route path="/" element={<Dashboard apiUrl={API_URL} />} />
            <Route path="/motions" element={<MotionList apiUrl={API_URL} />} />
            <Route path="/motions/:id" element={<MotionDetail apiUrl={API_URL} />} />
            <Route path="/analytics" element={<Analytics apiUrl={API_URL} />} />
            <Route path="/settings" element={<Settings apiUrl={API_URL} />} />
          </Routes>
        </main>
        
        <footer className="app-footer">
          <p>© 2025 LegalMotion Tracker | Developed for Your Law Firm</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;
