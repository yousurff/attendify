# Attendify - Yeni Nesil Yoklama Yönetim Sistemi

Attendify, geleneksel kağıt-kalem yoklamasını tarihe gömen; **React**, **PHP** ve **Python (Yapay Zeka)** teknolojilerinin hibrit çalışmasıyla geliştirilmiş modern bir yoklama takip sistemidir.

Proje, öğretmenlerin sınıfta kamera aracılığıyla saniyeler içinde yoklama almasını sağlarken, idarecilerin tüm süreci detaylı grafiklerle yönetmesine olanak tanır. "Cyberpunk" esintili modern arayüzü ile kullanıcı deneyimini ön planda tutar.

---

## ⚡ Öne Çıkan Özellikler

### 🤖 Yapay Zeka Destekli Yoklama (AI Core)
* **Anlık Yüz Tanıma:** Python ve `face_recognition` kütüphanesi kullanılarak geliştirilen mikroservis, kamera akışını milisaniyeler içinde analiz eder.
* **Canlı Geri Bildirim:** Öğrenci kameraya baktığı an sistem yüzünü algılar, kimliğini doğrular ve ekranda (YEŞİL) onay verir.
* **Hata Toleransı:** Işık açısı veya hafif poz değişikliklerini tolere edebilen esnek algoritma.
* **Admin Test Laboratuvarı:** Yeni eklenen öğrencilerin veya kamera ayarlarının test edilebileceği, admin paneline entegre simülasyon alanı.

### 🎨 Modern Arayüz ve UX
* **Cyberpunk Dark Mode:** Göz yormayan, kontrastı yüksek ve modern renk paleti.
* **Responsive Tasarım:** Tablet ve laptop ekranlarına tam uyumlu yerleşim.
* **İnteraktif Dashboard:** Anlık istatistikler, grafikler ve özet veriler.

### 🛡️ Güvenlik ve Yönetim
* **Rol Bazlı Erişim:** Admin ve Öğretmenler için ayrıştırılmış yetkilendirme sistemi.
* **Güvenli Veri:** Session tabanlı oturum yönetimi ve Bcrypt şifreleme.
* **Detaylı Raporlama:** Excel formatında dışa aktarma ve geçmişe dönük yoklama kayıtları.

---

## 🛠️ Teknolojiler ve Mimari

Proje, her biri kendi alanında güçlü üç ana katmandan oluşur:

### 1. Frontend (İstemci)
* **React 18 (Vite):** Hızlı ve modüler arayüz geliştirimi.
* **CSS Modules & Variables:** Özelleştirilebilir, global tema yönetimi.
* **React Icons & Recharts:** Görselleştirme ve ikon setleri.
* **Axios:** API iletişimi.

### 2. Backend (Yönetim API)
* **PHP 7.4+ (Native):** Performanslı ve hafif REST API yapısı.
* **MySQL:** İlişkisel veritabanı yönetimi.
* **PDO:** Güvenli veritabanı sorguları.

### 3. AI Service (Görüntü İşleme)
* **Python 3.x:** Yapay zeka motoru.
* **FastAPI:** React ile iletişim kuran yüksek performanslı asenkron web sunucusu.
* **Face Recognition & NumPy:** Biyometrik veri işleme ve matris hesaplamaları.

---

## 🚀 Kurulum Rehberi

Projeyi yerel makinenizde çalıştırmak için aşağıdaki adımları izleyin.

### Ön Gereksinimler
* XAMPP (veya muadili Apache/MySQL sunucusu)
* Node.js (v16 veya üzeri)
* Python (v3.8 veya üzeri)

### Adım 1: Veritabanı Kurulumu
1.  `phpMyAdmin`'e gidin ve `attendify_db` adında bir veritabanı oluşturun.
2.  Proje içindeki `database/attendify_db.sql` dosyasını içe aktarın.

### Adım 2: PHP Backend Başlatma
1.  Projenin `backend` klasörünü XAMPP'in `htdocs` dizini altına (örneğin: `htdocs/attendify/backend`) taşıyın.
2.  `config/database.php` dosyasındaki veritabanı bilgilerini kontrol edin.

### Adım 3: Python AI Servisini Başlatma
Yüz tanıma motorunun çalışması için Python sunucusu ayakta olmalıdır.
1.  Terminali açın ve `python_api` klasörüne gidin.
2.  Gerekli kütüphaneleri yükleyin:
    ```bash
    pip install fastapi uvicorn face_recognition mysql-connector-python numpy pillow python-multipart
    ```
3.  Sunucusu başlatın:
    ```bash
    uvicorn main:app --reload --port 8000
    ```

### Adım 4: Frontend Başlatma
1.  Yeni bir terminalde `frontend` klasörüne gidin.
2.  Bağımlılıkları yükleyin ve projeyi ayağa kaldırın:
    ```bash
    npm install
    npm run dev
    ```
3.  Tarayıcıda `http://localhost:3000` adresine gidin.

---

## 📂 Proje Yapısı

```bash
attendify/
├── backend/              # PHP API (Kullanıcı, Ders, Sınıf işlemleri)
│   ├── config/           # Veritabanı ayarları
│   ├── controllers/      # İş mantığı katmanı
│   └── index.php         # Router
│
├── frontend/             # React Arayüzü
│   ├── src/
│   │   ├── components/   # Admin ve Teacher bileşenleri
│   │   │   ├── admin/    # Ayarlar, Test Laboratuvarı vb.
│   │   │   └── teacher/  # Kamera ve Yoklama ekranları
│   │   ├── services/     # API istekleri
│   │   └── styles/       # Global CSS ve Tema
│
├── python_api/           # AI Mikroservisi
│   ├── main.py           # FastAPI sunucusu ve Yüz Tanıma mantığı
│   └── check_db.py       # Veritabanı bağlantı test aracı
│
└── database/             # SQL dosyaları