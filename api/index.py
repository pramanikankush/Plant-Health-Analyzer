from flask import Flask, render_template, request, jsonify
import google.generativeai as genai
import os
from PIL import Image
import io
import uuid
from werkzeug.utils import secure_filename
import html

app = Flask(__name__, template_folder='../templates', static_folder='../static')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

# Gemini setup
api_key = os.getenv('GOOGLE_API_KEY')
if api_key:
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel('gemini-2.0-flash-exp')
else:
    model = None

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/login')
def login():
    return render_template('login.html')

@app.route('/signup')
def signup():
    return render_template('signup.html')

@app.route('/analyze', methods=['POST'])
def analyze():
    if not model:
        return jsonify({'error': 'AI service not configured'}), 500
        
    try:
        files = request.files.getlist('images') if 'images' in request.files else [request.files.get('image')]
        files = [f for f in files if f and f.filename]
        
        if not files:
            return jsonify({'error': 'No images uploaded'}), 400
        
        results = []
        
        for file in files[:5]:  # Limit to 5 images for serverless
            try:
                filename = secure_filename(file.filename)
                if not allowed_file(filename):
                    results.append({'filename': filename, 'error': 'Invalid file type'})
                    continue
                
                file_data = file.read()
                if len(file_data) > 5 * 1024 * 1024:  # 5MB limit
                    results.append({'filename': filename, 'error': 'File too large'})
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
                
                results.append({
                    'id': str(uuid.uuid4()),
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

# Disabled storage features for serverless
@app.route('/history')
def history():
    return jsonify([])

@app.route('/get-reminders')
def get_reminders():
    return jsonify({'reminders': [], 'progress': {'total': 0, 'completed': 0}})

@app.route('/auth/login', methods=['POST'])
def auth_login():
    return jsonify({'success': False, 'error': 'Authentication disabled in demo mode'})

@app.route('/auth/signup', methods=['POST'])
def auth_signup():
    return jsonify({'success': False, 'error': 'Registration disabled in demo mode'})

@app.route('/reminders')
def reminders():
    return render_template('index.html')

@app.route('/progress')
def progress():
    return render_template('index.html')

@app.route('/alerts')
def alerts():
    return render_template('index.html')

@app.route('/cost-reports')
def cost_reports():
    return render_template('index.html')

@app.route('/profile')
def profile():
    return render_template('index.html')

@app.route('/help')
def help_guide():
    return render_template('index.html')

@app.route('/logout')
def logout():
    return render_template('index.html')

@app.route('/export/<analysis_id>')
def export_pdf(analysis_id):
    return jsonify({'error': 'Export disabled in demo mode'}), 404

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({'error': 'Internal server error'}), 500

# Vercel entry point
def handler(request):
    return app(request.environ, lambda status, headers: None)

if __name__ == '__main__':
    app.run(debug=True)