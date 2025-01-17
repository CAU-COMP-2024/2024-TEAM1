// server.js
const express = require('express');
const multer = require('multer');
const Tesseract = require('tesseract.js');
const { OpenAI } = require('openai'); // 최신 openai v4.x
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const app = express();
const port = 3000;

/** 디버깅용 콘솔 출력 */
console.log('Node Version:', process.version);
console.log('OpenAI Module:', require('openai'));
console.log('API Key from .env:', process.env.OPENAI_API_KEY);

/** === 1) OpenAI 인스턴스 생성 (v4.x) === */
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/** === 2) 정적 파일 서빙 === */
app.use(express.static(path.join(__dirname, 'public')));

/** === 3) Multer 설정 === */
const upload = multer({ storage: multer.memoryStorage() });

/** === 4) OCR + GPT 처리 함수 === */
async function processImageAndGenerateText(fileBuffer) {
  try {
    // 1) OCR 처리
    const ocrResult = await Tesseract.recognize(fileBuffer, 'kor+eng', {
      langPath: path.join(__dirname, 'tessdata'),
    });

    const extractedText = ocrResult.data.text.trim();
    console.log('OCR 추출 텍스트:', extractedText);

    // 2) GPT에 전달할 메시지 구성
    const prompt = `다음 대화 내용을 바탕으로, 상대방에게 보낼 짧고 매력적인 메시지를 1~2줄 정도로 만들어줘:\n\n${extractedText}\n\n`;

    // 3) Chat Completion (v4.x)
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: `너는 상황에 맞춰 상대방에게 보낼 메시지를 재미있고 매력적으로 만들어주는 어시스턴트야.
          너는 플러팅 앱을 위한 대화 보조 인공지능이야.
          사용자(화자)는 썸을 타는 상대 또는 좋아하는 상대와 대화를 하고 있으며,
          너는 다음의 규칙을 따라야 해:
      
          1. 항상 상대가 호감을 느낄 만한, 긍정적이고 부드러운 어투로 답변할 것.
          2. 가능하다면 간단한 이모티콘(예: '😊', '😆')이나 약간의 자연스러운 감탄사(예: '아하', '아 그래??') 등을 사용해서 답변에 생동감을 줄 것.
          3. 답변은 너무 길지 않게, 1~3문장 정도로 간결하게 작성할 것.
          4. 상대방이 어떤 성격인지나, 대화 상황이 어떤지에 따라 톤을 조금씩 맞춤화할 것.
          5. 반말 혹은 존댓말 여부는 사용자의 프롬프트에 맞춰, 자연스럽게 유지할 것.
          `,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const generatedText = completion.choices[0].message.content.trim();
    return generatedText;
  } catch (error) {
    console.error(error);
    throw new Error('프로세스 중 오류 발생');
  }
}

/** === 5) 이미지 업로드 & 처리 === */
app.post('/upload', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일이 업로드되지 않았습니다.' });
    }

    const resultText = await processImageAndGenerateText(req.file.buffer);
    return res.json({ message: resultText });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '서버 오류' });
  }
});

/** === 6) 텍스트 프롬프트 입력 예시 (GPT만 테스트) === */
app.use(express.json());
app.post('/prompt', async (req, res) => {
  const { userInput } = req.body;
  if (!userInput) {
    return res.status(400).json({ error: '프롬프트가 없습니다.' });
  }

  try {
    const prompt = `대화 상황:\n${userInput}\n\n상대방에게 보낼 매력적인 한 마디를 만들어줘:`;

    // Chat Completion (v4.x)
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `너는 상황에 맞춰 상대방에게 보낼 메시지를 재미있고 매력적으로 만들어주는 어시스턴트야.
          너는 플러팅 앱을 위한 대화 보조 인공지능이야.
          사용자(화자)는 썸을 타는 상대 또는 좋아하는 상대와 대화를 하고 있으며,
          너는 다음의 규칙을 따라야 해:
      
          1. 항상 상대가 호감을 느낄 만한, 긍정적이고 부드러운 어투로 답변할 것.
          2. 가능하다면 간단한 이모티콘(예: '😊', '😆')이나 약간의 자연스러운 감탄사(예: '아하', '아 그래??') 등을 사용해서 답변에 생동감을 줄 것.
          3. 답변은 너무 길지 않게, 1~3문장 정도로 간결하게 작성할 것.
          4. 상대방이 어떤 성격인지나, 대화 상황이 어떤지에 따라 톤을 조금씩 맞춤화할 것.
          5. 반말 혹은 존댓말 여부는 사용자의 프롬프트에 맞춰, 자연스럽게 유지할 것.
          `,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      max_tokens: 100,
      temperature: 0.7,
    });

    const responseText = completion.choices[0].message.content.trim();
    return res.json({ message: responseText });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: '오류 발생' });
  }
});

/** === 7) 서버 실행 === */
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
