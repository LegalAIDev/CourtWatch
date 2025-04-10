# Legal Motion Tracker

A proprietary AI tool for law firms to track denied motions to dismiss and summary judgment orders from courts, displayed in a visually appealing dashboard.

## Overview

This application connects to legal research APIs (Docket Alarm or LexisNexis), pulls court orders that deny motions to dismiss or summary judgment, and presents them in an organized dashboard. The system includes AI-generated summaries of court orders to provide quick insights.

## Features

- **Daily Updates**: Automatically fetches new denied motions daily
- **Comprehensive Data**: Displays case name, judge, parties, law firms, and AI summaries
- **Powerful Filtering**: Filter by court, judge, motion type, and date range
- **Visual Analytics**: Chart trends, statistics, and insights about denied motions
- **Customizable Settings**: Configure API credentials and refresh settings

## System Architecture

The application uses a modern architecture with these components:

1. **Backend API (Python/Flask)**
   - Connects to Docket Alarm/Lexis API
   - Processes and filters court orders
   - Generates AI summaries using OpenAI API
   - Provides REST endpoints for the frontend

2. **Database (SQLite)**
   - Stores motion data, party information, and analytics
   - Enables efficient querying and filtering
   - Maintains historical data

3. **Frontend Dashboard (React)**
   - Responsive user interface
   - Interactive charts and visualizations
   - Detailed motion information display
   - Administrative settings

## Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docket Alarm or LexisNexis API credentials
- OpenAI API key (for AI summaries)

### Backend Setup

1. Create a virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install flask flask-cors python-dotenv requests openai
   ```

3. Create a `.env` file with your API credentials:
   ```
   DOCKET_ALARM_USERNAME=your_username
   DOCKET_ALARM_PASSWORD=your_password
   OPENAI_API_KEY=your_openai_key
   ```

4. Run the backend server:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Create a `.env` file with the backend API URL:
   ```
   REACT_APP_API_URL=http://localhost:5000/api
   ```

4. Start the development server:
   ```
   npm start
   ```

## API Endpoints

- `GET /api/motions`: Get all tracked motions
- `GET /api/motions/filter`: Filter motions by criteria
- `GET /api/motions/:id`: Get detailed information about a specific motion
- `GET /api/stats`: Get statistics about denied motions
- `POST /api/refresh`: Manually trigger refresh of denied motions
- `POST /api/settings/api`: Update API credentials
- `POST /api/settings/refresh`: Update refresh settings

## Customization Options

The system is designed to be flexible and can be customized in these ways:

1. **Alternative Data Sources**: Switch between Docket Alarm and LexisNexis APIs
2. **Additional Motion Types**: Expand to track other motion types
3. **Custom AI Models**: Use different AI models for summarization
4. **Enterprise Integration**: Connect to law firm document management systems

## Scheduled Tasks

For production deployment, set up scheduled tasks:

1. **Daily Refresh**: Configure the system to pull new motions daily
2. **Database Backup**: Regularly back up the SQLite database
3. **Error Monitoring**: Set up alerts for API failures

## Security Considerations

This application handles sensitive legal data, so ensure:

1. All API credentials are securely stored
2. Communication between components is encrypted
3. Access to the dashboard is properly authenticated
4. Database is secured against unauthorized access

## Support and Maintenance

For assistance with this system, contact the development team at:
- Email: support@legalmotiontracker.com
- Phone: (555) 123-4567