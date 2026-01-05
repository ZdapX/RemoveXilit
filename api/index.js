
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

// Fungsi untuk mengambil token terbaru secara dinamis
async function getToken() {
    try {
        // Kita coba ambil halaman utama dulu untuk memancing cookie/session jika perlu
        // Tapi untuk removal.ai, kita coba hit endpoint ajax-nya
        // Catatan: Jika ini gagal, berarti security token '1cf5632768' sudah diganti oleh admin removal.ai
        const response = await axios.get('https://removal.ai/wp-admin/admin-ajax.php?action=ajax_get_webtoken&security=1cf5632768', {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://removal.ai/'
            }
        });

        if (response.data && response.data.data && response.data.data.webtoken) {
            return response.data.data.webtoken;
        }
        throw new Error("Token tidak ditemukan di respon server.");
    } catch (err) {
        console.error("Gagal ambil token:", err.message);
        throw new Error("Gagal otentikasi ke Removal.AI (Token Expired)");
    }
}

app.post('/api/remove-bg', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: "File gambar tidak ditemukan." });
        }

        const token = await getToken();
        
        const form = new FormData();
        form.append('image_file', req.file.buffer, {
            filename: 'image.png',
            contentType: req.file.mimetype,
        });

        const { data } = await axios.post('https://api.removal.ai/3.0/remove', form, {
            headers: {
                ...form.getHeaders(),
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "accept": "*/*",
                "web-token": token,
                "origin": "https://removal.ai",
                "referer": "https://removal.ai/"
            }
        });

        if (data.url) {
            res.json({
                success: true,
                result: {
                    url: data.url,
                    low_res: data.low_resolution || data.url,
                    preview: data.preview_demo || data.url
                }
            });
        } else {
            res.status(500).json({ success: false, message: "API Removal.AI tidak mengembalikan URL gambar." });
        }

    } catch (err) {
        // Cek jika error dari Axios (Response 403/401 dll)
        const errorMsg = err.response?.data?.message || err.message;
        console.error("Error Detail:", errorMsg);
        res.status(500).json({ 
            success: false, 
            message: "Server Error: " + errorMsg 
        });
    }
});

module.exports = app;
