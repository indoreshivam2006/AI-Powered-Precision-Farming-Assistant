"use client";

import { useEffect, useRef, useState } from "react";
import type { ComponentType, RefAttributes } from "react";
import { useChat } from "@ai-sdk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Bot, User, Loader2, Mic, Square, Volume2, Camera, ImagePlus, X } from "lucide-react";
import dynamic from "next/dynamic";
import { FeatureShell } from "@/components/FeatureShell";
import { reverseGeocode } from "@/lib/geocode";
import type ReactWebcam from "react-webcam";
import type { WebcamProps } from "react-webcam";

type DynamicWebcamProps = Partial<WebcamProps> & RefAttributes<ReactWebcam>;

const Webcam = dynamic<DynamicWebcamProps>(
  () =>
    import("react-webcam").then(
      (mod) => mod.default as unknown as ComponentType<DynamicWebcamProps>
    ),
  { ssr: false }
);

type Message = { id: string; role: "user" | "assistant"; content: string; image?: string };

export default function AdvisoryPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Namaste, I'm your AI advisor. Ask me anything about your crops, soil, or weather. You can also ask me a disease to identify.",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [userLocation, setUserLocation] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);

  const [playingMessageId, setPlayingMessageId] = useState<string | null>(null);
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const webcamRef = useRef<ReactWebcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const capture = () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      setAttachedImage(imageSrc);
      setIsCameraOpen(false);
    }
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const loc = await reverseGeocode(latitude, longitude);
          setUserLocation(loc.formatted);
        },
        (error) => {
          console.error("Geolocation error:", error);
        },
      );
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Text to Speech
  const handlePlayAudio = (id: string, text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel(); // Stop current speech

      if (playingMessageId === id) {
        setPlayingMessageId(null);
        return;
      }

      setPlayingMessageId(id);
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "hi-IN"; // Default to Hindi, can be changed
      utterance.rate = 0.9;

      utterance.onend = () => setPlayingMessageId(null);
      utterance.onerror = () => setPlayingMessageId(null);

      window.speechSynthesis.speak(utterance);
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      mediaRecorderRef.current?.stop();
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((track) => track.stop());
        await handleAudioUpload(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("Microphone access is required for voice assistant.");
    }
  };

  const handleAudioUpload = async (audioBlob: Blob) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "audio.webm");

      const res = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Transcription failed");

      const data = await res.json();
      if (data.text) {
        handleSend(data.text);
      }
    } catch (error) {
      console.error("Audio upload error:", error);
      alert("Failed to transcribe audio.");
      setIsLoading(false);
    }
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text: string) => {
    if ((!text.trim() && !attachedImage) || isLoading) return;

    const finalContent = text.trim() ? text : "Please analyze this image.";
    const userMessage: Message = { id: Date.now().toString(), role: "user", content: finalContent, image: attachedImage || undefined };
    const newMessages = [...messages, userMessage];

    setMessages(newMessages);
    setInput("");
    setAttachedImage(null);
    setIsLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages, userLocation }),
      });

      if (!res.body) throw new Error("No response body");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      // Add empty assistant message to be filled
      const assistantId = (Date.now() + 1).toString();
      setMessages((prev) => [...prev, { id: assistantId, role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) =>
          prev.map(m => m.id === assistantId ? { ...m, content: assistantContent } : m)
        );
      }

      // Auto-read is disabled; user must click the speaker button to listen.
      // speak(assistantContent);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: "assistant", content: "Sorry, I encountered an error connecting to Groq. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <FeatureShell intro="A friendly AI agronomist for everyday questions, powered by real-time intelligence.">
      <div className="flex flex-col h-[60vh]">
        <div className="flex-1 space-y-4 overflow-y-auto pr-2 pb-4">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
              <span
                className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${m.role === "user"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-primary text-primary-foreground"
                  }`}
              >
                {m.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </span>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${m.role === "user"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-accent text-accent-foreground border border-border"
                  }`}
              >
                {m.image && (
                  <img src={m.image} alt="User attachment" className="mb-2 max-w-full rounded-xl border border-border" style={{ maxHeight: '200px' }} />
                )}
                {m.content}
              </div>
              {m.role === "assistant" && (
                <button
                  onClick={() => handlePlayAudio(m.id, m.content)}
                  className={`ml-2 mt-1 p-2 rounded-full border transition-all duration-300 self-start ${playingMessageId === m.id ? "bg-primary/10 text-primary border-primary/20" : "bg-transparent text-muted-foreground border-border hover:bg-accent hover:text-foreground"}`}
                  title={playingMessageId === m.id ? "Stop reading" : "Read aloud"}
                  type="button"
                >
                  {playingMessageId === m.id ? <Square className="h-4 w-4 fill-current" /> : <Volume2 className="h-4 w-4" />}
                </button>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.role === "user" && (
            <div className="flex gap-3">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground">
                <Bot className="h-4 w-4" />
              </span>
              <div className="max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-accent text-accent-foreground border border-border flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" /> Thinking...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {isCameraOpen && (
          <div className="absolute inset-0 z-50 bg-background/95 backdrop-blur flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="relative w-full max-w-md bg-card rounded-2xl overflow-hidden shadow-xl border border-border">
              <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full h-auto"
                videoConstraints={{ facingMode: "environment" }}
              />
              <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                <Button onClick={() => setIsCameraOpen(false)} variant="secondary" size="icon" className="rounded-full h-12 w-12 bg-background/80 hover:bg-background">
                  <X className="h-5 w-5" />
                </Button>
                <Button onClick={capture} size="icon" className="rounded-full h-12 w-12 border-2 border-primary-foreground bg-primary shadow-lg hover:bg-primary/90">
                  <Camera className="h-5 w-5" />
                </Button>
              </div>
            </div>
          </div>
        )}



        <div className="mt-3 flex flex-col gap-2">
          {attachedImage && (
            <div className="relative self-start">
              <img src={attachedImage} alt="Preview" className="h-20 w-auto rounded-xl border border-border object-cover" />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md hover:bg-destructive/90"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          <form onSubmit={(e) => { e.preventDefault(); handleSend(input); }} className="flex gap-2">
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
            <Button type="button" size="icon" variant="secondary" className="h-12 w-12 rounded-full shrink-0" onClick={() => fileInputRef.current?.click()} disabled={isLoading || isRecording || isCameraOpen}>
              <ImagePlus className="h-4 w-4" />
            </Button>
            <Button type="button" size="icon" variant="secondary" className="h-12 w-12 rounded-full shrink-0" onClick={() => setIsCameraOpen(true)} disabled={isLoading || isRecording || isCameraOpen}>
              <Camera className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              size="icon"
              variant={isRecording ? "destructive" : "secondary"}
              className="h-12 w-12 rounded-full shrink-0"
              onClick={toggleRecording}
              disabled={isLoading && !isRecording}
            >
              {isRecording ? <Square className="h-4 w-4 fill-current animate-pulse" /> : <Mic className="h-4 w-4" />}
            </Button>
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isRecording ? "Listening..." : "Ask your question…"}
              className="h-12 rounded-full bg-background px-5"
              disabled={isLoading || isRecording || isCameraOpen}
            />
            <Button type="submit" size="icon" className="h-12 w-12 rounded-full shrink-0" disabled={isLoading || (!input.trim() && !attachedImage) || isRecording}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </FeatureShell>
  );
}
