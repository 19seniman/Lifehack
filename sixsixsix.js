const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ===================================================================
// KONFIGURASI
// ===================================================================

// Nama file yang berisi token
const TOKEN_FILE_PATH = path.join(__dirname, 'token.txt');

// Cookie (Isi jika diperlukan, jika token saja tidak cukup)
// Contoh: 'SITE_TOTAL_ID=f6c8f8...; g_state={...}'
const COOKIE_STRING = ""; // BIARKAN KOSONG JIKA TIDAK PERLU

// ===================================================================
// FUNGSI UNTUK MEMBACA TOKEN
// ===================================================================

/**
 * Membaca token dari file 'token.txt'
 * @returns {string} - Token otorisasi
 */
function getAuthToken() {
    try {
        // Baca file secara sinkron (langsung)
        // .trim() sangat penting untuk menghapus spasi/baris baru
        const token = fs.readFileSync(TOKEN_FILE_PATH, 'utf8').trim();
        
        if (!token) {
            console.error(`Error: File '${TOKEN_FILE_PATH}' kosong.`);
            process.exit(1); // Keluar dari skrip
        }
        
        return token;
    } catch (err) {
        console.error(`Error: Gagal membaca file token di '${TOKEN_FILE_PATH}'`);
        console.error("Pastikan file 'token.txt' ada di folder yang sama dengan skrip ini.");
        console.error("Detail Error:", err.message);
        process.exit(1); // Keluar dari skrip
    }
}

// ===================================================================
// LOGIKA UTAMA BOT
// ===================================================================

// Ambil token dari file
const AUTH_TOKEN = getAuthToken();
console.log("Berhasil membaca token dari file.");

// URL Target
const BASE_URL = "https://pornmaker.ai/api";

// Konfigurasi headers dasar untuk semua permintaan
const headers = {
    "Authorization": `Bearer ${AUTH_TOKEN}`,
    "accept": "*/*",
    "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0"
};

// Tambahkan cookie ke headers jika diisi
if (COOKIE_STRING) {
    headers['cookie'] = COOKIE_STRING;
}

// Buat instance axios dengan konfigurasi default
const apiClient = axios.create({
    baseURL: BASE_URL,
    headers: headers
});

/**
 * Fungsi untuk memeriksa informasi akun (metode GET)
 */
async function checkAccountInfo() {
    console.log("Memeriksa informasi akun...");
    try {
        const response = await apiClient.get('/me');
        console.log("Berhasil mendapatkan info akun:");
        console.log(response.data);
    } catch (error) {
        console.error("Gagal mendapatkan info akun:", error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        }
    }
}

/**
 * Fungsi untuk mengklaim kredit harian (metode POST)
 */
async function claimDailyCredits() {
    console.log("Mencoba mengklaim kredit harian...");
    try {
        const response = await apiClient.post('/GetDailyFreeCredits', null);
        console.log("Berhasil mengklaim kredit harian!");
        console.log("Respon server:", response.data);
    } catch (error) {
        console.error("Gagal mengklaim kredit harian:", error.message);
        if (error.response) {
            console.error(`Status: ${error.response.status}, Data: ${JSON.stringify(error.response.data)}`);
        }
    }
}

// Hitung 24 jam dalam milidetik
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

/**
 * Fungsi utama untuk menjalankan bot
 */
async function runBot() {
    console.log("Bot dimulai...");

    // 1. Periksa akun saat pertama kali dijalankan
    await checkAccountInfo();

    // 2. Langsung klaim kredit saat pertama kali dijalankan
    await claimDailyCredits();

    // 3. Atur interval untuk mengklaim lagi setiap 24 jam
    setInterval(claimDailyCredits, TWENTY_FOUR_HOURS_MS);

    console.log(`Bot sekarang berjalan. Akan mencoba mengklaim kredit lagi dalam 24 jam.`);
    console.log(`Jangan tutup jendela terminal ini agar bot tetap berjalan.`);
}

// Jalankan bot
runBot();
