from fastapi import FastAPI, UploadFile, File, HTTPException
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

DB_CONFIG = {
    'user': 'root',
    'password': '',
    'host': 'localhost',
    'database': 'attendify_db',
}

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PHOTOS_DIR = os.path.abspath(os.path.join(BASE_DIR, "..", "frontend", "public"))

known_face_encodings = []
known_face_student_numbers = []

def get_db_connection():
    return mysql.connector.connect(**DB_CONFIG)

@app.on_event("startup")
def load_known_faces():
    global known_face_encodings, known_face_student_numbers
    known_face_encodings = []
    known_face_student_numbers = []

    print("\n🚀 [SİSTEM BAŞLATILIYOR] Yüz veritabanı yükleniyor...")
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor(dictionary=True)
        
        query = """
            SELECT s.student_number, sp.encoding_data 
            FROM student_photos sp
            JOIN students s ON sp.student_id = s.id 
            WHERE sp.encoding_data IS NOT NULL
        """
        cursor.execute(query)
        records = cursor.fetchall()
        
        count = 0
        for record in records:
            if record['encoding_data']:
                try:
                    encoding = np.array(json.loads(record['encoding_data']))
                    known_face_encodings.append(encoding)
                    known_face_student_numbers.append(str(record['student_number']).strip())
                    count += 1
                except Exception:
                    pass
        
        print(f"✅ TOPLAM {count} ÖĞRENCİ YÜZÜ HAFIZAYA ALINDI!\n")
        
    except Exception as e:
        print(f"❌ Veritabanı Bağlantı Hatası: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

@app.get("/")
def read_root():
    return {"status": "Attendify AI Service Running 🚀"}

@app.get("/encode_existing")
def encode_existing_photos():
    conn = get_db_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, photo_path FROM student_photos WHERE encoding_data IS NULL")
    photos = cursor.fetchall()
    
    updated_count = 0
    print(f"\n--- {len(photos)} yeni fotoğraf taranıyor... ---")

    for photo in photos:
        relative_path = photo['photo_path'].lstrip('/').lstrip('\\')
        full_path = os.path.join(PHOTOS_DIR, relative_path)
        
        if not os.path.exists(full_path):
            continue

        try:
            image = face_recognition.load_image_file(full_path)
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
                print(f"✅ Kodlandı: ID {photo['id']}")
        except Exception as e:
            print(f"❌ Hata: {e}")

    cursor.close()
    conn.close()
    load_known_faces()
    return {"status": "completed", "processed": updated_count}

@app.post("/recognize")
async def recognize_face(file: UploadFile = File(...)):
    if not known_face_encodings:
        return {"found_student_numbers": [], "detections": []}

    try:
        image_data = await file.read()
        image = Image.open(io.BytesIO(image_data))
        image_np = np.array(image)
    except Exception as e:
        print(f"❌ Resim Hatası: {e}")
        return {"found_student_numbers": [], "detections": []}

    face_locations = face_recognition.face_locations(image_np)
    face_encodings = face_recognition.face_encodings(image_np, face_locations)

    detections = []
    found_student_numbers = []

    for (top, right, bottom, left), face_encoding in zip(face_locations, face_encodings):
        tolerance = 0.52
        
        face_distances = face_recognition.face_distance(known_face_encodings, face_encoding)
        best_match_index = np.argmin(face_distances)
        distance = face_distances[best_match_index]
        
        if distance < tolerance:
            student_num = known_face_student_numbers[best_match_index]
            found_student_numbers.append(student_num)
            
            # Koordinatları da ekle
            detections.append({
                "student_number": student_num,
                "location": [top, right, bottom, left] # [y1, x2, y2, x1]
            })
            print(f"✅ ALGILANDI: {student_num} (Konum: {top},{left})")

    return {
        "found_student_numbers": list(set(found_student_numbers)), # Eski uyumluluk için
        "detections": detections, # Yeni sistem için
        "count": len(detections)
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)