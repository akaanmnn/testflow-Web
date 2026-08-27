const S = ({ title, children }) => (
  <section style={{ marginBottom: 28 }}>
    <h2 style={{ fontSize: 16, marginBottom: 10 }}>{title}</h2>
    <div style={{ lineHeight: 1.65 }}>{children}</div>
  </section>
);

const K = ({ children }) => <code>{children}</code>;

export default function Help() {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 className="page-title">Yardım</h1>
      <p className="muted" style={{ marginTop: -8, marginBottom: 24 }}>
        TestFlow ile kod yazmadan web testleri kaydedin, düzenleyin ve koşun.
      </p>

      <S title="1 · Giriş, Kişisel Alan ve projeler">
        Şirket (AD) kullanıcı adı ve şifrenizle girersiniz; kayıt olmak yoktur.
        İlk girişte size özel bir <b>Kişisel Alan</b> açılır. Ekiple çalışmak
        için sol üstteki listeden <b>＋ Yeni proje</b> oluşturun ve
        <b> Proje Üyeleri</b> sayfasından arkadaşlarınızı AD kullanıcı adıyla
        ekleyin. Sol üstten projeler arasında geçiş yapılır;
        <b> farklı projeler birbirinin verisini göremez</b>. Senaryolar
        ("Kopyala →" / "Çoğalt") ve test veri setleri projelere <b>bağımsız
        kopya</b> olarak paylaşılır.
      </S>

      <S title="2 · Eklenti kurulumu (bir kez)">
        Kayıt ve koşum Chrome/Edge eklentisiyle yapılır:
        <ol style={{ margin: '8px 0 8px 20px' }}>
          <li><K>chrome://extensions</K> → sağ üstten <b>Geliştirici modu</b></li>
          <li><b>Paketlenmemiş öğe yükle</b> → repodaki <K>extension/</K> klasörü</li>
          <li><b>Ayrıntılar → Gizli modda izin ver</b> anahtarını açın (temiz oturum için)</li>
          <li>Bu sekmeyi yenileyin — Senaryolar'ın sağ üstünde eklenti sürümü görünmeli</li>
        </ol>
        Eklenti güncellenince <K>chrome://extensions</K>'tan 🔄 yenileyin.
      </S>

      <S title="3 · Senaryo kaydetme">
        Senaryolar → <b>+ Yeni Senaryo</b> → ad girin, URL'i ortamdan seçin →
        <b> 🔴 Kaydı Başlat</b>. Açılan pencerede testi normal yapın: tıklama,
        yazma, seçim ve dosya seçimi otomatik adım olur. Doğrulama eklemek için
        çubuktaki <b>✓ Doğrula</b>'ya basıp doğrulanacak öğeye tıklayın
        (yeşil çerçeveyle vurgulanır). <b>Kaydı Bitir</b> ile senaryo hazır.
        <div className="card" style={{ marginTop: 10, padding: 12, fontSize: 13 }}>
          🔒 Şifre alanları asla kaydedilmez — koşabilmek için o adımı bir test
          verisi anahtarına bağlamanız gerekir (bkz. §5).
        </div>
      </S>

      <S title="4 · Senaryo düzenleme ve adım bayrakları">
        Detay sayfasında ad, URL, klasör ve adımlar düzenlenir (↑↓ taşı, ✕ sil);
        değişiklikler <b>Kaydet</b> ile yazılır. Adım bayrakları:
        <table style={{ marginTop: 10 }}>
          <thead><tr><th>Bayrak</th><th>Ne yapar</th><th>Ne zaman</th></tr></thead>
          <tbody>
            <tr><td><b>gizli</b></td><td>Değer maskelenir</td><td>Şifre gibi hassas değerler</td></tr>
            <tr><td><b>boşsa</b></td><td>Alan dolu/kilitliyse dokunmaz, atlar; boşsa doldurur</td><td>Dosyadan dosyaya dolu gelebilen alanlar</td></tr>
            <tr><td><b>ops.</b></td><td>Öğe yoksa koşumu kesmez, adımı atlar</td><td>Bazen gelen modallar, koşullu öğeler</td></tr>
          </tbody>
        </table>
      </S>

      <S title="5 · Test verileri ve bağlama (📎)">
        Test Verileri'nde setler oluşturun; anahtarlar <b>metin</b> veya
        <b> dosya</b> (≤3MB) tipinde olabilir, hassaslar <b>gizli</b> işaretlenir.
        Senaryoda bir adımın listesinden 📎'li anahtarı seçince değer koşum
        anında setten alınır. Şifre adımları bağlanmak zorundadır; upload
        adımları yalnızca dosya anahtarlarına bağlanır. Aynı senaryoyu farklı
        setlerle koşarak farklı verilerle test edebilirsiniz.
      </S>

      <S title="6 · Ortamlar">
        Ortamlar'da test/staging gibi ortamları tanımlayın. Senaryo URL'i
        ortamdan seçilir; koşumda ortam seçerseniz senaryo o ortamın adresinde
        koşar (yol korunur, sunucu değişir).
      </S>

      <S title="7 · Koşum">
        Senaryo detayında <b>▶ Koş</b> → ortam + test verisi → <b>Başlat</b>.
        Gizli mod izni varsa koşum <b>gizli pencerede, temiz oturumla</b> yapılır;
        izin kapalıysa sistem hedef sitenin çerezlerini temizleyip normal sekmede
        koşar. Beklemeler: öğeler 5sn, doğrulamalar 12sn, opsiyonel adımlar 3sn.
        <br /><br />
        <b>Data-driven:</b> koşum panelinde birden fazla veri seti işaretlerseniz
        senaryo her setle ayrı ayrı koşar, her set ayrı kayıt olur.{' '}
        <b>Toplu koşum:</b> Senaryolar'da kutucuklarla seçin → ▶ Toplu Koş —
        sırayla koşar, canlı ilerleme ve özet gösterilir.{' '}
        <b>Tekrar koşum:</b> Koşumlar'da passed olmayanların yanındaki ↻,
        senaryoyu güncel haliyle aynı ortam + veri setiyle yeniden koşar.
      </S>

      <S title="8 · Sonuçlar ve self-healing">
        Koşumlar'da bir kayda tıklayın: her adımın tanımı, durumu
        (<span className="badge passed">passed</span>{' '}
        <span className="badge failed">failed</span>{' '}
        <span className="badge skipped">skipped</span>), hata mesajı ve
        <b> ekran görüntüsü</b> (tıklayınca büyür) görünür.
        <br /><br />
        Her öğe için 7'ye kadar tanımlayıcı saklanır; biri değişse bile
        (örn. id) koşum diğerleriyle öğeyi bulur — adım geçer, <b>healed ✓</b>{' '}
        işaretlenir ve çalışan tanımlayıcı senaryoya otomatik yazılır.
        Dashboard'daki iyileşen adım sayısı, arayüzü değişen senaryoların
        sinyalidir.
      </S>

      <S title="9 · Sık karşılaşılan durumlar">
        <b>Kaydı Başlat pasif</b> → eklenti kurulu/güncel değil (§2).<br />
        <b>"Gizli/boş değer"</b> → adımı 📎 ile bağlayıp Kaydet'e basın;
        aynı alana ait fazla adım varsa silin.<br />
        <b>"Element bulunamadı"</b> → sayfa değişti (senaryoyu güncelleyin)
        ya da öğe o akışta gelmiyor (adımı <b>ops.</b> yapın); ekran
        görüntüsünden o anki sayfayı kontrol edin.<br />
        <b>"Beklenen X, bulunan Y"</b> → sayfa beklenen içeriğe ulaşmadı;
        Y hangi ekranda kalındığını söyler.<br />
        <b>Koşum login'li başlıyor</b> → gizli mod iznini kontrol edin (§2/4).<br />
        <b>Alanlar dolu/kilitli geliyor</b> → adımları <b>boşsa</b> işaretleyin.
      </S>
    </div>
  );
}
