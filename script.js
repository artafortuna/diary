// ============================================================================
// SCRIPT ANTI-ERROR & PENYELAMAT DATA LAMA
// ============================================================================

// Gunakan pembungkus aman agar script pasti jalan walau koneksi/browser lambat
(function() {
    function initApp() {
        let diaryData = [];
        let editId = null;
        let base64ImageStr = "";

        // 1. AMBIL SEMUA ELEMEN (Dengan proteksi agar tidak crash jika tidak ditemukan)
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

        // 2. TEMA LIGHT/DARK
        let savedTheme = 'light';
        try { savedTheme = localStorage.getItem('ruangcerita_theme') || 'light'; } catch(e) {}
        html.setAttribute('data-theme', savedTheme);
        if(themeToggle) themeToggle.textContent = savedTheme === 'dark' ? '☀️' : '🌙';

        themeToggle?.addEventListener('click', () => {
            const currentTheme = html.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            html.setAttribute('data-theme', newTheme);
            themeToggle.textContent = newTheme === 'dark' ? '☀️' : '🌙';
            try { localStorage.setItem('ruangcerita_theme', newTheme); } catch(e) {}
        });

        // 3. NAVIGASI TABS
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navBtns.forEach(b => b.classList.remove('active'));
                tabPanes.forEach(p => p.classList.remove('active'));
                btn.classList.add('active');
                
                const targetId = btn.getAttribute('data-target');
                const targetEl = document.getElementById(targetId);
                if(targetEl) targetEl.classList.add('active');
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        });

        // 4. PENCARIAN
        searchBtn?.addEventListener('click', () => searchOverlay?.classList.add('active'));
        closeSearchBtn?.addEventListener('click', () => {
            if(searchOverlay) searchOverlay.classList.remove('active');
            if(searchInput) searchInput.value = '';
            renderDiary();
        });
        searchInput?.addEventListener('input', renderDiary);
        filterBulanTahun?.addEventListener('change', renderDiary);

        // 5. DROPDOWN TANGGAL (CARA PALING AMAN 100% MUNCUL)
        const initDateDropdowns = () => {
            const dHari = document.getElementById('tgl_hari');
            const dBulan = document.getElementById('tgl_bulan');
            const dTahun = document.getElementById('tgl_tahun');
            const dJam = document.getElementById('tgl_jam');
            const dMenit = document.getElementById('tgl_menit');
            
            if(!dHari || !dBulan || !dTahun || !dJam || !dMenit) return; // Cegah crash

            let hariHTML = '';
            for(let i=1; i<=31; i++) hariHTML += `<option value="${String(i).padStart(2, '0')}">${i}</option>`;
            dHari.innerHTML = hariHTML;

            let bulanHTML = '';
            const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
            namaBulan.forEach((bln, idx) => {
                bulanHTML += `<option value="${String(idx + 1).padStart(2, '0')}">${bln}</option>`;
            });
            dBulan.innerHTML = bulanHTML;

            let tahunHTML = '';
            const currentYear = new Date().getFullYear();
            for(let i=currentYear; i>=currentYear-10; i--) tahunHTML += `<option value="${i}">${i}</option>`;
            dTahun.innerHTML = tahunHTML;

            let jamHTML = '';
            for(let i=0; i<24; i++) jamHTML += `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`;
            dJam.innerHTML = jamHTML;

            let menitHTML = '';
            for(let i=0; i<60; i++) menitHTML += `<option value="${String(i).padStart(2, '0')}">${String(i).padStart(2, '0')}</option>`;
            dMenit.innerHTML = menitHTML;
        };

        const setDropdownToNow = () => {
            const now = new Date();
            const dHari = document.getElementById('tgl_hari');
            if(!dHari) return; // Jika HTML blm siap, jangan dipaksa

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
                if (isNaN(date)) throw "Invalid";
                document.getElementById('tgl_hari').value = String(date.getDate()).padStart(2, '0');
                document.getElementById('tgl_bulan').value = String(date.getMonth() + 1).padStart(2, '0');
                document.getElementById('tgl_tahun').value = date.getFullYear();
                document.getElementById('tgl_jam').value = String(date.getHours()).padStart(2, '0');
                document.getElementById('tgl_menit').value = String(date.getMinutes()).padStart(2, '0');
            } catch(e) { setDropdownToNow(); }
        };

        // 6. POPUP ALERT & CONFIRM
        window.showAlert = (title, message) => {
            document.getElementById('alertTitle').textContent = title;
            document.getElementById('alertMessage').textContent = message;
            customAlert?.classList.add('show');
        };
        document.getElementById('alertOkBtn')?.addEventListener('click', () => customAlert.classList.remove('show'));

        window.showConfirm = (title, message, onConfirm) => {
            document.getElementById('confirmTitle').textContent = title;
            document.getElementById('confirmMessage').textContent = message;
            customConfirm?.classList.add('show');
            
            const okBtn = document.getElementById('confirmOkBtn');
            const cancelBtn = document.getElementById('confirmCancelBtn');
            
            const newOkBtn = okBtn.cloneNode(true);
            const newCancelBtn = cancelBtn.cloneNode(true);
            okBtn.parentNode.replaceChild(newOkBtn, okBtn);
            cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
            
            newOkBtn.addEventListener('click', () => { customConfirm.classList.remove('show'); if (onConfirm) onConfirm(); });
            newCancelBtn.addEventListener('click', () => customConfirm.classList.remove('show'));
        };

        // 7. INDEXED_DB & MIGRASI DATA LAMA (Anti-Hilang)
        const dbName = "RuangCeritaDB_V2";
        const storeName = "ceritaStore";
        let db;

        const initDB = () => {
            if (!window.indexedDB) {
                // Jika browser tidak support IndexedDB, gunakan LocalStorage
                loadDataFallback();
                return;
            }

            const request = indexedDB.open(dbName, 1);
            
            request.onupgradeneeded = (e) => {
                db = e.target.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName, { keyPath: "id" });
                }
            };

            request.onsuccess = (e) => {
                db = e.target.result;
                migrateOldData(); // Tarik data lama ke sistem baru!
            };

            request.onerror = (e) => {
                loadDataFallback(); // Fallback jika DB di-block
            };
        };

        const migrateOldData = () => {
            try {
                // CARI DATA LAMA (NAMA KEY LAMA)
                const oldDataStr = localStorage.getItem('diary_entries');
                if (oldDataStr) {
                    const oldData = JSON.parse(oldDataStr);
                    const transaction = db.transaction([storeName], "readwrite");
                    const store = transaction.objectStore(storeName);
                    
                    oldData.forEach(item => store.put(item));
                    
                    transaction.oncomplete = () => {
                        // Jangan hapus data lama di localstorage buat jaga-jaga
                        loadDataFromDB();
                    };
                } else {
                    loadDataFromDB();
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

        const loadDataFallback = () => {
            try {
                diaryData = JSON.parse(localStorage.getItem('diary_entries')) || [];
                diaryData.sort((a, b) => new Date(b.waktu) - new Date(a.waktu));
                updateFilterOptions();
                renderDiary();
            } catch(e) {}
        };

        const saveDataToDB = (data, isUpdate = false) => {
            if (db) {
                const transaction = db.transaction([storeName], "readwrite");
                const store = transaction.objectStore(storeName);
                store.put(data);
                transaction.oncomplete = () => {
                    showAlert("Berhasil", isUpdate ? "Ceritamu berhasil diperbarui!" : "Momen barumu telah disimpan!");
                    loadDataFromDB();
                };
            } else {
                // Fallback Simpan LocalStorage
                if(isUpdate) {
                    const idx = diaryData.findIndex(d => d.id === data.id);
                    if(idx !== -1) diaryData[idx] = data;
                } else {
                    diaryData.push(data);
                }
                localStorage.setItem('diary_entries', JSON.stringify(diaryData));
                showAlert("Berhasil", "Momen telah disimpan (Mode Basic).");
                loadDataFallback();
            }
        };

        const deleteDataFromDB = (id) => {
            if (db) {
                const transaction = db.transaction([storeName], "readwrite");
                const store = transaction.objectStore(storeName);
                store.delete(id);
                transaction.oncomplete = () => {
                    showAlert("Terhapus", "Kenangan berhasil dihapus.");
                    loadDataFromDB();
                    if (editId === id) resetFormState();
                };
            } else {
                diaryData = diaryData.filter(d => d.id !== id);
                localStorage.setItem('diary_entries', JSON.stringify(diaryData));
                showAlert("Terhapus", "Kenangan berhasil dihapus.");
                loadDataFallback();
            }
        };

        // 8. UPLOAD FOTO
        const fotoInput = document.getElementById('foto');
        const imgPreview = document.getElementById('imgPreview');
        const uploadPlaceholder = document.getElementById('uploadPlaceholder');

        fotoInput?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

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
            if(modalImg && imageModal) {
                modalImg.src = src;
                imageModal.classList.add('show');
            }
        };
        closeLightboxBtn?.addEventListener('click', () => imageModal?.classList.remove('show'));
        imageModal?.addEventListener('click', (e) => { if(e.target === imageModal) imageModal.classList.remove('show'); });

        // 9. RENDER DATA & FILTER
        const updateFilterOptions = () => {
            if(!filterBulanTahun) return;
            const uniqueMonths = [...new Set(diaryData.map(item => item.waktu ? item.waktu.substring(0, 7) : ""))].filter(Boolean);
            const currentVal = filterBulanTahun.value;
            
            filterBulanTahun.innerHTML = '<option value="">Tampilkan Semua Waktu</option>';
            uniqueMonths.forEach(ym => {
                const [y, m] = ym.split('-');
                const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                const lbl = `${namaBulan[parseInt(m)-1]} ${y}`;
                filterBulanTahun.innerHTML += `<option value="${ym}">${lbl}</option>`;
            });
            if (uniqueMonths.includes(currentVal)) filterBulanTahun.value = currentVal;
        };

        const renderDiary = () => {
            if(!entriesContainer) return;
            entriesContainer.innerHTML = '';
            const searchQuery = searchInput ? searchInput.value.toLowerCase() : '';
            const filterWaktu = filterBulanTahun ? filterBulanTahun.value : ''; 

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
                        <p>Belum ada cerita yang ditemukan.</p>
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

        // 10. FORM SUBMIT & RESET
        document.getElementById('diaryForm')?.addEventListener('submit', (e) => {
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
            
            // Pindah ke tab beranda otomatis
            const btnBeranda = document.querySelector('[data-target="tab-beranda"]');
            if(btnBeranda) btnBeranda.click();
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
            
            const btnTulis = document.querySelector('[data-target="tab-tulis"]');
            if(btnTulis) btnTulis.click();
        };

        window.confirmDelete = (id) => {
            showConfirm("Hapus Kenangan?", "Apakah kamu yakin ingin menghapus cerita ini?", () => deleteDataFromDB(id));
        };

        document.getElementById('btnCancel')?.addEventListener('click', () => {
            resetFormState();
            const btnBeranda = document.querySelector('[data-target="tab-beranda"]');
            if(btnBeranda) btnBeranda.click();
        });

        const resetFormState = () => {
            editId = null;
            document.getElementById('diaryForm')?.reset();
            document.getElementById('formTitle').innerHTML = '<i class="fas fa-pen-nib"></i> Tulis Cerita Hari Ini';
            document.getElementById('btnSubmit').textContent = "Simpan Momen";
            document.getElementById('btnCancel').style.display = "none";
            clearUploadPreview();
            setDropdownToNow();
        };

        const clearUploadPreview = () => {
            base64ImageStr = "";
            if(imgPreview) {
                imgPreview.src = "";
                imgPreview.style.display = 'none';
            }
            if(uploadPlaceholder) uploadPlaceholder.style.display = 'block';
            if(fotoInput) fotoInput.value = "";
        };

        // --- MULAI JALANKAN SEMUA ---
        initDateDropdowns();
        setDropdownToNow();
        initDB();
    }

    // Pastikan kode hanya berjalan saat HTML sudah beres di-render
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initApp);
    } else {
        initApp();
    }
})();