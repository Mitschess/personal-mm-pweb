### 1. Kerangka HTML & CSS
- **Prompt:**
  - "coba buat kerangka web html nya" (AI membaca file requirement ETS dan README persona saya)
  - "coba kasih cssnya"
  - "coba redesign warna dan layout nya, dengan earth tone"
  - "coba buat web baru yang implement freelance money management"
  - "oke apakah anda bisa jadikan navbar di kiri menjadi diatas"
  - "apakah anda bisa buat agar appsnya di tengah gitu dan ada navbar diatas" + screenshot contoh desain
- **Dipakai:** struktur `index.html` (bingkai `.app`, navbar, kartu ringkasan, daftar transaksi, dialog form) dan `style.css` warna earth tone
- **Diubah:**
  - Navbar awalnya sidebar di kiri ("apakah anda bisa buat navbar dikiri?"), lalu saya minta dipindah ke atas
  - Aplikasi dibuat di tengah dalam bingkai dengan latar luar abu-abu, mengikuti contoh desain
  - `type` pada link icon diganti `image/png` karena file icon berformat PNG
  - Angka font Georgia awalnya naik-turun → ditambah `font-variant-numeric: lining-nums`

### 2. W1–W4: tambah, daftar, hapus, simpan
- **Prompt:**
  - "coba implement js"
  - "buat pemasukan dan pengeluaran menjadi diatas jadi ngga redundan, nanti tinggal di klik dari dua opsi tersebut"
  - "coba buat web baru yang implement freelance money management"
- **Dipakai:** `simpanData()`, `muatData()`, `bukaDialogTransaksi()`, `simpanTransaksi()`, `hapusTransaksi()`, `renderDaftar()`, `buatItemTransaksi()`, `formatRupiah()`, `ambilJenis()`
- **Diubah:**
  - Dropdown jenis diganti dua radio button bergaya tombol, supaya tinggal klik pemasukan/pengeluaran
  - Bug: radio yang disembunyikan ikut aturan `input { width: 100% }` sehingga dialog bisa di-scroll ke samping → diberi `width: 0; height: 0` (detail di PROSES.md)

### 3. W5–W6: ringkasan dan validasi
- **Prompt:** "coba implement js", "coba buat web baru yang implement freelance money management"
- **Dipakai:** `hitungRingkasan()` dan `jumlahkan()` (filter + reduce), `renderDashboard()`, `validasiTransaksi()`, `tampilkanError()`, `hapusError()`, `hapusErrorSaatDiubah()`
- **Diubah:** —

### 4. Fitur khas: tagihan klien
- **Prompt:** "coba implement js" (versi pertama: tagihan + tandai lunas), "coba buat web baru yang implement freelance money management" (ditambah jatuh tempo dan status terlambat)
- **Dipakai:** `simpanTagihan()`, `validasiTagihan()`, `tandaiLunas()`, `hapusTagihan()`, `statusTagihan()`, `teksStatus()`, `renderTagihan()`, total piutang di `hitungRingkasan()`
- **Diubah:** — (alasan memakai `tagihanId` ada di PROSES.md bagian keputusan desain)

### 5. Bonus: edit transaksi dan filter
- **Prompt:** "coba buat web baru yang implement freelance money management"
- **Dipakai:** mode edit di `bukaDialogTransaksi()` dan `simpanTransaksi()` (hidden input `transaksi-id`), `ambilTransaksiTerfilter()`, `isiFilterKategori()`, `resetFilter()`
- **Diubah:** —

### 6. Bonus: budget dan ekspor/impor JSON
- **Prompt:** "coba buat web baru yang implement freelance money management"
- **Dipakai:** `cekBudget()`, `statusBudget()`, `renderBudget()`, `renderIsianBudget()`, `simpanBudget()`, `eksporData()`, `imporData()`
- **Diubah:**
  - Bug: budget terpakai tepat 100% ditulis "hampir habis" → `statusBudget()` membandingkan nominal langsung, bukan persen yang dibulatkan
  - Bug: teks "Belum ada budget" terjepit di satu kolom grid → `grid-column: 1 / -1`
  - Teks budget terlipat karena kolom hanya 240px → `minmax(min(300px, 100%), 1fr)`

### 7. Bonus: tampilan responsif
- **Prompt:** "oke apakah anda bisa jadikan navbar di kiri menjadi diatas", "apakah anda bisa buat agar appsnya di tengah gitu dan ada navbar diatas"
- **Dipakai:** media query ≤1140px (navbar dua baris), ≤768px (bingkai memenuhi layar), ≤600px (logo saja, menu berikon), ≤480px (kartu, filter, form menyesuaikan)
- **Diubah:**
  - Breakpoint navbar dua baris dinaikkan ke 1140px karena di lebar 1000–1100px menu tidak muat
  - Di versi pertama halaman bisa di-scroll ke samping → kolom grid memakai `minmax(0, 1fr)`
