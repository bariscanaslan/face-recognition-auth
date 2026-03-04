"use client";

import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';

interface FaceResult {
    bbox: [number, number, number, number];
    confidence: number;
}

type ScanStatus = "idle" | "scanning" | "done" | "no_face" | "error";

function WebcamFaceMatch() {
    const [isShowVideo, setIsShowVideo] = useState(false);
    const [faces, setFaces] = useState<FaceResult[]>([]);
    const [scanStatus, setScanStatus] = useState<ScanStatus>("idle");
    const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
    const videoElement = useRef<any>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const videoConstraints = { width: 640, height: 480, facingMode: "user" };

    const startCam = () => {
        setIsShowVideo(true);
        setFaces([]);
        setCapturedFrame(null);
        setScanStatus("idle");
    };

    const stopCam = () => {
        const stream = videoElement.current?.stream;
        stream?.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        setIsShowVideo(false);
        setFaces([]);
        setCapturedFrame(null);
        setScanStatus("idle");
    };

    const drawBoxes = useCallback((faceList: FaceResult[], img: HTMLImageElement) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);

        faceList.forEach(({ bbox, confidence }) => {
            const [x1, y1, x2, y2] = bbox;
            const color = confidence > 75 ? "#22c55e"
                        : confidence > 60 ? "#3b82f6"
                        : "#ef4444";

            // Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 4]);
            ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
            ctx.setLineDash([]);

            // Köşe bracket'lar
            const bLen = 16;
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;

            ctx.beginPath(); ctx.moveTo(x1, y1 + bLen); ctx.lineTo(x1, y1); ctx.lineTo(x1 + bLen, y1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x2 - bLen, y1); ctx.lineTo(x2, y1); ctx.lineTo(x2, y1 + bLen); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x1, y2 - bLen); ctx.lineTo(x1, y2); ctx.lineTo(x1 + bLen, y2); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(x2 - bLen, y2); ctx.lineTo(x2, y2); ctx.lineTo(x2, y2 - bLen); ctx.stroke();
        });
    }, []);

    const handleScan = async () => {
        if (!videoElement.current) return;

        setScanStatus("scanning");
        setFaces([]);
        setCapturedFrame(null);

        // Anlık görüntüyü al
        const screenshot = videoElement.current.getScreenshot();
        if (!screenshot) {
            setScanStatus("error");
            return;
        }

        setCapturedFrame(screenshot);

        try {
            const res = await fetch("http://localhost:8000/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ image: screenshot }),
            });

            const data = await res.json();

            if (data.status === "no_face") {
                setScanStatus("no_face");
                setFaces([]);
                return;
            }

            setFaces(data.faces);
            setScanStatus("done");

            const img = new Image();
            img.onload = () => drawBoxes(data.faces, img);
            img.src = screenshot;

        } catch (e) {
            console.error(e);
            setScanStatus("error");
        }
    };

    const getMatchColor = (conf: number) =>
        conf > 75 ? "#22c55e" : conf > 60 ? "#3b82f6" : "#ef4444";

    const getMatchLabel = (conf: number) =>
        conf > 75 ? "Good Match" : conf > 60 ? "Partial Match" : "No Match";

    const bestFace = faces.length > 0
        ? faces.reduce((a, b) => a.confidence > b.confidence ? a : b)
        : null;

    return (
        <div style={{
            minHeight: "100vh",
            background: "linear-gradient(135deg, #0f0f0f 0%, #1a1a2e 50%, #0f0f0f 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "'Inter', 'Segoe UI', sans-serif",
        }}>
            {/* Title */}
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
                <h1 style={{
                    color: "#ffffff",
                    fontSize: "22px",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    margin: 0,
                }}>
                    Face Recognition
                </h1>
                <p style={{ color: "#555", fontSize: "13px", marginTop: "6px", letterSpacing: "0.05em" }}>
                    Real-time identity verification
                </p>
            </div>

            {/* Camera / Result Frame */}
            <div style={{
                position: "relative",
                width: "640px",
                height: "480px",
                borderRadius: "16px",
                overflow: "hidden",
                background: "#111",
                boxShadow: isShowVideo
                    ? "0 0 0 1px rgba(255,255,255,0.08), 0 0 40px rgba(99,102,241,0.15), 0 24px 48px rgba(0,0,0,0.6)"
                    : "0 0 0 1px rgba(255,255,255,0.06), 0 24px 48px rgba(0,0,0,0.5)",
            }}>
                {/* Placeholder */}
                {!isShowVideo && (
                    <div style={{
                        width: "100%", height: "100%",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center", gap: "16px",
                        background: "linear-gradient(145deg, #141414, #1c1c1c)",
                    }}>
                        <svg width="56" height="56" viewBox="0 0 24 24" fill="none"
                            stroke="rgba(255,255,255,0.15)" strokeWidth="1.2"
                            strokeLinecap="round" strokeLinejoin="round">
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                            <circle cx="12" cy="13" r="4"/>
                        </svg>
                        <span style={{ color: "rgba(255,255,255,0.12)", fontSize: "13px", letterSpacing: "0.08em" }}>
                            CAMERA OFF
                        </span>
                        {[
                            { top: 16, left: 16, rotate: "0deg" },
                            { top: 16, right: 16, rotate: "90deg" },
                            { bottom: 16, left: 16, rotate: "270deg" },
                            { bottom: 16, right: 16, rotate: "180deg" },
                        ].map((s, i) => (
                            <div key={i} style={{
                                position: "absolute", ...s,
                                width: "20px", height: "20px",
                                borderTop: "2px solid rgba(255,255,255,0.1)",
                                borderLeft: "2px solid rgba(255,255,255,0.1)",
                                transform: `rotate(${s.rotate})`,
                            }}/>
                        ))}
                    </div>
                )}

                {/* Live webcam — scan yapılana kadar görünür */}
                {isShowVideo && scanStatus !== "done" && (
                    <>
                        <Webcam
                            audio={false}
                            ref={videoElement}
                            videoConstraints={videoConstraints}
                            screenshotFormat="image/jpeg"
                            screenshotQuality={0.85}
                            mirrored={true}
                            style={{
                                position: "absolute", top: 0, left: 0,
                                width: "100%", height: "100%", objectFit: "cover",
                            }}
                        />
                        {/* Scanning overlay */}
                        {scanStatus === "scanning" && (
                            <div style={{
                                position: "absolute", inset: 0,
                                background: "rgba(0,0,0,0.55)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexDirection: "column", gap: "14px",
                            }}>
                                <div style={{
                                    width: "40px", height: "40px",
                                    border: "3px solid rgba(255,255,255,0.1)",
                                    borderTop: "3px solid #6366f1",
                                    borderRadius: "50%",
                                    animation: "spin 0.8s linear infinite",
                                }}/>
                                <span style={{ color: "#fff", fontSize: "14px", letterSpacing: "0.1em" }}>
                                    ANALYZING...
                                </span>
                            </div>
                        )}
                        {/* Live badge */}
                        <div style={{
                            position: "absolute", top: "14px", left: "14px",
                            display: "flex", alignItems: "center", gap: "6px",
                            background: "rgba(0,0,0,0.45)", backdropFilter: "blur(6px)",
                            borderRadius: "20px", padding: "4px 10px 4px 8px",
                            border: "1px solid rgba(255,255,255,0.08)",
                        }}>
                            <div style={{
                                width: "7px", height: "7px", borderRadius: "50%",
                                background: "#ef4444", animation: "pulse 1.5s infinite",
                            }}/>
                            <span style={{ color: "#fff", fontSize: "11px", fontWeight: 600, letterSpacing: "0.1em" }}>LIVE</span>
                        </div>
                    </>
                )}

                {/* Scan sonucu — canvas üzerinde */}
                {scanStatus === "done" && capturedFrame && (
                    <canvas
                        ref={canvasRef}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                )}

                {/* no_face durumu */}
                {scanStatus === "no_face" && capturedFrame && (
                    <>
                        <img src={capturedFrame} style={{
                            width: "100%", height: "100%", objectFit: "cover",
                            filter: "brightness(0.5)",
                        }} alt="captured" />
                        <div style={{
                            position: "absolute", inset: 0,
                            display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                            <span style={{
                                color: "#ef4444", fontSize: "15px",
                                fontWeight: 600, letterSpacing: "0.1em",
                                background: "rgba(0,0,0,0.5)",
                                padding: "10px 20px", borderRadius: "8px",
                            }}>
                                NO FACE DETECTED
                            </span>
                        </div>
                    </>
                )}
            </div>

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px", marginTop: "24px" }}>
                <button onClick={startCam} disabled={isShowVideo} style={btnStyle(!isShowVideo, "primary")}>
                    Start Camera
                </button>

                {/* Scan butonu — sadece kamera açıkken ve scanning değilken */}
                {isShowVideo && (
                    <button
                        onClick={handleScan}
                        disabled={scanStatus === "scanning"}
                        style={btnStyle(scanStatus !== "scanning", "scan")}
                    >
                        {scanStatus === "scanning" ? "Scanning..." : "Scan"}
                    </button>
                )}

                {/* Tekrar scan için retry */}
                {scanStatus === "done" || scanStatus === "no_face" ? (
                    <button onClick={() => {
                        setScanStatus("idle");
                        setFaces([]);
                        setCapturedFrame(null);
                    }} style={btnStyle(true, "secondary")}>
                        Retry
                    </button>
                ) : null}

                <button onClick={stopCam} disabled={!isShowVideo} style={btnStyle(isShowVideo, "danger")}>
                    Stop Camera
                </button>
            </div>

            {/* Matching Rate */}
            <div style={{ marginTop: "28px", minHeight: "80px", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
                {bestFace && (
                    <>
                        <div style={{ fontSize: "13px", fontWeight: 500, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                            Matching Rate
                        </div>
                        <div style={{
                            fontSize: "48px", fontWeight: 800,
                            color: getMatchColor(bestFace.confidence),
                            letterSpacing: "-0.02em", lineHeight: 1,
                            textShadow: `0 0 32px ${getMatchColor(bestFace.confidence)}66`,
                            transition: "color 0.4s ease",
                        }}>
                            {bestFace.confidence}%
                        </div>
                        <div style={{
                            fontSize: "12px", fontWeight: 600,
                            color: getMatchColor(bestFace.confidence),
                            letterSpacing: "0.12em", textTransform: "uppercase", opacity: 0.8,
                        }}>
                            {getMatchLabel(bestFace.confidence)}
                        </div>
                    </>
                )}
                {scanStatus === "idle" && isShowVideo && (
                    <span style={{ color: "rgba(255,255,255,0.2)", fontSize: "13px", letterSpacing: "0.06em" }}>
                        Scan butonuna bas
                    </span>
                )}
                {scanStatus === "error" && (
                    <span style={{ color: "#ef4444", fontSize: "13px" }}>Bir hata oluştu, tekrar dene.</span>
                )}
            </div>

            <style>{`
                @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.85)} }
                @keyframes spin { to { transform: rotate(360deg); } }
            `}</style>
        </div>
    );
}

function btnStyle(active: boolean, variant: "primary" | "danger" | "scan" | "secondary"): React.CSSProperties {
    const base: React.CSSProperties = {
        padding: "11px 24px", borderRadius: "10px",
        fontSize: "14px", fontWeight: 600, letterSpacing: "0.04em",
        cursor: active ? "pointer" : "not-allowed",
        transition: "all 0.2s ease", border: "1px solid rgba(255,255,255,0.1)",
    };
    if (!active) return { ...base, background: "rgba(255,255,255,0.04)", color: "rgba(255,255,255,0.2)" };

    const variants = {
        primary:    { background: "linear-gradient(135deg,#6366f1,#4f46e5)", color: "#fff", boxShadow: "0 4px 16px rgba(99,102,241,0.35)" },
        scan:       { background: "linear-gradient(135deg,#06b6d4,#0891b2)", color: "#fff", boxShadow: "0 4px 16px rgba(6,182,212,0.35)" },
        secondary:  { background: "rgba(255,255,255,0.08)", color: "#fff", boxShadow: "none" },
        danger:     { background: "rgba(239,68,68,0.15)", color: "#ef4444", boxShadow: "none" },
    };
    return { ...base, ...variants[variant] };
}

export default WebcamFaceMatch;