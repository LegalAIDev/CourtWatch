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
