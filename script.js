// HAPUS pembungkus DOMContentLoaded agar tereksekusi langsung dan tidak di-block oleh browser previewer
let diaryData = [];
let editId = null;
let base64ImageStr = "";

const html = document.documentElement;
const themeToggle = document.getElementById('themeToggle');
const searchBtn = document.getElementById('searchBtn');
const closeSearchBtn = document.getElementById('closeSearchBtn');
const searchOverlay = document.getElementById('searchOverlay');
const searchInput = document.getElementById('searchInput');
const filterBulanTahun = document.getElementById('filterBulanTahun');
const entriesContainer = document.getElementById('diaryEntriesContainer');

const navBtns = document.querySelectorAll('.nav-btn');
const tabPanes = document.querySelectorAll('.tab-pane');

const imageModal = document.getElementById('diaryImageModal');
const modalImg = document.getElementById('fullScreenImg');
const closeLightboxBtn = document.getElementById('closeLightboxBtn');

const customAlert = document.getElementById('customAlert');
const customConfirm = document.getElementById('customConfirm');

// --- TEMA LIGHT/DARK ---
let savedTheme = 'light';
try { savedTheme = localStorage.getItem('ruangcerita_theme') || 'light'; } catch(e) {}
html.setAttribute('data-theme', savedTheme);
themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

themeToggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    html.setAttribute('data-theme', newTheme);
    themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
    try { localStorage.setItem('ruangcerita_theme', newTheme); } catch(e) {}
});

// --- NAVIGASI TABS ---
navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        navBtns.forEach(b => b.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.getAttribute('data-target')).classList.add('active');
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
});

searchBtn.addEventListener('click', () => searchOverlay.classList.add('active'));
closeSearchBtn.addEventListener('click', () => {
    searchOverlay.classList.remove('active');
    searchInput.value = '';
    renderDiary();
});
searchInput.addEventListener('input', renderDiary);
filterBulanTahun.addEventListener('change', renderDiary);

// --- PERBAIKAN TOTAL DROPDOWN TANGGAL ---
const initDateDropdowns = () => {
    const dHari = document.getElementById('tgl_hari');
    const dBulan = document.getElementById('tgl_bulan');
    const dTahun = document.getElementById('tgl_tahun');
    const dJam = document.getElementById('tgl_jam');
    const dMenit = document.getElementById('tgl_menit');
    
    // Kosongkan dulu
    dHari.length = 0; dBulan.length = 0; dTahun.length = 0; dJam.length = 0; dMenit.length = 0;

    // Cara yang lebih aman dan dijamin muncul di semua browser: new Option()
    for(let i=1; i<=31; i++) dHari.add(new Option(i, String(i).padStart(2, '0')));
    
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    namaBulan.forEach((bln, idx) => dBulan.add(new Option(bln, String(idx + 1).padStart(2, '0'))));
    
    const currentYear = new Date().getFullYear();
    for(let i=currentYear; i>=currentYear-10; i--) dTahun.add(new Option(i, i));
    
    for(let i=0; i<24; i++) dJam.add(new Option(String(i).padStart(2, '0'), String(i).padStart(2, '0')));
    for(let i=0; i<60; i++) dMenit.add(new Option(String(i).padStart(2, '0'), String(i).padStart(2, '0')));
};

const setDropdownToNow = () => {
    const now = new Date();
    document.getElementById('tgl_hari').value = String(now.getDate()).padStart(2, '0');
    document.getElementById('tgl_bulan').value = String(now.getMonth() + 1).padStart(2, '0');
    document.getElementById('tgl_tahun').value = now.getFullYear();
    document.getElementById('tgl_jam').value = String(now.getHours()).padStart(2, '0');
    document.getElementById('tgl_menit').value = String(now.getMinutes()).padStart(2, '0');
};

const getSelectedDateTime = () => {
    return `${document.getElementById('tgl_tahun').value}-${document.getElementById('tgl_bulan').value}-${document.getElementById('tgl_hari').value}T${document.getElementById('tgl_jam').value}:${document.getElementById('tgl_menit').value}`;
};

const setDropdownFromISO = (isoString) => {
    try {
        const date = new Date(isoString);
        if (isNaN(date)) throw "Invalid Date";
        document.getElementById('tgl_hari').value = String(date.getDate()).padStart(2, '0');
        document.getElementById('tgl_bulan').value = String(date.getMonth() + 1).padStart(2, '0');
        document.getElementById('tgl_tahun').value = date.getFullYear();
        document.getElementById('tgl_jam').value = String(date.getHours()).padStart(2, '0');
        document.getElementById('tgl_menit').value = String(date.getMinutes()).padStart(2, '0');
    } catch(e) { setDropdownToNow(); }
};

// Jalankan pembentukan Dropdown
initDateDropdowns();
setDropdownToNow();

