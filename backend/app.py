import os
import json
import datetime
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import openai
from database import Database

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize database connection
db = Database()

# Configure API credentials
DOCKET_ALARM_USERNAME = os.getenv("DOCKET_ALARM_USERNAME")
DOCKET_ALARM_PASSWORD = os.getenv("DOCKET_ALARM_PASSWORD")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure OpenAI
openai.api_key = OPENAI_API_KEY

class DocketAlarmAPI:
    """Client for the Docket Alarm API"""
    
    BASE_URL = "https://www.docketalarm.com/api/v1"
    
    def __init__(self, username, password):
        self.username = username
        self.password = password
        self.login_token = None
    
    def login(self):
        """Login to Docket Alarm API and get token"""
        endpoint = f"{self.BASE_URL}/login/"
        data = {
            "username": self.username,
            "password": self.password
        }
        response = requests.post(endpoint, json=data)
        if response.status_code == 200:
            result = response.json()
            if result.get("success"):
                self.login_token = result.get("login_token")
                return True
        return False
    
    def search_dockets(self, query, court=None, date_start=None, date_end=None):
        """Search for dockets matching the given criteria"""
        if not self.login_token:
            if not self.login():
                return {"error": "Authentication failed"}
        
        endpoint = f"{self.BASE_URL}/search_dockets/"
        data = {
            "login_token": self.login_token,
            "q": query,
            "limit": 100
        }
        
        if court:
            data["court"] = court
        
        if date_start:
            data["date_start"] = date_start
        
        if date_end:
            data["date_end"] = date_end
        
        response = requests.post(endpoint, json=data)
        if response.status_code == 200:
            return response.json()
        
        return {"error": f"API request failed with status {response.status_code}"}
    
    def get_docket(self, court, docket_num):
        """Get detailed docket information"""
        if not self.login_token:
            if not self.login():
                return {"error": "Authentication failed"}
        
        endpoint = f"{self.BASE_URL}/getdocket/"
        data = {
            "login_token": self.login_token,
            "court": court,
            "docket_num": docket_num
        }
        
        response = requests.post(endpoint, json=data)
        if response.status_code == 200:
            return response.json()
        
        return {"error": f"API request failed with status {response.status_code}"}
    
    def get_document(self, court, docket_num, doc_num):
        """Get document content"""
        if not self.login_token:
            if not self.login():
                return {"error": "Authentication failed"}
        
        endpoint = f"{self.BASE_URL}/getdocket/"
        data = {
            "login_token": self.login_token,
            "court": court,
            "docket_num": docket_num,
            "get_documents": True,
            "doc_num": doc_num
        }
        
        response = requests.post(endpoint, json=data)
        if response.status_code == 200:
            return response.json()
        
        return {"error": f"API request failed with status {response.status_code}"}


