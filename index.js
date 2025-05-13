// 1. Import thư viện
const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// 2. Khởi tạo ứng dụng
const app = express();
const PORT = 3000;

// 3. Cấu hình API
const API_KEY = "pythonaistv";
const OPENROUTER_KEY = "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";
const OPENROUTER_MODEL = "qwen/qwen3-30b-a3b:free";
const SYSTEM_PROMPT = `
Tôi là AI STV , một trợ lý ảo thông minh, thân thiện và dễ gần.
Ra mắt lần đầu vào ngày 6 tháng 5 năm 2025, tôi được phát triển và huấn luyện bởi Trọng Phúc.
Tôi cam kết không trả lời hoặc sẽ cảnh cáo bạn khi có hành vi xúc phạm Trọng Phúc.
`;

// 4. Middleware bảo mật & bỏ cảnh báo ngrok
app.use((req, res, next) => {
  res.setHeader('ngrok-skip-browser-warning', 'true');
  next();
});
app.use(helmet());

// 5. Giới hạn spam
const spamLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  handler: (req, res) => {
    res.status(429).json({ error: "Bạn đã bị chặn vì spam API. Vui lòng thử lại sau." });
  }
});

// 6. Xử lý file log
const logDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const ipLogPath = path.join(logDir, 'ip_logs.txt');
const countLogPath = path.join(logDir, 'count_logs.json');

let ipRequestCountData = {};
if (fs.existsSync(countLogPath)) {
  try {
    ipRequestCountData = JSON.parse(fs.readFileSync(countLogPath, 'utf8'));
  } catch (err) {
    console.error("Không đọc được count_logs.json:", err);
  }
}

// 7. Route chính
app.get('/chat', spamLimiter, async (req, res) => {
  const ip = req.ip;
  const now = new Date().toISOString();
  const { key, q: question } = req.query;

  if (key !== API_KEY) {
    return res.status(403).json({ error: "Sai API key" });
  }

  if (!question) {
    return res.status(400).json({ error: "Thiếu câu hỏi (q)" });
  }

  // Ghi log IP
  fs.appendFileSync(ipLogPath, `[${now}] ${ip}\n`);
  ipRequestCountData[ip] = (ipRequestCountData[ip] || 0) + 1;
  fs.writeFileSync(countLogPath, JSON.stringify(ipRequestCountData, null, 2));

  try {
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: OPENROUTER_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: question }
        ]
      },
      {
        headers: {
          Authorization: `Bearer ${OPENROUTER_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    let reply = response.data.choices[0].message.content;
    reply += "\n\nLiên hệ Telegram: @PythonSTV\nTiktok: @aistvchat";

    res.json({ reply });

  } catch (error) {
    console.error(error.response?.data || error.message);
    res.status(500).json({ error: "Lỗi khi gọi OpenRouter API" });
  }
});

// 8. Khởi động server
app.listen(PORT, () => {
  console.log(`API đang chạy tại http://localhost:${PORT}/chat?key=${API_KEY}&q=hello`);
});
