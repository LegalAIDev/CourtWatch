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

// components/Dashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import './Dashboard.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function Dashboard({ apiUrl }) {
  const [stats, setStats] = useState(null);
  const [recentMotions, setRecentMotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch statistics
        const statsResponse = await axios.get(`${apiUrl}/stats`);
        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        } else {
          setError(statsResponse.data.error || 'Failed to fetch statistics');
        }
        
        // Fetch recent motions
        const motionsResponse = await axios.get(`${apiUrl}/motions?limit=5`);
        if (motionsResponse.data.success) {
          setRecentMotions(motionsResponse.data.motions);
        } else {
          setError(motionsResponse.data.error || 'Failed to fetch recent motions');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [apiUrl]);

  if (isLoading) {
    return <div className="loading">Loading dashboard data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  return (
    <div className="dashboard">
      <h2>Dashboard</h2>
      
      <div className="stats-overview">
        <div className="stat-card">
          <h3>Total Motions</h3>
          <div className="stat-value">{stats?.total_motions || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Courts</h3>
          <div className="stat-value">{stats?.by_court?.length || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Judges</h3>
          <div className="stat-value">{stats?.by_judge?.length || 0}</div>
        </div>
        <div className="stat-card">
          <h3>Motion Types</h3>
          <div className="stat-value">{stats?.by_motion_type?.length || 0}</div>
        </div>
      </div>
      
      <div className="dashboard-charts">
        <div className="chart-container">
          <h3>Recent Motion Trend</h3>
          {stats?.recent_trend && stats.recent_trend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.recent_trend}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Denied Motions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No trend data available</div>
          )}
        </div>
        
        <div className="chart-container">
          <h3>Motions by Court</h3>
          {stats?.by_court && stats.by_court.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={stats.by_court}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="court"
                >
                  {stats.by_court.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No court data available</div>
          )}
        </div>
      </div>
      
      <div className="recent-motions">
        <h3>Recent Denied Motions</h3>
        {recentMotions.length > 0 ? (
          <div className="motions-list">
            {recentMotions.map(motion => (
              <div key={motion.id} className="motion-card">
                <div className="motion-header">
                  <h4>{motion.case_name}</h4>
                  <span className="motion-date">{motion.order_date}</span>
                </div>
                <div className="motion-body">
                  <p><strong>Court:</strong> {motion.court}</p>
                  <p><strong>Judge:</strong> {motion.judge}</p>
                  <p><strong>Motion Type:</strong> {motion.motion_type}</p>
                  <p className="motion-summary">{motion.summary.substring(0, 150)}...</p>
                </div>
                <div className="motion-footer">
                  <Link to={`/motions/${motion.id}`} className="view-details">View Details</Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-data">No recent motions available</div>
        )}
        
        <div className="view-all">
          <Link to="/motions" className="view-all-link">View All Motions</Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

// components/MotionList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import './MotionList.css';

function MotionList({ apiUrl }) {
  const [motions, setMotions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    court: '',
    judge: '',
    motionType: '',
    startDate: '',
    endDate: ''
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchMotions();
  }, [apiUrl, filters, currentPage]);

  const fetchMotions = async () => {
    setIsLoading(true);
    
    try {
      const params = {
        limit: itemsPerPage,
        offset: (currentPage - 1) * itemsPerPage
      };
      
      if (filters.court) params.court = filters.court;
      if (filters.judge) params.judge = filters.judge;
      if (filters.motionType) params.motion_type = filters.motionType;
      if (filters.startDate) params.start_date = filters.startDate;
      if (filters.endDate) params.end_date = filters.endDate;
      
      const response = await axios.get(`${apiUrl}/motions/filter`, { params });
      
      if (response.data.success) {
        setMotions(response.data.motions);
        
        // Calculate total pages (this would typically come from the API)
        // In a real implementation, the API should return total count
        setTotalPages(Math.ceil(response.data.total / itemsPerPage) || 1);
      } else {
        setError(response.data.error || 'Failed to fetch motions');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching motions');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleResetFilters = () => {
    setFilters({
      court: '',
      judge: '',
      motionType: '',
      startDate: '',
      endDate: ''
    });
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  if (isLoading && motions.length === 0) {
    return <div className="loading">Loading motions...</div>;
  }

  return (
    <div className="motion-list-container">
      <h2>Denied Motions</h2>
      
      <div className="filters">
        <h3>Filters</h3>
        <div className="filter-grid">
          <div className="filter-group">
            <label htmlFor="court">Court</label>
            <input
              type="text"
              id="court"
              name="court"
              value={filters.court}
              onChange={handleFilterChange}
              placeholder="Enter court name"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="judge">Judge</label>
            <input
              type="text"
              id="judge"
              name="judge"
              value={filters.judge}
              onChange={handleFilterChange}
              placeholder="Enter judge name"
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="motionType">Motion Type</label>
            <select
              id="motionType"
              name="motionType"
              value={filters.motionType}
              onChange={handleFilterChange}
            >
              <option value="">All Types</option>
              <option value="motion to dismiss">Motion to Dismiss</option>
              <option value="motion for summary judgment">Motion for Summary Judgment</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label htmlFor="startDate">Start Date</label>
            <input
              type="date"
              id="startDate"
              name="startDate"
              value={filters.startDate}
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label htmlFor="endDate">End Date</label>
            <input
              type="date"
              id="endDate"
              name="endDate"
              value={filters.endDate}
              onChange={handleFilterChange}
            />
          </div>
        </div>
        
        <div className="filter-actions">
          <button 
            onClick={handleResetFilters}
            className="reset-filters"
          >
            Reset Filters
          </button>
        </div>
      </div>
      
      {error && <div className="error">Error: {error}</div>}
      
      {motions.length > 0 ? (
        <div className="motion-table-container">
          <table className="motion-table">
            <thead>
              <tr>
                <th>Case Name</th>
                <th>Court</th>
                <th>Judge</th>
                <th>Motion Type</th>
                <th>Order Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {motions.map(motion => (
                <tr key={motion.id}>
                  <td>{motion.case_name}</td>
                  <td>{motion.court}</td>
                  <td>{motion.judge}</td>
                  <td>{motion.motion_type}</td>
                  <td>{motion.order_date}</td>
                  <td>
                    <Link to={`/motions/${motion.id}`} className="view-button">
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          <div className="pagination">
            <button
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            
            <span className="page-info">
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      ) : (
        <div className="no-results">
          No motions found matching your criteria
        </div>
      )}
    </div>
  );
}

export default MotionList;

// components/MotionDetail.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import './MotionDetail.css';

function MotionDetail({ apiUrl }) {
  const { id } = useParams();
  const [motion, setMotion] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchMotionDetail = async () => {
      setIsLoading(true);
      
      try {
        const response = await axios.get(`${apiUrl}/motions/${id}`);
        
        if (response.data.success) {
          setMotion(response.data.motion);
        } else {
          setError(response.data.error || 'Failed to fetch motion details');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching motion details');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchMotionDetail();
  }, [apiUrl, id]);

  if (isLoading) {
    return <div className="loading">Loading motion details...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!motion) {
    return <div className="not-found">Motion not found</div>;
  }

  return (
    <div className="motion-detail">
      <div className="motion-detail-header">
        <Link to="/motions" className="back-link">
          &larr; Back to Motions
        </Link>
        <h2>{motion.case_name}</h2>
      </div>
      
      <div className="motion-detail-grid">
        <div className="motion-detail-card case-info">
          <h3>Case Information</h3>
          <div className="info-grid">
            <div className="info-item">
              <label>Court:</label>
              <span>{motion.court}</span>
            </div>
            <div className="info-item">
              <label>Docket Number:</label>
              <span>{motion.docket_number}</span>
            </div>
            <div className="info-item">
              <label>Judge:</label>
              <span>{motion.judge}</span>
            </div>
            <div className="info-item">
              <label>Motion Type:</label>
              <span>{motion.motion_type}</span>
            </div>
            <div className="info-item">
              <label>Order Date:</label>
              <span>{motion.order_date}</span>
            </div>
            <div className="info-item">
              <label>Document Number:</label>
              <span>{motion.document_number}</span>
            </div>
          </div>
        </div>
        
        <div className="motion-detail-card parties">
          <h3>Parties & Representation</h3>
          {motion.parties && motion.parties.length > 0 ? (
            <div className="parties-list">
              {motion.parties.map((party, index) => (
                <div key={index} className="party-item">
                  <h4>{party.party_type}: {party.party_name}</h4>
                  
                  {party.attorneys && party.attorneys.length > 0 ? (
                    <div className="attorneys-list">
                      <h5>Represented by:</h5>
                      <ul>
                        {party.attorneys.map((attorney, attyIndex) => (
                          <li key={attyIndex}>
                            {attorney.attorney_name} ({attorney.law_firm})
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : (
                    <p>No attorney information available</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p>No party information available</p>
          )}
        </div>
      </div>
      
      <div className="motion-detail-card summary">
        <h3>Order Summary</h3>
        <div className="summary-content">
          {motion.summary ? (
            <p>{motion.summary}</p>
          ) : (
            <p>No summary available</p>
          )}
        </div>
      </div>
      
      <div className="motion-detail-card order-description">
        <h3>Order Description</h3>
        <div className="order-description-content">
          {motion.order_description ? (
            <p>{motion.order_description}</p>
          ) : (
            <p>No order description available</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default MotionDetail;

// components/Analytics.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import './Analytics.css';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function Analytics({ apiUrl }) {
  const [stats, setStats] = useState(null);
  const [lawFirms, setLawFirms] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      
      try {
        // Fetch statistics
        const statsResponse = await axios.get(`${apiUrl}/stats`);
        if (statsResponse.data.success) {
          setStats(statsResponse.data.stats);
        } else {
          setError(statsResponse.data.error || 'Failed to fetch statistics');
        }
        
        // Fetch law firm data
        const firmsResponse = await axios.get(`${apiUrl}/law-firms`);
        if (firmsResponse.data.success) {
          setLawFirms(firmsResponse.data.firms);
        } else {
          setError(firmsResponse.data.error || 'Failed to fetch law firm data');
        }
      } catch (err) {
        setError(err.message || 'An error occurred while fetching data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
  }, [apiUrl]);

  if (isLoading) {
    return <div className="loading">Loading analytics data...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  // Prepare data for top judges chart
  const topJudgesData = stats?.by_judge?.slice(0, 10) || [];
  
  // Prepare data for motion types pie chart
  const motionTypesData = stats?.by_motion_type || [];
  
  // Prepare data for trend line chart
  const trendData = stats?.recent_trend || [];

  return (
    <div className="analytics">
      <h2>Analytics</h2>
      
      <div className="analytics-charts">
        <div className="chart-container">
          <h3>Motion Trend (Last 30 Days)</h3>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart
                data={trendData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke="#8884d8" 
                  name="Denied Motions" 
                  activeDot={{ r: 8 }} 
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No trend data available</div>
          )}
        </div>
        
        <div className="chart-container">
          <h3>Motion Types</h3>
          {motionTypesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={motionTypesData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="count"
                  nameKey="motion_type"
                >
                  {motionTypesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No motion type data available</div>
          )}
        </div>
        
        <div className="chart-container wide">
          <h3>Top 10 Judges</h3>
          {topJudgesData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={topJudgesData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="judge" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#8884d8" name="Denied Motions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No judge data available</div>
          )}
        </div>
        
        <div className="chart-container wide">
          <h3>Courts Distribution</h3>
          {stats?.by_court && stats.by_court.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={stats.by_court}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="court" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" fill="#82ca9d" name="Denied Motions" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="no-data">No court data available</div>
          )}
        </div>
      </div>
      
      <div className="top-law-firms">
        <h3>Top Law Firms</h3>
        {lawFirms.length > 0 ? (
          <div className="law-firms-table-container">
            <table className="law-firms-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Law Firm</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {lawFirms.map((firm, index) => (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td>{firm.law_firm}</td>
                    <td>{firm.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="no-data">No law firm data available</div>
        )}
      </div>
    </div>
  );
}

export default Analytics;

// components/Settings.js
import React, { useState } from 'react';
import axios from 'axios';
import './Settings.css';

function Settings({ apiUrl }) {
  const [apiSettings, setApiSettings] = useState({
    docketAlarmUsername: '',
    docketAlarmPassword: '',
    openaiApiKey: ''
  });
  
  const [refreshSettings, setRefreshSettings] = useState({
    autoRefresh: true,
    refreshTime: '01:00',
    daysBack: 1
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');

  const handleApiChange = (e) => {
    const { name, value } = e.target;
    setApiSettings(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const handleRefreshChange = (e) => {
    const { name, value, type, checked } = e.target;
    setRefreshSettings(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };
  
  const handleApiSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');
    
    try {
      const response = await axios.post(`${apiUrl}/settings/api`, apiSettings);
      
      if (response.data.success) {
        setSuccessMessage('API settings saved successfully');
      } else {
        setError(response.data.error || 'Failed to save API settings');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving API settings');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleRefreshSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccessMessage('');
    
    try {
      const response = await axios.post(`${apiUrl}/settings/refresh`, refreshSettings);
      
      if (response.data.success) {
        setSuccessMessage('Refresh settings saved successfully');
      } else {
        setError(response.data.error || 'Failed to save refresh settings');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while saving refresh settings');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="settings">
      <h2>Settings</h2>
      
      {error && <div className="error-message">{error}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      <div className="settings-section">
        <h3>API Configuration</h3>
        <form onSubmit={handleApiSubmit} className="settings-form">
          <div className="form-group">
            <label htmlFor="docketAlarmUsername">Docket Alarm Username</label>
            <input
              type="text"
              id="docketAlarmUsername"
              name="docketAlarmUsername"
              value={apiSettings.docketAlarmUsername}
              onChange={handleApiChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="docketAlarmPassword">Docket Alarm Password</label>
            <input
              type="password"
              id="docketAlarmPassword"
              name="docketAlarmPassword"
              value={apiSettings.docketAlarmPassword}
              onChange={handleApiChange}
              required
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="openaiApiKey">OpenAI API Key (for AI Summaries)</label>
            <input
              type="password"
              id="openaiApiKey"
              name="openaiApiKey"
              value={apiSettings.openaiApiKey}
              onChange={handleApiChange}
              required
            />
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="save-button"
            >
              {isSubmitting ? 'Saving...' : 'Save API Settings'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="settings-section">
        <h3>Refresh Settings</h3>
        <form onSubmit={handleRefreshSubmit} className="settings-form">
          <div className="form-group checkbox">
            <input
              type="checkbox"
              id="autoRefresh"
              name="autoRefresh"
              checked={refreshSettings.autoRefresh}
              onChange={handleRefreshChange}
            />
            <label htmlFor="autoRefresh">Enable Automatic Daily Refresh</label>
          </div>
          
          <div className="form-group">
            <label htmlFor="refreshTime">Daily Refresh Time</label>
            <input
              type="time"
              id="refreshTime"
              name="refreshTime"
              value={refreshSettings.refreshTime}
              onChange={handleRefreshChange}
              disabled={!refreshSettings.autoRefresh}
            />
          </div>
          
          <div className="form-group">
            <label htmlFor="daysBack">Days to Look Back</label>
            <select
              id="daysBack"
              name="daysBack"
              value={refreshSettings.daysBack}
              onChange={handleRefreshChange}
            >
              <option value={1}>1 day</option>
              <option value={2}>2 days</option>
              <option value={3}>3 days</option>
              <option value={7}>1 week</option>
              <option value={14}>2 weeks</option>
              <option value={30}>1 month</option>
            </select>
          </div>
          
          <div className="form-actions">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className="save-button"
            >
              {isSubmitting ? 'Saving...' : 'Save Refresh Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Settings;

// Add CSS files for the components (not shown for brevity)
