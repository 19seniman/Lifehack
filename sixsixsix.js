const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ===================================================================
// KONFIGURASI
// ===================================================================

// Nama file yang berisi token. 
// HARAP MASUKKAN SATU TOKEN PER BARIS di dalam file ini.
const TOKEN_FILE_PATH = path.join(__dirname, 'token.txt');

// Cookie (Isi jika diperlukan, jika token saja tidak cukup)
// Jika diisi, cookie yang sama akan digunakan untuk SEMUA akun.
const COOKIE_STRING = ""; // BIARKAN KOSONG JIKA TIDAK PERLU

// URL Target
const BASE_URL = "https://pornmaker.ai/api";

// Hitung 24 jam dalam milidetik
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

// ===================================================================
// FUNGSI UTILITY
// ===================================================================

/**
 * Membaca semua token dari file 'token.txt' (satu token per baris).
 * Sudah diperkuat untuk mengatasi masalah karakter tersembunyi (seperti \r).
 * @returns {string[]} - Array dari token otorisasi
 */
function getAuthTokens() {
    console.log(`Mencoba membaca token dari '${TOKEN_FILE_PATH}'...`);
    try {
        const fileContent = fs.readFileSync(TOKEN_FILE_PATH, 'utf8');
        
        // Pembersihan agresif: 
        // 1. Hapus semua karakter Carriage Return (\r) untuk kompatibilitas OS.
        // 2. Pisahkan berdasarkan baris baru (\n).
        // 3. Trim spasi di awal/akhir setiap baris.
        // 4. Filter untuk menghapus baris yang kosong.
        const tokens = fileContent
            .replace(/\r/g, '') // Hapus semua karakter Carriage Return (\r)
            .split('\n')
            .map(line => line.trim()) // Trim spasi di awal/akhir
            .filter(token => token.length > 0); // Hapus baris yang sepenuhnya kosong

        if (tokens.length === 0) {
            console.error(`Error: File '${TOKEN_FILE_PATH}' kosong atau tidak berisi token valid.`);
            process.exit(1);
        }

        console.log(`✅ Berhasil membaca ${tokens.length} akun.`);
        return tokens;
    } catch (err) {
        console.error(`❌ Error: Gagal membaca file token di '${TOKEN_FILE_PATH}'`);
        console.error("Pastikan file 'token.txt' ada di folder yang sama dan dapat diakses.");
        console.error("Detail Error:", err.message);
        process.exit(1);
    }
}

/**
 * Membuat instance Axios untuk akun tertentu
 * @param {string} authToken - Token otorisasi untuk akun ini
 * @returns {axios.AxiosInstance} - Instance Axios yang sudah dikonfigurasi
 */
function createApiClient(authToken) {
    const headers = {
        // Gunakan token murni yang sudah di-trim
        "Authorization": `Bearer ${authToken}`,
        "accept": "*/*",
        "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36 Edg/141.0.0.0"
    };

    if (COOKIE_STRING) {
        headers['cookie'] = COOKIE_STRING;
    }

    return axios.create({
        baseURL: BASE_URL,
        headers: headers
    });
}

// ===================================================================
// LOGIKA AKUN TUNGGAL
// ===================================================================

/**
 * Fungsi untuk memeriksa informasi akun (metode GET)
 * @param {axios.AxiosInstance} client - Klien API khusus akun
 */
async function checkAccountInfo(client) {
    try {
        const response = await client.get('/me');
        const email = response.data.user.email || 'N/A';
        const credits = response.data.user.credits || 'N/A';
        console.log(`[INFO AKUN] Email: ${email} | Kredit Saat Ini: ${credits}`);
        return { email, credits };
    } catch (error) {
        let status = error.response ? error.response.status : 'N/A';
        let data = error.response ? JSON.stringify(error.response.data) : error.message;
        console.error(`[ERROR INFO] Gagal mendapatkan info akun. Status: ${status}, Detail: ${data}`);
        return null;
    }
}

/**
 * Fungsi untuk mengklaim kredit harian (metode POST)
 * @param {axios.AxiosInstance} client - Klien API khusus akun
 * @param {string} accountIdentifier - Pengenal akun (misalnya, email)
 */
async function claimDailyCredits(client, accountIdentifier) {
    console.log(`[KLAIM] Mencoba mengklaim kredit harian untuk akun ${accountIdentifier}...`);
    try {
        const response = await client.post('/GetDailyFreeCredits', null);
        console.log(`[KLAIM SUKSES] Akun ${accountIdentifier}: Berhasil mengklaim! Respon: ${JSON.stringify(response.data)}`);
    } catch (error) {
        let status = error.response ? error.response.status : 'N/A';
        let data = error.response ? JSON.stringify(error.response.data) : error.message;

        if (status === 400 && data.includes("already claimed")) {
            console.warn(`[KLAIM GAGAL] Akun ${accountIdentifier}: Kredit sudah diklaim hari ini.`);
            return;
        }

        console.error(`[KLAIM ERROR] Akun ${accountIdentifier}: Gagal mengklaim. Status: ${status}, Detail: ${data}`);
    }
}

/**
 * Fungsi untuk menjalankan proses bot untuk satu akun
 * @param {string} token - Token akun saat ini
 * @param {number} index - Indeks akun (untuk logging)
 */
async function runAccountBot(token, index) {
    const accountLabel = `AKUN ${index + 1}`;
    console.log(`\n==================================================`);
    console.log(`Memulai proses untuk ${accountLabel}`);
    console.log(`==================================================`);

    // Buat klien API khusus untuk token ini
    const apiClient = createApiClient(token);
    
    // 1. Periksa dan dapatkan info akun
    const info = await checkAccountInfo(apiClient);
    // Gunakan email sebagai ID jika berhasil, jika tidak, gunakan label default
    const identifier = info ? info.email : accountLabel; 

    // 2. Langsung klaim kredit saat pertama kali dijalankan
    await claimDailyCredits(apiClient, identifier);

    // 3. Atur interval untuk mengklaim lagi setiap 24 jam
    // Menggunakan IIFE agar identifier di-capture dengan benar untuk setInterval
    setInterval(() => claimDailyCredits(apiClient, identifier), TWENTY_FOUR_HOURS_MS);

    console.log(`[BOT] ${identifier} berhasil di-setup. Klaim berikutnya dalam 24 jam.`);
}

// ===================================================================
// LOGIKA UTAMA MULTI-AKUN
// ===================================================================

/**
 * Fungsi utama untuk menjalankan bot untuk semua akun
 */
async function runBot() {
    console.log("Bot multi-akun dimulai...");
    
    // Ambil semua token dari file
    const tokens = getAuthTokens();

    // Jalankan bot untuk setiap akun secara berurutan dengan jeda
    for (let i = 0; i < tokens.length; i++) {
        // Jeda 1 detik di antara inisiasi akun untuk mencegah rate limit pada start-up
        await new Promise(resolve => setTimeout(resolve, 1000));
        runAccountBot(tokens[i], i);
    }

    console.log(`\n==================================================`);
    console.log(`🚀 Bot sekarang berjalan dan memantau ${tokens.length} akun.`);
    console.log(`Jangan tutup jendela terminal ini agar bot tetap berjalan.`);
    console.log(`==================================================`);
}

// Jalankan bot
runBot();
