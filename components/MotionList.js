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
