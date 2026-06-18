// src/pages/AdminMeetingLobby.js
import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../api/axios";
import AdminSidebar from "../components/AdminSidebar";
import { FaBell, FaSearch, FaVideo, FaMicrophone } from "react-icons/fa";
import "./AdminMeetingLobby.css";

const fmtTime = (t) => {
  if (!t) return "—";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"} IST`;
};

const avatarUrl = (name) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name || "P")}&background=778aff&color=fff&size=80`;

const AdminMeetingLobby = () => {
  const { id }   = useParams();
  const navigate = useNavigate();

  const [meeting,   setMeeting]   = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [camera,    setCamera]    = useState(true);
  const [mic,       setMic]       = useState(true);
  const [joining,   setJoining]   = useState(false);
  const [camStream, setCamStream] = useState(null);
  const videoRef = useRef(null);

  const adminName   = localStorage.getItem("name") || "Admin";
  const adminAvatar = localStorage.getItem("avatar") || avatarUrl(adminName);

  /* Fetch meeting */
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) { navigate("/login"); return; }
    api.get(`/meetings/${id}`)
      .then((res) => setMeeting(res.data.meeting))
      .catch(() => setError("Could not load meeting details."))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  /* Request camera/mic preview */
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
      .catch(() => {});
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  /* Enable/disable actual camera track; update preview accordingly */
  useEffect(() => {
    if (!camStream) return;
    camStream.getVideoTracks().forEach((t) => { t.enabled = camera; });
    if (videoRef.current) {
      videoRef.current.srcObject = camera ? camStream : null;
      if (camera) videoRef.current.play().catch(() => {});
    }
  }, [camStream, camera]);

  /* Enable/disable actual audio track when mic toggle changes */
  useEffect(() => {
    if (!camStream) return;
    camStream.getAudioTracks().forEach((t) => { t.enabled = mic; });
  }, [camStream, mic]);

  const handleJoin = async () => {
    setJoining(true);
    try {
      try { await api.patch(`/meetings/${id}/start`); } catch (_) {}
      navigate(`/admin/meetings/call/${id}`, {
        state: { initialMuted: !mic, initialCamOff: !camera },
      });
    } catch {
      setJoining(false);
    }
  };

  if (loading) return (
    <div className="aml-root">
      <AdminSidebar />
      <div className="aml-loading"><div className="aml-spinner" /></div>
    </div>
  );

  if (error || !meeting) return (
    <div className="aml-root">
      <AdminSidebar />
      <div className="aml-error-state">
        <p>{error || "Meeting not found."}</p>
        <button onClick={() => navigate("/admin/case-meetings")}>Back to Meetings</button>
      </div>
    </div>
  );

  const sessionId    = meeting._id?.slice(-7).toUpperCase().replace(/(.{3})(.{4})/, "$1-$2");
  const caseTitle    = meeting.caseId?.caseTitle || meeting.meetingTitle || "—";
  const caseId       = meeting.caseId?.caseId;
  const mediator     = meeting.mediator;
  const parts        = meeting.participants || [];

  const allParticipants = [
    ...(mediator ? [{ name: mediator.name || "Mediator", role: "Mediator", avatar: mediator.avatar }] : []),
    ...parts.map((p) => ({
      name:   p.name || p.user?.name || "Participant",
      role:   p.role || "participant",
      avatar: p.user?.avatar || null,
    })),
  ];
  const participantCount = allParticipants.length;

  return (
    <div className="aml-root">
      <AdminSidebar />
      <div className="aml-main">

        {/* Topbar */}
        <header className="aml-topbar">
          <div className="aml-search">
            <FaSearch className="aml-search-icon" />
            <input className="aml-search-input" placeholder="Search cases, mediators or meetings…" readOnly />
          </div>
          <div className="aml-topbar-right">
            <button className="aml-bell-btn"><FaBell /></button>
            <img src={adminAvatar} alt="admin" className="aml-admin-avatar" />
          </div>
        </header>

        <div className="aml-body">

          {/* ── Left: Preview + Devices ── */}
          <div className="aml-left">

            {/* Live camera preview */}
            <div className="aml-preview-card">
              <span className="aml-live-badge">🔴 LIVE PREVIEW</span>
              {camStream && camera ? (
                <video ref={videoRef} className="aml-video-feed" autoPlay muted playsInline />
              ) : (
                <div className={`aml-cam-placeholder${!camera ? " aml-cam-off" : ""}`}>
                  <FaVideo className="aml-cam-ph-icon" />
                  <p>{camera ? "Requesting camera access…" : "Camera is off"}</p>
                </div>
              )}
              {/* Overlay toggle icons (center-bottom of preview) */}
              <div className="aml-preview-overlay-icons">
                <button
                  className={`aml-ov-btn${!camera ? " aml-ov-btn--off" : ""}`}
                  onClick={() => setCamera((v) => !v)}
                  title={camera ? "Turn off camera" : "Turn on camera"}
                >
                  <FaVideo />
                </button>
                <button
                  className={`aml-ov-btn${!mic ? " aml-ov-btn--off" : ""}`}
                  onClick={() => setMic((v) => !v)}
                  title={mic ? "Mute" : "Unmute"}
                >
                  <FaMicrophone />
                </button>
              </div>
            </div>

            {/* Ready to join */}
            <div className="aml-ready">
              <h3 className="aml-ready-title">Ready to join?</h3>
              <p className="aml-ready-sub">Please check your audio and video settings before joining the session.</p>
            </div>

            {/* Device toggle cards */}
            <div className="aml-devices-grid">
              <div className="aml-device-card">
                <div className="aml-device-info">
                  <span className="aml-device-icon-wrap"><FaVideo /></span>
                  <div>
                    <p className="aml-device-name">Camera</p>
                    <p className="aml-device-sub">Integrated Webcam</p>
                  </div>
                </div>
                <button
                  className={`aml-toggle ${camera ? "aml-toggle--on" : "aml-toggle--off"}`}
                  onClick={() => setCamera((v) => !v)}
                >
                  <span className="aml-toggle-knob" />
                </button>
              </div>
              <div className="aml-device-card">
                <div className="aml-device-info">
                  <span className="aml-device-icon-wrap"><FaMicrophone /></span>
                  <div>
                    <p className="aml-device-name">Microphone</p>
                    <p className="aml-device-sub">Default Input</p>
                  </div>
                </div>
                <button
                  className={`aml-toggle ${mic ? "aml-toggle--on" : "aml-toggle--off"}`}
                  onClick={() => setMic((v) => !v)}
                >
                  <span className="aml-toggle-knob" />
                </button>
              </div>
            </div>
          </div>

          {/* ── Right: Session info card ── */}
          <div className="aml-right">
            {meeting.isPrivate && (
              <div className="aml-private-pill">PRIVATE SESSION</div>
            )}

            <h2 className="aml-session-id">Session ID: {sessionId}</h2>

            {/* Participants list */}
            <div className="aml-participants">
              {allParticipants.slice(0, 5).map((p, i) => (
                <div key={i} className="aml-participant">
                  <div className="aml-participant-av">
                    {p.avatar
                      ? <img src={p.avatar} alt={p.name} />
                      : <span>{(p.name || "?").charAt(0).toUpperCase()}</span>
                    }
                  </div>
                  <div>
                    <p className="aml-participant-role">{(p.role || "participant").toUpperCase()}</p>
                    <p className="aml-participant-name">{p.name}</p>
                  </div>
                </div>
              ))}
              {allParticipants.length === 0 && (
                <p className="aml-no-participants">No participants listed yet.</p>
              )}
            </div>

            {/* Details grid */}
            <div className="aml-details-grid">
              <div className="aml-detail">
                <p className="aml-detail-label">CASE ID</p>
                <p className="aml-detail-value">{caseId ? `#${caseId}` : "—"}</p>
              </div>
              <div className="aml-detail">
                <p className="aml-detail-label">TOPIC</p>
                <p className="aml-detail-value">{caseTitle}</p>
              </div>
              <div className="aml-detail">
                <p className="aml-detail-label">SCHEDULED TIME</p>
                <p className="aml-detail-value">{fmtTime(meeting.startTime)}</p>
              </div>
              <div className="aml-detail">
                <p className="aml-detail-label">PARTICIPANTS</p>
                <p className="aml-detail-value">{participantCount}</p>
              </div>
            </div>

            {/* Join button */}
            <button className="aml-join-btn" onClick={handleJoin} disabled={joining}>
              {joining ? "Joining…" : "Join Session"}
            </button>

            {/* Disclaimer */}
            <div className="aml-disclaimer">
              <span className="aml-disclaimer-icon">🔒</span>
              <p>
                This session is encrypted. By joining, you agree to the{" "}
                <a href="/confidentiality" className="aml-disclaimer-link">Confidentiality Agreement</a>.
              </p>
            </div>

            <button className="aml-back-btn" onClick={() => navigate("/admin/case-meetings")}>
              ← Back to Meetings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminMeetingLobby;
