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