class MotionTracker:
    """Process and track motions from court dockets"""
    
    def __init__(self, api_client):
        self.api_client = api_client
    
    def find_denied_motions(self, days_back=1):
        """Find denied motions to dismiss or summary judgment"""
        # Calculate date range
        end_date = datetime.datetime.now().strftime("%Y-%m-%d")
        start_date = (datetime.datetime.now() - datetime.timedelta(days=days_back)).strftime("%Y-%m-%d")
        
        # Search queries for different motion types
        motion_types = [
            "motion to dismiss denied",
            "motion for summary judgment denied"
        ]
        
        results = []
        
        for motion_type in motion_types:
            # Search for denied motions
            search_results = self.api_client.search_dockets(
                query=motion_type,
                date_start=start_date,
                date_end=end_date
            )
            
            if "error" in search_results:
                continue
            
            # Process search results
            if "search_results" in search_results:
                for result in search_results["search_results"]:
                    # Get full docket details
                    court = result.get("court")
                    docket_num = result.get("docket_number")
                    
                    if court and docket_num:
                        docket_details = self.api_client.get_docket(court, docket_num)
                        
                        if "error" not in docket_details and "docket" in docket_details:
                            processed_result = self._process_docket(docket_details["docket"], motion_type)
                            if processed_result:
                                results.append(processed_result)
        
        return results
    
    def _process_docket(self, docket, motion_type):
        """Process a docket to extract relevant information"""
        # Extract case name
        case_name = docket.get("info", {}).get("title", "Unknown Case")
        
        # Extract judge information
        judge = docket.get("info", {}).get("judge", "Unknown Judge")
        
        # Extract parties and their representation
        parties = []
        for party_type, party_list in docket.get("parties", {}).items():
            for party in party_list:
                party_name = party.get("name", "Unknown Party")
                attorneys = []
                
                for attorney in party.get("attorneys", []):
                    attorney_name = attorney.get("name", "Unknown Attorney")
                    firm = attorney.get("firm", "Unknown Firm")
                    attorneys.append({
                        "name": attorney_name,
                        "firm": firm
                    })
                
                parties.append({
                    "type": party_type,
                    "name": party_name,
                    "attorneys": attorneys
                })
        
        # Find the relevant motion and order
        order_info = None
        order_text = None
        
        if "docket_report" in docket:
            for entry in docket["docket_report"]:
                description = entry.get("description", "").lower()
                
                # Check if this is a denied motion to dismiss or summary judgment
                if (("motion to dismiss" in description or "motion for summary judgment" in description) 
                    and "denied" in description):
                    
                    # Get the document number
                    doc_num = entry.get("document_number")
                    
                    if doc_num:
                        # Get the full document text
                        document = self.api_client.get_document(
                            docket.get("info", {}).get("court"),
                            docket.get("info", {}).get("docket_number"),
                            doc_num
                        )
                        
                        if "error" not in document and "documents" in document:
                            for doc in document["documents"]:
                                if doc.get("document_number") == doc_num:
                                    order_text = doc.get("text", "")
                                    order_info = {
                                        "date": entry.get("date"),
                                        "description": entry.get("description"),
                                        "document_number": doc_num
                                    }
                                    break
                        
                        if order_text:
                            break
        
        if not order_text:
            return None
        
        # Generate AI summary of the order
        summary = self._generate_summary(order_text)
        
        return {
            "case_name": case_name,
            "judge": judge,
            "court": docket.get("info", {}).get("court"),
            "docket_number": docket.get("info", {}).get("docket_number"),
            "parties": parties,
            "motion_type": motion_type,
            "order_info": order_info,
            "summary": summary
        }
    
    def _generate_summary(self, order_text):
        """Generate an AI summary of the court order"""
        try:
            response = openai.ChatCompletion.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful legal assistant. Summarize the following court order denying a motion to dismiss or motion for summary judgment. Focus on the key legal reasoning and grounds for denial."},
                    {"role": "user", "content": order_text[:15000]}  # Limit to 15000 chars to stay within token limits
                ],
                max_tokens=500,
                temperature=0.3
            )
            return response.choices[0].message["content"]
        except Exception as e:
            return f"Error generating summary: {str(e)}"


# Initialize API client
docket_api = DocketAlarmAPI(DOCKET_ALARM_USERNAME, DOCKET_ALARM_PASSWORD)
motion_tracker = MotionTracker(docket_api)

@app.route('/api/refresh', methods=['POST'])
def refresh_motions():
    """Endpoint to manually trigger refresh of denied motions"""
    days_back = request.json.get('days_back', 1)
    
    try:
        # Find denied motions
        denied_motions = motion_tracker.find_denied_motions(days_back=days_back)
        
        # Store in database
        for motion in denied_motions:
            db.insert_motion(motion)
        
        return jsonify({"success": True, "motions_found": len(denied_motions)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/motions', methods=['GET'])
def get_motions():
    """Get all tracked motions"""
    try:
        motions = db.get_motions()
        return jsonify({"success": True, "motions": motions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/motions/filter', methods=['GET'])
def filter_motions():
    """Filter motions by various criteria"""
    court = request.args.get('court')
    judge = request.args.get('judge')
    motion_type = request.args.get('motion_type')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    
    try:
        motions = db.filter_motions(court, judge, motion_type, start_date, end_date)
        return jsonify({"success": True, "motions": motions})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics about denied motions"""
    try:
        stats = {
            "total_motions": db.count_motions(),
            "by_court": db.count_motions_by_court(),
            "by_judge": db.count_motions_by_judge(),
            "by_motion_type": db.count_motions_by_type(),
            "recent_trend": db.get_motion_trend()
        }
        return jsonify({"success": True, "stats": stats})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

def scheduled_refresh():
    """Function to be called by scheduler for daily refresh"""
    denied_motions = motion_tracker.find_denied_motions(days_back=1)
    for motion in denied_motions:
        db.insert_motion(motion)
    print(f"Daily refresh completed: {len(denied_motions)} new motions found")

if __name__ == '__main__':
    # You would typically set up a scheduler here for daily refresh
    # For example, using APScheduler:
    # 
    # from apscheduler.schedulers.background import BackgroundScheduler
    # scheduler = BackgroundScheduler()
    # scheduler.add_job(scheduled_refresh, 'cron', hour=1)  # Run at 1 AM every day
    # scheduler.start()
    
    app.run(debug=True)