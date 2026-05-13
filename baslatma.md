# Başlatma

Mireditor projesini çalıştırmak için kullanabileceğiniz komutlar aşağıda listelenmiştir. Uygulamanın hem masaüstü sürümünü (backend + frontend + electron) tek seferde başlatabilir, hem de backend ve frontend'i ayrı ayrı çalıştırabilirsiniz.

## 🚀 Tüm Uygulamayı Başlatma (Masaüstü Uygulaması Olarak)

Hem backend (FastAPI), hem frontend (Vite/React), hem de Electron uygulamasını **tek bir komutla** aynı anda başlatmak için `Mireditor` klasörü içinde şu komutu kullanın:

```bash
cd Mireditor
npm run dev-desktop
```

> **Not:** Konsolda daha önce yazdığınız `npm run dev-destop` komutunda yazım hatası (k harfi eksik) bulunuyordu. Doğrusu **`npm run dev-desktop`** olmalıdır.

## 🛠️ Ayrı Ayrı Başlatma Seçenekleri

Eğer servisleri tek tek çalıştırmak veya geliştirme yapmak isterseniz aşağıdaki komutları kullanabilirsiniz:

### 1. Sadece Backend'i Başlatmak İçin
`Mireditor` klasörü içerisindeyken:
```bash
cd Mireditor
npm run backend
```
*(Bu komut otomatik olarak `backend` klasörüne gidip FastAPI sunucusunu 8000 portunda başlatır.)*

### 2. Sadece Frontend'i (Tarayıcıda) Başlatmak İçin
Uygulamayı Electron (masaüstü) olmadan sadece web tarayıcısında (localhost:5173) çalıştırmak isterseniz:
```bash
cd Mireditor
npm run dev
```

### 3. Sadece Electron Penceresini Açmak İçin
Eğer backend ve frontend (Vite) zaten başka terminallerde çalışıyorsa, sadece Electron uygulamasını açmak için:
```bash
cd Mireditor
npm run electron
```
