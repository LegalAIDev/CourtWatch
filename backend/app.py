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

# Get allowed origins from environment variable or use a default
allowed_origins = os.getenv('ALLOWED_ORIGINS', 'https://courtwatchai.netlify.app,http://localhost:3000').split(',')
CORS(app, resources={r"/api/*": {"origins": allowed_origins}})

# Initialize database connection
db = Database()

# Configure API credentials
LEX_MACHINA_CLIENT_ID = os.getenv("LEX_MACHINA_CLIENT_ID")
LEX_MACHINA_CLIENT_SECRET = os.getenv("LEX_MACHINA_CLIENT_SECRET")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Configure OpenAI
openai.api_key = OPENAI_API_KEY

class LexMachinaAPI:
    """Client for the Lex Machina API"""
    
    TOKEN_URL = "https://api.lexmachina.com/oauth2/token"
    QUERY_URL = "https://api.lexmachina.com/query-district-cases"
    CASE_DETAIL_URL = "https://api.lexmachina.com/district-cases/{}"
    
    def __init__(self, client_id, client_secret):
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None
        self.token_expiry = None
    
    def get_access_token(self):
        """Get OAuth2 token from Lex Machina API"""
        # Check if we have a valid token
        if self.access_token and self.token_expiry and datetime.datetime.now() < self.token_expiry:
            return self.access_token
            
        # Request new token
        response = requests.post(
            self.TOKEN_URL,
            data={"client_id": self.client_id, "client_secret": self.client_secret},
            headers={"Content-Type": "application/x-www-form-urlencoded"}
        )
        
        if response.status_code == 200:
            token_data = response.json()
            self.access_token = token_data["access_token"]
            # Set expiry time (typically 1 hour, but subtract 5 minutes to be safe)
            self.token_expiry = datetime.datetime.now() + datetime.timedelta(seconds=token_data.get("expires_in", 3600) - 300)
            return self.access_token
        else:
            raise Exception(f"Failed to get access token: {response.status_code} - {response.text}")
    
    def search_denied_motions(self, motion_type=None, days_back=1):
        """Search for denied motions to dismiss or summary judgment"""
        token = self.get_access_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        # Calculate date range
        end_date = datetime.datetime.now()
        start_date = end_date - datetime.timedelta(days=days_back)
        
        # Determine event types to search for
        event_types = []
        if motion_type:
            if "dismiss" in motion_type.lower():
                event_types.append("Dismiss (Contested)")
            elif "summary judgment" in motion_type.lower():
                event_types.append("Summary Judgment (Contested)")
        else:
            event_types = ["Dismiss (Contested)", "Summary Judgment (Contested)"]
        
        # Build query payload
        payload = {
            "caseStatus": "Open",
            "events": {
                "includeEventTypes": event_types,
                "date": {
                    "onOrAfter": start_date.strftime("%Y-%m-%d"),
                    "onOrBefore": end_date.strftime("%Y-%m-%d")
                },
                "includeEventOutcomes": ["Denied"]
            },
            "page": 1,
            "pageSize": 100
        }
        
        # Execute the query
        response = requests.post(self.QUERY_URL, json=payload, headers=headers)
        
        if response.status_code == 200:
            results = response.json()
            case_refs = results.get("cases", [])
            
            denied_motions = []
            for case_ref in case_refs:
                case_id = case_ref.get("districtCaseId")
                if not case_id:
                    continue
                    
                # Get detailed case information
                case_details = self.get_case_details(case_id)
                processed_case = self._process_case(case_details, motion_type)
                
                if processed_case:
                    denied_motions.append(processed_case)
            
            return denied_motions
        else:
            raise Exception(f"API request failed with status {response.status_code}: {response.text}")
    
    def get_case_details(self, case_id):
        """Get detailed case information"""
        token = self.get_access_token()
        headers = {"Authorization": f"Bearer {token}"}
        
        response = requests.get(self.CASE_DETAIL_URL.format(case_id), headers=headers)
        
        if response.status_code == 200:
            return response.json()
        else:
            raise Exception(f"Failed to get case details: {response.status_code} - {response.text}")
    
    def _process_case(self, case, motion_type=None):
        """Process a case to extract relevant information"""
        # Extract case name
        case_name = case.get("caseName", "Unknown Case")
        
        # Extract court information
        court = case.get("court", {}).get("name", "Unknown Court")
        
        # Extract judge information
        judge = case.get("judge", {}).get("name", "Unknown Judge")
        
        # Extract docket number
        docket_number = case.get("docketNumber", "Unknown Docket")
        
        # Extract parties and their representation
        parties = []
        for party in case.get("parties", []):
            party_name = party.get("name", "Unknown Party")
            party_role = party.get("role", "Unknown Role")
            
            attorneys = []
            # Find law firm representations for this party
            for rep in case.get("lawFirmRepresentations", []):
                if rep.get("side") == party_role:
                    firm = rep.get("lawFirm", {}).get("name", "Unknown Firm")
                    
                    for attorney in rep.get("attorneys", []):
                        attorney_name = attorney.get("name", "Unknown Attorney")
                        attorneys.append({
                            "name": attorney_name,
                            "firm": firm
                        })
            
            parties.append({
                "type": party_role,
                "name": party_name,
                "attorneys": attorneys
            })
        
        # Find the relevant motion and order information
        order_info = None
        order_text = None
        
        # Look for denied motions in events
        for event in case.get("events", []):
            event_type = event.get("type", "")
            event_outcome = event.get("outcome", "")
            
            is_relevant_motion = False
            determined_motion_type = ""
            
            if "Dismiss" in event_type and "Contested" in event_type and "Denied" in event_outcome:
                is_relevant_motion = True
                determined_motion_type = "motion to dismiss denied"
            elif "Summary Judgment" in event_type and "Contested" in event_type and "Denied" in event_outcome:
                is_relevant_motion = True
                determined_motion_type = "motion for summary judgment denied"
            
            # If we have a specific motion type filter, check it
            if motion_type and determined_motion_type != motion_type:
                continue
                
            if is_relevant_motion:
                event_date = event.get("date")
                event_description = f"{event_type} - {event_outcome}"
                document_id = event.get("documentId")
                
                # Get the order text if we have a document ID
                if document_id:
                    # In a real implementation, we would fetch the document text
                    # This would require an additional API call to get document content
                    # For now, we'll use a placeholder
                    order_text = f"Order denying {determined_motion_type}. Document ID: {document_id}"
                
                order_info = {
                    "date": event_date,
                    "description": event_description,
                    "document_number": document_id
                }
                
                # Stop after finding the first relevant motion
                break
        
        if not order_info:
            return None
        
        # Generate AI summary of the order
        summary = self._generate_summary(order_text or f"Order denying motion in case {case_name}")
        
        return {
            "case_name": case_name,
            "judge": judge,
            "court": court,
            "docket_number": docket_number,
            "parties": parties,
            "motion_type": motion_type or "order denial",
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
lex_machina_api = LexMachinaAPI(LEX_MACHINA_CLIENT_ID, LEX_MACHINA_CLIENT_SECRET)
motion_tracker = MotionTracker(lex_machina_api)

class MotionTracker:
    """Process and track motions from court dockets"""
    
    def __init__(self, api_client):
        self.api_client = api_client
    
    def find_denied_motions(self, days_back=1):
        """Find denied motions to dismiss or summary judgment"""
        # Get denied motions from API client
        return self.api_client.search_denied_motions(days_back=days_back)


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