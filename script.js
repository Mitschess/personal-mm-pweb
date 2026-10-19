// ===== Konstanta =====
// Kunci localStorage diberi awalan "fmm_" supaya tidak bentrok dengan aplikasi lain
const KUNCI = {
    transaksi: "fmm_transaksi",
};

// Kategori tetap untuk tiap jenis transaksi
const KATEGORI = {
    pemasukan: ["Proyek", "Retainer", "Bonus", "Lainnya"],
    pengeluaran: ["Software & Tools", "Internet & Listrik", "Peralatan", "Makan", "Transportasi", "Lainnya"],
};

const JUDUL_HALAMAN = {
    dashboard: "Dashboard",
    transaksi: "Transaksi",
};

// ===== Data di memori =====
// transaksi: { id, tanggal, jenis, kategori, nominal, catatan }
let daftarTransaksi = [];

// Singkatan untuk document.getElementById
const $ = (id) => document.getElementById(id);

// ===== Simpan & muat (W4) =====
function simpanData() {
    localStorage.setItem(KUNCI.transaksi, JSON.stringify(daftarTransaksi));
}

function muatData() {
    try {
        // getItem mengembalikan null kalau belum ada data -> pakai nilai awal
        daftarTransaksi = JSON.parse(localStorage.getItem(KUNCI.transaksi)) || [];
    } catch (err) {
        // Kalau isi localStorage rusak (bukan JSON), mulai dari kosong
        daftarTransaksi = [];
    }
}

// ===== Fungsi bantu =====
function formatRupiah(angka) {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(angka);
}

