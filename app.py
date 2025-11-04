from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for, abort
import google.generativeai as genai
import os
from PIL import Image
import io
from dotenv import load_dotenv
import html
from datetime import datetime, timedelta
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import sqlite3
import uuid
from supabase import create_client, Client
from functools import wraps
from werkzeug.utils import secure_filename
import re
import secrets

load_dotenv()

app = Flask(__name__)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# Supabase setup
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
if not supabase_url or not supabase_key:
    print("ERROR: SUPABASE_URL and SUPABASE_KEY must be set")
    exit(1)
supabase: Client = create_client(supabase_url, supabase_key)

# Gemini setup
api_key = os.getenv('GOOGLE_API_KEY')
if not api_key:
    print("ERROR: GOOGLE_API_KEY must be set")
    exit(1)
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Database
def get_db():
    conn = sqlite3.connect('analysis_history.db', check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    c = conn.cursor()
    c.execute('''CREATE TABLE IF NOT EXISTS analyses (
        id TEXT PRIMARY KEY, user_id TEXT, timestamp TEXT, plant_type TEXT,
        health_status TEXT, disease_name TEXT, symptoms TEXT, treatment TEXT,
        medicines TEXT, severity TEXT, cost_estimate TEXT, image_name TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS reminders (
        id TEXT PRIMARY KEY, user_id TEXT, analysis_id TEXT, reminder_date TEXT,
        task_description TEXT, status TEXT, proof_image TEXT, completed_at TEXT)''')
    c.execute('''CREATE TABLE IF NOT EXISTS progress_tracking (
        id TEXT PRIMARY KEY, user_id TEXT, original_analysis_id TEXT,
        followup_analysis_id TEXT, improvement_percentage REAL,
        severity_change TEXT, created_at TEXT)''')
    conn.commit()
    conn.close()

init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def login_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        # Note: Session-based auth removed - implement alternative authentication
        return f(*args, **kwargs)
    return decorated

# Routes
@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/reminders')
def reminders():
    return render_template('reminders.html')

@app.route('/progress')
def progress():
    return render_template('progress.html')

@app.route('/alerts')
def alerts():
    return render_template('alerts.html')

@app.route('/cost-reports')
def cost_reports():
    return render_template('cost_reports.html')

@app.route('/profile')
def profile():
    return render_template('profile.html')

@app.route('/help')
def help_guide():
    return render_template('help.html')

@app.route('/logout')
def logout():
    # Note: Session functionality removed - implement alternative logout
    return redirect(url_for('login'))

# Auth
@app.route('/auth/login', methods=['POST'])
def auth_login():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if not response.user:
            return jsonify({'success': False, 'error': 'Invalid credentials'}), 401
        
        # Note: Session functionality removed - implement alternative user tracking
        return jsonify({'success': True})
    except Exception as e:
        error_msg = str(e)
        if 'Email not confirmed' in error_msg:
            return jsonify({'success': False, 'error': 'Please verify your email'}), 401
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

@app.route('/auth/signup', methods=['POST'])
def auth_signup():
    try:
        data = request.get_json()
        email = data.get('email', '').strip()
        password = data.get('password', '')
        
        response = supabase.auth.sign_up({"email": email, "password": password})
        return jsonify({'success': True, 'message': 'Account created! Please login.'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

# Analyze
@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        files = request.files.getlist('images') if 'images' in request.files else [request.files.get('image')]
        files = [f for f in files if f and f.filename]
        
        if not files:
            return jsonify({'error': 'No images uploaded'}), 400
        if len(files) > 10:
            return jsonify({'error': 'Maximum 10 images allowed'}), 400
        
        user_id = 'guest'  # Note: Session removed - implement alternative user identification
        results = []
        
        for file in files:
            try:
                filename = secure_filename(file.filename)
                if not allowed_file(filename):
                    results.append({'filename': filename, 'error': 'Invalid file type'})
                    continue
                
                file_data = file.read()
                if not file_data or len(file_data) > 10 * 1024 * 1024:
                    results.append({'filename': filename, 'error': 'File too large or empty'})
                    continue
                
                image = Image.open(io.BytesIO(file_data))
                
                prompt = """Analyze this leaf image for plant disease detection. Provide analysis in this EXACT format:

Plant Type: [plant species]
Health Status: [Healthy/Diseased]
Disease Name: [disease name or "None"]
Symptoms: [visible symptoms]
Treatment: [Day 1 - action, Day 3 - action, Day 7 - action, Day 14 - action]
Medicines: [Indian market medicines with prices, e.g., Antracol 2g/L - ₹85]
Severity: [Mild/Moderate/Severe]
Cost Estimate: [₹250-300]"""
                
                response = model.generate_content([prompt, image])
                analysis = html.unescape(response.text)
                parsed = parse_analysis(analysis)
                analysis_id = str(uuid.uuid4())
                
                if user_id != 'guest':
                    save_analysis(analysis_id, parsed, filename, user_id)
                
                results.append({
                    'id': analysis_id,
                    'filename': filename,
                    'analysis': analysis,
                    'parsed': parsed
                })
                
            except Exception as e:
                results.append({'filename': filename, 'error': f'Analysis failed: {str(e)}'})
        
        if not results:
            return jsonify({'error': 'No images analyzed'}), 400
            
        return jsonify({'success': True, 'results': results})
        
    except Exception as e:
        return jsonify({'error': f'Analysis failed: {str(e)}'}), 500

def parse_analysis(text):
    parsed = {}
    current_key = None
    current_value = []
    
    for line in text.split('\n'):
        line = line.strip()
        if not line:
            continue
            
        if ':' in line and any(k in line.lower() for k in ['plant type', 'health status', 'disease name', 'symptoms', 'treatment', 'medicines', 'severity', 'cost estimate']):
            if current_key:
                parsed[current_key] = ' '.join(current_value).strip()
            
            key, value = line.split(':', 1)
            current_key = key.strip().lower().replace(' ', '_')
            current_value = [value.strip()] if value.strip() else []
        else:
            if current_key:
                current_value.append(line)
    
    if current_key:
        parsed[current_key] = ' '.join(current_value).strip()
    
    return parsed

def save_analysis(analysis_id, parsed, filename, user_id):
    conn = get_db()
    try:
        c = conn.cursor()
        c.execute('INSERT INTO analyses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', (
            analysis_id, user_id, datetime.now().isoformat(),
            parsed.get('plant_type', ''), parsed.get('health_status', ''),
            parsed.get('disease_name', ''), parsed.get('symptoms', ''),
            parsed.get('treatment', ''), parsed.get('medicines', ''),
            parsed.get('severity', ''), parsed.get('cost_estimate', ''), filename
        ))
        conn.commit()
        create_reminders(analysis_id, user_id, parsed.get('treatment', ''), c, conn)
    except Exception as e:
        print(f"Error saving: {e}")
        conn.rollback()
    finally:
        conn.close()

def create_reminders(analysis_id, user_id, treatment, cursor, conn):
    try:
        matches = re.findall(r'Day\s+(\d+)\s*[-:]?\s*([^\n]+)', treatment, re.IGNORECASE)
        for day, task in matches[:4]:
            cursor.execute('INSERT INTO reminders VALUES (?, ?, ?, ?, ?, ?, ?, ?)', (
                str(uuid.uuid4()), user_id, analysis_id,
                (datetime.now() + timedelta(days=int(day))).isoformat(),
                task.strip()[:200], 'pending', None, None
            ))
        conn.commit()
    except Exception as e:
        print(f"Error creating reminders: {e}")

@app.route('/history')
def history():
    conn = get_db()
    try:
        user_id = 'guest'  # Note: Session removed - implement alternative user identification
        c = conn.cursor()
        c.execute('SELECT * FROM analyses WHERE user_id = ? ORDER BY timestamp DESC LIMIT 100', (user_id,))
        analyses = c.fetchall()
        
        return jsonify([{
            'id': a[0], 'timestamp': a[2], 'plant_type': a[3],
            'health_status': a[4], 'disease_name': a[5], 'symptoms': a[6],
            'treatment': a[7], 'medicines': a[8], 'severity': a[9],
            'cost_estimate': a[10], 'image_name': a[11]
        } for a in analyses])
    except Exception as e:
        return jsonify({'error': 'Failed to load history'}), 500
    finally:
        conn.close()

@app.route('/get-reminders')
def get_reminders():
    conn = get_db()
    try:
        user_id = 'guest'  # Note: Session removed - implement alternative user identification
        c = conn.cursor()
        c.execute('''SELECT r.*, a.plant_type, a.disease_name FROM reminders r 
                     JOIN analyses a ON r.analysis_id = a.id 
                     WHERE r.user_id = ? ORDER BY r.reminder_date ASC LIMIT 200''', (user_id,))
        reminders = c.fetchall()
        
        return jsonify({
            'reminders': [{
                'id': r[0], 'analysis_id': r[2], 'reminder_date': r[3],
                'task': r[4], 'status': r[5], 'proof_image': r[6],
                'completed_at': r[7], 'plant_type': r[8], 'disease_name': r[9]
            } for r in reminders],
            'progress': {'total': len(reminders), 'completed': sum(1 for r in reminders if r[5] == 'completed')}
        })
    except Exception as e:
        return jsonify({'error': 'Failed to load reminders'}), 500
    finally:
        conn.close()

# Location and Alerts
@app.route('/update-location', methods=['POST'])
def update_location():
    try:
        data = request.get_json()
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if not latitude or not longitude:
            return jsonify({'success': False, 'error': 'Location required'}), 400
        
        prompt = f"""Given coordinates latitude {latitude} and longitude {longitude}, provide the city and state/region name.
Respond in this exact format:
City: [city name]
State: [state/region name]"""
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        city = 'Unknown'
        state = 'Unknown'
        for line in text.split('\n'):
            if 'City:' in line:
                city = line.split(':', 1)[1].strip()
            elif 'State:' in line:
                state = line.split(':', 1)[1].strip()
        
        return jsonify({'success': True, 'city': city, 'state': state})
    except Exception as e:
        return jsonify({'success': False, 'error': 'Failed to get location'}), 500

@app.route('/get-alerts')
def get_alerts():
    try:
        prompt = """Provide 5 common plant disease alerts for current season with preventive measures.
Format each as:
Disease: [name]
Plant: [affected plant]
Severity: [Mild/Moderate/Severe]
Prevention: [preventive treatment]

Separate each with a blank line."""
        
        response = model.generate_content(prompt)
        text = response.text.strip()
        
        alerts = []
        current_alert = {}
        
        for line in text.split('\n'):
            line = line.strip()
            if not line:
                if current_alert:
                    alerts.append(current_alert)
                    current_alert = {}
                continue
            
            if ':' in line:
                key, value = line.split(':', 1)
                key = key.strip().lower()
                if key == 'disease':
                    current_alert['disease'] = value.strip()
                elif key == 'plant':
                    current_alert['plant'] = value.strip()
                elif key == 'severity':
                    current_alert['severity'] = value.strip()
                elif key == 'prevention':
                    current_alert['treatment'] = value.strip()
        
        if current_alert:
            alerts.append(current_alert)
        
        return jsonify({'alerts': alerts[:5]})
    except Exception as e:
        return jsonify({'error': 'Failed to load alerts'}), 500

# Price Comparison
@app.route('/get-medicine-prices', methods=['POST'])
def get_medicine_prices():
    try:
        data = request.get_json()
        medicine_name = data.get('medicine', '').strip()
        
        if not medicine_name:
            return jsonify({'error': 'Medicine name required'}), 400
        
        prompt = f"""Provide price comparison for agricultural medicine: {medicine_name}

List 5 vendors with this EXACT format:

Vendor: [Vendor Name]
Price: ₹[amount]
PackSize: [size with unit]
Link: [store URL or "In-store only"]
BulkPrice: ₹[amount for 10+ units]

Use real Indian agricultural stores like BigHaat, AgroStar, KisanKonnect.
Provide realistic 2024 market prices."""
        
        response = model.generate_content(prompt)
        prices = parse_medicine_prices(response.text)
        
        return jsonify({'success': True, 'prices': prices})
    except Exception as e:
        return jsonify({'error': 'Failed to fetch prices'}), 500

def parse_medicine_prices(text):
    vendors = []
    lines = text.split('\n')
    current_vendor = {}
    
    for line in lines:
        line = line.strip()
        if not line:
            if current_vendor.get('vendor'):
                vendors.append(current_vendor)
                current_vendor = {}
            continue
        
        if ':' in line:
            key, value = line.split(':', 1)
            key = key.strip().lower()
            value = value.strip()
            
            if key == 'vendor':
                if current_vendor.get('vendor'):
                    vendors.append(current_vendor)
                current_vendor = {'vendor': value}
            elif key == 'price':
                current_vendor['price'] = value
            elif key == 'packsize':
                current_vendor['pack_size'] = value
            elif key == 'link':
                current_vendor['link'] = value
            elif key == 'bulkprice':
                current_vendor['bulk_price'] = value
    
    if current_vendor.get('vendor'):
        vendors.append(current_vendor)
    
    return vendors

@app.route('/export/<analysis_id>')
def export_pdf(analysis_id):
    if not re.match(r'^[a-f0-9-]{36}$', analysis_id):
        abort(400)
    
    conn = get_db()
    try:
        user_id = 'guest'  # Note: Session removed - implement alternative user identification
        c = conn.cursor()
        c.execute('SELECT * FROM analyses WHERE id = ? AND user_id = ?', (analysis_id, user_id))
        analysis = c.fetchone()
        
        if not analysis:
            abort(404)
        
        filename = os.path.join(UPLOAD_FOLDER, f'report_{secrets.token_hex(8)}.pdf')
        doc = SimpleDocTemplate(filename, pagesize=letter)
        styles = getSampleStyleSheet()
        story = [
            Paragraph('Plant Disease Analysis Report', styles['Title']),
            Spacer(1, 12),
            Paragraph(f'Date: {html.escape(str(analysis[2]))}', styles['Normal']),
            Paragraph(f'Plant: {html.escape(str(analysis[3]))}', styles['Normal']),
            Paragraph(f'Status: {html.escape(str(analysis[4]))}', styles['Normal']),
            Paragraph(f'Disease: {html.escape(str(analysis[5]))}', styles['Normal']),
            Paragraph(f'Symptoms: {html.escape(str(analysis[6]))}', styles['Normal']),
            Paragraph(f'Treatment: {html.escape(str(analysis[7]))}', styles['Normal']),
            Paragraph(f'Medicines: {html.escape(str(analysis[8]))}', styles['Normal']),
            Paragraph(f'Severity: {html.escape(str(analysis[9]))}', styles['Normal']),
            Paragraph(f'Cost: {html.escape(str(analysis[10]))}', styles['Normal'])
        ]
        doc.build(story)
        
        return send_file(filename, as_attachment=True)
    except Exception as e:
        return jsonify({'error': 'Export failed'}), 500
    finally:
        conn.close()

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal error'}), 500

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
