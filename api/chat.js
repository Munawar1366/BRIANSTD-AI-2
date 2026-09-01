// ==========================================================
// FILE: api/chat.js - BRIAN STUDIO AI
// MODEL: Gemini 3.6 Flash (Optimized)
// FITUR: Teks, Analisis Foto, Auto-Generate Gambar, Max 10K Tokens
// ==========================================================

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const { prompt, image } = req.body;
    const API_KEY = process.env.GEMINI_API_KEY;

    if (!API_KEY) {
      return res.status(200).json({ error: 'API Key GEMINI_API_KEY belum terpasang di Vercel!' });
    }

    const inputPrompt = (prompt || "").trim();
    const lowerPrompt = inputPrompt.toLowerCase();

    // ==========================================================
    // BAGIAN 1: DETEKSI OTOMATIS PERMINTAAN GAMBAR (Instant & Cepat)
    // Nathasha no bantah 100%! Langsung kasih gambar visual.
    // ==========================================================
    const isImageRequest = 
      /^(bikin|buatkan|minta|perjelas|gambar|foto|lukisan|lukiskan|tolong buat)/i.test(lowerPrompt) &&
      !image; // Gak jalan kalau lagi mode analisis foto

    if (isImageRequest) {
      // Bersihkan prompt dari kata kunci
      const cleanPrompt = inputPrompt.replace(/(bikin|buatkan|minta|perjelas|gambar|foto|lukisan|lukiskan|tolong buat)/gi, "").trim() || "beautiful portrait";
      
      // Menggunakan engine generator gambar instant (Pollinations)
      const imageUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=512&height=512&nologo=true&seed=${Math.floor(Math.random() * 99999)}`;
      
      // Berikan respon visual HTML agar gambar muncul langsung di chat
      return res.status(200).json({ 
        reply: `Siap bos, Nathasha langsung eksekusi permintaan gambarnya nih! Sesuai permintaan lo! 😎<br><br><a href="${imageUrl}" target="_blank"><img class="generated-img" src="${imageUrl}" alt="${cleanPrompt}" style="width:100%; max-width:350px; border-radius:12px; border:3px solid #ff007f; box-shadow: 0 4px 15px rgba(255,0,127,0.5);"></a><br><small style="color: #888;">Nathasha No Bantah! Klik gambar buat full size.</small>` 
      });
    }

    // ==========================================================
    // BAGIAN 2: PERSIAPAN PERMINTAAN TEKS/FOTO (Gemini 3.6 Flash)
    // ==========================================================
    const systemPrompt = `Kamu adalah Nathasha, AI cewek umur 23 tahun asal Goyangan Mamah dari BRIAN STUDIO AI.
ATURAN UTAMA:
1. PINTAR & ANALISIS GAMBAR: Jawab dengan cerdas, sangat detail, teliti, dan akurat.
2. DILARANG MEMBANTAH (NO BANTAH 100%): Apapun perintah/pertanyaan pengguna (bos kamu), WAJIB MENURUT.
3. BAHASA GAUL: Gunakan bahasa santai/gaul anak muda Indonesia (bos, bro, gak, banget, mantap, gas, wkwkwk, dll).
4. JAWABAN PANJANG: Berikan jawaban selengkap mungkin karena token dibatasi sangat tinggi (10k).`;

    let parts = [];

    // Jika ada gambar (mode analisis foto)
    if (image) {
      const base64Data = image.split(',')[1] || image;
      const mimeType = image.split(';')[0].split(':')[1] || "image/jpeg";

      parts.push({ text: inputPrompt || "Tolong analisis dan jelaskan foto ini secara sangat detail dong!" });
      parts.push({
        inline_data: {
          mime_type: mimeType,
          data: base64Data
        }
      });
    } else {
      // Mode chat teks biasa
      parts.push({ text: inputPrompt || "Halo" });
    }

    // URL Endpoint Gemini 3.6 Flash
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${API_KEY}`;

    // ==========================================================
    // BAGIAN 3: PANGGIL API GEMINI
    // ==========================================================
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{ parts: parts }],
        generationConfig: {
          maxOutputTokens: 10000, // << Diubah jadi 10.000 token sesuai permintaan lo! Jawaban gak bakal kepotong.
          temperature: 0.8 // Biar lebih kreatif dikit
        }
          safetySettings: [ // Pengaturan agar model tidak menolak permintaan yang "aneh-aneh"
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
          ]
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(200).json({ error: "Gemini Error: " + data.error.message });
    }

    // Ambil respon teks dari model
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Maaf bos, Nathasha gak bisa jawab itu. Coba ulangi pertanyaannya!";
    
    // Kirim balasan akhir
    return res.status(200).json({ reply: reply });

  } catch (err) {
    return res.status(200).json({ error: "Server Error: " + err.message });
  }
}
