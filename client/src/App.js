import React, { useState } from "react";

function App() {
  const [fileContent, setFileContent] = useState("");
  const [filePath, setFilePath] = useState("");

  const readFile = async () => {
    try {
      const content = await window.electronAPI.readFile(filePath);
      setFileContent(content);
    } catch (error) {
      console.error("Error reading file:", error);
      setFileContent("파일 읽기 오류");
    }
  };

  return (
    <div>
      <h1>Electron + React 연동</h1>
      <input
        type="text"
        value={filePath}
        onChange={(e) => setFilePath(e.target.value)}
        placeholder="파일 경로 입력"
      />
      <button onClick={readFile}>파일 읽기</button>
      <pre>{fileContent}</pre>
    </div>
  );
}

export default App;
