from flask import Flask, render_template, request, jsonify, session, redirect, url_for, abort
import google.generativeai as genai
import os
from PIL import Image
import io
from datetime import datetime, timedelta
import uuid
from supabase import create_client, Client
from functools import wraps
from werkzeug.utils import secure_filename
import re
import html

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=24)

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Supabase setup
supabase_url = os.getenv('SUPABASE_URL')
supabase_key = os.getenv('SUPABASE_KEY')
if supabase_url and supabase_key:
    supabase: Client = create_client(supabase_url, supabase_key)

# Gemini setup
api_key = os.getenv('GOOGLE_API_KEY')
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    try:
        files = request.files.getlist('images') if 'images' in request.files else [request.files.get('image')]
        files = [f for f in files if f and f.filename]
        
        if not files:
            return jsonify({'error': 'No images uploaded'}), 400
        
        results = []
        
        for file in files:
            try:
                filename = secure_filename(file.filename)
                if not allowed_file(filename):
                    results.append({'filename': filename, 'error': 'Invalid file type'})
                    continue
                
                file_data = file.read()
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
                
                results.append({
                    'id': analysis_id,
                    'filename': filename,
                    'analysis': analysis,
                    'parsed': parsed
                })
                
            except Exception as e:
                results.append({'filename': filename, 'error': f'Analysis failed: {str(e)}'})
        
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

# Vercel handler
def handler(request):
    return app