// --- MODAL ALERT & CONFIRM ---
window.showAlert = (title, message) => {
    document.getElementById('alertTitle').textContent = title;
    document.getElementById('alertMessage').textContent = message;
    customAlert.classList.add('show');
};
document.getElementById('alertOkBtn').addEventListener('click', () => customAlert.classList.remove('show'));

window.showConfirm = (title, message, onConfirm) => {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    customConfirm.classList.add('show');
    
    const okBtn = document.getElementById('confirmOkBtn');
    const cancelBtn = document.getElementById('confirmCancelBtn');
    
    const newOkBtn = okBtn.cloneNode(true);
    const newCancelBtn = cancelBtn.cloneNode(true);
    okBtn.parentNode.replaceChild(newOkBtn, okBtn);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newOkBtn.addEventListener('click', () => { customConfirm.classList.remove('show'); if (onConfirm) onConfirm(); });
    newCancelBtn.addEventListener('click', () => customConfirm.classList.remove('show'));
};

// --- DATABASE & SCRIPT PENYELAMAT DATA LAMA ---
const dbName = "RuangCeritaDB";
const storeName = "ceritaStore";
let db;

const initDB = () => {
    const request = indexedDB.open(dbName, 1);
    
    request.onupgradeneeded = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains(storeName)) {
            db.createObjectStore(storeName, { keyPath: "id" });
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        migrateOldData(); // PANGGIL FUNGSI PENYELAMAT DATA DI SINI
    };

    request.onerror = (e) => {
        console.error("IndexedDB error:", e);
        showAlert("Error", "Gagal mengakses penyimpanan.");
    };
};

const migrateOldData = () => {
    try {
        // Ambil data lama yang tertinggal di LocalStorage
        const oldData = localStorage.getItem('diary_entries');
        if (oldData) {
            const parsed = JSON.parse(oldData);
            const transaction = db.transaction([storeName], "readwrite");
            const store = transaction.objectStore(storeName);
            
            parsed.forEach(item => store.put(item)); // Masukkan ke IndexedDB
            
            transaction.oncomplete = () => {
                localStorage.removeItem('diary_entries'); // Hapus dari sistem lama agar bersih
                loadDataFromDB();
                showAlert("Pembaruan Sistem", "Data lama kamu berhasil dikembalikan dan dioptimasi ke sistem penyimpanan baru!");
            };
        } else {
            loadDataFromDB(); // Jika tidak ada data lama, lanjut biasa
        }
    } catch(e) {
        loadDataFromDB();
    }
};

const loadDataFromDB = () => {
    if (!db) return;
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.getAll();

    request.onsuccess = () => {
        diaryData = request.result.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
        updateFilterOptions();
        renderDiary();
    };
};

const saveDataToDB = (data, isUpdate = false) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.put(data);

    transaction.oncomplete = () => {
        showAlert("Berhasil", isUpdate ? "Ceritamu berhasil diperbarui!" : "Momen barumu telah disimpan!");
        loadDataFromDB();
    };
};

const deleteDataFromDB = (id) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    store.delete(id);

    transaction.oncomplete = () => {
        showAlert("Terhapus", "Kenangan berhasil dihapus.");
        loadDataFromDB();
        if (editId === id) resetFormState();
    };
};

initDB();

// --- PERBAIKAN UPLOAD FOTO (Mencegah Gagal Render / Gambar Blank) ---
const fotoInput = document.getElementById('foto');
const imgPreview = document.getElementById('imgPreview');
const uploadPlaceholder = document.getElementById('uploadPlaceholder');

fotoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Menggunakan FileReader murni, hapus manipulasi Canvas yang memicu bug ukuran
    const reader = new FileReader();
    reader.onload = function(event) {
        base64ImageStr = event.target.result;
        imgPreview.src = base64ImageStr;
        imgPreview.style.display = 'block';
        uploadPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);
});

window.openLightbox = (src) => {
    modalImg.src = src;
    imageModal.classList.add('show');
};
closeLightboxBtn.addEventListener('click', () => imageModal.classList.remove('show'));
imageModal.addEventListener('click', (e) => { if(e.target === imageModal) imageModal.classList.remove('show'); });

// --- RENDER DATA ---
const updateFilterOptions = () => {
    const uniqueMonths = [...new Set(diaryData.map(item => item.waktu ? item.waktu.substring(0, 7) : ""))].filter(Boolean);
    const currentVal = filterBulanTahun.value;
    
    filterBulanTahun.innerHTML = '<option value="">Tampilkan Semua Waktu</option>';
    uniqueMonths.forEach(ym => {
        const [y, m] = ym.split('-');
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
        const lbl = `${namaBulan[parseInt(m)-1]} ${y}`;
        filterBulanTahun.add(new Option(lbl, ym));
    });
    
    if (uniqueMonths.includes(currentVal)) filterBulanTahun.value = currentVal;
};

