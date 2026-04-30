from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timezone

db = SQLAlchemy()


class Prediction(db.Model):
    """Stores every image upload and its CNN prediction result."""
    __tablename__ = 'predictions'

    id               = db.Column(db.Integer, primary_key=True)
    image_filename   = db.Column(db.String(255), nullable=False)
    plant_type       = db.Column(db.String(100), nullable=False)
    disease_name     = db.Column(db.String(255), nullable=False)
    confidence       = db.Column(db.Float, nullable=False)
    is_healthy       = db.Column(db.Boolean, default=False)
    remedy           = db.Column(db.Text)
    description      = db.Column(db.Text)
    severity         = db.Column(db.Enum('Low', 'Medium', 'High', 'Healthy'), default='Medium')
    uploaded_at      = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    ip_address       = db.Column(db.String(45))

    def to_dict(self):
        return {
            'id':             self.id,
            'image_filename': self.image_filename,
            'plant_type':     self.plant_type,
            'disease_name':   self.disease_name,
            'confidence':     round(self.confidence * 100, 2),
            'is_healthy':     self.is_healthy,
            'remedy':         self.remedy,
            'description':    self.description,
            'severity':       self.severity,
            'uploaded_at':    self.uploaded_at.strftime('%Y-%m-%d %H:%M:%S'),
        }

    def __repr__(self):
        return f'<Prediction {self.id}: {self.disease_name} ({self.confidence:.1%})>'


class DiseaseInfo(db.Model):
    """Static lookup table for disease metadata."""
    __tablename__ = 'disease_info'

    id           = db.Column(db.Integer, primary_key=True)
    class_name   = db.Column(db.String(255), unique=True, nullable=False)
    plant_type   = db.Column(db.String(100), nullable=False)
    disease_name = db.Column(db.String(255), nullable=False)
    description  = db.Column(db.Text)
    symptoms     = db.Column(db.Text)
    remedy       = db.Column(db.Text)
    severity     = db.Column(db.Enum('Low', 'Medium', 'High', 'Healthy'), default='Medium')
    is_healthy   = db.Column(db.Boolean, default=False)

    def __repr__(self):
        return f'<DiseaseInfo {self.class_name}>'
