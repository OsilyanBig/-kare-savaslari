// components/menu/HowToPlay.tsx
'use client';

import { useState } from 'react';
import Modal from '../ui/Modal';

interface HowToPlayProps {
  onClose: () => void;
}

const SECTIONS = [
  {
    id: 'overview',
    title: '🎯 Genel Bakış',
    icon: '🎯',
    content: [
      'Kare Savaşları, kareli bir harita üzerinde ülkeler kurduğun ve rakiplerini fethederek dünyayı ele geçirmeye çalıştığın bir strateji oyunudur.',
      'Oyun başladığında her oyuncuya rastgele topraklar verilir. Sıranı kullanarak saldırabilir veya ordunu güçlendirebilirsin.',
      'Son ayakta kalan oyuncu oyunu kazanır! 👑',
    ],
  },
  {
    id: 'map',
    title: '🗺️ Harita',
    icon: '🗺️',
    content: [
      'Harita kareli bir grid üzerinde rastgele oluşur. Her oyunun haritası farklıdır.',
      'Mavi kareler denizi temsil eder. Deniz hiçbir ülkeye ait olamaz.',
      'Her ülkenin kendine has bir rengi vardır ve tüm toprakları o renkte görünür.',
      'Ülkenizin toprakları üzerinde ülke adı, komutan adı, kare sayısı, donanma ve hava kuvvetleri sayısı yazar.',
    ],
  },
  {
    id: 'turns',
    title: '🔄 Tur Sistemi',
    icon: '🔄',
    content: [
      'Oyuncular sırayla oynar. Her turda sadece BİR aksiyon yapabilirsin:',
      '⚔️ SALDIRI: Bir komşu ülkeye saldır',
      '🏭 ÜRETİM: Donanma veya hava kuvveti üret',
      '⏭️ PAS: Turunu geç',
      '🏳️ TESLİM OL: Oyundan çekil',
      'Her tur için bir süre limiti vardır. Süre dolduğunda otomatik olarak pas geçersin.',
    ],
  },
  {
    id: 'attack',
    title: '⚔️ Saldırı',
    icon: '⚔️',
    content: [
      'Saldırı üç çeşittir: Karadan, Denizden ve Havadan.',
      '',
      '🏔️ KARADAN SALDIRI:',
      '• Hedef ülkeyle kara sınırın olmalıdır',
      '• Sahip olduğun kare sayısı kadar saldırabilirsin',
      '',
      '🚢 DENİZDEN SALDIRI:',
      '• Hedef ülkeyle deniz bağlantın olmalıdır',
      '• Donanma gücün kadar saldırabilirsin',
      '',
      '✈️ HAVADAN SALDIRI:',
      '• Her ülkeye havadan saldırabilirsin (sınır gerekmez)',
      '• Hava kuvvetlerin kadar saldırabilirsin',
      '',
      '🔀 KARMA SALDIRI:',
      '• Birden fazla saldırı türünü aynı anda kullanabilirsin',
      '• Örn: 5 kara + 3 deniz + 2 hava = 10 toplam saldırı',
    ],
  },
  {
    id: 'coin',
    title: '🪙 Madalyon (Kılıç vs Kalkan)',
    icon: '🪙',
    content: [
      'Her saldırı veya üretimden sonra altın bir madalyon atılır!',
      '',
      '⚔️ KILIÇ: Saldırı tarafını temsil eder',
      '🛡️ KALKAN: Savunma tarafını temsil eder',
      '',
      'Madalyon atılmadan önce Kılıç veya Kalkan seçersin:',
      '✅ Seçtiğin gelirse: Saldırın/üretimin BAŞARILI!',
      '❌ Diğeri gelirse: Saldırın/üretimin BAŞARISIZ!',
      '',
      '📊 Şans oranı zorluk moduna göre değişir.',
    ],
  },
  {
    id: 'battle_results',
    title: '📊 Savaş Sonuçları',
    icon: '📊',
    content: [
      '✅ SALDIRI KAZANIRSAN:',
      '• Belirttiğin kare sayısı kadar toprak alırsın',
      '• Donanman ve hava kuvvetlerin aynen kalır',
      '',
      '❌ SALDIRI KAYBEDERSEN:',
      '• Karadan saldırdığın kare kadar toprak KAYBEDERSİN',
      '• Denizden saldırdığın kadar DONANMA kaybedersin',
      '• Havadan saldırdığın kadar HAVA KUVVETİ kaybedersin',
      '',
      '👑 FETİH BONUSU:',
      '• Bir ülkeyi tamamen ele geçirirsen, o ülkenin tüm donanması ve hava kuvvetleri senin olur!',
    ],
  },
  {
    id: 'production',
    title: '🏭 Üretim',
    icon: '🏭',
    content: [
      'Turunu saldırı yerine üretim yapmak için kullanabilirsin.',
      '',
      '🚢 DONANMA ÜRETİMİ:',
      '• Madalyon atarsın - başarılıysa donanman oluşur',
      '• Başarısızsa 2 TUR boyunca donanma üretemezsin!',
      '',
      '✈️ HAVA KUVVETİ ÜRETİMİ:',
      '• Madalyon atarsın - başarılıysa hava kuvvetin oluşur',
      '• Başarısızsa 3 TUR boyunca hava kuvveti üretemezsin!',
      '',
      '⚠️ Dikkat: Üretim risklidir! Başarısızlık uzun süre üretim yapamamak demektir.',
    ],
  },
  {
    id: 'difficulty',
    title: '🎚️ Zorluk Modları',
    icon: '🎚️',
    content: [
      '😊 KOLAY MOD:',
      '• Normal şans %50\'dir',
      '• Bir ülkenin %70\'ini fethettiysen, kalan için şansın %70\'e çıkar',
      '• Yeni başlayanlar için önerilir',
      '',
      '😐 ORTA MOD:',
      '• Şans her zaman %50\'dir',
      '• Klasik oyun deneyimi',
      '',
      '😈 ZOR MOD:',
      '• Normal şans %50\'dir',
      '• Bir ülkenin %70\'ini fethettiysen, kalan için şansın %30\'a düşer',
      '• Ustalar için!',
    ],
  },
  {
    id: 'colonies',
    title: '🏝️ Koloniler',
    icon: '🏝️',
    content: [
      'Deniz veya hava yoluyla ana ülkenle bağlantısı olmayan bir bölge ele geçirirsen, bu bir KOLONİ olur.',
      '',
      '• Koloni üzerinde kaç kare olduğu yazar',
      '• Koloniden etrafındaki ülkelere karadan saldırabilirsin',
      '• Ama kolonindeki kare sayısı kadar saldırabilirsin',
      '• Koloniyi büyütmek için deniz ve hava desteği alabilirsin',
    ],
  },
  {
    id: 'tips',
    title: '💡 Taktik İpuçları',
    icon: '💡',
    content: [
      '1. 🎯 Zayıf komşularını hedef al - Küçük ülkeler fetih bonusu verir!',
      '2. 🚢 Donanma erken bas - Deniz saldırısı sürpriz avantaj sağlar',
      '3. ✈️ Hava kuvveti stratejik kullan - Uzak ülkelere ulaşabilirsin',
      '4. 🤝 Güçlü komşulara hemen saldırma - Önce güçlen',
      '5. 📊 Risk hesapla - Kaybettiğinde ne kaybedeceğini düşün',
      '6. 🏭 Üretimi doğru zamanda yap - Başarısızlık seni tur kaybettirir',
      '7. 🗺️ Haritayı oku - Deniz yollarını ve stratejik noktaları belirle',
      '8. 👑 Fetih bonusunu hedefle - Ülke tamamen alındığında ordusu senin olur!',
    ],
  },
];

