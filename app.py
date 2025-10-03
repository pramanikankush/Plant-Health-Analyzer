from flask import Flask, render_template, request, jsonify, send_file, session, redirect, url_for
import google.generativeai as genai
import os
from PIL import Image
import io
from dotenv import load_dotenv
import html
import json
from datetime import datetime
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
import sqlite3
import uuid
from supabase import create_client, Client
from functools import wraps

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'your-secret-key-change-this')

# Configure Supabase
supabase_url = os.environ.get('SUPABASE_URL')
supabase_key = os.environ.get('SUPABASE_KEY')
supabase: Client = create_client(supabase_url, supabase_key)

# Configure Gemini API
genai.configure(api_key=os.environ.get('GOOGLE_API_KEY') or os.environ.get('GEMINI_API_KEY'))
model = genai.GenerativeModel('gemini-2.0-flash-exp')

# Initialize database
def init_db():
    conn = sqlite3.connect('analysis_history.db')
    c = conn.cursor()
    c.execute('DROP TABLE IF EXISTS analyses')
    c.execute('''
        CREATE TABLE analyses (
            id TEXT PRIMARY KEY,
            timestamp TEXT,
            plant_type TEXT,
            health_status TEXT,
            disease_name TEXT,
            symptoms TEXT,
            treatment TEXT,
            medicines TEXT,
            severity TEXT,
            cost_estimate TEXT,
            image_name TEXT
        )
    ''')
    conn.commit()
    conn.close()

init_db()

# Auth decorator
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user' not in session:
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    return decorated_function

# Language translations
TRANSLATIONS = {
    'en': {
        'upload_image': 'Upload Image',
        'analyze_leaf': 'Analyze Leaf',
        'plant_type': 'Plant Type',
        'health_status': 'Health Status',
        'disease_name': 'Disease Name',
        'symptoms': 'Symptoms',
        'treatment': 'Treatment',
        'severity': 'Severity'
    },
    'es': {
        'upload_image': 'Subir Imagen',
        'analyze_leaf': 'Analizar Hoja',
        'plant_type': 'Tipo de Planta',
        'health_status': 'Estado de Salud',
        'disease_name': 'Nombre de Enfermedad',
        'symptoms': 'Síntomas',
        'treatment': 'Tratamiento',
        'severity': 'Severidad'
    },
    'hi': {
        'upload_image': 'छवि अपलोड करें',
        'analyze_leaf': 'पत्ती का विश्लेषण करें',
        'plant_type': 'पौधे का प्रकार',
        'health_status': 'स्वास्थ्य स्थिति',
        'disease_name': 'रोग का नाम',
        'symptoms': 'लक्षण',
        'treatment': 'उपचार',
        'severity': 'गंभीरता'
    }
}

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/auth/login', methods=['POST'])
def auth_login():
    email = request.json.get('email')
    password = request.json.get('password')
    
    try:
        response = supabase.auth.sign_in_with_password({"email": email, "password": password})
        if response.user:
            session['user'] = {
                'id': response.user.id,
                'email': response.user.email
            }
            return jsonify({'success': True})
        else:
            return jsonify({'error': 'Invalid credentials'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/auth/signup', methods=['POST'])
def auth_signup():
    email = request.json.get('email')
    password = request.json.get('password')
    
    try:
        response = supabase.auth.sign_up({"email": email, "password": password})
        if response.user:
            return jsonify({'success': True, 'message': 'Account created. Please check your email for verification.'})
        else:
            return jsonify({'error': 'Failed to create account'}), 400
    except Exception as e:
        return jsonify({'error': str(e)}), 400

@app.route('/logout')
def logout():
    session.pop('user', None)
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    lang = request.args.get('lang', 'en')
    return render_template('index.html', lang=lang, translations=TRANSLATIONS.get(lang, TRANSLATIONS['en']))

@app.route('/analyze', methods=['POST'])
@login_required
def analyze():
    files = request.files.getlist('images') if 'images' in request.files else [request.files.get('image')]
    
    if not files or all(f.filename == '' for f in files):
        return jsonify({'error': 'No images uploaded'}), 400
    
    results = []
    
    for file in files:
        if file and file.filename != '':
            try:
                image = Image.open(io.BytesIO(file.read()))
                
                prompt = """Analyze this leaf image for plant disease detection. Provide a detailed analysis in this EXACT format:

Plant Type: [specific plant species name]
Health Status: [Healthy/Diseased]
Disease Name: [specific disease name if diseased, otherwise "None"]
Symptoms: [detailed description of visible symptoms on the leaf - spots, discoloration, wilting, etc.]
Treatment: [comprehensive step-by-step treatment plan including cultural practices, timing, and application methods]
Medicines: [List specific medicines available in Indian market with exact names and prices:
- Fungicides: Antracol (Propineb 70% WP) 2g/L - ₹85, Blitox (Copper Oxychloride 50% WP) 3g/L - ₹45
- Bactericides: Streptocycline (Streptomycin + Tetracycline) 1g/L - ₹120
- Insecticides: Confidor (Imidacloprid 17.8% SL) 0.5ml/L - ₹95
- Fertilizers: NPK 19:19:19 (500g) - ₹65, Urea (1kg) - ₹25]
Severity: [Mild/Moderate/Severe]
Cost Estimate: [total treatment cost in ₹ format like ₹250-300]

IMPORTANT: Use real medicine brands sold in India like Tata Rallis, UPL, Bayer, Syngenta, BASF products. Include current 2024 market prices."""
                
                response = model.generate_content([prompt, image])
                analysis = html.unescape(response.text)
                # Clean up any remaining HTML entities
                analysis = analysis.replace('&amp;', '&').replace('&lt;', '<').replace('&gt;', '>').replace('&quot;', '"').replace('&#39;', "'")
                
                # Parse analysis
                parsed = parse_analysis(analysis)
                
                # Save to database
                analysis_id = str(uuid.uuid4())
                save_analysis(analysis_id, parsed, file.filename)
                
                results.append({
                    'id': analysis_id,
                    'filename': file.filename,
                    'analysis': analysis,
                    'parsed': parsed
                })
                
            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'error': str(e)
                })
    
    return jsonify({'success': True, 'results': results})

