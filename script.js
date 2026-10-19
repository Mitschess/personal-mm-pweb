// =====================================================
// Kas Freelance — pencatat keuangan untuk pekerja lepas
// =====================================================

const JUDUL_HALAMAN = {
    dashboard: "Dashboard",
    transaksi: "Transaksi",
};

// Singkatan untuk document.getElementById
const $ = (id) => document.getElementById(id);

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
// EVENT LISTENER
// =====================================================
document.querySelectorAll(".nav-item").forEach((tombol) => {
    tombol.addEventListener("click", () => tampilkanHalaman(tombol.dataset.halaman));
});

// Sementara: tombol hanya membuka dialog form (penyimpanan menyusul)
$("btn-tambah-transaksi").addEventListener("click", () => $("dialog-transaksi").showModal());

// Tombol Batal / × menutup dialog tempat tombol itu berada
document.querySelectorAll("[data-tutup]").forEach((tombol) => {
    tombol.addEventListener("click", () => tombol.closest("dialog").close());
});

// =====================================================
// SAAT HALAMAN DIBUKA
// =====================================================
$("tanggal-hari-ini").textContent = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
});
tampilkanHalaman(location.hash.slice(1));
