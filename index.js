const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const app = express();

const PORT = 3000;
const VALID_KEY = "pythonaistv";
const IMGBB_API_KEY = '511042c7d206ab02dd75340728055d70'; // API key Imgbb

// Tạo folder public để lưu ảnh
const IMAGE_DIR = path.join(__dirname, 'public');
if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR);

app.use('/images', express.static(IMAGE_DIR)); // Cho phép truy cập ảnh qua URL

app.get('/api/chat', async (req, res) => {
    const { key, chataistv } = req.query;

    if (key !== VALID_KEY)
        return res.status(403).json({ error: "Invalid API key" });

    if (!chataistv || !chataistv.startsWith("createimage="))
        return res.status(400).json({ error: "Format: chataistv=createimage=your_prompt" });

    const prompt = decodeURIComponent(chataistv.replace("createimage=", ""));
    const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}`;

    try {
        // Tải ảnh từ Pollinations về server
        const imgResponse = await axios.get(imageUrl, { responseType: 'arraybuffer' });
        const fileName = `image_${Date.now()}.png`;
        const filePath = path.join(IMAGE_DIR, fileName);
        fs.writeFileSync(filePath, imgResponse.data);

        // Tạo formData để upload lên Imgbb
        const form = new FormData();
        form.append('image', fs.createReadStream(filePath));
        form.append('key', IMGBB_API_KEY);

        // Upload ảnh lên Imgbb
        const imgbbResponse = await axios.post('https://api.imgbb.com/1/upload', form, {
            headers: form.getHeaders(),
        });

        const imgbbUrl = imgbbResponse.data?.data?.url;
        if (!imgbbUrl) return res.status(500).json({ error: "Failed to upload image to Imgbb" });

        // Trả về link ảnh trên Imgbb
        res.json({
            status: "success",
            prompt,
            image_url: imgbbUrl
        });

    } catch (err) {
        res.status(500).json({ error: "Image generation or upload failed", detail: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại http://localhost:${PORT}`);
});
