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
