/**
 * ============================================================================
 * RUANG CERITA - CORE APPLICATION SCRIPT
 * Pro Engineer & UI/UX Designer Approach
 * ============================================================================
 */

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. STATE & DOM ELEMENTS
    // ==========================================
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
    
    // Tab Navigation Elements
    const navBtns = document.querySelectorAll('.nav-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');

    // Modal Elements
    const imageModal = document.getElementById('diaryImageModal');
    const modalImg = document.getElementById('fullScreenImg');
    const closeLightboxBtn = document.getElementById('closeLightboxBtn');
    
    // Custom Alert & Confirm Elements
    const customAlert = document.getElementById('customAlert');
    const customConfirm = document.getElementById('customConfirm');

    // ==========================================
    // 2. TEMA (LIGHT/DARK MODE)
    // ==========================================
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

    // ==========================================
    // 3. NAVIGASI TABS & PENCARIAN (EXPAND)
    // ==========================================
    navBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Hapus class active dari semua
            navBtns.forEach(b => b.classList.remove('active'));
            tabPanes.forEach(p => p.classList.remove('active'));
            
            // Tambah class active ke yang diklik
            btn.classList.add('active');
            const target = btn.getAttribute('data-target');
            document.getElementById(target).classList.add('active');
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });

    searchBtn.addEventListener('click', () => {
        searchOverlay.classList.add('active');
        searchInput.focus();
    });

    closeSearchBtn.addEventListener('click', () => {
        searchOverlay.classList.remove('active');
        searchInput.value = '';
        renderDiary(); // Reset pencarian
    });

    searchInput.addEventListener('input', renderDiary);
    filterBulanTahun.addEventListener('change', renderDiary);

    // ==========================================
    // 4. DROPDOWN TANGGAL & WAKTU (DINAMIS)
    // ==========================================
    const initDateDropdowns = () => {
        const dHari = document.getElementById('tgl_hari');
        const dBulan = document.getElementById('tgl_bulan');
        const dTahun = document.getElementById('tgl_tahun');
        const dJam = document.getElementById('tgl_jam');
        const dMenit = document.getElementById('tgl_menit');
        
        const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];

        // Populate Dropdowns
        for(let i=1; i<=31; i++) dHari.innerHTML += `<option value="${String(i).padStart(2, '0')}">${i}</option>`;
        namaBulan.forEach((bln, idx) => {
            const val = String(idx + 1).padStart(2, '0');
            dBulan.innerHTML += `<option value="${val}">${bln}</option>`;
        });
        const currentYear = new Date().getFullYear();
        for(let i=currentYear; i>=currentYear-10; i--) dTahun.innerHTML += `<option value="${i}">${i}</option>`;
        for(let i=0; i<24; i++) dJam.innerHTML += `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`;
        for(let i=0; i<60; i++) dMenit.innerHTML += `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`;
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
        const date = new Date(isoString);
        document.getElementById('tgl_hari').value = String(date.getDate()).padStart(2, '0');
        document.getElementById('tgl_bulan').value = String(date.getMonth() + 1).padStart(2, '0');
        document.getElementById('tgl_tahun').value = date.getFullYear();
        document.getElementById('tgl_jam').value = String(date.getHours()).padStart(2, '0');
        document.getElementById('tgl_menit').value = String(date.getMinutes()).padStart(2, '0');
    };

    initDateDropdowns();
    setDropdownToNow();

    // ==========================================
    // 5. CUSTOM MODALS (ALERT & CONFIRM)
    // ==========================================
    window.showAlert = (title, message) => {
        document.getElementById('alertTitle').textContent = title;
        document.getElementById('alertMessage').textContent = message;
        customAlert.classList.add('show');
    };
    
    document.getElementById('alertOkBtn').addEventListener('click', () => {
        customAlert.classList.remove('show');
    });

    window.showConfirm = (title, message, onConfirm) => {
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        customConfirm.classList.add('show');
        
        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');
        
        // Remove old listeners to avoid multiple triggers
        const newOkBtn = okBtn.cloneNode(true);
        const newCancelBtn = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOkBtn, okBtn);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newOkBtn.addEventListener('click', () => {
            customConfirm.classList.remove('show');
            if (onConfirm) onConfirm();
        });
        
        newCancelBtn.addEventListener('click', () => {
            customConfirm.classList.remove('show');
        });
    };

    // ==========================================
    // 6. INDEXED DB (PENYIMPANAN PERMANEN)
    // ==========================================
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
            loadDataFromDB();
        };

        request.onerror = (e) => {
            console.error("IndexedDB error:", e);
            showAlert("Error", "Gagal mengakses penyimpanan lokal. Browser mungkin tidak mendukung.");
        };
    };

    const loadDataFromDB = () => {
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
        store.put(data); // 'put' otomatis insert/update berdasar keyPath (id)

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
            showAlert("Terhapus", "Kenangan berhasil dihapus dari ruang cerita.");
            loadDataFromDB();
            if (editId === id) resetFormState();
        };
    };

    initDB();

    // ==========================================
    // 7. MANAJEMEN GAMBAR (UPLOAD & LIGHTBOX)
    // ==========================================
    const fotoInput = document.getElementById('foto');
    const imgPreview = document.getElementById('imgPreview');
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');

    fotoInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                // Resize Canvas agar IndexedDB tidak penuh
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 1200;
                const MAX_HEIGHT = 1200;
                let width = img.width;
                let height = img.height;

                if (width > MAX_WIDTH || height > MAX_HEIGHT) {
                    if (width / height > MAX_WIDTH / MAX_HEIGHT) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    } else {
                        width *= MAX_HEIGHT / height;
                        height = MAX_HEIGHT;
                    }
                }
                
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                
                base64ImageStr = canvas.toDataURL('image/jpeg', 0.8); 
                imgPreview.src = base64ImageStr;
                imgPreview.style.display = 'block';
                uploadPlaceholder.style.display = 'none';
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
    });

    window.openLightbox = (src) => {
        modalImg.src = src;
        imageModal.classList.add('show');
    };

    closeLightboxBtn.addEventListener('click', () => imageModal.classList.remove('show'));
    imageModal.addEventListener('click', (e) => {
        if(e.target === imageModal) imageModal.classList.remove('show');
    });

    // ==========================================
    // 8. RENDER LIST & FILTER
    // ==========================================
    const updateFilterOptions = () => {
        const uniqueMonths = [...new Set(diaryData.map(item => item.waktu.substring(0, 7)))];
        const currentVal = filterBulanTahun.value;
        
        filterBulanTahun.innerHTML = '<option value="">Tampilkan Semua Waktu</option>';
        uniqueMonths.forEach(ym => {
            const [y, m] = ym.split('-');
            const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            const lbl = `${namaBulan[parseInt(m)-1]} ${y}`;
            filterBulanTahun.innerHTML += `<option value="${ym}">${lbl}</option>`;
        });
        
        if (uniqueMonths.includes(currentVal)) {
            filterBulanTahun.value = currentVal;
        }
    };

    const renderDiary = () => {
        entriesContainer.innerHTML = '';
        const searchQuery = searchInput.value.toLowerCase();
        const filterWaktu = filterBulanTahun.value; 

        const filteredData = diaryData.filter(item => {
            const matchSearch = item.catatan.toLowerCase().includes(searchQuery) || 
                                (item.lokasi && item.lokasi.toLowerCase().includes(searchQuery)) ||
                                item.kategori.toLowerCase().includes(searchQuery);
            const matchMonth = filterWaktu === "" || item.waktu.startsWith(filterWaktu);
            return matchSearch && matchMonth;
        });

        if (filteredData.length === 0) {
            entriesContainer.innerHTML = `
                <div class="card glowing-card" style="text-align:center; grid-column: 1 / -1;">
                    <i class="fas fa-folder-open" style="font-size:3rem; color:var(--text-muted); margin-bottom:15px;"></i>
                    <p>Belum ada cerita yang ditemukan.</p>
                </div>`;
            return;
        }

        filteredData.forEach(item => {
            const opsiWaktu = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
            const tanggalCantik = new Date(item.waktu).toLocaleDateString('id-ID', opsiWaktu);

            const div = document.createElement('div');
            div.className = 'entry-card';
            div.innerHTML = `
                <div class="entry-header">
                    <span class="entry-meta"><i class="far fa-calendar-alt"></i> ${tanggalCantik}</span>
                    <span class="badge">${item.kategori}</span>
                </div>
                ${item.foto ? `<img src="${item.foto}" class="entry-image" alt="Momen" onclick="openLightbox('${item.foto}')">` : ''}
                <div class="entry-text">${item.catatan}</div>
                ${item.lokasi ? `<div class="entry-location"><i class="fas fa-map-marker-alt"></i> ${item.lokasi}</div>` : ''}
                <div class="entry-actions">
                    <button class="btn-sm" onclick="editEntry(${item.id})"><i class="fas fa-edit"></i> Edit</button>
                    <button class="btn-sm delete" onclick="confirmDelete(${item.id})"><i class="fas fa-trash"></i> Hapus</button>
                </div>
            `;
            entriesContainer.appendChild(div);
        });
    };

    // ==========================================
    // 9. FORM SUBMIT, EDIT, & DELETE
    // ==========================================
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
        
        e.target.reset();
        resetFormState();
        
        // Pindah otomatis ke tab beranda
        document.querySelector('[data-target="tab-beranda"]').click();
    });

    window.editEntry = (id) => {
        const item = diaryData.find(d => d.id === id);
        if (!item) return;

        setDropdownFromISO(item.waktu);
        document.getElementById('kategori').value = item.kategori;
        document.getElementById('lokasi').value = item.lokasi;
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
        
        // Pindah ke tab tulis
        document.querySelector('[data-target="tab-tulis"]').click();
    };

    window.confirmDelete = (id) => {
        showConfirm(
            "Hapus Kenangan?", 
            "Apakah kamu yakin ingin menghapus cerita ini? Data tidak bisa dikembalikan setelah dihapus.",
            () => deleteDataFromDB(id)
        );
    };

    document.getElementById('btnCancel').addEventListener('click', () => {
        document.getElementById('diaryForm').reset();
        resetFormState();
        document.querySelector('[data-target="tab-beranda"]').click();
    });

    const resetFormState = () => {
        editId = null;
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
});