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


