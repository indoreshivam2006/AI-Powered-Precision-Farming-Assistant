import os
from flask import (Blueprint, render_template, request,
                   redirect, url_for, jsonify, flash, current_app)
from app.models import db, Prediction
from app.predict import predict_disease, allowed_file, save_upload

main_bp = Blueprint('main', __name__)


# ─── Landing Page ────────────────────────────────────────────────────────────
@main_bp.route('/')
def index():
    total_predictions = Prediction.query.count()
    disease_count     = Prediction.query.filter_by(is_healthy=False).count()
    healthy_count     = Prediction.query.filter_by(is_healthy=True).count()
    return render_template('index.html',
                           total_predictions=total_predictions,
                           disease_count=disease_count,
                           healthy_count=healthy_count)


# ─── Upload Page ─────────────────────────────────────────────────────────────
@main_bp.route('/upload')
def upload():
    return render_template('predict.html')


# ─── Predict (POST) ──────────────────────────────────────────────────────────
@main_bp.route('/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        flash('No file selected.', 'error')
        return redirect(url_for('main.upload'))

    file = request.files['image']
    if file.filename == '':
        flash('No file selected.', 'error')
        return redirect(url_for('main.upload'))

    if not allowed_file(file.filename):
        flash('Invalid file type. Please upload PNG, JPG, or JPEG.', 'error')
        return redirect(url_for('main.upload'))

    # Save upload
    filename = save_upload(file)
    image_path = os.path.join(current_app.config['UPLOAD_FOLDER'], filename)

    # Run CNN inference
    result = predict_disease(image_path)

    # Save to database
    prediction = Prediction(
        image_filename = filename,
        plant_type     = result['plant_type'],
        disease_name   = result['disease_name'],
        confidence     = result['confidence'],
        is_healthy     = result['is_healthy'],
        remedy         = result['remedy'],
        description    = result['description'],
        severity       = result['severity'],
        ip_address     = request.remote_addr,
    )
    db.session.add(prediction)
    db.session.commit()

    return render_template('result.html',
                           result=result,
                           filename=filename,
                           prediction_id=prediction.id)


# ─── History Page ────────────────────────────────────────────────────────────
@main_bp.route('/history')
def history():
    page       = request.args.get('page', 1, type=int)
    plant_filter  = request.args.get('plant', '')
    disease_filter = request.args.get('disease', '')

    query = Prediction.query.order_by(Prediction.uploaded_at.desc())
    if plant_filter:
        query = query.filter(Prediction.plant_type.ilike(f'%{plant_filter}%'))
    if disease_filter:
        query = query.filter(Prediction.disease_name.ilike(f'%{disease_filter}%'))

    predictions = query.paginate(page=page, per_page=12, error_out=False)
    plants = db.session.query(Prediction.plant_type).distinct().all()
    plants = [p[0] for p in plants]

    return render_template('history.html',
                           predictions=predictions,
                           plants=plants,
                           plant_filter=plant_filter,
                           disease_filter=disease_filter)


# ─── About Page ──────────────────────────────────────────────────────────────
@main_bp.route('/about')
def about():
    return render_template('about.html')


# ─── JSON API Endpoints ───────────────────────────────────────────────────────
@main_bp.route('/api/predictions')
def api_predictions():
    predictions = Prediction.query.order_by(Prediction.uploaded_at.desc()).limit(50).all()
    return jsonify([p.to_dict() for p in predictions])


@main_bp.route('/api/predictions/<int:pred_id>')
def api_prediction_detail(pred_id):
    prediction = Prediction.query.get_or_404(pred_id)
    return jsonify(prediction.to_dict())


@main_bp.route('/api/stats')
def api_stats():
    total    = Prediction.query.count()
    healthy  = Prediction.query.filter_by(is_healthy=True).count()
    diseased = Prediction.query.filter_by(is_healthy=False).count()
    plants   = db.session.query(Prediction.plant_type,
                                db.func.count(Prediction.id))\
                         .group_by(Prediction.plant_type).all()
    return jsonify({
        'total':    total,
        'healthy':  healthy,
        'diseased': diseased,
        'by_plant': {p: c for p, c in plants},
    })


# ─── Delete prediction ────────────────────────────────────────────────────────
@main_bp.route('/delete/<int:pred_id>', methods=['POST'])
def delete_prediction(pred_id):
    prediction = Prediction.query.get_or_404(pred_id)
    # Delete uploaded image file
    img_path = os.path.join(current_app.config['UPLOAD_FOLDER'], prediction.image_filename)
    if os.path.exists(img_path):
        os.remove(img_path)
    db.session.delete(prediction)
    db.session.commit()
    flash('Prediction deleted.', 'success')
    return redirect(url_for('main.history'))
