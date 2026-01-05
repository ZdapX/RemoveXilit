
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const FormData = require('form-data');
const multer = require('multer');

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

async function getToken() {
    try {
        // Link security token mungkin berubah, jika error 500 cek link ini di browser
        const { data } = await axios.get('https://removal.ai/wp-admin/admin-ajax.php?action=ajax_get_webtoken&security=1cf5632768');
        return data.data.webtoken;
    } catch (err) {
        throw new Error("Gagal mengambil token removal.ai");
    }
}

// Endpoint Upload & Remove
app.post('/api/remove-bg', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) return res.status(400).json({ success: false, message: "Mana gambarnya?" });

        const token = await getToken();
        const form = new FormData();
        
        // Gunakan buffer dari multer
        form.append('image_file', req.file.buffer, {
            filename: req.file.originalname,
            contentType: req.file.mimetype,
        });

        const { data: response } = await axios.post('https://api.removal.ai/3.0/remove', form, {
            headers: {
                ...form.getHeaders(),
                "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "web-token": token
            },
        });

        res.json({
            success: true,
            result: {
                url: response.url,
                low_res: response.low_resolution,
                preview: response.preview_demo
            }
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = app;
