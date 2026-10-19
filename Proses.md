## Langkah pengerjaan

1. Membuat README yang berisi identitas dan permasalahan dari persona yang didapat
2. Inisialisasi AI-LOG, PROSES.md, HTML, CSS, dan JS
3. Merancang struktur data yang disimpan di localStorage (transaksi, tagihan, budget)
4. Membuat nav yang berisi Dashboard dan Transaksi
5. Membuat kartu ringkasan, daftar transaksi, dan dialog form tambah transaksi
6. Membuat CSS warna earth tone, aplikasi di tengah dalam bingkai dengan navbar di atas
7. Membuat form tambah transaksi dengan pilihan pemasukan/pengeluaran berupa tombol (W1)
8. Menampilkan daftar transaksi, terbaru di atas, dalam format Rupiah (W2)
9. Menambah tombol hapus dengan konfirmasi (W3)
10. Menyimpan dan memuat data dari localStorage (W4)
11. Menghitung total pemasukan, pengeluaran, dan saldo secara otomatis (W5)
12. Menambah validasi form dengan pesan error di halaman (W6)
13. Menambah menu Tagihan dan form tagihan klien dengan jatuh tempo
14. Tagihan yang ditandai lunas otomatis menjadi pemasukan
15. Menampilkan total piutang dan tagihan yang terlambat
16. Menambah fitur edit transaksi
17. Menambah filter jenis, kategori, rentang tanggal, dan pencarian catatan
18. Menambah menu Pengaturan untuk budget per kategori beserta peringatannya
19. Menambah ekspor dan impor data JSON
20. Membuat tampilan responsif sampai layar HP 360px


## Rancangan struktur data

Data disimpan di localStorage dalam tiga kunci. Setiap kunci berisi teks hasil `JSON.stringify()` dan dibaca kembali dengan `JSON.parse()`. Awalan `fmm_` dipakai supaya tidak bentrok dengan aplikasi versi pertama, karena keduanya berjalan di domain yang sama.

**`fmm_transaksi`**: array objek transaksi

```js
{
  id: 1760850000000,          // Date.now() saat dibuat, unik
  tanggal: "2026-10-12",
  jenis: "pengeluaran",       // "pemasukan" | "pengeluaran"
  kategori: "Software & Tools",
  nominal: 150000,            // angka, bukan teks "Rp 150.000"
  catatan: "Langganan Figma",
  tagihanId: 1760840000000    // hanya ada kalau transaksi ini dari tagihan yang dilunasi
}
```

**`fmm_tagihan`**: array objek tagihan (fitur khas)

```js
{
  id: 1760840000000,
  klien: "CV Sinar",
  proyek: "Website company profile",
  nominal: 4000000,
  tanggal: "2026-10-15",      // tanggal tagihan dikirim
  jatuhTempo: "2026-10-30",
  status: "belum dibayar",    // "belum dibayar" | "lunas"
  tanggalLunas: null          // diisi saat ditandai lunas
}
```

**`fmm_budget`**: objek batas pengeluaran per bulan (bonus)

```js
{ "Software & Tools": 200000, "Makan": 600000 }
```

Status "terlambat" tidak disimpan. Status itu dihitung setiap kali halaman dirender (`statusTagihan()`: belum dibayar dan jatuh tempo sebelum hari ini), supaya otomatis berubah ketika hari berganti.