// "2026-10-19" -> "19 Okt 2026"
function formatTanggal(tanggal) {
    return new Date(tanggal + "T00:00:00").toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

// Tanggal hari ini "YYYY-MM-DD" menurut waktu lokal (bukan UTC)
function tanggalHariIni() {
    const d = new Date();
    const bulan = String(d.getMonth() + 1).padStart(2, "0");
    const hari = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${bulan}-${hari}`;
}

// Total nominal dari sebuah array transaksi
function jumlahkan(daftar) {
    return daftar.reduce((total, item) => total + item.nominal, 0);
}

// Membuat elemen HTML sekaligus class dan teksnya
function buatElemen(tag, className, teks) {
    const el = document.createElement(tag);
    if (className) el.className = className;
    if (teks !== undefined) el.textContent = teks;
    return el;
}

function buatTombol(className, teks, aksi) {
    const tombol = buatElemen("button", className, teks);
    tombol.type = "button";
    tombol.addEventListener("click", aksi);
    return tombol;
}

// Terbaru di atas: urut tanggal, lalu id (waktu dibuat)
function urutkanTerbaru(a, b) {
    if (a.tanggal !== b.tanggal) return b.tanggal.localeCompare(a.tanggal);
    return b.id - a.id;
}

// Isi <select> dengan daftar kategori
function isiOpsiKategori(select, daftar, teksAwal, nilaiAwal) {
    select.innerHTML = "";
    select.appendChild(new Option(teksAwal, nilaiAwal));
    daftar.forEach((kategori) => select.appendChild(new Option(kategori, kategori)));
}

// ===== Toast (notifikasi kecil di bawah) =====
let timerToast;
function tampilkanToast(pesan, tipe = "info") {
    const toast = $("toast");
    toast.textContent = pesan;
    toast.className = `toast tampil ${tipe}`;
    clearTimeout(timerToast);
    timerToast = setTimeout(() => toast.classList.remove("tampil"), 3500);
}

// ===== Validasi (W6) =====
function tampilkanError(input, pesan) {
    $("error-" + input.id).textContent = pesan;
    input.classList.add("tidak-valid");
}

function hapusError(form) {
    form.querySelectorAll(".error").forEach((el) => (el.textContent = ""));
    form.querySelectorAll(".tidak-valid").forEach((el) => el.classList.remove("tidak-valid"));
}

// Error di satu field hilang begitu field itu diubah
function hapusErrorSaatDiubah(event) {
    event.target.classList.remove("tidak-valid");
    const elError = $("error-" + event.target.id);
    if (elError) elError.textContent = "";
}

// ===== Navigasi halaman =====
function tampilkanHalaman(nama) {
    if (!JUDUL_HALAMAN[nama]) nama = "dashboard";

    document.querySelectorAll(".halaman").forEach((el) => {
        el.classList.toggle("aktif", el.id === `halaman-${nama}`);
    });
    document.querySelectorAll(".nav-item").forEach((el) => {
        el.classList.toggle("aktif", el.dataset.halaman === nama);
    });

    $("judul-halaman").textContent = JUDUL_HALAMAN[nama];
    history.replaceState(null, "", `#${nama}`); // halaman tetap sama saat di-refresh
    window.scrollTo(0, 0);
}

// TRANSAKSI (W1, W3)
function ambilJenis() {
    const terpilih = document.querySelector('input[name="jenis"]:checked');
    return terpilih ? terpilih.value : "";
}

// Opsi kategori di form mengikuti jenis yang dipilih
function gantiOpsiKategoriForm() {
    isiOpsiKategori($("transaksi-kategori"), KATEGORI[ambilJenis()], "-- Pilih kategori --", "");
}

function bukaDialogTransaksi() {
    const form = $("form-transaksi");
    form.reset();
    hapusError(form);
    gantiOpsiKategoriForm();
    $("transaksi-tanggal").value = tanggalHariIni();
    $("dialog-transaksi").showModal();
}

function validasiTransaksi() {
    const form = $("form-transaksi");
    hapusError(form);
    let valid = true;

    const tanggal = $("transaksi-tanggal");
    const kategori = $("transaksi-kategori");
    const nominal = $("transaksi-nominal");

    if (tanggal.value === "") {
        tampilkanError(tanggal, "Tanggal wajib diisi.");
        valid = false;
    }
    if (kategori.value === "") {
        tampilkanError(kategori, "Pilih kategori.");
        valid = false;
    }
    if (nominal.value === "" || Number(nominal.value) <= 0) {
        tampilkanError(nominal, "Nominal harus lebih dari 0.");
        valid = false;
    }
    return valid;
}

function simpanTransaksi(event) {
    event.preventDefault(); // cegah halaman reload saat form disubmit
    if (!validasiTransaksi()) return;

    const transaksiBaru = {
        id: Date.now(),
        tanggal: $("transaksi-tanggal").value,
        jenis: ambilJenis(),
        kategori: $("transaksi-kategori").value,
        nominal: Number($("transaksi-nominal").value), // disimpan sebagai angka
        catatan: $("transaksi-catatan").value.trim(),
    };

    daftarTransaksi.push(transaksiBaru);
    simpanData();
    $("dialog-transaksi").close();
    renderSemua();
    tampilkanToast("Transaksi tersimpan.");
}

function hapusTransaksi(id) {
    if (!confirm("Yakin ingin menghapus transaksi ini?")) return;

    daftarTransaksi = daftarTransaksi.filter((t) => t.id !== id);
    simpanData();
    renderSemua();
    tampilkanToast("Transaksi dihapus.");
}

// RENDER

// ----- Ringkasan (W5) -----
function hitungRingkasan() {
    const pemasukan = daftarTransaksi.filter((t) => t.jenis === "pemasukan");
    const pengeluaran = daftarTransaksi.filter((t) => t.jenis === "pengeluaran");

    const totalPemasukan = jumlahkan(pemasukan);
    const totalPengeluaran = jumlahkan(pengeluaran);
    const saldo = totalPemasukan - totalPengeluaran;

    $("total-pemasukan").textContent = formatRupiah(totalPemasukan);
    $("total-pengeluaran").textContent = formatRupiah(totalPengeluaran);
    $("saldo").textContent = formatRupiah(saldo);
    $("saldo").classList.toggle("negatif", saldo < 0);

    $("info-pemasukan").textContent = `${pemasukan.length} transaksi`;
    $("info-pengeluaran").textContent = `${pengeluaran.length} transaksi`;
}

// ----- Satu baris transaksi -----
function buatItemTransaksi(t, denganAksi) {
    const li = buatElemen("li", `item item-${t.jenis}`);

    const ikon = buatElemen("span", "item-ikon", t.jenis === "pemasukan" ? "+" : "−");

    const info = buatElemen("div", "item-info");
    const keterangan = `${t.kategori} · ${formatTanggal(t.tanggal)}`;
    info.append(buatElemen("strong", "", t.catatan || t.kategori), buatElemen("small", "", keterangan));

    const tanda = t.jenis === "pemasukan" ? "+" : "−";
    const nominal = buatElemen("span", `nominal nominal-${t.jenis}`, tanda + formatRupiah(t.nominal));

    li.append(ikon, info, nominal);

    if (denganAksi) {
        const aksi = buatElemen("div", "item-aksi");
        aksi.appendChild(buatTombol("btn-ikon btn-ikon-hapus", "Hapus", () => hapusTransaksi(t.id)));
        li.appendChild(aksi);
    }
    return li;
}

// ----- Daftar transaksi (W2) -----
function renderDaftar() {
    // [...] menyalin array supaya data asli tidak ikut terurut
    const hasil = [...daftarTransaksi].sort(urutkanTerbaru);
    const ul = $("daftar-transaksi");
    ul.innerHTML = "";

    if (hasil.length === 0) {
        ul.appendChild(buatElemen("li", "kosong", "Belum ada transaksi. Klik “+ Transaksi” untuk mulai mencatat."));
    }

    hasil.forEach((t) => ul.appendChild(buatItemTransaksi(t, true)));
}

// ----- Dashboard -----
function renderDashboard() {
    // 5 transaksi terbaru ([...] menyalin array supaya data asli tidak ikut terurut)
    const terbaru = [...daftarTransaksi].sort(urutkanTerbaru).slice(0, 5);

    const ulTransaksi = $("dashboard-transaksi");
    ulTransaksi.innerHTML = "";
    if (terbaru.length === 0) {
        ulTransaksi.appendChild(buatElemen("li", "kosong", "Belum ada transaksi."));
    }
    terbaru.forEach((t) => ulTransaksi.appendChild(buatItemTransaksi(t, false)));
}

// Dipanggil setiap kali data berubah
function renderSemua() {
    hitungRingkasan();
    renderDashboard();
    renderDaftar();
}

// EVENT LISTENER
document.querySelectorAll(".nav-item").forEach((tombol) => {
    tombol.addEventListener("click", () => tampilkanHalaman(tombol.dataset.halaman));
});

// Tombol "Lihat semua" di dashboard
document.querySelectorAll("[data-ke]").forEach((tombol) => {
    tombol.addEventListener("click", () => tampilkanHalaman(tombol.dataset.ke));
});

$("btn-tambah-transaksi").addEventListener("click", () => bukaDialogTransaksi());

// Tombol Batal / × menutup dialog tempat tombol itu berada
document.querySelectorAll("[data-tutup]").forEach((tombol) => {
    tombol.addEventListener("click", () => tombol.closest("dialog").close());
});

// Klik area gelap di luar form juga menutup dialog
document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
        if (event.target === dialog) dialog.close();
    });
});

document.querySelectorAll('input[name="jenis"]').forEach((radio) => {
    radio.addEventListener("change", gantiOpsiKategoriForm);
});

$("form-transaksi").addEventListener("submit", simpanTransaksi);
$("form-transaksi").addEventListener("input", hapusErrorSaatDiubah);

// SAAT HALAMAN DIBUKA
muatData();
$("tanggal-hari-ini").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});
tampilkanHalaman(location.hash.slice(1));
renderSemua();
