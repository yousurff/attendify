from fastapi import FastAPI, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import face_recognition
import mysql.connector
import numpy as np
import json
import os
import io
from PIL import Image

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Veritabanı Ayarları
DB_CONFIG = {
    'user': 'root',
    'password': '',
    'host': 'localhost',
    'database': 'attendify_db',
}

# Fotoğraf Yolu
PHOTOS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public"))

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@app.get("/")
def read_root():
    return {"status": "Attendify AI Service Running 🚀"}

# --- MEVCUT FOTOĞRAFLARI ÖĞREN (INDEXING) ---
@app.get("/encode_existing")
def encode_existing_photos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # Sadece NULL olanları çek
    cursor.execute("SELECT id, photo_path FROM student_photos WHERE encoding_data IS NULL")
    photos = cursor.fetchall()
    
    updated_count = 0
    errors = []

    print(f"\n--- {len(photos)} adet yeni fotoğraf işleniyor... ---")

    for photo in photos:
        relative_path = photo['photo_path'].lstrip('/')
        full_path = os.path.join(PHOTOS_DIR, relative_path)
        
        if not os.path.exists(full_path):
            errors.append(f"Dosya yok: {full_path}")
            continue

        try:
            image = face_recognition.load_image_file(full_path)
            # 'hog' modeli daha hızlıdır
            encodings = face_recognition.face_encodings(image)

            if len(encodings) > 0:
                face_encoding = encodings[0].tolist()
                json_data = json.dumps(face_encoding)
                
                update_cursor = conn.cursor()
                sql = "UPDATE student_photos SET encoding_data = %s WHERE id = %s"
                update_cursor.execute(sql, (json_data, photo['id']))
                conn.commit()
                update_cursor.close()
                updated_count += 1
                print(f"✅ OK: {photo['photo_path']}")
            else:
                print(f"❌ Yüz Yok: {photo['photo_path']}")
                
        except Exception as e:
            errors.append(f"Hata: {str(e)}")

    cursor.close()
    conn.close()
    
    return {
        "status": "completed", 
        "processed": len(photos), 
        "success_newly_encoded": updated_count, 
        "errors": errors
    }

# --- CANLI TANIMA ---
@app.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    # 1. Bilinen Yüzleri Çek
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    
    # --- KRİTİK DÜZELTME BURADA YAPILDI ---
    # Artık 'users' tablosuna değil, 'students' tablosuna bağlanıyoruz.
    # sp.student_id -> s.id ile eşleşiyor.
    # Öğrenci numarası 'students' tablosunda 'student_number' sütununda.
    query = """
        SELECT s.student_number, sp.encoding_data 
        FROM student_photos sp
        JOIN students s ON sp.student_id = s.id 
        WHERE sp.encoding_data IS NOT NULL
    """
    try:
        cursor.execute(query)
        known_records = cursor.fetchall()
    except Exception as e:
        print(f"SQL Hatası: {e}")
        return {"found_students": []}
    
    known_encodings = []
    known_student_numbers = []
    
    for record in known_records:
        if record['encoding_data']:
            try:
                encoding = np.array(json.loads(record['encoding_data']))
                known_encodings.append(encoding)
                # React tarafıyla uyum için String'e çeviriyoruz
                known_student_numbers.append(str(record['student_number']))
            except:
                continue
            
    cursor.close()
    conn.close()

    if not known_encodings:
        print(f"⚠️ Veritabanında kayıtlı yüz verisi yok! (Sorgu {len(known_records)} kayıt döndürdü ama veri boş olabilir)")
        return {"found_students": []}

    # 2. Kameradan Gelen Görüntüyü İşle
    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image)
        
        face_locations = face_recognition.face_locations(image_np)
        face_encodings = face_recognition.face_encodings(image_np, face_locations)
    except Exception as e:
        print(f"Görüntü İşleme Hatası: {e}")
        return {"found_students": []}

    found_students = []

    # Ekrana bilgi yaz (Debug)
    if len(face_locations) > 0:
        print(f"👀 Kamerada {len(face_locations)} yüz görüldü. Tanımlanıyor...")

    for face_encoding in face_encodings:
        # TOLERANS AYARI: 0.55
        tolerance = 0.55
        
        matches = face_recognition.compare_faces(known_encodings, face_encoding, tolerance=tolerance)
        face_distances = face_recognition.face_distance(known_encodings, face_encoding)
        
        if len(face_distances) > 0:
            best_match_index = np.argmin(face_distances)
            distance = face_distances[best_match_index]
            student_num = known_student_numbers[best_match_index]

            if matches[best_match_index]:
                print(f"✅ EŞLEŞTİ! No: {student_num} - Fark: {distance:.4f}")
                found_students.append(student_num)
            else:
                print(f"❌ Tanınamadı (En yakın: {student_num} - Fark: {distance:.4f})")

    return {"found_students": list(set(found_students))}