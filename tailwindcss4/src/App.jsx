import React, { useState, useRef, useEffect } from "react";

const BASE_URL = "https://speech-to-text-1-ztov.onrender.com";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [inputName, setInputName] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState([]);

  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${BASE_URL}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchHistory();
    }
  }, [isLoggedIn]);

  const handleDelete = async (id) => {
    try {
      await fetch(`${BASE_URL}/history/${id}`, {
        method: "DELETE",
      });
      fetchHistory();
    } catch (err) {
      console.error("Failed to delete history item:", err);
    }
  };

  const handleStart = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorderRef.current = new window.MediaRecorder(stream);
    audioChunksRef.current = [];

    mediaRecorderRef.current.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    mediaRecorderRef.current.onstop = async () => {
      const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const formData = new FormData();
      formData.append("audio", blob, "recording.webm");

      try {
        const response = await fetch(`${BASE_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        const data = await response.json();
        setTranscript(data.transcript || "No speech detected.");
        fetchHistory();
      } catch (error) {
        console.error("Transcription failed:", error);
        setTranscript("Error processing speech.");
      }
    };

    mediaRecorderRef.current.start();
    setIsRecording(true);
  };

  const handleStop = () => {
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (inputName.trim()) {
      setUsername(inputName.trim());
      setIsLoggedIn(true);
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername("");
    setInputName("");
    setTranscript("");
    setHistory([]);
    setIsRecording(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("audio", file);

    fetch(`${BASE_URL}/upload`, {
      method: "POST",
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        setTranscript(data.transcript || "No speech detected.");
        fetchHistory();
      })
      .catch((err) => {
        console.error("Upload error:", err);
        setTranscript("Upload failed.");
      });
  };

  return (
    <div className="w-screen min-h-screen bg-gradient-to-tr from-blue-100 via-blue-300 to-blue-500 flex flex-col">
      {/* Header */}
      <div className="w-full bg-blue-900 py-4 px-4 sm:px-6 md:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-lg">
        <div className="text-2xl font-bold text-white tracking-wide text-center sm:text-left">
          Speech to Text
        </div>

        {!isLoggedIn ? (
          <form className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto" onSubmit={handleLogin}>
            <input
              type="text"
              placeholder="Enter your name"
              className="px-3 py-1 rounded-lg w-full sm:w-64 border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={inputName}
              onChange={(e) => setInputName(e.target.value)}
              required
            />
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-1 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row items-center gap-2">
            <span className="text-white text-lg">Welcome, {username}!</span>
            <button
              onClick={handleLogout}
              className="bg-blue-600 text-white px-4 py-1 rounded-lg font-semibold hover:bg-blue-700 transition"
            >
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Main */}
      {isLoggedIn && (
        <div className="flex-1 flex flex-col md:flex-row">
          {/* Left panel: Buttons */}
          <div className="w-full md:w-2/5 p-6 md:p-10 bg-blue-800 bg-opacity-80 flex flex-col items-center shadow-2xl">
            <h1 className="text-3xl md:text-4xl font-extrabold text-white mb-8 text-center drop-shadow-lg">
              🎤 Speech to Text
            </h1>
            <div className="flex flex-col gap-4 w-full">
              <button
                onClick={handleStart}
                disabled={isRecording}
                className={`py-4 px-6 rounded-xl text-lg md:text-2xl font-bold shadow-lg transition-all ${
                  isRecording
                    ? "bg-blue-300 text-blue-500 cursor-not-allowed"
                    : "bg-blue-500 text-white hover:bg-blue-600"
                }`}
              >
                Start Recording
              </button>
              <button
                onClick={handleStop}
                disabled={!isRecording}
                className={`py-4 px-6 rounded-xl text-lg md:text-2xl font-bold shadow-lg transition-all ${
                  !isRecording
                    ? "bg-blue-300 text-blue-500 cursor-not-allowed"
                    : "bg-blue-700 text-white hover:bg-blue-800"
                }`}
              >
                Stop Recording
              </button>
              <button
                onClick={handleCopy}
                className="py-4 px-6 rounded-xl text-lg md:text-2xl font-bold shadow-lg bg-blue-400 text-white hover:bg-blue-500 transition-all"
              >
                Copy Text
              </button>
            </div>
          </div>

          {/* Right panel: Transcript + Upload */}
          <div className="flex-1 flex flex-col items-center p-4 md:p-8 gap-6">
            {/* Upload buttons */}
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 justify-center items-center">
              <div
                className="flex flex-col items-center justify-center bg-white bg-opacity-90 rounded-2xl shadow-lg p-6 cursor-pointer hover:bg-blue-100 transition w-48"
                onClick={() => fileInputRef.current.click()}
              >
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-blue-500 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5-5m0 0l5 5m-5-5v12"
                  />
                </svg>
                <span className="font-semibold text-blue-700 text-sm text-center">
                  Upload File
                </span>
              </div>

              <div
                className="flex flex-col items-center justify-center bg-white bg-opacity-90 rounded-2xl shadow-lg p-6 cursor-pointer hover:bg-blue-100 transition w-48"
                onClick={handleStart}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-12 w-12 text-blue-500 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 1v14m0 0a5 5 0 005-5V6a5 5 0 00-10 0v4a5 5 0 005 5zm0 0v4m-4 0h8"
                  />
                </svg>
                <span className="font-semibold text-blue-700 text-sm text-center">
                  Record Audio
                </span>
              </div>
            </div>

            {/* Transcript area */}
            <div className="w-full bg-white bg-opacity-90 rounded-3xl shadow-2xl flex flex-col">
              <h2 className="text-xl sm:text-2xl font-bold text-blue-700 mb-2 mt-4 ml-4">
                Transcription
              </h2>
              <textarea
                className="flex-1 w-full p-4 sm:p-6 text-base sm:text-lg rounded-2xl border-2 border-blue-200 focus:outline-none focus:ring-4 focus:ring-blue-200 bg-white text-blue-900 resize-none"
                placeholder="Your speech will appear here..."
                value={transcript}
                readOnly
              />
            </div>

            {/* History */}
            <div className="w-full max-h-64 overflow-y-auto bg-white rounded-xl shadow-md p-4 border border-blue-300">
              <h3 className="text-lg font-semibold text-blue-700 mb-2">
                Past Transcriptions
              </h3>
              {history.length === 0 ? (
                <p className="text-blue-500">No history yet.</p>
              ) : (
                history.map((item) => (
                  <div key={item._id} className="mb-4 border-b pb-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-blue-900">
                          🎧 {item.filename}
                        </p>
                        <p className="text-blue-800">{item.text}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(item._id)}
                        className="ml-4 text-red-600 hover:underline"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <footer className="text-blue-900 text-sm sm:text-base text-center mt-4">
              &copy; {new Date().getFullYear()} Speech to Text App
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}
