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