def parse_analysis(text):
    lines = text.split('\n')
    parsed = {}
    current_key = None
    current_value = []
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
            
        # Check if line starts with a key (contains colon)
        if ':' in line and any(key in line.lower() for key in ['plant type', 'health status', 'disease name', 'symptoms', 'treatment', 'medicines', 'severity', 'cost estimate']):
            # Save previous key-value pair
            if current_key:
                parsed[current_key] = ' '.join(current_value).strip()
            
            # Start new key-value pair
            key, value = line.split(':', 1)
            current_key = key.strip().lower().replace(' ', '_').replace('&', '')
            current_value = [value.strip()] if value.strip() else []
        else:
            # Continue previous value (multi-line content)
            if current_key:
                current_value.append(line)
    
    # Save the last key-value pair
    if current_key:
        parsed[current_key] = ' '.join(current_value).strip()
    
    return parsed

def save_analysis(analysis_id, parsed, filename):
    conn = sqlite3.connect('analysis_history.db')
    c = conn.cursor()
    c.execute('''
        INSERT INTO analyses VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        analysis_id,
        datetime.now().isoformat(),
        parsed.get('plant_type', ''),
        parsed.get('health_status', ''),
        parsed.get('disease_name', ''),
        parsed.get('symptoms', ''),
        parsed.get('treatment', ''),
        parsed.get('medicines', ''),
        parsed.get('severity', ''),
        parsed.get('cost_estimate', ''),
        filename
    ))
    conn.commit()
    conn.close()

@app.route('/history')
def history():
    conn = sqlite3.connect('analysis_history.db')
    c = conn.cursor()
    c.execute('SELECT * FROM analyses ORDER BY timestamp DESC LIMIT 50')
    analyses = c.fetchall()
    conn.close()
    
    return jsonify([{
        'id': a[0], 'timestamp': a[1], 'plant_type': a[2],
        'health_status': a[3], 'disease_name': a[4], 'symptoms': a[5],
        'treatment': a[6], 'medicines': a[7], 'severity': a[8], 
        'cost_estimate': a[9], 'image_name': a[10]
    } for a in analyses])

@app.route('/export/<analysis_id>')
def export_pdf(analysis_id):
    conn = sqlite3.connect('analysis_history.db')
    c = conn.cursor()
    c.execute('SELECT * FROM analyses WHERE id = ?', (analysis_id,))
    analysis = c.fetchone()
    conn.close()
    
    if not analysis:
        return jsonify({'error': 'Analysis not found'}), 404
    
    filename = f'report_{analysis_id}.pdf'
    doc = SimpleDocTemplate(filename, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    story.append(Paragraph('Plant Disease Analysis Report', styles['Title']))
    story.append(Spacer(1, 12))
    story.append(Paragraph(f'Date: {analysis[1]}', styles['Normal']))
    story.append(Paragraph(f'Plant Type: {analysis[2]}', styles['Normal']))
    story.append(Paragraph(f'Health Status: {analysis[3]}', styles['Normal']))
    story.append(Paragraph(f'Disease: {analysis[4]}', styles['Normal']))
    story.append(Paragraph(f'Symptoms: {analysis[5]}', styles['Normal']))
    story.append(Paragraph(f'Treatment: {analysis[6]}', styles['Normal']))
    story.append(Paragraph(f'Medicines: {analysis[7]}', styles['Normal']))
    story.append(Paragraph(f'Severity: {analysis[8]}', styles['Normal']))
    story.append(Paragraph(f'Cost Estimate: {analysis[9]}', styles['Normal']))
    
    doc.build(story)
    return send_file(filename, as_attachment=True)

if __name__ == '__main__':
    app.run(debug=True)
