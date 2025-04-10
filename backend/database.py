import os
import json
import sqlite3
import datetime
from contextlib import contextmanager

class Database:
    """Database management for motion tracking"""
    
    def __init__(self, db_path="motions.db"):
        self.db_path = db_path
        self._initialize_db()
    
    @contextmanager
    def _get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _initialize_db(self):
        """Initialize database schema if it doesn't exist"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Create motions table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS motions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                case_name TEXT,
                judge TEXT,
                court TEXT,
                docket_number TEXT,
                motion_type TEXT,
                order_date TEXT,
                order_description TEXT,
                document_number TEXT,
                summary TEXT,
                date_added TEXT,
                full_data TEXT,
                UNIQUE(court, docket_number, document_number)
            )
            ''')
            
            # Create parties table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS parties (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                motion_id INTEGER,
                party_type TEXT,
                party_name TEXT,
                FOREIGN KEY (motion_id) REFERENCES motions (id)
            )
            ''')
            
            # Create attorneys table
            cursor.execute('''
            CREATE TABLE IF NOT EXISTS attorneys (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                party_id INTEGER,
                attorney_name TEXT,
                law_firm TEXT,
                FOREIGN KEY (party_id) REFERENCES parties (id)
            )
            ''')
            
            conn.commit()
    
    def insert_motion(self, motion_data):
        """Insert a new denied motion into the database"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Extract basic motion data
            case_name = motion_data.get("case_name", "Unknown Case")
            judge = motion_data.get("judge", "Unknown Judge")
            court = motion_data.get("court", "Unknown Court")
            docket_number = motion_data.get("docket_number", "Unknown Docket")
            motion_type = motion_data.get("motion_type", "Unknown Motion Type")
            summary = motion_data.get("summary", "")
            
            # Extract order info
            order_info = motion_data.get("order_info", {})
            order_date = order_info.get("date") if order_info else None
            order_description = order_info.get("description") if order_info else None
            document_number = order_info.get("document_number") if order_info else None
            
            # Current date
            date_added = datetime.datetime.now().strftime("%Y-%m-%d")
            
            # Full data as JSON
            full_data = json.dumps(motion_data)
            
            # Check if motion already exists
            cursor.execute(
                "SELECT id FROM motions WHERE court = ? AND docket_number = ? AND document_number = ?",
                (court, docket_number, document_number)
            )
            existing = cursor.fetchone()
            
            if existing:
                # Update existing motion
                motion_id = existing["id"]
                cursor.execute(
                    '''
                    UPDATE motions SET
                        case_name = ?,
                        judge = ?,
                        motion_type = ?,
                        order_date = ?,
                        order_description = ?,
                        summary = ?,
                        date_added = ?,
                        full_data = ?
                    WHERE id = ?
                    ''',
                    (case_name, judge, motion_type, order_date, order_description, 
                     summary, date_added, full_data, motion_id)
                )
            else:
                # Insert new motion
                cursor.execute(
                    '''
                    INSERT INTO motions (
                        case_name, judge, court, docket_number, motion_type,
                        order_date, order_description, document_number,
                        summary, date_added, full_data
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    ''',
                    (case_name, judge, court, docket_number, motion_type,
                     order_date, order_description, document_number,
                     summary, date_added, full_data)
                )
                motion_id = cursor.lastrowid
            
            # Delete existing parties and attorneys for this motion
            cursor.execute("SELECT id FROM parties WHERE motion_id = ?", (motion_id,))
            party_ids = [row["id"] for row in cursor.fetchall()]
            
            for party_id in party_ids:
                cursor.execute("DELETE FROM attorneys WHERE party_id = ?", (party_id,))
            
            cursor.execute("DELETE FROM parties WHERE motion_id = ?", (motion_id,))
            
            # Insert parties and attorneys
            for party in motion_data.get("parties", []):
                party_type = party.get("type", "Unknown")
                party_name = party.get("name", "Unknown Party")
                
                cursor.execute(
                    "INSERT INTO parties (motion_id, party_type, party_name) VALUES (?, ?, ?)",
                    (motion_id, party_type, party_name)
                )
                party_id = cursor.lastrowid
                
                for attorney in party.get("attorneys", []):
                    attorney_name = attorney.get("name", "Unknown Attorney")
                    law_firm = attorney.get("firm", "Unknown Firm")
                    
                    cursor.execute(
                        "INSERT INTO attorneys (party_id, attorney_name, law_firm) VALUES (?, ?, ?)",
                        (party_id, attorney_name, law_firm)
                    )
            
            conn.commit()
            return motion_id
    
    def get_motions(self, limit=100, offset=0):
        """Get all tracked motions with pagination"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            cursor.execute(
                "SELECT * FROM motions ORDER BY order_date DESC LIMIT ? OFFSET ?",
                (limit, offset)
            )
            motions = []
            
            for row in cursor.fetchall():
                motion = dict(row)
                
                # Get parties for this motion
                cursor.execute("SELECT * FROM parties WHERE motion_id = ?", (row["id"],))
                parties = []
                
                for party_row in cursor.fetchall():
                    party = dict(party_row)
                    
                    # Get attorneys for this party
                    cursor.execute("SELECT * FROM attorneys WHERE party_id = ?", (party["id"],))
                    attorneys = [dict(attorney_row) for attorney_row in cursor.fetchall()]
                    
                    party["attorneys"] = attorneys
                    parties.append(party)
                
                motion["parties"] = parties
                motions.append(motion)
            
            return motions
    
    def filter_motions(self, court=None, judge=None, motion_type=None, start_date=None, end_date=None, limit=100, offset=0):
        """Filter motions by various criteria"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            query = "SELECT * FROM motions WHERE 1=1"
            params = []
            
            if court:
                query += " AND court = ?"
                params.append(court)
            
            if judge:
                query += " AND judge LIKE ?"
                params.append(f"%{judge}%")
            
            if motion_type:
                query += " AND motion_type LIKE ?"
                params.append(f"%{motion_type}%")
            
            if start_date:
                query += " AND order_date >= ?"
                params.append(start_date)
            
            if end_date:
                query += " AND order_date <= ?"
                params.append(end_date)
            
            query += " ORDER BY order_date DESC LIMIT ? OFFSET ?"
            params.extend([limit, offset])
            
            cursor.execute(query, params)
            motions = []
            
            for row in cursor.fetchall():
                motion = dict(row)
                
                # Get parties for this motion
                cursor.execute("SELECT * FROM parties WHERE motion_id = ?", (row["id"],))
                parties = []
                
                for party_row in cursor.fetchall():
                    party = dict(party_row)
                    
                    # Get attorneys for this party
                    cursor.execute("SELECT * FROM attorneys WHERE party_id = ?", (party["id"],))
                    attorneys = [dict(attorney_row) for attorney_row in cursor.fetchall()]
                    
                    party["attorneys"] = attorneys
                    parties.append(party)
                
                motion["parties"] = parties
                motions.append(motion)
            
            return motions
    
    def count_motions(self):
        """Count total number of tracked motions"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT COUNT(*) as count FROM motions")
            return cursor.fetchone()["count"]
    
    def count_motions_by_court(self):
        """Count motions by court"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT court, COUNT(*) as count FROM motions GROUP BY court ORDER BY count DESC")
            return [dict(row) for row in cursor.fetchall()]
    
    def count_motions_by_judge(self, limit=20):
        """Count motions by judge"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT judge, COUNT(*) as count FROM motions GROUP BY judge ORDER BY count DESC LIMIT ?",
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]
    
    def count_motions_by_type(self):
        """Count motions by type"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT motion_type, COUNT(*) as count FROM motions GROUP BY motion_type ORDER BY count DESC")
            return [dict(row) for row in cursor.fetchall()]
    
    def get_motion_trend(self, days=30):
        """Get motion trend for the past X days"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Calculate date range
            end_date = datetime.datetime.now()
            start_date = end_date - datetime.timedelta(days=days)
            
            # Generate date series
            date_series = []
            current_date = start_date
            
            while current_date <= end_date:
                date_str = current_date.strftime("%Y-%m-%d")
                date_series.append(date_str)
                current_date += datetime.timedelta(days=1)
            
            # Get counts per day
            results = []
            
            for date_str in date_series:
                cursor.execute(
                    "SELECT COUNT(*) as count FROM motions WHERE order_date = ?",
                    (date_str,)
                )
                count = cursor.fetchone()["count"]
                results.append({
                    "date": date_str,
                    "count": count
                })
            
            return results
    
    def get_law_firms(self, limit=50):
        """Get most active law firms"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                '''
                SELECT law_firm, COUNT(*) as count
                FROM attorneys
                GROUP BY law_firm
                ORDER BY count DESC
                LIMIT ?
                ''',
                (limit,)
            )
            return [dict(row) for row in cursor.fetchall()]