from fastapi.testclient import TestClient
from main import app

# Sanal bir istemci oluşturuyoruz
client = TestClient(app)

def test_anasayfa_calisiyor_mu():
    """
    Sistemin ayakta olup olmadığını kontrol eden basit test.
    """
    response = client.get("/")
    
    # 200 kodu 'Başarılı' demektir
    assert response.status_code == 200
    
    # Dönen mesajın içinde 'Attendify' yazıyor mu?
    assert "Attendify" in response.json()["status"]

# Veritabanı bağlantısı gerektirmeyen diğer basit fonksiyonları buraya ekleyebilirsin.