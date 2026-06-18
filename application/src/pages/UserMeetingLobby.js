// src/pages/MeetingLobby.js
import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import UserSidebar from "../components/UserSidebar";
import UserNavbar from "../components/Navbar";
import "./UserMeetingLobby.css";

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${ampm} IST`;
};

const MeetingLobby = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [meeting,   setMeeting]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [camera,    setCamera]    = useState(true);
  const [mic,       setMic]       = useState(true);
  const [joining,   setJoining]   = useState(false);
  const [camStream, setCamStream] = useState(null);
  const videoRef = React.useRef(null);

  /* ── Fetch meeting ── */
  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/meetings/${id}`);
        setMeeting(res.data.meeting);
      } catch (e) {
        setError("Could not load meeting details.");
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [id]);

  /* ── Request camera/mic for live preview ── */
  useEffect(() => {
    let stream = null;
    navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
      .then((s) => {
        stream = s;
        setCamStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
      })
      .catch(() => { /* browser denied or not supported — fallback to placeholder */ });
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  /* ── Attach stream to video element once both are ready ── */
  useEffect(() => {
    if (camStream && videoRef.current && camera) {
      videoRef.current.srcObject = camStream;
      videoRef.current.play().catch(() => {});
    } else if (videoRef.current && !camera) {
      videoRef.current.srcObject = null;
    }
  }, [camStream, camera]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      // Start meeting if it hasn't started yet (mediator/admin would do this,
      // but we attempt it in case user is the organizer)
      if (meeting?.status === "Scheduled" || meeting?.status === "Confirmed") {
        try { await api.patch(`/meetings/${id}/start`); } catch (_) { /* not organizer, that's fine */ }
      }
      navigate(`/user/meetings/call/${id}`);
    } catch (e) {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="dashboard-container">
      <UserSidebar activePage="meetings" />
      <main className="lobby-main">
        <UserNavbar />
        <div className="lobby-loading"><div className="lobby-spinner" /></div>
      </main>
    </div>
  );

  if (error || !meeting) return (
    <div className="dashboard-container">
      <UserSidebar activePage="meetings" />
      <main className="lobby-main">
        <UserNavbar />
        <div className="lobby-error">
          <p>{error || "Meeting not found."}</p>
          <button onClick={() => navigate("/user/meetings")}>Back to Meetings</button>
        </div>
      </main>
    </div>
  );

  const caseTitle    = meeting.caseId?.caseTitle || meeting.meetingTitle || "—";
  const sessionId    = meeting._id?.slice(-7).toUpperCase().replace(/(.{3})(.{4})/, "$1-$2");
  const mediator     = meeting.mediator;
  const participants = meeting.participants?.length || 0;
  const isPrivate    = meeting.isPrivate;

  return (
    <div className="dashboard-container">
      <UserSidebar activePage="meetings" />

      <main className="lobby-main">
        <UserNavbar />

        <div className="lobby-body">
          {/* Left — Camera preview */}
          <div className="lobby-left">
            <div className="lobby-preview">
              <div className="lobby-preview-label">🔴 LIVE PREVIEW</div>
              {camStream && camera ? (
                <video
                  ref={videoRef}
                  className="lobby-video-feed"
                  autoPlay
                  muted
                  playsInline
                />
              ) : (
                <div className={`lobby-cam-area${!camera ? " lobby-cam-off" : ""}`}>
                  <span>📷</span>
                  <p>{camera ? "Requesting camera…" : "Camera is off"}</p>
                </div>
              )}
            </div>

            <div className="lobby-ready">
              <h3>Ready to join?</h3>
              <p>Please check your audio and video settings before joining the session.</p>
            </div>

            <div className="lobby-devices">
              <div className="lobby-device">
                <div className="lobby-device-info">
                  <span className="lobby-device-icon">📷</span>
                  <div>
                    <p className="lobby-device-name">Camera</p>
                    <p className="lobby-device-sub">Integrated Webcam</p>
                  </div>
                </div>
                <button
                  className={`lobby-toggle ${camera ? "on" : "off"}`}
                  onClick={() => setCamera((v) => !v)}
                >
                  <span className="lobby-toggle-knob" />
                </button>
              </div>

              <div className="lobby-device">
                <div className="lobby-device-info">
                  <span className="lobby-device-icon">🎙️</span>
                  <div>
                    <p className="lobby-device-name">Microphone</p>
                    <p className="lobby-device-sub">Default Input</p>
                  </div>
                </div>
                <button
                  className={`lobby-toggle ${mic ? "on" : "off"}`}
                  onClick={() => setMic((v) => !v)}
                >
                  <span className="lobby-toggle-knob" />
                </button>
              </div>
            </div>
          </div>

          {/* Right — Session info */}
          <div className="lobby-right">
            {isPrivate && (
              <div className="lobby-private-tag">PRIVATE SESSION</div>
            )}
            <h2 className="lobby-session-id">Session ID: {sessionId}</h2>

            {mediator && (
              <div className="lobby-mediator">
                <img
                  src={mediator.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(mediator.name)}&background=778aff&color=fff&size=80`}
                  alt={mediator.name}
                  className="lobby-mediator-avatar"
                />
                <div>
                  <p className="lobby-mediator-label">MEDIATOR</p>
                  <p className="lobby-mediator-name">{mediator.name}</p>
                </div>
              </div>
            )}

            <div className="lobby-details-grid">
              <div className="lobby-detail">
                <p className="lobby-detail-label">CASE ID</p>
                <p className="lobby-detail-value">#{meeting.caseId?.caseId || "—"}</p>
              </div>
              <div className="lobby-detail">
                <p className="lobby-detail-label">TOPIC</p>
                <p className="lobby-detail-value">{caseTitle}</p>
              </div>
              <div className="lobby-detail">
                <p className="lobby-detail-label">SCHEDULED TIME</p>
                <p className="lobby-detail-value">{fmtTime(meeting.startTime)}</p>
              </div>
              <div className="lobby-detail">
                <p className="lobby-detail-label">PARTICIPANTS</p>
                <p className="lobby-detail-value">{participants + (mediator ? 1 : 0)}</p>
              </div>
            </div>

            <button
              className="lobby-join-btn"
              onClick={handleJoin}
              disabled={joining}
            >
              {joining ? "Joining…" : "Join Session"}
            </button>

            <div className="lobby-disclaimer">
              <span>🔒</span>
              <p>
                This session is encrypted. By joining, you agree to the{" "}
                <a href="/confidentiality">Confidentiality Agreement</a>.
              </p>
            </div>

            <button
              className="lobby-back-btn"
              onClick={() => navigate("/user/meetings")}
            >
              ← Back to Meetings
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MeetingLobby;