const renderDiary = () => {
    entriesContainer.innerHTML = '';
    const searchQuery = searchInput.value.toLowerCase();
    const filterWaktu = filterBulanTahun.value; 

    // Filter yang lebih kebal terhadap data cacat
    const filteredData = diaryData.filter(item => {
        if(!item.waktu) return false;
        const note = item.catatan ? item.catatan.toLowerCase() : "";
        const loc = item.lokasi ? item.lokasi.toLowerCase() : "";
        const cat = item.kategori ? item.kategori.toLowerCase() : "";
        
        const matchSearch = note.includes(searchQuery) || loc.includes(searchQuery) || cat.includes(searchQuery);
        const matchMonth = filterWaktu === "" || item.waktu.startsWith(filterWaktu);
        return matchSearch && matchMonth;
    });

    if (filteredData.length === 0) {
        entriesContainer.innerHTML = `
            <div class="card glowing-card" style="text-align:center; grid-column: 1 / -1; padding: 30px;">
                <i class="fas fa-folder-open" style="font-size:2.5rem; color:var(--text-muted); margin-bottom:10px;"></i>
                <p>Belum ada cerita ditemukan.</p>
            </div>`;
        return;
    }

    filteredData.forEach(item => {
        let tanggalCantik = item.waktu;
        try {
            const opsiWaktu = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            tanggalCantik = new Date(item.waktu).toLocaleDateString('id-ID', opsiWaktu);
        } catch(e){}

        const div = document.createElement('div');
        div.className = 'entry-card';
        div.innerHTML = `
            <div class="entry-header">
                <span class="entry-meta"><i class="far fa-calendar-alt"></i> ${tanggalCantik}</span>
                <span class="badge">${item.kategori || ''}</span>
            </div>
            ${item.foto ? `<img src="${item.foto}" class="entry-image" alt="Momen" onclick="openLightbox('${item.foto}')">` : ''}
            <div class="entry-text">${item.catatan || ''}</div>
            ${item.lokasi ? `<div class="entry-location"><i class="fas fa-map-marker-alt"></i> ${item.lokasi}</div>` : ''}
            <div class="entry-actions">
                <button class="btn-sm" onclick="editEntry(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                <button class="btn-sm delete" onclick="confirmDelete(${item.id})"><i class="fas fa-trash"></i> Hapus</button>
            </div>
        `;
        entriesContainer.appendChild(div);
    });
};

document.getElementById('diaryForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const dataMomen = {
        id: editId ? editId : Date.now(),
        waktu: getSelectedDateTime(),
        kategori: document.getElementById('kategori').value,
        lokasi: document.getElementById('lokasi').value,
        catatan: document.getElementById('catatan').value,
        foto: base64ImageStr
    };
    saveDataToDB(dataMomen, !!editId);
    resetFormState();
    document.querySelector('[data-target="tab-beranda"]').click();
});

window.editEntry = (id) => {
    const item = diaryData.find(d => d.id === id);
    if (!item) return;

    setDropdownFromISO(item.waktu);
    document.getElementById('kategori').value = item.kategori;
    document.getElementById('lokasi').value = item.lokasi || '';
    document.getElementById('catatan').value = item.catatan;
    
    if (item.foto) {
        base64ImageStr = item.foto;
        imgPreview.src = item.foto;
        imgPreview.style.display = 'block';
        uploadPlaceholder.style.display = 'none';
    } else {
        clearUploadPreview();
    }

    editId = id;
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-edit"></i> Edit Momen Cerita';
    document.getElementById('btnSubmit').textContent = "Perbarui Cerita";
    document.getElementById('btnCancel').style.display = "block";
    
    document.querySelector('[data-target="tab-tulis"]').click();
};

window.confirmDelete = (id) => {
    showConfirm("Hapus Kenangan?", "Apakah kamu yakin ingin menghapus cerita ini? Data tidak bisa dikembalikan.", () => deleteDataFromDB(id));
};

document.getElementById('btnCancel').addEventListener('click', () => {
    resetFormState();
    document.querySelector('[data-target="tab-beranda"]').click();
});

const resetFormState = () => {
    editId = null;
    document.getElementById('diaryForm').reset();
    document.getElementById('formTitle').innerHTML = '<i class="fas fa-pen-nib"></i> Tulis Cerita Hari Ini';
    document.getElementById('btnSubmit').textContent = "Simpan Momen";
    document.getElementById('btnCancel').style.display = "none";
    clearUploadPreview();
    setDropdownToNow();
};

const clearUploadPreview = () => {
    base64ImageStr = "";
    imgPreview.src = "";
    imgPreview.style.display = 'none';
    uploadPlaceholder.style.display = 'block';
    fotoInput.value = "";
};