# node-modules

Kriptoda kısa vadeli hareketleri yakalamak için örnek bir scalper bot iskeleti.
Kod, varsayılan olarak **paper mode** çalışır ve API anahtarları olmadan sadece sinyal üretir.

## Özellikler
- EMA + RSI sinyali
- Aylık trend filtresi (EMA) ile yön onayı
- Bybit market verisi ile scalp sinyali üretimi
- Hata olduğunda cooldown ile ders çıkarma (error coach)
- Kısa bekleme (cooldown) ve risk limitleri
- Paper/live mod ayrımı
- Telegram bildirimleri (mesaj teyidi ile)
- Hata dayanımı için kontrollü istekler

## Kurulum
```bash
npm install
```

## Çalıştırma
```bash
cp .env.example .env
npm start
```

## Telegram kurulumu
- Bot oluşturup `TELEGRAM_BOT_TOKEN` alın.
- Bildirim atılacak sohbetin `TELEGRAM_CHAT_ID` değerini girin.

## Notlar
- `PAPER_MODE=true` iken gerçek emir gönderilmez.
- Canlı emir için Binance API anahtarlarını ayarlayın.
- Bu iskelet eğitim amaçlıdır; canlı piyasada kullanmadan önce kapsamlı test yapın.
