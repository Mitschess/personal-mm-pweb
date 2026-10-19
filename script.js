// ===== Konstanta =====
// Kunci localStorage diberi awalan "fmm_" supaya tidak bentrok dengan aplikasi lain
const KUNCI = {
    transaksi: "fmm_transaksi",
    tagihan: "fmm_tagihan",
    budget: "fmm_budget",
};

// Kategori tetap untuk tiap jenis transaksi
const KATEGORI = {
    pemasukan: ["Proyek", "Retainer", "Bonus", "Lainnya"],
    pengeluaran: ["Software & Tools", "Internet & Listrik", "Peralatan", "Makan", "Transportasi", "Lainnya"],
};

const JUDUL_HALAMAN = {
    dashboard: "Dashboard",
    transaksi: "Transaksi",
    tagihan: "Tagihan Klien",
    pengaturan: "Pengaturan",
};

// ===== Data di memori =====
// transaksi: { id, tanggal, jenis, kategori, nominal, catatan, tagihanId? }
// tagihan:   { id, klien, proyek, nominal, tanggal, jatuhTempo, status, tanggalLunas }
// budget:    { "Makan": 600000, ... }  (batas pengeluaran per bulan)
let daftarTransaksi = [];
let daftarTagihan = [];
let budget = {};
let filterStatusTagihan = "semua";

// Singkatan untuk document.getElementById
const $ = (id) => document.getElementById(id);

// ===== Simpan & muat (W4) =====
function simpanData() {
    localStorage.setItem(KUNCI.transaksi, JSON.stringify(daftarTransaksi));
    localStorage.setItem(KUNCI.tagihan, JSON.stringify(daftarTagihan));
    localStorage.setItem(KUNCI.budget, JSON.stringify(budget));
}

