import mysql.connector
import json

# Veritabanı Ayarları
DB_CONFIG = {
    'user': 'root',
    'password': '',
    'host': 'localhost',
    'database': 'attendify_db',
}

def check_system():
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor(dictionary=True)
        print("\n✅ Veritabanına Bağlandı!\n")

        # 1. Toplam Fotoğraf Sayısı
        cursor.execute("SELECT COUNT(*) as count FROM student_photos")
        total_photos = cursor.fetchone()['count']
        print(f"📸 Toplam Fotoğraf Sayısı: {total_photos}")

        # 2. İşlenmiş (Encoding'i Olan) Fotoğraf Sayısı
        cursor.execute("SELECT COUNT(*) as count FROM student_photos WHERE encoding_data IS NOT NULL")
        encoded_photos = cursor.fetchone()['count']
        print(f"🧠 İşlenmiş (Yüzü Tanınmış) Fotoğraf Sayısı: {encoded_photos}")

        if encoded_photos == 0:
            print("\n❌ HATA: Hiçbir fotoğrafın yüz verisi çıkarılmamış!")
            print("👉 ÇÖZÜM: Tarayıcıdan 'http://localhost:8000/encode_existing' adresine gidin.")
            return

        # 3. Eşleşme Kontrolü (JOIN Testi)
        query = """
            SELECT u.username, sp.id as photo_id
            FROM student_photos sp
            JOIN users u ON sp.student_id = u.id 
            WHERE sp.encoding_data IS NOT NULL
        """
        cursor.execute(query)
        matches = cursor.fetchall()
        print(f"🔗 Kullanıcı ile Eşleşen Fotoğraf Sayısı: {len(matches)}")

        if len(matches) == 0:
            print("\n❌ HATA: Fotoğraflar var ama 'users' tablosundaki bir kullanıcıyla eşleşmiyor!")
            print("👉 Olası Sebep: Fotoğrafların 'student_id'si ile 'users' tablosundaki 'id'ler uyuşmuyor.")
            
            # Detaylı İnceleme
            cursor.execute("SELECT student_id FROM student_photos LIMIT 5")
            photo_ids = [str(r['student_id']) for r in cursor.fetchall()]
            print(f"   -> Fotoğraflardaki student_id örnekleri: {', '.join(photo_ids)}")
            
            cursor.execute("SELECT id FROM users LIMIT 5")
            user_ids = [str(r['id']) for r in cursor.fetchall()]
            print(f"   -> Users tablosundaki id örnekleri: {', '.join(user_ids)}")
        else:
            print("\n✅ SİSTEM HAZIR! Aşağıdaki öğrenciler tanınabilir durumda:")
            unique_students = set(m['username'] for m in matches)
            for s in unique_students:
                print(f"   - Öğrenci No: {s}")

    except Exception as e:
        print(f"\n❌ KRİTİK HATA: {str(e)}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    check_system()