export default function HowToPlay({ onClose }: HowToPlayProps) {
  const [activeSection, setActiveSection] = useState('overview');

  const currentSection = SECTIONS.find(s => s.id === activeSection)!;

  return (
    <Modal isOpen={true} onClose={onClose} title="📖 Nasıl Oynanır?" maxWidth="900px">
      <div className="flex flex-col md:flex-row gap-6 min-h-[500px]">
        {/* Sol Menü */}
        <div className="md:w-64 flex-shrink-0">
          <div className="flex md:flex-col gap-2 overflow-x-auto md:overflow-x-visible pb-2 md:pb-0">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex items-center gap-2 px-4 py-3 rounded-xl text-left whitespace-nowrap transition-all text-sm ${
                  activeSection === section.id
                    ? 'bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold'
                    : 'hover:bg-white/5 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{section.icon}</span>
                <span className="hidden md:inline">{section.title.replace(section.icon + ' ', '')}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Sağ İçerik */}
        <div className="flex-1 animate-fade-in" key={activeSection}>
          <h3 className="text-xl font-bold text-amber-400 mb-6">
            {currentSection.title}
          </h3>

          <div className="space-y-3">
            {currentSection.content.map((line, index) => {
              if (line === '') {
                return <div key={index} className="h-2" />;
              }

              // Başlık satırları (emoji ile başlayanlar)
              if (line.match(/^[🏔️🚢✈️🔀⚔️🛡️✅❌👑😊😐😈⚠️]/)) {
                return (
                  <p key={index} className="text-white font-semibold text-sm mt-2">
                    {line}
                  </p>
                );
              }

              // Madde işaretli satırlar
              if (line.startsWith('•')) {
                return (
                  <p key={index} className="text-slate-400 text-sm pl-6">
                    {line}
                  </p>
                );
              }

              // Numaralı satırlar
              if (line.match(/^\d+\./)) {
                return (
                  <p key={index} className="text-slate-300 text-sm pl-2">
                    {line}
                  </p>
                );
              }

              // Normal satırlar
              return (
                <p key={index} className="text-slate-300 text-sm leading-relaxed">
                  {line}
                </p>
              );
            })}
          </div>
        </div>
      </div>

      {/* Alt Bilgi */}
      <div className="mt-8 pt-4 border-t border-slate-700/50 text-center">
        <p className="text-slate-500 text-xs">
          💡 İpucu: Oyun sırasında sağ üstteki ❓ butonuna tıklayarak bu rehbere ulaşabilirsin
        </p>
      </div>
    </Modal>
  );
}