function muatData() {
    try {
        // getItem mengembalikan null kalau belum ada data -> pakai nilai awal
        daftarTransaksi = JSON.parse(localStorage.getItem(KUNCI.transaksi)) || [];
        daftarTagihan = JSON.parse(localStorage.getItem(KUNCI.tagihan)) || [];
        budget = JSON.parse(localStorage.getItem(KUNCI.budget)) || {};
    } catch (err) {
        // Kalau isi localStorage rusak (bukan JSON), mulai dari kosong
        daftarTransaksi = [];
        daftarTagihan = [];
        budget = {};
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

// "YYYY-MM" bulan berjalan, dipakai untuk budget
function bulanIni() {
    return tanggalHariIni().slice(0, 7);
}

// Jumlah hari dari tanggal a ke tanggal b (bisa negatif)
function selisihHari(a, b) {
    const satuHari = 24 * 60 * 60 * 1000;
    return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / satuHari);
}

// Total nominal dari sebuah array transaksi/tagihan
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

// =====================================================
// TRANSAKSI (W1, W3, edit)
// =====================================================
function ambilJenis() {
    const terpilih = document.querySelector('input[name="jenis"]:checked');
    return terpilih ? terpilih.value : "";
}

// Opsi kategori di form mengikuti jenis yang dipilih
function gantiOpsiKategoriForm() {
    isiOpsiKategori($("transaksi-kategori"), KATEGORI[ambilJenis()], "-- Pilih kategori --", "");
}

// transaksi kosong = mode tambah, berisi objek = mode edit
function bukaDialogTransaksi(transaksi) {
    const form = $("form-transaksi");
    form.reset();
    hapusError(form);

    if (transaksi) {
        $("judul-dialog-transaksi").textContent = "Edit Transaksi";
        $("transaksi-id").value = transaksi.id;
        $(`jenis-${transaksi.jenis}`).checked = true;
        gantiOpsiKategoriForm();
        $("transaksi-tanggal").value = transaksi.tanggal;
        $("transaksi-kategori").value = transaksi.kategori;
        $("transaksi-nominal").value = transaksi.nominal;
        $("transaksi-catatan").value = transaksi.catatan;
    } else {
        $("judul-dialog-transaksi").textContent = "Tambah Transaksi";
        $("transaksi-id").value = "";
        gantiOpsiKategoriForm();
        $("transaksi-tanggal").value = tanggalHariIni();
    }

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

    const id = $("transaksi-id").value;
    const data = {
        tanggal: $("transaksi-tanggal").value,
        jenis: ambilJenis(),
        kategori: $("transaksi-kategori").value,
        nominal: Number($("transaksi-nominal").value), // disimpan sebagai angka
        catatan: $("transaksi-catatan").value.trim(),
    };

    let pesan;
    if (id) {
        // Mode edit: timpa isi transaksi lama, id tetap sama
        const index = daftarTransaksi.findIndex((t) => t.id === Number(id));
        daftarTransaksi[index] = { ...daftarTransaksi[index], ...data };
        pesan = "Transaksi diperbarui.";
    } else {
        daftarTransaksi.push({ id: Date.now(), ...data });
        pesan = "Transaksi tersimpan.";
    }

    simpanData();
    $("dialog-transaksi").close();
    renderSemua();

    // Bonus: peringatan budget kalau pengeluaran ini membuat budget hampir habis/terlewati
    const peringatan = data.jenis === "pengeluaran" ? cekBudget(data.kategori, data.tanggal) : null;
    if (peringatan) {
        tampilkanToast(peringatan, "peringatan");
    } else {
        tampilkanToast(pesan);
    }
}

function hapusTransaksi(id) {
    const transaksi = daftarTransaksi.find((t) => t.id === id);
    if (!transaksi) return;

    let pesan = "Yakin ingin menghapus transaksi ini?";
    if (transaksi.tagihanId) {
        pesan += "\nTagihan asalnya akan kembali berstatus \"belum dibayar\".";
    }
    if (!confirm(pesan)) return;

    // Transaksi dari tagihan lunas dihapus -> tagihan kembali menjadi piutang
    if (transaksi.tagihanId) {
        const tagihan = daftarTagihan.find((t) => t.id === transaksi.tagihanId);
        if (tagihan) {
            tagihan.status = "belum dibayar";
            tagihan.tanggalLunas = null;
        }
    }

    daftarTransaksi = daftarTransaksi.filter((t) => t.id !== id);
    simpanData();
    renderSemua();
    tampilkanToast("Transaksi dihapus.");
}

// =====================================================
// TAGIHAN KLIEN (fitur khas)
// =====================================================
function bukaDialogTagihan() {
    const form = $("form-tagihan");
    form.reset();
    hapusError(form);
    $("tagihan-tanggal").value = tanggalHariIni();
    $("dialog-tagihan").showModal();
}

function validasiTagihan() {
    const form = $("form-tagihan");
    hapusError(form);
    let valid = true;

    const klien = $("tagihan-klien");
    const proyek = $("tagihan-proyek");
    const nominal = $("tagihan-nominal");
    const tanggal = $("tagihan-tanggal");
    const jatuhTempo = $("tagihan-jatuh-tempo");

    if (klien.value.trim() === "") {
        tampilkanError(klien, "Nama klien wajib diisi.");
        valid = false;
    }
    if (proyek.value.trim() === "") {
        tampilkanError(proyek, "Nama proyek wajib diisi.");
        valid = false;
    }
    if (nominal.value === "" || Number(nominal.value) <= 0) {
        tampilkanError(nominal, "Nominal harus lebih dari 0.");
        valid = false;
    }
    if (tanggal.value === "") {
        tampilkanError(tanggal, "Tanggal wajib diisi.");
        valid = false;
    }
    if (jatuhTempo.value === "") {
        tampilkanError(jatuhTempo, "Jatuh tempo wajib diisi.");
        valid = false;
    } else if (tanggal.value !== "" && jatuhTempo.value < tanggal.value) {
        tampilkanError(jatuhTempo, "Jatuh tempo tidak boleh sebelum tanggal tagihan.");
        valid = false;
    }
    return valid;
}

function simpanTagihan(event) {
    event.preventDefault();
    if (!validasiTagihan()) return;

    daftarTagihan.push({
        id: Date.now(),
        klien: $("tagihan-klien").value.trim(),
        proyek: $("tagihan-proyek").value.trim(),
        nominal: Number($("tagihan-nominal").value),
        tanggal: $("tagihan-tanggal").value,
        jatuhTempo: $("tagihan-jatuh-tempo").value,
        status: "belum dibayar",
        tanggalLunas: null,
    });

    simpanData();
    $("dialog-tagihan").close();
    renderSemua();
    tampilkanToast("Tagihan tersimpan sebagai piutang.");
}

// Tagihan lunas -> otomatis dicatat sebagai transaksi pemasukan
function tandaiLunas(id) {
    const tagihan = daftarTagihan.find((t) => t.id === id);
    if (!tagihan || tagihan.status === "lunas") return;

    tagihan.status = "lunas";
    tagihan.tanggalLunas = tanggalHariIni();

    daftarTransaksi.push({
        id: Date.now(),
        tanggal: tagihan.tanggalLunas, // tanggal uang diterima
        jenis: "pemasukan",
        kategori: "Proyek",
        nominal: tagihan.nominal,
        catatan: `${tagihan.proyek} — ${tagihan.klien}`,
        tagihanId: tagihan.id, // penghubung ke tagihan asal
    });

    simpanData();
    renderSemua();
    tampilkanToast(`Lunas! ${formatRupiah(tagihan.nominal)} masuk ke pemasukan.`);
}

function hapusTagihan(id) {
    const tagihan = daftarTagihan.find((t) => t.id === id);
    if (!tagihan) return;

    let pesan = `Hapus tagihan "${tagihan.proyek}"?`;
    if (tagihan.status === "lunas") {
        pesan += "\nTransaksi pemasukan dari tagihan ini juga akan dihapus.";
    }
    if (!confirm(pesan)) return;

    daftarTagihan = daftarTagihan.filter((t) => t.id !== id);
    daftarTransaksi = daftarTransaksi.filter((t) => t.tagihanId !== id);
    simpanData();
    renderSemua();
    tampilkanToast("Tagihan dihapus.");
}

// "lunas", "terlambat" (lewat jatuh tempo), atau "belum"
function statusTagihan(tagihan) {
    if (tagihan.status === "lunas") return "lunas";
    return tagihan.jatuhTempo < tanggalHariIni() ? "terlambat" : "belum";
}

function teksStatus(tagihan) {
    const status = statusTagihan(tagihan);
    if (status === "lunas") {
        return tagihan.tanggalLunas ? `Lunas ${formatTanggal(tagihan.tanggalLunas)}` : "Lunas";
    }

    const sisaHari = selisihHari(tanggalHariIni(), tagihan.jatuhTempo);
    if (status === "terlambat") return `Terlambat ${-sisaHari} hari`;
    if (sisaHari === 0) return "Jatuh tempo hari ini";
    return `${sisaHari} hari lagi`;
}

// Belum lunas di atas (jatuh tempo terdekat dulu), lunas di bawah (terbaru dulu)
function urutkanTagihan(a, b) {
    const lunasA = a.status === "lunas";
    const lunasB = b.status === "lunas";
    if (lunasA !== lunasB) return lunasA ? 1 : -1;
    if (!lunasA) return a.jatuhTempo.localeCompare(b.jatuhTempo);
    return (b.tanggalLunas || "").localeCompare(a.tanggalLunas || "");
}

function cocokFilterStatus(tagihan) {
    if (filterStatusTagihan === "semua") return true;
    if (filterStatusTagihan === "belum") return tagihan.status === "belum dibayar";
    return statusTagihan(tagihan) === filterStatusTagihan; // "terlambat" atau "lunas"
}

// =====================================================
// BUDGET (bonus)
// =====================================================
function hitungPemakaianBudget(kategori, bulan) {
    const terpakai = daftarTransaksi.filter(
        (t) => t.jenis === "pengeluaran" && t.kategori === kategori && t.tanggal.startsWith(bulan)
    );
    return jumlahkan(terpakai);
}

// Dibandingkan langsung dengan nominal (bukan persen yang sudah dibulatkan)
// supaya terpakai tepat = batas dianggap habis, bukan "hampir habis"
function statusBudget(terpakai, batas) {
    if (terpakai >= batas) return "lewat"; // habis atau terlewati
    if (terpakai >= batas * 0.8) return "mendekati";
    return "aman";
}

// Mengembalikan teks peringatan, atau null kalau masih aman
function cekBudget(kategori, tanggal) {
    const batas = budget[kategori];
    if (!batas) return null;

    const terpakai = hitungPemakaianBudget(kategori, tanggal.slice(0, 7));
    const status = statusBudget(terpakai, batas);

    if (status === "lewat" && terpakai === batas) {
        return `Budget ${kategori} bulan ini sudah habis.`;
    }
    if (status === "lewat") {
        return `Budget ${kategori} terlewati: ${formatRupiah(terpakai)} dari ${formatRupiah(batas)}.`;
    }
    if (status === "mendekati") {
        const persen = Math.round((terpakai / batas) * 100);
        return `Budget ${kategori} hampir habis (${persen}% terpakai).`;
    }
    return null;
}

function renderIsianBudget() {
    const wadah = $("isian-budget");
    wadah.innerHTML = "";

    KATEGORI.pengeluaran.forEach((kategori, i) => {
        const field = buatElemen("div", "field-budget");

        const label = buatElemen("label", "", kategori);
        label.htmlFor = `budget-${i}`;

        const input = document.createElement("input");
        input.type = "number";
        input.min = "0";
        input.id = `budget-${i}`;
        input.placeholder = "Tanpa batas";
        input.dataset.kategori = kategori;
        input.value = budget[kategori] || "";

        field.append(label, input);
        wadah.appendChild(field);
    });
}

function simpanBudget(event) {
    event.preventDefault();

    const budgetBaru = {};
    let valid = true;

    document.querySelectorAll("#isian-budget input").forEach((input) => {
        input.classList.remove("tidak-valid");
        if (input.value === "") return; // kosong = tanpa batas

        const nilai = Number(input.value);
        if (nilai < 0) {
            input.classList.add("tidak-valid");
            valid = false;
        } else if (nilai > 0) {
            budgetBaru[input.dataset.kategori] = nilai;
        }
    });

    if (!valid) {
        $("error-budget").textContent = "Budget tidak boleh negatif.";
        return;
    }

    $("error-budget").textContent = "";
    budget = budgetBaru;
    simpanData();
    renderSemua();
    tampilkanToast("Budget disimpan.");
}

// =====================================================
// EKSPOR / IMPOR JSON (bonus)
// =====================================================
function eksporData() {
    const isi = {
        aplikasi: "Kas Freelance",
        diekspor: new Date().toISOString(),
        transaksi: daftarTransaksi,
        tagihan: daftarTagihan,
        budget: budget,
    };

    // Buat file sementara dari teks JSON, lalu klik link download-nya
    const blob = new Blob([JSON.stringify(isi, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `kas-freelance-${tanggalHariIni()}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    tampilkanToast("Data diekspor ke file JSON.");
}

function imporData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
        try {
            const isi = JSON.parse(reader.result);
            const formatBenar =
                Array.isArray(isi.transaksi) &&
                Array.isArray(isi.tagihan) &&
                isi.transaksi.every((t) => typeof t.nominal === "number");
            if (!formatBenar) throw new Error("Format file tidak sesuai");

            const pesan = `Impor ${isi.transaksi.length} transaksi dan ${isi.tagihan.length} tagihan?\nData yang ada sekarang akan diganti.`;
            if (!confirm(pesan)) return;

            daftarTransaksi = isi.transaksi;
            daftarTagihan = isi.tagihan;
            budget = isi.budget || {};
            simpanData();
            renderIsianBudget();
            renderSemua();
            tampilkanToast("Data berhasil diimpor.");
        } catch (err) {
            tampilkanToast("File tidak valid. Pilih file hasil ekspor aplikasi ini.", "error");
        }
    };
    reader.readAsText(file);

    // Kosongkan input supaya file yang sama bisa dipilih lagi
    event.target.value = "";
}

// =====================================================
// RENDER
// =====================================================

// ----- Ringkasan (W5 + total piutang) -----
function hitungRingkasan() {
    const pemasukan = daftarTransaksi.filter((t) => t.jenis === "pemasukan");
    const pengeluaran = daftarTransaksi.filter((t) => t.jenis === "pengeluaran");
    const belumLunas = daftarTagihan.filter((t) => t.status === "belum dibayar");
    const terlambat = belumLunas.filter((t) => statusTagihan(t) === "terlambat");

    const totalPemasukan = jumlahkan(pemasukan);
    const totalPengeluaran = jumlahkan(pengeluaran);
    const saldo = totalPemasukan - totalPengeluaran;

    $("total-pemasukan").textContent = formatRupiah(totalPemasukan);
    $("total-pengeluaran").textContent = formatRupiah(totalPengeluaran);
    $("saldo").textContent = formatRupiah(saldo);
    $("saldo").classList.toggle("negatif", saldo < 0);
    $("total-piutang").textContent = formatRupiah(jumlahkan(belumLunas));

    $("info-pemasukan").textContent = `${pemasukan.length} transaksi`;
    $("info-pengeluaran").textContent = `${pengeluaran.length} transaksi`;

    if (daftarTagihan.length === 0) {
        $("info-piutang").textContent = "Belum ada tagihan";
    } else if (belumLunas.length === 0) {
        $("info-piutang").textContent = "Semua tagihan lunas";
    } else {
        $("info-piutang").textContent = `${belumLunas.length} tagihan · ${terlambat.length} terlambat`;
    }

    // Angka di menu Tagihan (kosong = badge disembunyikan lewat CSS)
    $("badge-tagihan").textContent = belumLunas.length || "";
}

// ----- Satu baris transaksi -----
function buatItemTransaksi(t, denganAksi) {
    const li = buatElemen("li", `item item-${t.jenis}`);

    const ikon = buatElemen("span", "item-ikon", t.jenis === "pemasukan" ? "+" : "−");

    const info = buatElemen("div", "item-info");
    let keterangan = `${t.kategori} · ${formatTanggal(t.tanggal)}`;
    if (t.tagihanId) keterangan += " · dari tagihan";
    info.append(buatElemen("strong", "", t.catatan || t.kategori), buatElemen("small", "", keterangan));

    const tanda = t.jenis === "pemasukan" ? "+" : "−";
    const nominal = buatElemen("span", `nominal nominal-${t.jenis}`, tanda + formatRupiah(t.nominal));

    li.append(ikon, info, nominal);

    if (denganAksi) {
        const aksi = buatElemen("div", "item-aksi");
        // Transaksi dari tagihan tidak bisa diedit supaya nominalnya tetap sama dengan tagihan
        if (!t.tagihanId) {
            aksi.appendChild(buatTombol("btn-ikon", "Edit", () => bukaDialogTransaksi(t)));
        }
        aksi.appendChild(buatTombol("btn-ikon btn-ikon-hapus", "Hapus", () => hapusTransaksi(t.id)));
        li.appendChild(aksi);
    }
    return li;
}

// ----- Satu baris tagihan -----
function buatItemTagihan(t, denganHapus) {
    const status = statusTagihan(t);
    const li = buatElemen("li", `item item-tagihan status-${status}`);

    const ikon = buatElemen("span", "item-ikon", t.klien.charAt(0).toUpperCase());

    const info = buatElemen("div", "item-info");
    info.append(
        buatElemen("strong", "", t.proyek),
        buatElemen("small", "", `${t.klien} · jatuh tempo ${formatTanggal(t.jatuhTempo)}`)
    );

    const kanan = buatElemen("div", "item-kanan");
    kanan.append(
        buatElemen("span", "nominal", formatRupiah(t.nominal)),
        buatElemen("span", `label-status ${status}`, teksStatus(t))
    );

    li.append(ikon, info, kanan);

    const aksi = buatElemen("div", "item-aksi");
    if (status !== "lunas") {
        aksi.appendChild(buatTombol("btn-ikon btn-ikon-lunas", "Tandai lunas", () => tandaiLunas(t.id)));
    }
    if (denganHapus) {
        aksi.appendChild(buatTombol("btn-ikon btn-ikon-hapus", "Hapus", () => hapusTagihan(t.id)));
    }
    if (aksi.children.length > 0) li.appendChild(aksi);

    return li;
}

// ----- Daftar transaksi + filter (W2) -----
function ambilTransaksiTerfilter() {
    const cari = $("filter-cari").value.trim().toLowerCase();
    const jenis = $("filter-jenis").value;
    const kategori = $("filter-kategori").value;
    const dari = $("filter-dari").value;
    const sampai = $("filter-sampai").value;

    return daftarTransaksi.filter((t) => {
        if (jenis !== "semua" && t.jenis !== jenis) return false;
        if (kategori !== "semua" && t.kategori !== kategori) return false;
        if (dari && t.tanggal < dari) return false;
        if (sampai && t.tanggal > sampai) return false;
        if (cari && !t.catatan.toLowerCase().includes(cari)) return false;
        return true;
    });
}

function renderDaftar() {
    const hasil = ambilTransaksiTerfilter().sort(urutkanTerbaru);
    const ul = $("daftar-transaksi");
    ul.innerHTML = "";

    if (hasil.length === 0) {
        const teks = daftarTransaksi.length === 0
            ? "Belum ada transaksi. Klik “+ Transaksi” untuk mulai mencatat."
            : "Tidak ada transaksi yang cocok dengan filter.";
        ul.appendChild(buatElemen("li", "kosong", teks));
    }

    hasil.forEach((t) => ul.appendChild(buatItemTransaksi(t, true)));

    const masuk = jumlahkan(hasil.filter((t) => t.jenis === "pemasukan"));
    const keluar = jumlahkan(hasil.filter((t) => t.jenis === "pengeluaran"));
    $("info-filter").textContent =
        `${hasil.length} transaksi · masuk ${formatRupiah(masuk)} · keluar ${formatRupiah(keluar)}`;
}

// Opsi filter kategori mengikuti filter jenis
function isiFilterKategori() {
    const select = $("filter-kategori");
    const pilihanLama = select.value;
    const jenis = $("filter-jenis").value;

    let daftar;
    if (jenis === "semua") {
        // Gabungan kedua jenis tanpa duplikat ("Lainnya" ada di keduanya)
        daftar = [...new Set([...KATEGORI.pemasukan, ...KATEGORI.pengeluaran])];
    } else {
        daftar = KATEGORI[jenis];
    }

    isiOpsiKategori(select, daftar, "Semua kategori", "semua");
    select.value = daftar.includes(pilihanLama) ? pilihanLama : "semua";
}

function resetFilter() {
    $("filter-cari").value = "";
    $("filter-jenis").value = "semua";
    $("filter-dari").value = "";
    $("filter-sampai").value = "";
    isiFilterKategori();
    $("filter-kategori").value = "semua";
    renderDaftar();
}

// ----- Daftar tagihan -----
function renderTagihan() {
    const hasil = daftarTagihan.filter(cocokFilterStatus).sort(urutkanTagihan);
    const ul = $("daftar-tagihan");
    ul.innerHTML = "";

    if (hasil.length === 0) {
        const teks = daftarTagihan.length === 0
            ? "Belum ada tagihan. Klik “+ Tagihan” untuk mencatat tagihan ke klien."
            : "Tidak ada tagihan dengan status ini.";
        ul.appendChild(buatElemen("li", "kosong", teks));
    }

    hasil.forEach((t) => ul.appendChild(buatItemTagihan(t, true)));
}

// ----- Dashboard -----
function renderDashboard() {
    // 5 tagihan belum lunas dengan jatuh tempo terdekat
    const perluDitagih = daftarTagihan
        .filter((t) => t.status === "belum dibayar")
        .sort(urutkanTagihan)
        .slice(0, 5);

    const ulTagihan = $("dashboard-tagihan");
    ulTagihan.innerHTML = "";
    if (perluDitagih.length === 0) {
        ulTagihan.appendChild(buatElemen("li", "kosong", "Tidak ada tagihan yang menunggu pembayaran."));
    }
    perluDitagih.forEach((t) => ulTagihan.appendChild(buatItemTagihan(t, false)));

    // 5 transaksi terbaru ([...] menyalin array supaya data asli tidak ikut terurut)
    const terbaru = [...daftarTransaksi].sort(urutkanTerbaru).slice(0, 5);

    const ulTransaksi = $("dashboard-transaksi");
    ulTransaksi.innerHTML = "";
    if (terbaru.length === 0) {
        ulTransaksi.appendChild(buatElemen("li", "kosong", "Belum ada transaksi."));
    }
    terbaru.forEach((t) => ulTransaksi.appendChild(buatItemTransaksi(t, false)));

    renderBudget();
}

function renderBudget() {
    const wadah = $("dashboard-budget");
    wadah.innerHTML = "";

    const bulan = bulanIni();
    const kategoriBerbudget = KATEGORI.pengeluaran.filter((k) => budget[k] > 0);

    if (kategoriBerbudget.length === 0) {
        wadah.appendChild(buatElemen("p", "kosong", "Belum ada budget. Atur di halaman Pengaturan."));
        return;
    }

    kategoriBerbudget.forEach((kategori) => {
        const batas = budget[kategori];
        const terpakai = hitungPemakaianBudget(kategori, bulan);
        const persen = Math.round((terpakai / batas) * 100);
        const status = statusBudget(terpakai, batas);
        const sisa = batas - terpakai;

        const baris = buatElemen("div", `budget budget-${status}`);

        const kepala = buatElemen("div", "budget-kepala");
        kepala.append(
            buatElemen("span", "", kategori),
            buatElemen("span", "", `${formatRupiah(terpakai)} / ${formatRupiah(batas)}`)
        );

        const bar = buatElemen("div", "budget-bar");
        const isi = buatElemen("div", "budget-isi");
        isi.style.width = Math.min(persen, 100) + "%";
        bar.appendChild(isi);

        let keterangan = `Sisa ${formatRupiah(sisa)}`;
        if (status === "mendekati") keterangan = `${persen}% terpakai — hampir habis`;
        if (status === "lewat") {
            keterangan = sisa === 0 ? "Budget habis" : `Melewati batas ${formatRupiah(-sisa)}`;
        }

        baris.append(kepala, bar, buatElemen("small", "budget-ket", keterangan));
        wadah.appendChild(baris);
    });
}

// Dipanggil setiap kali data berubah
function renderSemua() {
    hitungRingkasan();
    renderDashboard();
    renderDaftar();
    renderTagihan();
}

// =====================================================
// EVENT LISTENER
// =====================================================
document.querySelectorAll(".nav-item").forEach((tombol) => {
    tombol.addEventListener("click", () => tampilkanHalaman(tombol.dataset.halaman));
});

// Tombol "Lihat semua" / "Atur budget" di dashboard
document.querySelectorAll("[data-ke]").forEach((tombol) => {
    tombol.addEventListener("click", () => tampilkanHalaman(tombol.dataset.ke));
});

$("btn-tambah-transaksi").addEventListener("click", () => bukaDialogTransaksi());
$("btn-tambah-tagihan").addEventListener("click", () => bukaDialogTagihan());

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
$("form-tagihan").addEventListener("submit", simpanTagihan);
$("form-tagihan").addEventListener("input", hapusErrorSaatDiubah);
$("form-budget").addEventListener("submit", simpanBudget);

// Filter transaksi
$("filter-cari").addEventListener("input", renderDaftar);
$("filter-jenis").addEventListener("change", () => {
    isiFilterKategori();
    renderDaftar();
});
$("filter-kategori").addEventListener("change", renderDaftar);
$("filter-dari").addEventListener("change", renderDaftar);
$("filter-sampai").addEventListener("change", renderDaftar);
$("filter-reset").addEventListener("click", resetFilter);

// Filter status tagihan
document.querySelectorAll("#filter-status button").forEach((tombol) => {
    tombol.addEventListener("click", () => {
        filterStatusTagihan = tombol.dataset.status;
        document.querySelectorAll("#filter-status button").forEach((b) => {
            b.classList.toggle("aktif", b === tombol);
        });
        renderTagihan();
    });
});

$("btn-ekspor").addEventListener("click", eksporData);
$("input-impor").addEventListener("change", imporData);

// =====================================================
// SAAT HALAMAN DIBUKA
// =====================================================
muatData();
isiFilterKategori();
renderIsianBudget();
$("tanggal-hari-ini").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});
tampilkanHalaman(location.hash.slice(1));
renderSemua();
